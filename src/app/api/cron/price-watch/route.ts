/**
 * GET /api/cron/price-watch — scheduled price re-fetch (Vercel Cron).
 *
 * For every shortlisted product across all users, re-run Tony's search, read
 * the current price, and append a row to price_observations whenever the price
 * *moved* from the last known value (the prior observation, or the shortlist
 * baseline when there's none). The /alerts page merges these into the
 * per-device timeline, so a drop detected while the user was away still shows.
 *
 * Auth: Vercel sends `Authorization: Bearer ${CRON_SECRET}` for cron requests
 * when CRON_SECRET is configured. We require it — without a configured secret
 * the endpoint refuses to run (no open trigger).
 *
 * Cost control: searches are deduped by normalized product name and capped, so
 * 1000 shortlisted "AirPods Pro" rows cost one SerpAPI call, not 1000.
 */
import { NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase/admin';
import { runServerSearch } from '@/lib/search/run';
import { matchWatchedProduct, type WatchedRow } from '@/lib/alerts/refetch';
import type { Product } from '@/types/product';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const MAX_ROWS = 2000;
const MAX_QUERIES = 80;

interface ShortlistRow {
  user_id: string;
  product_id: string;
  name: string;
  store: string;
  price_amount: number;
  price_currency: string;
}

function normalizeName(s: string): string {
  return s.toLowerCase().replace(/\s+/g, ' ').trim();
}

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET ?? '';
  if (!secret) {
    return NextResponse.json({ error: 'cron_not_configured' }, { status: 503 });
  }
  const auth = req.headers.get('authorization');
  if (auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const admin = getAdminClient();
  if (!admin) {
    return NextResponse.json({ error: 'supabase_unconfigured' }, { status: 503 });
  }

  // 1. Pull every watched product (capped).
  const { data: rows, error: rowsErr } = await admin
    .from('shortlist')
    .select('user_id, product_id, name, store, price_amount, price_currency')
    .order('added_at', { ascending: false })
    .limit(MAX_ROWS);
  if (rowsErr) {
    return NextResponse.json({ error: rowsErr.message }, { status: 500 });
  }
  const shortlist = (rows ?? []) as ShortlistRow[];
  if (shortlist.length === 0) {
    return NextResponse.json({ ok: true, scannedRows: 0, searchesRun: 0, observationsWritten: 0 });
  }

  // 2. Latest known price per (user, product), to compare moves against.
  //    Falls back to the shortlist baseline below when a product is unseen.
  const userIds = Array.from(new Set(shortlist.map((r) => r.user_id)));
  const lastByKey = new Map<string, number>();
  const { data: obs } = await admin
    .from('price_observations')
    .select('user_id, product_id, price_amount, observed_at')
    .in('user_id', userIds)
    .order('observed_at', { ascending: false })
    .limit(10000);
  for (const o of (obs ?? []) as Array<{ user_id: string; product_id: string; price_amount: number }>) {
    const key = `${o.user_id}::${o.product_id}`;
    if (!lastByKey.has(key)) lastByKey.set(key, o.price_amount); // first = most recent
  }

  // 3. Dedupe queries by normalized name; run each search once (capped).
  const queryNames = new Map<string, string>(); // normalized -> original (first seen)
  for (const r of shortlist) {
    const n = normalizeName(r.name);
    if (n && !queryNames.has(n)) queryNames.set(n, r.name);
    if (queryNames.size >= MAX_QUERIES) break;
  }

  const productsByName = new Map<string, Product[]>();
  let searchesRun = 0;
  let searchErrors = 0;
  await Promise.all(
    Array.from(queryNames.entries()).map(async ([norm, original]) => {
      try {
        const result = await runServerSearch({ q: original, attachments: [] });
        productsByName.set(norm, result.products);
        searchesRun += 1;
      } catch {
        searchErrors += 1;
      }
    }),
  );

  // 4. For each watched row, match the fresh product and record a move.
  const toInsert: Array<{
    user_id: string;
    product_id: string;
    price_amount: number;
    price_currency: string;
    source: string;
  }> = [];
  let matched = 0;
  for (const r of shortlist) {
    const norm = normalizeName(r.name);
    const products = productsByName.get(norm);
    if (!products) continue; // query was capped out or failed
    const watched: WatchedRow = {
      productId: r.product_id,
      name: r.name,
      store: r.store,
      currency: r.price_currency,
    };
    const hit = matchWatchedProduct(watched, products);
    if (!hit) continue;
    matched += 1;
    const newAmount = hit.finalPrice.amount;
    const key = `${r.user_id}::${r.product_id}`;
    const prevAmount = lastByKey.get(key) ?? r.price_amount;
    if (newAmount === prevAmount) continue; // moves only — no noise
    toInsert.push({
      user_id: r.user_id,
      product_id: r.product_id,
      price_amount: newAmount,
      price_currency: r.price_currency,
      source: 'cron',
    });
    lastByKey.set(key, newAmount); // guard against duplicate rows in one run
  }

  let observationsWritten = 0;
  if (toInsert.length > 0) {
    const { error: insErr } = await admin.from('price_observations').insert(toInsert);
    if (insErr) {
      return NextResponse.json(
        { error: insErr.message, scannedRows: shortlist.length, searchesRun, matched },
        { status: 500 },
      );
    }
    observationsWritten = toInsert.length;
  }

  return NextResponse.json({
    ok: true,
    scannedRows: shortlist.length,
    distinctQueries: queryNames.size,
    searchesRun,
    searchErrors,
    matched,
    observationsWritten,
  });
}

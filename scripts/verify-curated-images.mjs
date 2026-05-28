#!/usr/bin/env node
/**
 * verify-curated-images.mjs
 *
 * Scans the source for hard-coded Unsplash image URLs in our curated
 * lists (BrowseCategories, EditorPicks, etc.) and HEAD-checks each
 * one. Exits non-zero if any URL returns anything other than 200, so
 * a broken curated photo can be caught BEFORE it ships to users.
 *
 * Run manually:   node scripts/verify-curated-images.mjs
 * Or via pnpm:    pnpm verify:images
 *
 * Even with the runtime <ProductImage> onError fallback, we still want
 * the curated set to be all-200 so users see the intended product
 * photo rather than a generic lucide glyph.
 */
import { readFile } from 'node:fs/promises';
import { glob } from 'node:fs/promises';

// Files that hold curated Unsplash URLs. Extend this list if more
// surfaces (alerts, dashboard, etc.) start hosting hard-coded photos.
const FILES = [
  'src/components/home/browse-categories.tsx',
  'src/components/home/editor-picks.tsx',
];

const URL_RE = /https:\/\/images\.unsplash\.com\/photo-[0-9a-f-]+(?:\?[^"'\s)]*)?/g;

async function collectUrls() {
  const found = new Set();
  for (const f of FILES) {
    try {
      const src = await readFile(f, 'utf8');
      const matches = src.match(URL_RE) ?? [];
      for (const m of matches) found.add(m.split('?')[0]); // drop query
    } catch (e) {
      console.warn(`  skip ${f}: ${e.message}`);
    }
  }
  return [...found];
}

async function head(url) {
  // GET with a tiny ?w=200 because Unsplash's bare HEAD can 405 on some
  // CDN nodes; a width-constrained GET is the canonical "is this asset
  // available" check.
  const probeUrl = `${url}?w=200`;
  try {
    const res = await fetch(probeUrl, { redirect: 'follow' });
    return res.status;
  } catch (e) {
    return `ERR ${e.message}`;
  }
}

const urls = await collectUrls();
if (urls.length === 0) {
  console.log('No Unsplash URLs found in scanned files. Nothing to check.');
  process.exit(0);
}

console.log(`Checking ${urls.length} curated image URL(s)…\n`);

let bad = 0;
const results = await Promise.all(
  urls.map(async (u) => ({ url: u, status: await head(u) })),
);
for (const r of results) {
  const ok = r.status === 200;
  if (!ok) bad++;
  const short = r.url.replace('https://images.unsplash.com/', '');
  console.log(`  ${ok ? '✓' : '✗'} ${r.status}  ${short}`);
}

if (bad > 0) {
  console.error(`\n${bad} URL(s) failed — replace before shipping.`);
  process.exit(1);
}
console.log('\nAll curated images verified.');

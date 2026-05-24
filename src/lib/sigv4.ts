/**
 * Minimal AWS Signature Version 4 signer used by the Amazon PA-API adapter.
 *
 * Reference: https://docs.aws.amazon.com/general/latest/gr/sigv4_signing.html
 *
 * Strictly Node — relies on `node:crypto`.
 */
import 'server-only';
import { createHash, createHmac } from 'node:crypto';

const ALGO = 'AWS4-HMAC-SHA256';

export interface SigV4Input {
  method: 'GET' | 'POST';
  host: string;
  path: string;
  /** Sorted by key when canonicalising; we don't currently send query string. */
  query?: Record<string, string>;
  headers: Record<string, string>;
  body: string;
  region: string;
  service: string;
  accessKey: string;
  secretKey: string;
  /** Defaults to "now" — pass for deterministic tests. */
  now?: Date;
}

function sha256Hex(s: string | Buffer): string {
  return createHash('sha256').update(s).digest('hex');
}

function hmac(key: Buffer | string, data: string): Buffer {
  return createHmac('sha256', key).update(data, 'utf8').digest();
}

function isoNoDelims(d: Date): { amzDate: string; dateStamp: string } {
  // amzDate = "YYYYMMDDTHHMMSSZ", dateStamp = "YYYYMMDD"
  const iso = d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
  return { amzDate: iso, dateStamp: iso.slice(0, 8) };
}

function canonicalQuery(q: Record<string, string> | undefined): string {
  if (!q) return '';
  return Object.keys(q)
    .sort()
    .map((k) => `${encodeURIComponent(k)}=${encodeURIComponent(q[k] ?? '')}`)
    .join('&');
}

function buildCanonical(
  input: SigV4Input,
  amzDate: string,
): { canonical: string; signedHeaders: string } {
  const lowerHeaders: Record<string, string> = {};
  for (const k of Object.keys(input.headers)) {
    lowerHeaders[k.toLowerCase()] = input.headers[k]!.trim().replace(/\s+/g, ' ');
  }
  lowerHeaders['host'] = input.host;
  lowerHeaders['x-amz-date'] = amzDate;

  const sortedKeys = Object.keys(lowerHeaders).sort();
  const canonicalHeaders = sortedKeys.map((k) => `${k}:${lowerHeaders[k]}\n`).join('');
  const signedHeaders = sortedKeys.join(';');

  const payloadHash = sha256Hex(input.body);

  const canonical = [
    input.method,
    input.path,
    canonicalQuery(input.query),
    canonicalHeaders,
    signedHeaders,
    payloadHash,
  ].join('\n');

  return { canonical, signedHeaders };
}

export interface SignedRequest {
  /** Headers to set when invoking fetch — includes Authorization and X-Amz-Date. */
  headers: Record<string, string>;
  amzDate: string;
}

export function sign(input: SigV4Input): SignedRequest {
  const now = input.now ?? new Date();
  const { amzDate, dateStamp } = isoNoDelims(now);

  const { canonical, signedHeaders } = buildCanonical(input, amzDate);

  const scope = `${dateStamp}/${input.region}/${input.service}/aws4_request`;
  const stringToSign = [ALGO, amzDate, scope, sha256Hex(canonical)].join('\n');

  const kDate = hmac('AWS4' + input.secretKey, dateStamp);
  const kRegion = hmac(kDate, input.region);
  const kService = hmac(kRegion, input.service);
  const kSigning = hmac(kService, 'aws4_request');
  const signature = createHmac('sha256', kSigning).update(stringToSign, 'utf8').digest('hex');

  const authorization =
    `${ALGO} Credential=${input.accessKey}/${scope}, ` +
    `SignedHeaders=${signedHeaders}, Signature=${signature}`;

  return {
    headers: { ...input.headers, 'X-Amz-Date': amzDate, Authorization: authorization },
    amzDate,
  };
}

import { describe, it, expect } from 'vitest';
import { findFirstUrl, isUrlOnly, containsUrl, urlHost } from '@/lib/extract/url';

describe('findFirstUrl', () => {
  it('returns a bare URL', () => {
    expect(findFirstUrl('https://www.tiktok.com/@x/video/123')).toBe(
      'https://www.tiktok.com/@x/video/123',
    );
  });

  it('extracts a URL embedded in caption text', () => {
    expect(findFirstUrl('이거 어디서 사? https://instagram.com/p/abc 대박')).toBe(
      'https://instagram.com/p/abc',
    );
  });

  it('trims trailing punctuation that clings to a pasted link', () => {
    expect(findFirstUrl('봐봐 (https://youtu.be/xYz).')).toBe('https://youtu.be/xYz');
    expect(findFirstUrl('here: https://example.com/a,')).toBe('https://example.com/a');
  });

  it('returns null when there is no URL', () => {
    expect(findFirstUrl('나이키 에어포스 흰색')).toBeNull();
    expect(findFirstUrl('')).toBeNull();
  });

  it('ignores non-http schemes', () => {
    expect(findFirstUrl('ftp://x.com/a mailto:y@z.com')).toBeNull();
  });
});

describe('isUrlOnly', () => {
  it('is true for a bare URL (with surrounding whitespace)', () => {
    expect(isUrlOnly('  https://x.com/p/1  ')).toBe(true);
  });

  it('is false when there is meaningful text alongside the URL', () => {
    expect(isUrlOnly('이거 사고싶어 https://x.com/p/1')).toBe(false);
  });

  it('is false for plain text', () => {
    expect(isUrlOnly('airpods pro')).toBe(false);
  });
});

describe('containsUrl', () => {
  it('detects a URL inside text', () => {
    expect(containsUrl('blah https://x.com blah')).toBe(true);
    expect(containsUrl('no link here')).toBe(false);
  });
});

describe('urlHost', () => {
  it('strips www and lowercases', () => {
    expect(urlHost('https://WWW.Instagram.com/p/abc')).toBe('instagram.com');
  });
  it('returns empty for invalid input', () => {
    expect(urlHost('not a url')).toBe('');
  });
});

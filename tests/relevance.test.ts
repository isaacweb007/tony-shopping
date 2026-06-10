import { describe, it, expect } from 'vitest';
import { relevanceScore, tokenize } from '@/lib/search/relevance';

describe('tokenize', () => {
  it('splits mixed Korean/English on punctuation + whitespace', () => {
    expect(tokenize('Apple AirPods Pro 2 (USB-C)')).toEqual(['apple', 'airpods', 'pro', '2', 'usb', 'c']);
  });
});

describe('relevanceScore', () => {
  it('scores a full-coverage title as highly similar (>=92)', () => {
    const s = relevanceScore('AirPods Pro 2 USB-C', 'Apple AirPods Pro 2 USB-C 정품');
    expect(s).toBeGreaterThanOrEqual(92);
  });

  it('matches despaced Korean titles (concatenated tokens)', () => {
    // Title has no spaces between tokens — substring match must still cover.
    const s = relevanceScore('갤럭시 버즈3 프로', '삼성갤럭시버즈3프로실버정품');
    expect(s).toBeGreaterThanOrEqual(92);
  });

  it('ranks an on-target title above an unrelated accessory', () => {
    const onTarget = relevanceScore('Sony WH-1000XM5', 'Sony WH-1000XM5 무선 헤드폰');
    const accessory = relevanceScore('Sony WH-1000XM5', '헤드폰 거치대 스탠드 우드');
    expect(onTarget).toBeGreaterThan(accessory);
  });

  it('never zeros out (returns a neutral floor for no overlap)', () => {
    expect(relevanceScore('airpods pro', '전혀 다른 상품')).toBeGreaterThanOrEqual(30);
  });

  it('returns neutral when the query is empty', () => {
    expect(relevanceScore('', 'anything')).toBe(70);
  });

  it('clamps into 30..99', () => {
    const s = relevanceScore('a b c', 'a b c');
    expect(s).toBeLessThanOrEqual(99);
    expect(s).toBeGreaterThanOrEqual(30);
  });
});

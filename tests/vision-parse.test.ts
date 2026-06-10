import { describe, it, expect } from 'vitest';
import { parseProductIdentity, clampWords } from '@/lib/vision-parse';

describe('parseProductIdentity', () => {
  it('parses a full structured identity, strict query as main', () => {
    const r = parseProductIdentity(
      JSON.stringify({
        brand: 'Apple',
        model: 'AirPods Pro 2',
        category: '무선 이어폰',
        queryStrict: 'Apple AirPods Pro 2 USB-C',
        queryLoose: '무선 이어폰 노이즈캔슬링',
        alternatives: ['에어팟 프로 2'],
      }),
    );
    expect(r).not.toBeNull();
    expect(r!.main).toBe('Apple AirPods Pro 2 USB-C');
    expect(r!.brand).toBe('Apple');
    expect(r!.model).toBe('AirPods Pro 2');
    // loose + remaining alts ride along as candidates (deduped, minus main)
    expect(r!.alternatives).toContain('무선 이어폰 노이즈캔슬링');
    expect(r!.alternatives).toContain('에어팟 프로 2');
    expect(r!.alternatives).not.toContain('Apple AirPods Pro 2 USB-C');
  });

  it('does NOT drop a model number past the 4th token (old bug)', () => {
    const r = parseProductIdentity(
      JSON.stringify({
        brand: 'Samsung',
        model: 'Galaxy Buds3 Pro',
        category: '무선 이어폰',
        queryStrict: '삼성 갤럭시 버즈3 프로 실버',
        queryLoose: '무선 이어폰',
        alternatives: [],
      }),
    );
    expect(r!.main).toBe('삼성 갤럭시 버즈3 프로 실버'); // all 5 tokens kept
  });

  it('falls back to loose when strict is missing', () => {
    const r = parseProductIdentity(
      JSON.stringify({
        brand: null,
        model: null,
        category: '스노클링 마스크',
        queryStrict: null,
        queryLoose: '스노클링 마스크 세트',
        alternatives: ['다이빙 마스크'],
      }),
    );
    expect(r!.main).toBe('스노클링 마스크 세트');
    expect(r!.brand).toBeUndefined();
  });

  it('tolerates markdown code fences around the JSON', () => {
    const r = parseProductIdentity('```json\n{"queryStrict":"Sony WH-1000XM5","alternatives":[]}\n```');
    expect(r!.main).toBe('Sony WH-1000XM5');
  });

  it('returns null on a refusal / empty product', () => {
    expect(
      parseProductIdentity(
        JSON.stringify({ brand: null, model: null, category: null, queryStrict: null, queryLoose: null, alternatives: [] }),
      ),
    ).toBeNull();
  });

  it('returns null on non-JSON', () => {
    expect(parseProductIdentity('이 사진에는 상품이 잘 안 보여요')).toBeNull();
  });
});

describe('clampWords', () => {
  it('keeps queries up to 8 tokens intact', () => {
    expect(clampWords('one two three four five six')).toBe('one two three four five six');
  });
  it('caps a runaway query at 8 tokens', () => {
    expect(clampWords('a b c d e f g h i j', 8)).toBe('a b c d e f g h');
  });
});

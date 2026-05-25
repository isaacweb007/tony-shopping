import { describe, it, expect } from 'vitest';
import { heuristicFromFilename } from '@/lib/vision-heuristic';

describe('heuristicFromFilename', () => {
  describe('keeps real product slugs', () => {
    it('hyphenated merchant slug', () => {
      expect(heuristicFromFilename('airpods-pro-2-usbc-overview.png')).toBe(
        'airpods pro 2 usbc overview',
      );
    });

    it('mixed dashes and spaces in retail filename', () => {
      expect(heuristicFromFilename('LG-OLED-evo-G4-65inch-2024-model.jpg')).toBe(
        'LG OLED evo G4 65inch 2024 model',
      );
    });

    it('underscore-separated slug', () => {
      expect(heuristicFromFilename('sony_wh_1000xm5_headphones.jpg')).toBe(
        'sony wh 1000xm5 headphones',
      );
    });

    it('camelCase product code', () => {
      // The regex only catches lowercase→uppercase transitions — uppercase
      // runs like "WHHeadphones" stay glued. Documented limitation.
      expect(heuristicFromFilename('SonyWHHeadphones.jpg')).toBe('Sony WHHeadphones');
    });
  });

  describe('drops camera / screenshot noise', () => {
    it('Android IMG_<timestamp>', () => {
      expect(heuristicFromFilename('IMG_20240812_143120.jpg')).toBe('');
    });

    it('IMG with spaces', () => {
      expect(heuristicFromFilename('IMG 20240812 143120.jpg')).toBe('');
    });

    it('Sony DSC pattern', () => {
      expect(heuristicFromFilename('DSC_0489.jpg')).toBe('');
    });

    it('Pixel PXL prefix', () => {
      expect(heuristicFromFilename('PXL_20231101_120000.jpg')).toBe('');
    });

    it('macOS Screenshot with spaces', () => {
      expect(heuristicFromFilename('Screenshot 2024-08-12 14.31.20.png')).toBe('');
    });

    it('Korean 스크린샷', () => {
      expect(heuristicFromFilename('스크린샷 2024-08-12 오후 2.31.20.png')).toBe('');
    });
  });

  describe('edge cases', () => {
    it('returns empty for tiny names', () => {
      expect(heuristicFromFilename('ok.jpg')).toBe('');
    });

    it('returns empty for digits only', () => {
      expect(heuristicFromFilename('20240812.jpg')).toBe('');
    });

    it('trims long stems to 80 chars', () => {
      const long = 'a-' + 'b'.repeat(200) + '.jpg';
      const out = heuristicFromFilename(long);
      expect(out.length).toBeLessThanOrEqual(80);
    });

    it('drops the file extension', () => {
      expect(heuristicFromFilename('clean-name.PNG')).toBe('clean name');
    });
  });
});

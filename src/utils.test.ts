import { describe, it, expect } from 'vitest';
import {
  toEnglishDigits,
  toPersianDigits,
  normalizePersianString,
  getSafeImageUrl,
  convertGregorianToShamsi,
  convertShamsiToGregorian,
  getTodayShamsi,
} from './utils';

describe('toEnglishDigits', () => {
  it('converts Persian digits to English', () => {
    expect(toEnglishDigits('۱۲۳۴۵')).toBe('12345');
  });

  it('converts Arabic digits to English', () => {
    expect(toEnglishDigits('١٢٣')).toBe('123');
  });

  it('returns empty string for empty input', () => {
    expect(toEnglishDigits('')).toBe('');
  });

  it('leaves English digits unchanged', () => {
    expect(toEnglishDigits('abc123')).toBe('abc123');
  });

  it('handles mixed content', () => {
    expect(toEnglishDigits('Score: ۲-۱')).toBe('Score: 2-1');
  });
});

describe('toPersianDigits', () => {
  it('converts number to Persian digits', () => {
    expect(toPersianDigits(123)).toBe('۱۲۳');
  });

  it('converts string number to Persian digits', () => {
    expect(toPersianDigits('456')).toBe('۴۵۶');
  });

  it('handles zero', () => {
    expect(toPersianDigits(0)).toBe('۰');
  });
});

describe('normalizePersianString', () => {
  it('returns empty string for falsy input', () => {
    expect(normalizePersianString('')).toBe('');
    expect(normalizePersianString(null as any)).toBe('');
    expect(normalizePersianString(undefined as any)).toBe('');
  });

  it('trims whitespace', () => {
    expect(normalizePersianString('  hello  ')).toBe('hello');
  });

  it('replaces Arabic Ye with Persian Ye', () => {
    expect(normalizePersianString('مسي')).toBe('مسی');
  });

  it('replaces Arabic Ke with Persian Ke', () => {
    expect(normalizePersianString('كريم')).toBe('کریم');
  });

  it('converts Persian digits to English', () => {
    expect(normalizePersianString('۱۲۳')).toBe('123');
  });

  it('lowercases the string', () => {
    expect(normalizePersianString('Hello')).toBe('hello');
  });

  it('removes zero-width spaces', () => {
    expect(normalizePersianString('he\u200Bllo')).toBe('hello');
  });

  it('normalizes multiple spaces to single space', () => {
    expect(normalizePersianString('hello   world')).toBe('hello world');
  });
});

describe('getSafeImageUrl', () => {
  it('returns fallback for empty URL', () => {
    const result = getSafeImageUrl('');
    expect(result).toContain('unsplash');
  });

  it('returns relative URL as-is', () => {
    expect(getSafeImageUrl('/uploads/photo.jpg')).toBe('/uploads/photo.jpg');
  });

  it('proxies Varzesh3 images', () => {
    const result = getSafeImageUrl('https://www.varzesh3.com/image.jpg');
    expect(result).toContain('/api/image-proxy?url=');
  });

  it('returns external URLs as-is', () => {
    const url = 'https://example.com/photo.jpg';
    expect(getSafeImageUrl(url)).toBe(url);
  });
});

describe('convertGregorianToShamsi', () => {
  it('converts a known Gregorian date to Shamsi', () => {
    const result = convertGregorianToShamsi('2024-03-20');
    expect(result).toBeTruthy();
    expect(typeof result).toBe('string');
  });

  it('returns original for empty input', () => {
    expect(convertGregorianToShamsi('')).toBe('');
  });

  it('returns original for invalid format', () => {
    expect(convertGregorianToShamsi('not-a-date')).toBe('not-a-date');
  });
});

describe('convertShamsiToGregorian', () => {
  it('converts a known Shamsi date to Gregorian', () => {
    const result = convertShamsiToGregorian('1403-01-01');
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('returns original for empty input', () => {
    expect(convertShamsiToGregorian('')).toBe('');
  });
});

describe('getTodayShamsi', () => {
  it('returns a non-empty string', () => {
    const result = getTodayShamsi();
    expect(result).toBeTruthy();
    expect(typeof result).toBe('string');
  });
});

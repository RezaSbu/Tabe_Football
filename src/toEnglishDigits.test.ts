import { describe, it, expect } from 'vitest';
import { toEnglishDigits } from './utils';

describe('toEnglishDigits Edge Cases', () => {
  it('converts mixed Persian and Arabic-Indic digits', () => {
    const mixed = '۱۲۳۴۵٦٧٨٩'; // Persian 1-9 then Arabic-Indic 6-9
    expect(toEnglishDigits(mixed)).toBe('123456789');
  });
  it('keeps punctuation and whitespace unchanged', () => {
    const text = 'عدد: ۱۲۳، test ٤٥٦, 789!';
    expect(toEnglishDigits(text)).toBe('عدد: 123، test 456, 789!');
  });
  it('returns same string when there are no digits', () => {
    expect(toEnglishDigits('hello world')).toBe('hello world');
  });
});
export function toPersianDigits(num: number | string): string {
  const numStr = String(num);
  const persianDigits = ["۰", "۱", "۲", "۳", "۴", "۵", "۶", "۷", "۸", "۹"];
  return numStr.replace(/[0-9]/g, (w) => persianDigits[parseInt(w, 10)]);
}

export function normalizePersianString(str: string): string {
  if (!str) return "";
  return String(str)
    .trim()
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .replace(/[\s\t]+/g, " ")
    .replace(/‏/g, "")
    .replace(/ي/g, "ی")
    .replace(/ك/g, "ک")
    .replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d)))
    .replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)))
    .toLowerCase();
}

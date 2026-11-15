import { describe, it, expect } from "vitest";
import {
  looksLikeRichText,
  sanitizeInlineRichText,
  sanitizeNewsFields,
  sanitizeRichText,
  toPlainText,
} from "../richText";

// News bodies now accept a tiny HTML subset (bold/italic/underline/colour).
// The renderer must never let anything else through.

describe("looksLikeRichText", () => {
  it("detects formatting tags", () => {
    expect(looksLikeRichText("<b>گل</b>")).toBe(true);
    expect(looksLikeRichText('متن <span style="color:red">قرمز</span>')).toBe(true);
    expect(looksLikeRichText("خط اول<br>خط دوم")).toBe(true);
  });

  it("treats plain text (and angle-bracket-free strings) as plain", () => {
    expect(looksLikeRichText("گل دقیقه ۹۰")).toBe(false);
    expect(looksLikeRichText("۱ < ۲")).toBe(false);
    expect(looksLikeRichText("")).toBe(false);
    expect(looksLikeRichText(null)).toBe(false);
  });
});

describe("sanitizeRichText", () => {
  it("keeps whitelisted formatting", () => {
    expect(sanitizeRichText("<b>پررنگ</b> و <i>کج</i>")).toBe("<b>پررنگ</b> و <i>کج</i>");
    expect(sanitizeRichText("<p>پاراگراف</p>")).toBe("<p>پاراگراف</p>");
    expect(sanitizeRichText("خط اول<br>خط دوم")).toBe("خط اول<br>خط دوم");
  });

  it("keeps only whitelisted inline styles", () => {
    expect(sanitizeRichText('<span style="color: #ff0000">قرمز</span>')).toBe(
      '<span style="color:#ff0000">قرمز</span>'
    );
    expect(sanitizeRichText('<span style="color:rgb(255, 0, 0);font-weight:bold">قرمز</span>')).toBe(
      '<span style="color:rgb(255, 0, 0);font-weight:bold">قرمز</span>'
    );
    expect(sanitizeRichText('<span style="position:fixed;color:red">x</span>')).toBe(
      '<span style="color:red">x</span>'
    );
    expect(sanitizeRichText('<span style="background:url(javascript:alert(1))">x</span>')).toBe("<span>x</span>");
  });

  it("removes script/style blocks entirely", () => {
    expect(sanitizeRichText('سلام<script>alert("x")</script>دنیا')).toBe("سلامدنیا");
    expect(sanitizeRichText("<style>body{display:none}</style>متن")).toBe("متن");
    expect(sanitizeRichText('<iframe src="https://evil"></iframe>متن')).toBe("متن");
  });

  it("strips event handlers and every non-style attribute", () => {
    expect(sanitizeRichText('<b onclick="alert(1)">x</b>')).toBe("<b>x</b>");
    expect(sanitizeRichText('<a href="javascript:alert(1)">لینک</a>')).toBe("لینک");
    expect(sanitizeRichText('<img src=x onerror="alert(1)">')).toBe("");
    expect(sanitizeRichText('<span data-x="1" style="color:blue">x</span>')).toBe('<span style="color:blue">x</span>');
  });

  it("keeps stray angle brackets in plain text instead of escaping them", () => {
    // Legacy bodies are rendered as text nodes; escaping here would show
    // a literal "&lt;" to readers.
    expect(sanitizeRichText("۱ < ۲ و ۳ > ۲")).toBe("۱ < ۲ و ۳ > ۲");
    expect(sanitizeRichText("متن <b>بدون بسته")).toBe("متن <b>بدون بسته");
    expect(sanitizeRichText("</b></i>")).toBe("</b></i>");
  });

  it("still removes executable blocks from plain text", () => {
    expect(sanitizeRichText('سلام<script>alert("x")</script>دنیا')).toBe("سلامدنیا");
  });

  it("closes self-closing formatting tags so they cannot swallow the rest", () => {
    expect(sanitizeRichText("قبل <b/> بعد")).toBe("قبل <b></b> بعد");
  });

  it("is idempotent", () => {
    const once = sanitizeRichText('<p>متن <span style="color:#0f0">سبز</span><script>x</script></p>');
    expect(sanitizeRichText(once)).toBe(once);
  });

  it("passes plain Persian text through unchanged", () => {
    const text = "پرسپولیس در دقیقه ۹۰ به گل رسید.\n\nبازی جذاب بود.";
    expect(sanitizeRichText(text)).toBe(text);
  });
});

describe("sanitizeInlineRichText", () => {
  it("keeps inline formatting in a title/summary", () => {
    expect(sanitizeInlineRichText("پیروزی <b>پرسپولیس</b> برابر <i>استقلال</i>")).toBe(
      "پیروزی <b>پرسپولیس</b> برابر <i>استقلال</i>"
    );
    expect(sanitizeInlineRichText('گل <span style="color:#ef4444">قرمز</span>')).toBe(
      'گل <span style="color:#ef4444">قرمز</span>'
    );
  });

  it("flattens block markup and line breaks to spaces", () => {
    expect(sanitizeInlineRichText("<p>خط اول</p><p>خط دوم</p>")).toBe("خط اول خط دوم");
    expect(sanitizeInlineRichText("خط اول<br>خط دوم")).toBe("خط اول خط دوم");
    expect(sanitizeInlineRichText("<div>الف</div>\n<div>ب</div>")).toBe("الف ب");
  });

  it("drops executable markup but keeps the text", () => {
    expect(sanitizeInlineRichText('<b onclick="alert(1)">خبر</b><script>alert(1)</script>')).toBe("<b>خبر</b>");
  });

  it("leaves plain title/summary byte-identical", () => {
    const plain = "پرسپولیس ۲ < ۳ استقلال";
    expect(sanitizeInlineRichText(plain)).toBe(plain);
    expect(sanitizeInlineRichText("")).toBe("");
  });
});

describe("toPlainText", () => {
  it("strips formatting while keeping the visible words", () => {
    expect(toPlainText("<b>پرسپولیس</b> برد")).toBe("پرسپولیس برد");
    expect(toPlainText('<p>خط اول</p><p><span style="color:red">خط دوم</span></p>')).toBe("خط اول خط دوم");
    expect(toPlainText("خط اول<br>خط دوم")).toBe("خط اول خط دوم");
  });

  it("decodes entities produced by the sanitizer", () => {
    expect(toPlainText("<b>۱ &lt; ۲</b>")).toBe("۱ < ۲");
    expect(toPlainText("<b>AT&amp;T</b>")).toBe("AT&T");
  });

  it("returns legacy plain text untouched", () => {
    const plain = "پرسپولیس ۲ < ۳ استقلال\n\nبازی جذاب بود.";
    expect(toPlainText(plain)).toBe(plain);
    expect(toPlainText(null)).toBe("");
  });
});

describe("sanitizeNewsFields", () => {
  it("sanitizes title, summary, content and both read-more bodies", () => {
    const clean = sanitizeNewsFields({
      title: 'عنوان <b onclick="x()">خبر</b><script>0</script>',
      summary: "<p>خلاصه <i>کج</i></p><script>0</script>",
      content: '<b onclick="x()">متن</b><script>1</script>',
      read_more: { content: "<i>ادامه</i><script>2</script>", content2: "<u>پایان</u>", images: ["a.jpg"] },
    });
    expect(clean.title).toBe("عنوان <b>خبر</b>");
    expect(clean.summary).toBe("خلاصه <i>کج</i>");
    expect(clean.content).toBe("<b>متن</b>");
    expect(clean.read_more.content).toBe("<i>ادامه</i>");
    expect(clean.read_more.content2).toBe("<u>پایان</u>");
    expect(clean.read_more.images).toEqual(["a.jpg"]);
  });

  it("leaves legacy plain title and summary byte-identical", () => {
    const clean = sanitizeNewsFields({ title: "a < b", summary: "۱ < ۲", content: "متن" });
    expect(clean.title).toBe("a < b");
    expect(clean.summary).toBe("۱ < ۲");
    expect(clean.content).toBe("متن");
  });

  it("leaves a legacy plain body byte-identical", () => {
    const legacy = "پرسپولیس ۲ < ۳ استقلال\n\nبازی در دقیقه ۹۰ تمام شد.";
    expect(sanitizeNewsFields({ content: legacy }).content).toBe(legacy);
  });

  it("tolerates missing read_more", () => {
    expect((sanitizeNewsFields({ content: "x" }) as any).read_more).toBeUndefined();
  });
});

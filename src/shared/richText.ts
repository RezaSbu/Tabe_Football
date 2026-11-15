/**
 * Rich text for news bodies.
 *
 * Editors asked for bold + colour inside the admin news editor. That means the
 * `news.content` column now holds a small HTML subset instead of plain text —
 * so BOTH sides need a guard:
 *  - the admin editor produces the subset below;
 *  - the public pages render only that subset (never the raw string), because
 *    anything reaching the API must not be able to inject script into an
 *    article page.
 *
 * This is a deliberately small string-based sanitizer (no DOM dependency, so it
 * also runs on the server and in tests). It keeps a whitelist of formatting
 * tags plus a whitelist of inline style properties, drops every attribute
 * (including all on* handlers and any href), and keeps text that has no markup
 * at all byte-for-byte — legacy plain bodies must never gain entities such as
 * `&lt;` that would then show up literally on the article page.
 */
export const RICH_TEXT_TAGS = [
  "b",
  "strong",
  "i",
  "em",
  "u",
  "s",
  "mark",
  "br",
  "p",
  "div",
  "span",
  "blockquote",
  "ul",
  "ol",
  "li",
] as const;

const ALLOWED_TAGS = new Set<string>(RICH_TEXT_TAGS);

const ALLOWED_STYLE_PROPS = new Set([
  "color",
  "background-color",
  "font-weight",
  "font-style",
  "text-decoration",
  "text-decoration-line",
  "text-align",
]);

// Whole subtrees whose *content* must disappear, not just the tag.
const DANGEROUS_BLOCK =
  /<\s*(script|style|iframe|object|embed|template|noscript|svg|math)[^>]*>[\s\S]*?<\s*\/\s*\1\s*>/gi;
const DANGEROUS_TAG = /<\s*\/?\s*(script|style|iframe|object|embed|template|noscript|svg|math)[^>]*>/gi;
const HTML_COMMENT = /<!--[\s\S]*?-->/g;
// Any tag-like markup at all (`<b>`, `</i>`, `<a href=…>`, `<script>`), which
// decides whether the string needs the tag whitelist or is simply text. The
// trailing `>` matters: a title like «A < B» is plain text, not an unclosed tag.
const ANY_MARKUP = /<\s*\/?\s*[a-zA-Z][^>]*>/;
const TAG = /<\s*(\/?)\s*([a-zA-Z][a-zA-Z0-9-]*)((?:"[^"]*"|'[^']*'|[^>"'])*)>/g;
const RICH_TEXT_MARKER = new RegExp(`<\\s*(?:${RICH_TEXT_TAGS.join("|")})\\b[^>]*>`, "i");

/** True when the stored string contains formatting markup rather than plain text. */
export function looksLikeRichText(value: unknown): boolean {
  const text = typeof value === "string" ? value : "";
  return text.length > 0 && RICH_TEXT_MARKER.test(text);
}

function escapeText(value: string): string {
  return value.replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function sanitizeStyle(rawStyle: string): string {
  const declarations: string[] = [];
  for (const chunk of String(rawStyle || "").split(";")) {
    const separator = chunk.indexOf(":");
    if (separator < 0) continue;
    const prop = chunk.slice(0, separator).trim().toLowerCase();
    const value = chunk.slice(separator + 1).trim();
    if (!ALLOWED_STYLE_PROPS.has(prop) || !value) continue;
    // No url()/expression()/@import, no quotes, no markup.
    if (/url\s*\(|expression|@import|javascript:|[<>"']/i.test(value)) continue;
    if (!/^[#\w\s(),.%+-]+$/.test(value)) continue;
    declarations.push(`${prop}:${value}`);
  }
  return declarations.join(";");
}

function attributeValue(attrs: string, name: string): string {
  const match = new RegExp(`\\b${name}\\s*=\\s*("([^"]*)"|'([^']*)')`, "i").exec(attrs);
  if (!match) return "";
  return match[2] ?? match[3] ?? "";
}

/**
 * Returns safe HTML containing only the whitelisted tags/styles.
 *
 * Plain text is returned byte-for-byte (minus any executable block): the
 * renderer puts it in a text node, so escaping `<`/`>` here would turn a legacy
 * body like «۱ < ۲» into a visible `&lt;`. Only strings that the renderer will
 * actually treat as markup go through the tag whitelist.
 */
export function sanitizeRichText(input: unknown): string {
  let text = typeof input === "string" ? input : "";
  if (!text) return "";

  if (!ANY_MARKUP.test(text)) {
    return text.replace(HTML_COMMENT, "");
  }

  text = text.replace(HTML_COMMENT, "");
  text = text.replace(DANGEROUS_BLOCK, "");
  text = text.replace(DANGEROUS_TAG, "");

  let output = "";
  let cursor = 0;
  let match: RegExpExecArray | null;
  TAG.lastIndex = 0;
  while ((match = TAG.exec(text)) !== null) {
    output += escapeText(text.slice(cursor, match.index));
    cursor = match.index + match[0].length;

    const closing = match[1] === "/";
    const name = match[2].toLowerCase();
    const attrs = match[3] || "";
    if (!ALLOWED_TAGS.has(name)) continue; // drop the tag, keep the text around it

    if (name === "br") {
      if (!closing) output += "<br>";
      continue;
    }
    if (closing) {
      output += `</${name}>`;
      continue;
    }

    const style = name === "span" || name === "p" || name === "div" ? sanitizeStyle(attributeValue(attrs, "style")) : "";
    const selfClosing = /\/\s*$/.test(attrs);
    output += `<${name}${style ? ` style="${style}"` : ""}>`;
    // A stray self-closing formatting tag (<b />) would swallow the rest of the
    // article; close it immediately.
    if (selfClosing) output += `</${name}>`;
  }
  output += escapeText(text.slice(cursor));
  return output.trim();
}

// Block-level markup has no meaning in a single-line title/summary, so it is
// flattened to spaces when those fields are sanitized.
const INLINE_BLOCK_TAGS = /<\s*\/?\s*(?:p|div|blockquote|ul|ol|li)\b[^>]*>/gi;
const LINE_BREAK = /<\s*br\s*\/?>/gi;
const ALL_TAGS = /<[^>]*>/g;

/**
 * Sanitizer for the single-line rich fields (`title`, `summary`).
 *
 * Same whitelist as bodies, but every block tag and `<br>` becomes a space: a
 * heading/lead must stay one paragraph even when the editor used Enter. Plain
 * text (no markup) is returned byte-for-byte for the same reason as
 * `sanitizeRichText()`.
 */
export function sanitizeInlineRichText(input: unknown): string {
  const clean = sanitizeRichText(input);
  if (!ANY_MARKUP.test(clean)) return clean;
  return clean
    .replace(LINE_BREAK, " ")
    .replace(INLINE_BLOCK_TAGS, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function decodeEntities(value: string): string {
  return value
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    // Last, so a literal "&amp;lt;" stays "&lt;" instead of becoming "<".
    .replace(/&amp;/g, "&");
}

/**
 * Visible text of a rich field: markup stripped, entities decoded, whitespace
 * collapsed. Used for SEO/meta/JSON-LD, image `alt`, sharing, search haystacks
 * and compact admin previews — never for the rendered article itself.
 *
 * Strings without markup are returned untouched so a legacy plain title still
 * matches exactly what the page shows.
 */
export function toPlainText(input: unknown): string {
  const text = typeof input === "string" ? input : "";
  if (!text) return "";
  if (!ANY_MARKUP.test(text)) return text;
  const stripped = sanitizeRichText(text)
    .replace(LINE_BREAK, " ")
    .replace(ALL_TAGS, " ");
  return decodeEntities(stripped).replace(/\s+/g, " ").trim();
}

/**
 * Applies the sanitizer to every rich-text field of a news payload: title,
 * summary, body and both read-more bodies. Title/summary use the inline variant
 * (formatting is allowed, block structure is flattened).
 */
export function sanitizeNewsFields<T extends Record<string, any>>(payload: T): T {
  const output: Record<string, any> = { ...payload };
  if (typeof output.title === "string") output.title = sanitizeInlineRichText(output.title);
  if (typeof output.summary === "string") output.summary = sanitizeInlineRichText(output.summary);
  if (typeof output.content === "string") output.content = sanitizeRichText(output.content);
  if (output.read_more && typeof output.read_more === "object" && !Array.isArray(output.read_more)) {
    const readMore = { ...output.read_more };
    if (typeof readMore.content === "string") readMore.content = sanitizeRichText(readMore.content);
    if (typeof readMore.content2 === "string") readMore.content2 = sanitizeRichText(readMore.content2);
    output.read_more = readMore;
  }
  return output as T;
}

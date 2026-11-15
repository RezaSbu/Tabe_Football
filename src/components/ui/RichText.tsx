import React from "react";
import { looksLikeRichText, sanitizeInlineRichText, sanitizeRichText } from "../../shared/richText";

/**
 * Renders a news field that may be plain text (legacy articles) or the small
 * formatting subset produced by the admin rich-text editor.
 *
 * Old bodies keep their exact line breaks via `whitespace-pre-line`; new bodies
 * are sanitized before hitting the DOM, so even a compromised admin token
 * cannot inject script into a public article page.
 *
 * `inline` renders a single-line field (title/summary) as a `<span>`: block
 * markup is flattened so a heading never grows a paragraph.
 */
interface RichTextProps {
  text?: string | null;
  className?: string;
  inline?: boolean;
}

export default function RichText({ text, className = "", inline = false }: RichTextProps) {
  const value = typeof text === "string" ? text : "";
  if (!looksLikeRichText(value)) {
    return inline ? (
      <span className={className}>{value}</span>
    ) : (
      <p className={`whitespace-pre-line ${className}`}>{value}</p>
    );
  }
  return inline ? (
    <span
      className={`rich-text ${className}`}
      dangerouslySetInnerHTML={{ __html: sanitizeInlineRichText(value) }}
    />
  ) : (
    <div
      className={`rich-text ${className}`}
      dangerouslySetInnerHTML={{ __html: sanitizeRichText(value) }}
    />
  );
}

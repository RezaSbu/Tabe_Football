import React, { useEffect, useRef, useState } from "react";
import { Bold, Italic, Underline, Palette, RemoveFormatting, Check } from "lucide-react";
import { sanitizeInlineRichText, sanitizeRichText } from "../../shared/richText";

/**
 * Small rich-text editor for news bodies: bold, italic, underline and text
 * colour. It is intentionally not a full WYSIWYG — the stored subset is the
 * same one `sanitizeRichText()` accepts, and every value that leaves this
 * component is sanitized so the textarea never round-trips junk into the DB.
 *
 * `inline` turns it into a single-line field for the title/summary: Enter is
 * swallowed and the value goes through `sanitizeInlineRichText()` instead.
 *
 * Uses execCommand: deprecated but universally supported, zero dependencies,
 * and it produces exactly the `<b>/<i>/<u>/<span style="color:…">` markup the
 * public renderer allows.
 */
interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  minHeight?: number;
  required?: boolean;
  label?: string;
  hint?: string;
  inline?: boolean;
}

const COLORS = [
  { name: "مشکی", value: "#f8fafc" },
  { name: "قرمز", value: "#ef4444" },
  { name: "سبز", value: "#10b981" },
  { name: "آبی", value: "#38bdf8" },
  { name: "زرد", value: "#f59e0b" },
  { name: "خاکستری", value: "#94a3b8" },
];

export default function RichTextEditor({
  value,
  onChange,
  placeholder = "متن خبر را وارد کنید...",
  minHeight = 140,
  required = false,
  label,
  hint,
  inline = false,
}: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  // null = not initialised yet, so the first effect paints the incoming value
  // (opening an existing article) instead of skipping as "already emitted".
  const lastEmitted = useRef<string | null>(null);
  const [showColors, setShowColors] = useState(false);

  // Keep the DOM in sync with external value changes (opening another news
  // item, resetting the form) without stomping the caret while typing.
  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;
    const incoming = value || "";
    if (lastEmitted.current !== null && incoming === lastEmitted.current) return;
    if (editor.innerHTML !== incoming) editor.innerHTML = incoming;
    lastEmitted.current = incoming;
  }, [value]);

  const emit = () => {
    const editor = editorRef.current;
    if (!editor) return;
    const isEmpty = !editor.textContent?.trim() && !editor.querySelector("img");
    const html = isEmpty ? "" : inline ? sanitizeInlineRichText(editor.innerHTML) : sanitizeRichText(editor.innerHTML);
    lastEmitted.current = html;
    onChange(html);
  };

  const run = (command: string, commandValue?: string) => {
    const editor = editorRef.current;
    if (!editor) return;
    editor.focus();
    // Inline styles (not <font>) so the sanitizer's style whitelist applies.
    document.execCommand("styleWithCSS", false, "true");
    document.execCommand(command, false, commandValue);
    emit();
  };

  const handlePaste = (event: React.ClipboardEvent<HTMLDivElement>) => {
    // Paste as plain text: copied web markup must never enter the article.
    event.preventDefault();
    const raw = event.clipboardData.getData("text/plain");
    document.execCommand("insertText", false, inline ? raw.replace(/\s*[\r\n]+\s*/g, " ") : raw);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    // A title/summary is one line: Enter must not create a second paragraph.
    if (inline && event.key === "Enter") event.preventDefault();
  };

  const toolbarButton = "flex h-7 w-7 items-center justify-center rounded-md border border-white/5 text-slate-300 hover:text-white hover:bg-white/10 transition cursor-pointer";
  const editorId = React.useId();

  return (
    <div className="space-y-1">
      {label && (
        <label htmlFor={editorId} className="block text-[10px] text-gray-500 mb-1">
          {label}
        </label>
      )}
      <div className="rounded-lg border border-white/5 bg-black overflow-hidden focus-within:border-emerald-500/40 transition">
        <div
          role="toolbar"
          aria-label="ابزار قالب‌بندی متن"
          className="flex flex-wrap items-center gap-1 border-b border-white/5 bg-[#0d0d10] px-2 py-1.5"
        >
          <button
            type="button"
            title="پررنگ (Ctrl+B)"
            aria-label="پررنگ"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => run("bold")}
            className={toolbarButton}
          >
            <Bold className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            title="کج (Ctrl+I)"
            aria-label="کج"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => run("italic")}
            className={toolbarButton}
          >
            <Italic className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            title="زیرخط (Ctrl+U)"
            aria-label="زیرخط"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => run("underline")}
            className={toolbarButton}
          >
            <Underline className="h-3.5 w-3.5" />
          </button>

          <span className="mx-1 h-4 w-px bg-white/10" aria-hidden="true" />

          <div className="relative">
            <button
              type="button"
              title="رنگ متن"
              aria-label="رنگ متن"
              aria-expanded={showColors}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => setShowColors((v) => !v)}
              className={toolbarButton}
            >
              <Palette className="h-3.5 w-3.5" />
            </button>
            {showColors && (
              <div className="absolute z-20 top-8 right-0 flex items-center gap-1.5 rounded-lg border border-white/10 bg-[#0d0d10] p-2 shadow-xl">
                {COLORS.map((color) => (
                  <button
                    key={color.value}
                    type="button"
                    title={color.name}
                    aria-label={color.name}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => {
                      run("foreColor", color.value);
                      setShowColors(false);
                    }}
                    className="h-5 w-5 rounded-full border border-white/20 cursor-pointer hover:scale-110 transition"
                    style={{ backgroundColor: color.value }}
                  />
                ))}
              </div>
            )}
          </div>

          <button
            type="button"
            title="حذف قالب‌بندی"
            aria-label="حذف قالب‌بندی"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => run("removeFormat")}
            className={toolbarButton}
          >
            <RemoveFormatting className="h-3.5 w-3.5" />
          </button>

          <span className="mr-auto flex items-center gap-1 text-[9px] font-bold text-slate-500">
            <Check className="h-3 w-3 text-emerald-500" />
            {inline ? "پررنگ، کج، زیرخط و رنگ" : "پررنگ، کج و رنگ متن"}
          </span>
        </div>

        <div
          id={editorId}
          ref={editorRef}
          role="textbox"
          aria-multiline={!inline}
          aria-required={required}
          contentEditable
          dir="rtl"
          suppressContentEditableWarning
          onInput={emit}
          onBlur={emit}
          onPaste={handlePaste}
          onKeyDown={handleKeyDown}
          data-placeholder={placeholder}
          className={`rich-text-editor w-full px-2.5 py-2 text-xs leading-7 text-white outline-none overflow-y-auto ${inline ? "whitespace-pre-wrap" : ""}`}
          style={{ minHeight: inline ? Math.min(minHeight, 44) : minHeight }}
        />
      </div>
      {hint && <p className="text-[10px] text-gray-600 leading-relaxed">{hint}</p>}
    </div>
  );
}

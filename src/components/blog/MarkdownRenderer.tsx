"use client";

import React, { useState } from "react";
import Link from "next/link";

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

export default function MarkdownRenderer({ content, className = "" }: MarkdownRendererProps) {
  if (!content || !content.trim()) {
    return null;
  }

  const blocks = parseMarkdownBlocks(content);

  return (
    <div className={`prose-container space-y-6 text-slate-800 leading-relaxed ${className}`}>
      {blocks.map((block, index) => renderBlock(block, index))}
    </div>
  );
}

// ==================== AST / BLOCK TYPES ====================

type BlockType =
  | { type: "heading"; level: number; text: string; id: string }
  | { type: "image"; src: string; alt: string; title?: string }
  | { type: "table"; headers: string[]; alignments: ("left" | "center" | "right")[]; rows: string[][] }
  | { type: "alert"; variant: "NOTE" | "TIP" | "IMPORTANT" | "WARNING" | "CAUTION"; text: string }
  | { type: "blockquote"; text: string }
  | { type: "code"; lang: string; code: string }
  | { type: "ul"; items: string[] }
  | { type: "ol"; items: string[] }
  | { type: "hr" }
  | { type: "paragraph"; text: string };

// ==================== BLOCK PARSER ====================

function parseMarkdownBlocks(markdown: string): BlockType[] {
  const blocks: BlockType[] = [];
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    // 1. Skip empty lines
    if (!trimmed) {
      i++;
      continue;
    }

    // 2. Fenced Code Block (```lang)
    if (trimmed.startsWith("```")) {
      const lang = trimmed.slice(3).trim();
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith("```")) {
        codeLines.push(lines[i]);
        i++;
      }
      i++; // Skip closing ```
      blocks.push({
        type: "code",
        lang: lang || "text",
        code: codeLines.join("\n"),
      });
      continue;
    }

    // 3. Headings (# to ######)
    const headingMatch = trimmed.match(/^(#{1,6})\s+(.+)$/);
    if (headingMatch) {
      const level = headingMatch[1].length;
      const text = headingMatch[2].trim();
      const id = text.toLowerCase().replace(/[^\w\s-]/g, "").replace(/\s+/g, "-");
      blocks.push({ type: "heading", level, text, id });
      i++;
      continue;
    }

    // 4. Horizontal Rule (---, ***, ___)
    if (/^(\*{3,}|-{3,}|_{3,})$/.test(trimmed)) {
      blocks.push({ type: "hr" });
      i++;
      continue;
    }

    // 5. Standalone Image Block: ![alt](url "title")
    const imageMatch = trimmed.match(/^!\[(.*?)\]\((.*?)(?:\s+"(.*?)")?\)$/);
    if (imageMatch) {
      blocks.push({
        type: "image",
        alt: imageMatch[1] || "",
        src: imageMatch[2] || "",
        title: imageMatch[3] || undefined,
      });
      i++;
      continue;
    }

    // 6. Blockquote or Alert (> [!NOTE])
    if (trimmed.startsWith(">")) {
      const quoteLines: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith(">")) {
        quoteLines.push(lines[i].trim().replace(/^>\s?/, ""));
        i++;
      }
      const fullQuoteText = quoteLines.join("\n").trim();
      const alertMatch = fullQuoteText.match(/^\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]\s*(.*)/is);

      if (alertMatch) {
        blocks.push({
          type: "alert",
          variant: alertMatch[1].toUpperCase() as any,
          text: alertMatch[2].trim(),
        });
      } else {
        blocks.push({
          type: "blockquote",
          text: fullQuoteText,
        });
      }
      continue;
    }

    // 7. Markdown Table (| header | header |)
    if (trimmed.startsWith("|") && trimmed.endsWith("|") && i + 1 < lines.length && lines[i + 1].includes("---")) {
      const parseCells = (row: string) =>
        row
          .slice(1, -1)
          .split("|")
          .map((c) => c.trim());

      const headers = parseCells(trimmed);
      const separatorRow = lines[i + 1];
      const alignCells = parseCells(separatorRow);
      const alignments: ("left" | "center" | "right")[] = alignCells.map((cell) => {
        if (cell.startsWith(":") && cell.endsWith(":")) return "center";
        if (cell.endsWith(":")) return "right";
        return "left";
      });

      i += 2; // Skip header and separator

      const rows: string[][] = [];
      while (i < lines.length && lines[i].trim().startsWith("|") && lines[i].trim().endsWith("|")) {
        rows.push(parseCells(lines[i].trim()));
        i++;
      }

      blocks.push({
        type: "table",
        headers,
        alignments,
        rows,
      });
      continue;
    }

    // 8. Unordered List (- item or * item)
    if (/^[-*+]\s+/.test(trimmed)) {
      const items: string[] = [];
      while (i < lines.length && /^[-*+]\s+/.test(lines[i].trim())) {
        items.push(lines[i].trim().replace(/^[-*+]\s+/, ""));
        i++;
      }
      blocks.push({ type: "ul", items });
      continue;
    }

    // 9. Ordered List (1. item)
    if (/^\d+\.\s+/.test(trimmed)) {
      const items: string[] = [];
      while (i < lines.length && /^\d+\.\s+/.test(lines[i].trim())) {
        items.push(lines[i].trim().replace(/^\d+\.\s+/, ""));
        i++;
      }
      blocks.push({ type: "ol", items });
      continue;
    }

    // 10. General Paragraph (Collect consecutive non-empty lines)
    const pLines: string[] = [];
    while (
      i < lines.length &&
      lines[i].trim() &&
      !lines[i].trim().startsWith("#") &&
      !lines[i].trim().startsWith("```") &&
      !lines[i].trim().startsWith(">") &&
      !/^[-*+]\s+/.test(lines[i].trim()) &&
      !/^\d+\.\s+/.test(lines[i].trim()) &&
      !/^(\*{3,}|-{3,}|_{3,})$/.test(lines[i].trim()) &&
      !(lines[i].trim().startsWith("|") && lines[i].trim().endsWith("|"))
    ) {
      pLines.push(lines[i].trim());
      i++;
    }

    if (pLines.length > 0) {
      blocks.push({
        type: "paragraph",
        text: pLines.join(" "),
      });
    }
  }

  return blocks;
}

// ==================== BLOCK RENDERER ====================

function renderBlock(block: BlockType, index: number) {
  switch (block.type) {
    case "heading": {
      const Tag = (`h${Math.min(6, Math.max(1, block.level))}` as unknown) as keyof JSX.IntrinsicElements;
      const headingStyles: Record<number, string> = {
        1: "text-3xl sm:text-4xl font-extrabold text-slate-950 mt-12 mb-6 tracking-tight",
        2: "text-2xl sm:text-3xl font-bold text-slate-900 mt-10 mb-4 pb-2 border-b border-slate-200 tracking-tight",
        3: "text-xl sm:text-2xl font-bold text-slate-900 mt-8 mb-3",
        4: "text-lg sm:text-xl font-bold text-slate-800 mt-6 mb-2",
        5: "text-base font-bold text-slate-800 mt-4 mb-2 uppercase tracking-wider",
        6: "text-sm font-bold text-slate-700 mt-4 mb-1 uppercase tracking-widest",
      };

      return (
        <Tag
          key={index}
          id={block.id}
          className={`${headingStyles[block.level] || headingStyles[2]} group scroll-mt-24`}
          style={{ fontFamily: "var(--font-display, inherit)" }}
        >
          {renderInline(block.text)}
        </Tag>
      );
    }

    case "image":
      return <BlogImage key={index} src={block.src} alt={block.alt} title={block.title} />;

    case "table":
      return (
        <div key={index} className="my-8 overflow-x-auto rounded-xl border border-slate-200 shadow-xs">
          <table className="w-full text-left text-sm border-collapse">
            <thead className="bg-slate-50 border-b border-slate-200 text-xs uppercase font-bold text-slate-700">
              <tr>
                {block.headers.map((header, hIdx) => (
                  <th
                    key={hIdx}
                    className="px-4 py-3.5"
                    style={{ textAlign: block.alignments[hIdx] || "left" }}
                  >
                    {renderInline(header)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {block.rows.map((row, rIdx) => (
                <tr key={rIdx} className={rIdx % 2 === 0 ? "bg-white" : "bg-slate-50/50 hover:bg-slate-50"}>
                  {row.map((cell, cIdx) => (
                    <td
                      key={cIdx}
                      className="px-4 py-3 text-slate-700"
                      style={{ textAlign: block.alignments[cIdx] || "left" }}
                    >
                      {renderInline(cell)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );

    case "alert": {
      const alertConfigs = {
        NOTE: {
          bg: "bg-blue-50/70 border-blue-500 text-blue-950",
          icon: "ℹ️",
          label: "Note",
        },
        TIP: {
          bg: "bg-emerald-50/70 border-emerald-500 text-emerald-950",
          icon: "💡",
          label: "Tip",
        },
        IMPORTANT: {
          bg: "bg-purple-50/70 border-purple-500 text-purple-950",
          icon: "📌",
          label: "Important",
        },
        WARNING: {
          bg: "bg-amber-50/70 border-amber-500 text-amber-950",
          icon: "⚠️",
          label: "Warning",
        },
        CAUTION: {
          bg: "bg-red-50/70 border-red-500 text-red-950",
          icon: "🚨",
          label: "Caution",
        },
      };

      const config = alertConfigs[block.variant] || alertConfigs.NOTE;

      return (
        <div
          key={index}
          className={`my-6 p-4 rounded-xl border-l-4 ${config.bg} shadow-2xs space-y-1`}
        >
          <div className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 opacity-90">
            <span>{config.icon}</span>
            <span>{config.label}</span>
          </div>
          <div className="text-sm sm:text-base leading-relaxed">
            {renderInline(block.text)}
          </div>
        </div>
      );
    }

    case "blockquote":
      return (
        <blockquote
          key={index}
          className="my-6 pl-5 border-l-4 border-[#3b5998] bg-slate-50/60 p-4 rounded-r-xl italic text-slate-700 text-base sm:text-lg leading-relaxed shadow-2xs"
        >
          {renderInline(block.text)}
        </blockquote>
      );

    case "code":
      return <CodeBlock key={index} code={block.code} lang={block.lang} />;

    case "ul":
      return (
        <ul key={index} className="list-disc pl-6 my-5 space-y-2 text-slate-700 text-base sm:text-lg leading-relaxed">
          {block.items.map((item, iIdx) => (
            <li key={iIdx} className="pl-1">
              {renderInline(item)}
            </li>
          ))}
        </ul>
      );

    case "ol":
      return (
        <ol key={index} className="list-decimal pl-6 my-5 space-y-2 text-slate-700 text-base sm:text-lg leading-relaxed">
          {block.items.map((item, iIdx) => (
            <li key={iIdx} className="pl-1">
              {renderInline(item)}
            </li>
          ))}
        </ol>
      );

    case "hr":
      return <hr key={index} className="my-10 border-slate-200" />;

    case "paragraph":
      return (
        <p key={index} className="text-slate-700 text-base sm:text-lg leading-relaxed mb-4">
          {renderInline(block.text)}
        </p>
      );

    default:
      return null;
  }
}

// ==================== INLINE FORMATTER ====================

function renderInline(text: string): React.ReactNode {
  if (!text) return null;

  // Split tokens by markdown syntax rules
  // 1. Inline Image: ![alt](url)
  // 2. Link: [text](url)
  // 3. Bold: **text** or __text__
  // 4. Italic: *text* or _text_
  // 5. Strike: ~~text~~
  // 6. Inline Code: `code`

  const regex = /(!?\[.*?\]\(.*?\))|(\*\*.*?\*\*)|(__.*?__)|(\*.*?\*)|(_.*?_)|(~~.*?~~)|(`.*?`)/g;

  const parts = text.split(regex).filter(Boolean);

  return parts.map((part, idx) => {
    // 1. Inline Image
    const imgMatch = part.match(/^!\[(.*?)\]\((.*?)\)$/);
    if (imgMatch) {
      return (
        <img
          key={idx}
          src={imgMatch[2]}
          alt={imgMatch[1]}
          className="inline-block max-h-48 rounded-lg shadow-xs my-1"
          loading="lazy"
        />
      );
    }

    // 2. Link
    const linkMatch = part.match(/^\[(.*?)\]\((.*?)\)$/);
    if (linkMatch) {
      const linkText = linkMatch[1];
      const linkUrl = linkMatch[2];
      const isInternal = linkUrl.startsWith("/") || linkUrl.startsWith("#");

      if (isInternal) {
        return (
          <Link
            key={idx}
            href={linkUrl}
            className="text-[#3b5998] hover:text-[#2f477a] underline font-semibold underline-offset-2 transition-colors"
          >
            {renderInline(linkText)}
          </Link>
        );
      }

      return (
        <a
          key={idx}
          href={linkUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[#3b5998] hover:text-[#2f477a] underline font-semibold underline-offset-2 transition-colors inline-flex items-center gap-0.5"
        >
          {renderInline(linkText)}
          <span className="text-xs opacity-75">↗</span>
        </a>
      );
    }

    // 3. Bold
    if ((part.startsWith("**") && part.endsWith("**")) || (part.startsWith("__") && part.endsWith("__"))) {
      return (
        <strong key={idx} className="font-bold text-slate-900">
          {renderInline(part.slice(2, -2))}
        </strong>
      );
    }

    // 4. Italic
    if ((part.startsWith("*") && part.endsWith("*")) || (part.startsWith("_") && part.endsWith("_"))) {
      return (
        <em key={idx} className="italic text-slate-800">
          {renderInline(part.slice(1, -1))}
        </em>
      );
    }

    // 5. Strikethrough
    if (part.startsWith("~~") && part.endsWith("~~")) {
      return (
        <del key={idx} className="line-through text-slate-400">
          {renderInline(part.slice(2, -2))}
        </del>
      );
    }

    // 6. Inline Code
    if (part.startsWith("`") && part.endsWith("`")) {
      return (
        <code
          key={idx}
          className="px-1.5 py-0.5 rounded-md text-xs sm:text-sm font-mono bg-slate-100 text-blue-700 border border-slate-200"
        >
          {part.slice(1, -1)}
        </code>
      );
    }

    return part;
  });
}

// ==================== SUB-COMPONENTS ====================

function BlogImage({ src, alt, title }: { src: string; alt: string; title?: string }) {
  const [hasError, setHasError] = useState(false);

  if (hasError || !src) {
    return (
      <div className="my-8 p-6 bg-slate-100 border border-slate-200 rounded-2xl text-center text-slate-400 text-sm">
        <span className="block text-2xl mb-1">🖼️</span>
        <span>Image could not be loaded ({alt || "Untitled"})</span>
      </div>
    );
  }

  return (
    <figure className="my-8">
      <div className="rounded-2xl overflow-hidden shadow-md border border-slate-200 bg-slate-950 flex items-center justify-center">
        <img
          src={src}
          alt={alt || "Blog visual illustration"}
          className="w-full max-h-[550px] object-cover hover:scale-[1.01] transition-transform duration-300"
          loading="lazy"
          onError={() => setHasError(true)}
        />
      </div>
      {(alt || title) && (
        <figcaption className="text-center text-xs sm:text-sm text-slate-500 mt-2.5 italic">
          {title || alt}
        </figcaption>
      )}
    </figure>
  );
}

function CodeBlock({ code, lang }: { code: string; lang: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="my-6 rounded-xl overflow-hidden bg-slate-900 border border-slate-800 shadow-md">
      <div className="flex items-center justify-between px-4 py-2 bg-slate-950/80 border-b border-slate-800 text-xs">
        <span className="font-mono font-semibold text-slate-400 uppercase tracking-wider">{lang}</span>
        <button
          type="button"
          onClick={handleCopy}
          className="text-xs font-semibold px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
        >
          {copied ? "✓ Copied" : "Copy"}
        </button>
      </div>
      <pre className="p-4 text-xs sm:text-sm font-mono text-emerald-400 overflow-x-auto leading-relaxed">
        <code>{code}</code>
      </pre>
    </div>
  );
}

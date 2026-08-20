"use client";

import React, { useRef, useMemo } from "react";
import { Input, Button, Tooltip, Tabs, Modal, Form } from "antd";
import {
  BoldOutlined,
  ItalicOutlined,
  StrikethroughOutlined,
  CodeOutlined,
  LinkOutlined,
  PictureOutlined,
  UnorderedListOutlined,
  OrderedListOutlined,
  TableOutlined,
  LineOutlined,
  LockOutlined,
  UnlockOutlined,
  FieldTimeOutlined,
  FileTextOutlined,
  AppstoreOutlined,
} from "@ant-design/icons";
import { EditorMode, HeadingItem } from "./types";

const { TextArea } = Input;

interface ArticleMainCanvasProps {
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  autoSlug: boolean;
  editorMode: EditorMode;
  onTitleChange: (val: string) => void;
  onSlugChange: (val: string) => void;
  onAutoSlugToggle: () => void;
  onExcerptChange: (val: string) => void;
  onContentChange: (val: string) => void;
  onEditorModeChange: (mode: EditorMode) => void;
}

export default function ArticleMainCanvas({
  title,
  slug,
  excerpt,
  content,
  autoSlug,
  editorMode,
  onTitleChange,
  onSlugChange,
  onAutoSlugToggle,
  onExcerptChange,
  onContentChange,
  onEditorModeChange,
}: ArticleMainCanvasProps) {
  const textAreaRef = useRef<any>(null);

  // Calculate statistics
  const stats = useMemo(() => {
    const rawText = content.replace(/[#*`_~[\]()-]/g, "").trim();
    const words = rawText ? rawText.split(/\s+/).length : 0;
    const chars = content.length;
    const readMinutes = Math.max(1, Math.ceil(words / 200));
    return {
      words,
      chars,
      readTime: `${readMinutes} min read`,
    };
  }, [content]);

  // Extract Heading Outline
  const headings = useMemo<HeadingItem[]>(() => {
    const lines = content.split("\n");
    const found: HeadingItem[] = [];
    lines.forEach((line) => {
      const match = line.match(/^(#{2,4})\s+(.+)$/);
      if (match) {
        const level = match[1].length;
        const text = match[2].trim();
        const id = text.toLowerCase().replace(/[^\w\s-]/g, "").replace(/\s+/g, "-");
        found.push({ id, text, level });
      }
    });
    return found;
  }, [content]);

  // Markdown Formatting Helper
  const insertFormatting = (prefix: string, suffix: string = "", placeholder: string = "text") => {
    const textarea = textAreaRef.current?.resizableTextArea?.textArea;
    if (!textarea) {
      onContentChange(content + `${prefix}${placeholder}${suffix}`);
      return;
    }

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = content.substring(start, end) || placeholder;
    const newContent =
      content.substring(0, start) +
      prefix +
      selectedText +
      suffix +
      content.substring(end);

    onContentChange(newContent);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(
        start + prefix.length,
        start + prefix.length + selectedText.length
      );
    }, 50);
  };

  const insertTable = () => {
    const tableTemplate = `\n| Feature | Description | Impact |\n| :--- | :--- | :--- |\n| Item 1 | Details here | High |\n| Item 2 | Details here | Medium |\n`;
    insertFormatting(tableTemplate, "", "");
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-10 transition-all space-y-6">
      {/* 1. Prominent Title Input */}
      <div>
        <div className="flex items-center justify-between text-xs text-slate-400 mb-1.5 font-medium">
          <span>Article Title</span>
          <span>{title.length} / 120</span>
        </div>
        <input
          type="text"
          value={title}
          onChange={(e) => onTitleChange(e.target.value)}
          placeholder="Enter article title..."
          maxLength={120}
          className="w-full text-2xl sm:text-4xl font-extrabold text-slate-900 placeholder:text-slate-300 border-none outline-none focus:ring-0 p-0 tracking-tight leading-tight"
        />
      </div>

      {/* 2. Contextual Base URL Slug Display */}
      <div className="flex flex-wrap items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs">
        <span className="text-slate-400 font-mono">https://nobstacle.com/blog/</span>
        <input
          type="text"
          value={slug}
          onChange={(e) => onSlugChange(e.target.value)}
          placeholder="article-slug"
          className="bg-transparent font-mono font-bold text-blue-700 outline-none border-b border-transparent focus:border-blue-400 flex-1 min-w-[140px] px-1 py-0.5"
        />
        <Tooltip title={autoSlug ? "Auto-generating slug from title (click to unlock)" : "Custom slug locked"}>
          <Button
            type="text"
            size="small"
            icon={autoSlug ? <LockOutlined className="text-blue-500" /> : <UnlockOutlined className="text-slate-400" />}
            onClick={onAutoSlugToggle}
            className="text-xs"
          >
            {autoSlug ? "Auto" : "Manual"}
          </Button>
        </Tooltip>
      </div>

      {/* 3. Subtitle / Excerpt */}
      <div>
        <div className="flex items-center justify-between text-xs text-slate-400 mb-1 font-medium">
          <span>Short Summary / Excerpt</span>
          <span className={excerpt.length > 160 ? "text-amber-500 font-bold" : ""}>
            {excerpt.length} / 160
          </span>
        </div>
        <TextArea
          value={excerpt}
          onChange={(e) => onExcerptChange(e.target.value)}
          placeholder="A compelling 1-2 sentence overview of this article for search engine snippets and social preview cards..."
          rows={2}
          maxLength={220}
          className="rounded-xl text-sm border-slate-200 text-slate-700 resize-none"
        />
      </div>

      {/* 4. Editor Toolbar & Mode Switcher */}
      <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        <div className="bg-slate-50 border-b border-slate-200 px-3 py-2 flex flex-wrap items-center justify-between gap-2">
          {/* Formatting Buttons */}
          <div className="flex items-center flex-wrap gap-1">
            <Tooltip title="Heading 2 (##)">
              <Button size="small" type="text" onClick={() => insertFormatting("\n## ", "\n", "Heading 2")}>
                <span className="font-bold text-xs">H2</span>
              </Button>
            </Tooltip>
            <Tooltip title="Heading 3 (###)">
              <Button size="small" type="text" onClick={() => insertFormatting("\n### ", "\n", "Heading 3")}>
                <span className="font-bold text-xs">H3</span>
              </Button>
            </Tooltip>
            <div className="h-4 w-px bg-slate-200 mx-1" />
            <Tooltip title="Bold (**text**)">
              <Button size="small" type="text" icon={<BoldOutlined />} onClick={() => insertFormatting("**", "**", "bold text")} />
            </Tooltip>
            <Tooltip title="Italic (*text*)">
              <Button size="small" type="text" icon={<ItalicOutlined />} onClick={() => insertFormatting("*", "*", "italic text")} />
            </Tooltip>
            <Tooltip title="Strikethrough (~~text~~)">
              <Button size="small" type="text" icon={<StrikethroughOutlined />} onClick={() => insertFormatting("~~", "~~", "strikethrough")} />
            </Tooltip>
            <Tooltip title="Inline Code (`code`)">
              <Button size="small" type="text" icon={<CodeOutlined />} onClick={() => insertFormatting("`", "`", "code")} />
            </Tooltip>
            <div className="h-4 w-px bg-slate-200 mx-1" />
            <Tooltip title="Bullet List (- item)">
              <Button size="small" type="text" icon={<UnorderedListOutlined />} onClick={() => insertFormatting("\n- ", "\n", "List item")} />
            </Tooltip>
            <Tooltip title="Numbered List (1. item)">
              <Button size="small" type="text" icon={<OrderedListOutlined />} onClick={() => insertFormatting("\n1. ", "\n", "List item")} />
            </Tooltip>
            <Tooltip title="Blockquote (> quote)">
              <Button size="small" type="text" onClick={() => insertFormatting("\n> ", "\n", "Key insight or quote...")}>
                <span className="font-serif italic font-bold text-xs">”</span>
              </Button>
            </Tooltip>
            <Tooltip title="Insert Table">
              <Button size="small" type="text" icon={<TableOutlined />} onClick={insertTable} />
            </Tooltip>
            <Tooltip title="Horizontal Divider (---)">
              <Button size="small" type="text" icon={<LineOutlined />} onClick={() => insertFormatting("\n---\n", "", "")} />
            </Tooltip>
            <Tooltip title="Insert Link">
              <Button
                size="small"
                type="text"
                icon={<LinkOutlined />}
                onClick={() => insertFormatting("[", "](https://nobstacle.com)", "link text")}
              />
            </Tooltip>
            <Tooltip title="Insert Image by URL">
              <Button
                size="small"
                type="text"
                icon={<PictureOutlined />}
                onClick={() => insertFormatting("![Image Alt](", ")", "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=800")}
              />
            </Tooltip>
            <Tooltip title="Upload Image from Computer">
              <label className="cursor-pointer inline-flex items-center justify-center p-1 rounded hover:bg-slate-200 text-blue-600 transition-colors">
                <span className="flex items-center gap-1 text-xs font-semibold px-1.5 py-0.5 bg-blue-50 hover:bg-blue-100 rounded text-blue-700">
                  <PictureOutlined /> Upload Image
                </span>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const reader = new FileReader();
                      reader.onload = (event) => {
                        if (event.target?.result) {
                          const base64Url = event.target.result as string;
                          insertFormatting(`\n![${file.name.replace(/\.[^/.]+$/, "")}](`, ")\n", base64Url);
                        }
                      };
                      reader.readAsDataURL(file);
                    }
                  }}
                />
              </label>
            </Tooltip>
          </div>

          {/* View Modes */}
          <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-lg p-0.5 text-xs">
            <button
              onClick={() => onEditorModeChange("split")}
              className={`px-2.5 py-1 rounded font-semibold transition-all ${
                editorMode === "split" ? "bg-blue-600 text-white shadow-xs" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Split View
            </button>
            <button
              onClick={() => onEditorModeChange("markdown")}
              className={`px-2.5 py-1 rounded font-semibold transition-all ${
                editorMode === "markdown" ? "bg-blue-600 text-white shadow-xs" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Markdown
            </button>
            <button
              onClick={() => onEditorModeChange("preview")}
              className={`px-2.5 py-1 rounded font-semibold transition-all ${
                editorMode === "preview" ? "bg-blue-600 text-white shadow-xs" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Preview
            </button>
          </div>
        </div>

        {/* Editor Body by Mode */}
        {editorMode === "markdown" && (
          <TextArea
            ref={textAreaRef}
            value={content}
            onChange={(e) => onContentChange(e.target.value)}
            placeholder="Write your article in Markdown..."
            rows={22}
            className="font-mono text-sm border-none p-6 text-slate-800 resize-y focus:shadow-none"
          />
        )}

        {editorMode === "split" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-slate-200">
            <TextArea
              ref={textAreaRef}
              value={content}
              onChange={(e) => onContentChange(e.target.value)}
              placeholder="Write your article in Markdown..."
              rows={22}
              className="font-mono text-sm border-none p-5 text-slate-800 resize-none focus:shadow-none bg-slate-50/40"
            />
            <div className="p-6 max-h-[600px] overflow-y-auto prose prose-slate max-w-none text-slate-800 text-sm leading-relaxed">
              {content ? (
                <div className="space-y-4">
                  {content.split("\n\n").map((block, i) => {
                    const t = block.trim();
                    if (t.startsWith("## ")) {
                      return <h2 key={i} className="text-xl font-bold text-slate-900 border-b pb-1.5 mt-4">{t.replace("## ", "")}</h2>;
                    }
                    if (t.startsWith("### ")) {
                      return <h3 key={i} className="text-lg font-bold text-slate-800 mt-3">{t.replace("### ", "")}</h3>;
                    }
                    if (t.startsWith("> ")) {
                      return <blockquote key={i} className="border-l-4 border-blue-500 pl-4 italic text-slate-600">{t.replace("> ", "")}</blockquote>;
                    }
                    if (t.startsWith("- ")) {
                      return (
                        <ul key={i} className="list-disc pl-5 space-y-1">
                          {t.split("\n").map((line, idx) => (
                            <li key={idx}>{line.replace(/^- /, "")}</li>
                          ))}
                        </ul>
                      );
                    }
                    if (t.startsWith("1. ")) {
                      return (
                        <ol key={i} className="list-decimal pl-5 space-y-1">
                          {t.split("\n").map((line, idx) => (
                            <li key={idx}>{line.replace(/^\d+\.\s*/, "")}</li>
                          ))}
                        </ol>
                      );
                    }
                    if (t === "---") {
                      return <hr key={i} className="my-6 border-slate-200" />;
                    }
                    return <p key={i} className="leading-relaxed">{t}</p>;
                  })}
                </div>
              ) : (
                <div className="text-slate-400 italic">Live preview will render here as you type...</div>
              )}
            </div>
          </div>
        )}

        {editorMode === "preview" && (
          <div className="p-8 max-h-[700px] overflow-y-auto prose prose-slate max-w-none text-slate-800">
            {content ? (
              <div className="space-y-5">
                {content.split("\n\n").map((block, i) => {
                  const t = block.trim();
                  if (t.startsWith("## ")) {
                    return <h2 key={i} className="text-2xl font-black text-slate-900 border-b pb-2">{t.replace("## ", "")}</h2>;
                  }
                  if (t.startsWith("### ")) {
                    return <h3 key={i} className="text-xl font-extrabold text-slate-800">{t.replace("### ", "")}</h3>;
                  }
                  if (t.startsWith("> ")) {
                    return <blockquote key={i} className="border-l-4 border-blue-600 bg-blue-50/50 p-4 rounded-r-xl italic text-slate-700">{t.replace("> ", "")}</blockquote>;
                  }
                  if (t.startsWith("- ")) {
                    return (
                      <ul key={i} className="list-disc pl-6 space-y-1.5">
                        {t.split("\n").map((line, idx) => (
                          <li key={idx}>{line.replace(/^- /, "")}</li>
                        ))}
                      </ul>
                    );
                  }
                  return <p key={i} className="leading-relaxed text-base">{t}</p>;
                })}
              </div>
            ) : (
              <div className="text-slate-400 italic">No content to preview yet.</div>
            )}
          </div>
        )}
      </div>

      {/* 5. Live Stats Bar & Dynamic Outline */}
      <div className="flex flex-wrap items-center justify-between gap-4 pt-2 border-t border-slate-100 text-xs text-slate-500">
        <div className="flex items-center gap-4">
          <span>
            <strong className="text-slate-700 font-semibold">{stats.words}</strong> words
          </span>
          <span>
            <strong className="text-slate-700 font-semibold">{stats.chars}</strong> characters
          </span>
          <span className="flex items-center gap-1">
            <FieldTimeOutlined className="text-blue-500" />
            <strong className="text-slate-700 font-semibold">{stats.readTime}</strong>
          </span>
        </div>

        {headings.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-600">Outline ({headings.length} sections):</span>
            <div className="flex items-center gap-1.5 flex-wrap">
              {headings.slice(0, 3).map((h, idx) => (
                <span key={idx} className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded text-[11px] truncate max-w-[120px]">
                  {h.text}
                </span>
              ))}
              {headings.length > 3 && <span className="text-slate-400">+{headings.length - 3} more</span>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

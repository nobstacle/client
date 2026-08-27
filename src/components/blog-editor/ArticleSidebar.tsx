"use client";

import React from "react";
import {
  Collapse,
  Switch,
  Select,
  Input,
  DatePicker,
  Card,
  Tag,
  Tooltip,
  Image as AntImage,
  Space,
} from "antd";
import {
  CloudUploadOutlined,
  FolderOpenOutlined,
  PictureOutlined,
  UserOutlined,
  GlobalOutlined,
  SettingOutlined,
  CheckCircleFilled,
  ExclamationCircleFilled,
  GoogleOutlined,
  ShareAltOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import { BlogFormData } from "./types";
import { compressImage, COVER_OPTIONS, AVATAR_OPTIONS } from "@/utils/imageOptimizer";

const { Option } = Select;
const { TextArea } = Input;

const CATEGORY_PRESETS = [
  "Hospitality Tech",
  "Customer Experience",
  "Multilingual AI",
  "Analytics & ROI",
  "Product Updates",
  "Guides & Tutorials",
];

const PRESET_COVERS = [
  { label: "Hotel & Resort Display", url: "/blog/hospitality_display.jpg" },
  { label: "Retail Countertop POS", url: "/blog/countertop_pos.jpg" },
  { label: "Speech AI & Translation", url: "/blog/ai_translation.jpg" },
  { label: "Analytics & Metrics", url: "/blog/signage_roi.jpg" },
];

export interface AuthorProfile {
  name: string;
  role: string;
  avatar?: string;
}

interface ArticleSidebarProps {
  data: BlogFormData;
  onChange: (patch: Partial<BlogFormData>) => void;
}

export default function ArticleSidebar({ data, onChange }: ArticleSidebarProps) {
  const [savedAuthors, setSavedAuthors] = React.useState<AuthorProfile[]>([]);

  // Load saved authors from localStorage
  React.useEffect(() => {
    try {
      const stored = localStorage.getItem("nobstacle_blog_saved_authors");
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          setSavedAuthors(parsed);
        }
      }
    } catch {
      // Ignore localStorage errors
    }
  }, []);

  // Save/update author profile in savedAuthors list
  const persistAuthor = (name: string, role: string, avatar?: string) => {
    const trimmedName = name.trim();
    if (!trimmedName) return;

    setSavedAuthors((prev) => {
      const filtered = prev.filter((a) => a.name.toLowerCase() !== trimmedName.toLowerCase());
      const updated = [{ name: trimmedName, role: role.trim(), avatar: avatar || "" }, ...filtered];
      try {
        localStorage.setItem("nobstacle_blog_saved_authors", JSON.stringify(updated));
      } catch {}
      return updated;
    });
  };

  const removeSavedAuthor = (nameToRemove: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSavedAuthors((prev) => {
      const updated = prev.filter((a) => a.name.toLowerCase() !== nameToRemove.toLowerCase());
      try {
        localStorage.setItem("nobstacle_blog_saved_authors", JSON.stringify(updated));
      } catch {}
      return updated;
    });
  };
  // Validation checklist calculation
  const checklist = {
    title: Boolean(data.title.trim()),
    slug: Boolean(data.slug.trim()),
    content: Boolean(data.content.trim() && data.content.length > 50),
    coverImage: Boolean(data.coverImage.trim()),
    category: Boolean(data.category.trim()),
    excerpt: Boolean(data.excerpt.trim()),
  };

  const allReady = Object.values(checklist).every(Boolean);

  const collapseItems = [
    // 1. Publishing & Checklist
    {
      key: "publishing",
      label: (
        <div className="flex items-center justify-between w-full pr-2">
          <span className="font-bold text-slate-800 flex items-center gap-2 text-sm">
            <CloudUploadOutlined className="text-blue-600" />
            Publishing
          </span>
          <Tag color={data.isPublished ? "green" : "orange"} className="text-[11px] font-bold rounded-full">
            {data.isPublished ? "Public" : "Draft"}
          </Tag>
        </div>
      ),
      children: (
        <div className="space-y-4">
          <div className="flex items-center justify-between bg-slate-50 p-3 rounded-xl border border-slate-200">
            <div>
              <div className="font-bold text-xs text-slate-800">Publish Immediately</div>
              <div className="text-[11px] text-slate-400">Make visible on public blog</div>
            </div>
            <Switch
              checked={data.isPublished}
              onChange={(val) => onChange({ isPublished: val })}
              checkedChildren="Live"
              unCheckedChildren="Draft"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-600 block mb-1">Publication Date</label>
            <DatePicker
              showTime
              className="w-full rounded-lg"
              value={data.publishedAt ? dayjs(data.publishedAt) : dayjs()}
              onChange={(date) => onChange({ publishedAt: date ? date.toISOString() : new Date().toISOString() })}
            />
          </div>

          {/* Validation Checklist */}
          <div className="bg-blue-50/50 border border-blue-100 rounded-xl p-3.5 space-y-2">
            <div className="text-xs font-bold text-slate-700 flex items-center justify-between">
              <span>Publish Readiness</span>
              <span className={allReady ? "text-emerald-600" : "text-amber-600"}>
                {Object.values(checklist).filter(Boolean).length} / 6
              </span>
            </div>
            <div className="space-y-1 text-xs">
              <CheckItem ok={checklist.title} label="Article title provided" />
              <CheckItem ok={checklist.slug} label="Valid URL slug" />
              <CheckItem ok={checklist.content} label="Body content (> 50 chars)" />
              <CheckItem ok={checklist.coverImage} label="Cover image selected" />
              <CheckItem ok={checklist.category} label="Category selected" />
              <CheckItem ok={checklist.excerpt} label="Excerpt summary written" />
            </div>
          </div>
        </div>
      ),
    },

    // 2. Organization (Category & Tags)
    {
      key: "organization",
      label: (
        <span className="font-bold text-slate-800 flex items-center gap-2 text-sm">
          <FolderOpenOutlined className="text-blue-600" />
          Organization
        </span>
      ),
      children: (
        <div className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-slate-600 block mb-1">Category</label>
            <Select
              className="w-full"
              placeholder="Select category"
              value={data.category || undefined}
              onChange={(val) => onChange({ category: val })}
              showSearch
            >
              {CATEGORY_PRESETS.map((cat) => (
                <Option key={cat} value={cat}>
                  {cat}
                </Option>
              ))}
            </Select>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-600 block mb-1">
              Keywords & Tags (Press Enter)
            </label>
            <Select
              mode="tags"
              className="w-full"
              placeholder="e.g. Hospitality, AI, Upsell"
              value={data.tags}
              onChange={(tags) => onChange({ tags })}
            />
          </div>
        </div>
      ),
    },

    // 3. Featured Image
    {
      key: "featuredImage",
      label: (
        <span className="font-bold text-slate-800 flex items-center gap-2 text-sm">
          <PictureOutlined className="text-blue-600" />
          Featured Image
        </span>
      ),
      children: (
        <div className="space-y-3.5">
          {data.coverImage ? (
            <div className="space-y-2">
              <div className="rounded-xl overflow-hidden border border-slate-200 bg-slate-900 aspect-video relative group flex items-center justify-center">
                <AntImage
                  src={data.coverImage}
                  alt={data.coverAlt || data.title}
                  className="w-full h-full object-cover"
                  fallback="/Logo_Light.png"
                />
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400 truncate max-w-[180px]">
                  {data.coverImage.startsWith("data:") ? "Uploaded Image" : data.coverImage}
                </span>
                <button
                  type="button"
                  onClick={() => onChange({ coverImage: "" })}
                  className="text-red-600 hover:text-red-800 font-semibold cursor-pointer"
                >
                  Remove
                </button>
              </div>
            </div>
          ) : (
            /* Upload Drop Area */
            <label className="border-2 border-dashed border-slate-200 hover:border-blue-500 bg-slate-50 hover:bg-blue-50/40 rounded-xl p-4 flex flex-col items-center justify-center cursor-pointer transition-colors text-center block">
              <PictureOutlined className="text-2xl text-blue-500 mb-1.5" />
              <span className="text-xs font-bold text-slate-700 block">Click to Upload Cover Image</span>
              <span className="text-[11px] text-slate-400 block mt-0.5">PNG, JPG, WebP up to 10MB</span>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    const compressedDataUrl = await compressImage(file, COVER_OPTIONS);
                    if (compressedDataUrl) {
                      onChange({ coverImage: compressedDataUrl });
                    }
                    e.target.value = "";
                  }
                }}
              />
            </label>
          )}

          {/* Quick upload alternative input */}
          {data.coverImage && (
            <label className="block text-center py-1.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg cursor-pointer transition-colors">
              Change Image (Upload New)
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    const compressedDataUrl = await compressImage(file, COVER_OPTIONS);
                    if (compressedDataUrl) {
                      onChange({ coverImage: compressedDataUrl });
                    }
                    e.target.value = "";
                  }
                }}
              />
            </label>
          )}

          <div>
            <label className="text-xs font-semibold text-slate-600 block mb-1">Select Preset Image</label>
            <Select
              className="w-full"
              placeholder="Choose a preset image"
              value={PRESET_COVERS.some((p) => p.url === data.coverImage) ? data.coverImage : undefined}
              onChange={(val) => onChange({ coverImage: val })}
              allowClear
            >
              {PRESET_COVERS.map((cov) => (
                <Option key={cov.url} value={cov.url}>
                  {cov.label}
                </Option>
              ))}
            </Select>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-600 block mb-1">Or Direct Image URL</label>
            <Input
              value={data.coverImage.startsWith("data:") ? "" : data.coverImage}
              onChange={(e) => onChange({ coverImage: e.target.value })}
              placeholder="https://images.unsplash.com/..."
              className="rounded-lg text-xs"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-600 block mb-1">Image Alt Text (for SEO)</label>
            <Input
              value={data.coverAlt || ""}
              onChange={(e) => onChange({ coverAlt: e.target.value })}
              placeholder="Descriptive text for visually impaired and search engines"
              className="rounded-lg text-xs"
            />
          </div>
        </div>
      ),
    },

    // 4. Author Information
    {
      key: "author",
      label: (
        <span className="font-bold text-slate-800 flex items-center gap-2 text-sm">
          <UserOutlined className="text-blue-600" />
          Author Info
        </span>
      ),
      children: (
        <div className="space-y-3.5">
          {savedAuthors.length > 0 && (
            <div>
              <label className="text-xs font-semibold text-slate-600 block mb-1">
                Select from Saved Authors ({savedAuthors.length})
              </label>
              <Select
                className="w-full"
                placeholder="Choose saved author"
                value={savedAuthors.some((a) => a.name === data.authorName) ? data.authorName : undefined}
                onChange={(val) => {
                  const found = savedAuthors.find((a) => a.name === val);
                  if (found) {
                    onChange({
                      authorName: found.name,
                      authorRole: found.role,
                      authorAvatar: found.avatar,
                    });
                  }
                }}
                allowClear
                onClear={() => onChange({ authorName: "", authorRole: "", authorAvatar: "" })}
              >
                {savedAuthors.map((auth) => (
                  <Option key={auth.name} value={auth.name}>
                    <div className="flex items-center justify-between w-full pr-1">
                      <span>{auth.name} {auth.role ? `— ${auth.role}` : ""}</span>
                      <button
                        type="button"
                        onClick={(e) => removeSavedAuthor(auth.name, e)}
                        className="text-slate-400 hover:text-red-500 text-xs ml-2 cursor-pointer"
                        title="Delete saved author"
                      >
                        ✕
                      </button>
                    </div>
                  </Option>
                ))}
              </Select>
            </div>
          )}

          <div>
            <label className="text-xs font-semibold text-slate-600 block mb-1">
              Author Name (Press Enter to Save)
            </label>
            <Input
              value={data.authorName}
              placeholder="e.g. Deepak Sharma"
              onChange={(e) => onChange({ authorName: e.target.value })}
              onPressEnter={() => {
                if (data.authorName.trim()) {
                  persistAuthor(data.authorName, data.authorRole, data.authorAvatar);
                }
              }}
              className="rounded-lg text-xs"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-600 block mb-1">
              Author Role / Title (Press Enter to Save)
            </label>
            <Input
              value={data.authorRole}
              placeholder="e.g. Head of Product"
              onChange={(e) => onChange({ authorRole: e.target.value })}
              onPressEnter={() => {
                if (data.authorName.trim()) {
                  persistAuthor(data.authorName, data.authorRole, data.authorAvatar);
                }
              }}
              className="rounded-lg text-xs"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-600 block mb-1">Author Avatar (Optional)</label>
            <div className="flex items-center gap-2">
              <Input
                value={data.authorAvatar || ""}
                placeholder="Avatar image URL..."
                onChange={(e) => onChange({ authorAvatar: e.target.value })}
                className="rounded-lg text-xs flex-1"
              />
              <label className="cursor-pointer px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg shrink-0">
                Upload
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const compressedDataUrl = await compressImage(file, AVATAR_OPTIONS);
                      if (compressedDataUrl) {
                        onChange({ authorAvatar: compressedDataUrl });
                      }
                      e.target.value = "";
                    }
                  }}
                />
              </label>
            </div>
          </div>

          {data.authorName.trim() && (
            <button
              type="button"
              onClick={() => persistAuthor(data.authorName, data.authorRole, data.authorAvatar)}
              className="w-full py-1.5 px-3 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-semibold rounded-lg transition-colors text-center cursor-pointer"
            >
              + Save Author to Reusable Profiles
            </button>
          )}
        </div>
      ),
    },

    // 5. SEO & Live Previews
    {
      key: "seo",
      label: (
        <span className="font-bold text-slate-800 flex items-center gap-2 text-sm">
          <GlobalOutlined className="text-blue-600" />
          SEO & Live Previews
        </span>
      ),
      children: (
        <div className="space-y-4">
          <div>
            <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
              <span>SEO Title</span>
              <span className={(data.seoTitle || data.title).length > 60 ? "text-amber-500 font-bold" : ""}>
                {(data.seoTitle || data.title).length} / 60
              </span>
            </div>
            <Input
              value={data.seoTitle || ""}
              onChange={(e) => onChange({ seoTitle: e.target.value })}
              placeholder={data.title || "Custom search engine title"}
              className="rounded-lg text-xs"
            />
          </div>

          <div>
            <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
              <span>Meta Description</span>
              <span className={(data.seoDescription || data.excerpt).length > 160 ? "text-amber-500 font-bold" : ""}>
                {(data.seoDescription || data.excerpt).length} / 160
              </span>
            </div>
            <TextArea
              value={data.seoDescription || ""}
              onChange={(e) => onChange({ seoDescription: e.target.value })}
              placeholder={data.excerpt || "Custom search description"}
              rows={2}
              className="rounded-lg text-xs resize-none"
            />
          </div>

          {/* Google Search Result Preview */}
          <div className="border border-slate-200 bg-slate-50/60 rounded-xl p-3.5 space-y-1 shadow-xs">
            <div className="text-[11px] font-bold text-slate-500 flex items-center gap-1.5 mb-2">
              <GoogleOutlined className="text-blue-600" />
              Google Search Result Snippet
            </div>
            <div className="text-[11px] text-emerald-800 truncate font-mono">
              https://nobstacle.com › blog › {data.slug || "article-slug"}
            </div>
            <div className="text-sm font-semibold text-blue-800 line-clamp-1 hover:underline cursor-pointer">
              {data.seoTitle || data.title || "Article Title Preview"}
            </div>
            <div className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
              {data.seoDescription || data.excerpt || "Article summary description appears here in search results..."}
            </div>
          </div>

          {/* Social Card Preview */}
          <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-xs">
            <div className="text-[11px] font-bold text-slate-500 p-2.5 bg-slate-50 flex items-center gap-1.5 border-b">
              <ShareAltOutlined className="text-indigo-600" />
              Social Media OpenGraph Card
            </div>
            <div className="bg-slate-800 aspect-video relative flex items-center justify-center overflow-hidden">
              <img
                src={data.coverImage || "/blog/hospitality_display.jpg"}
                alt="preview"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="p-3">
              <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">nobstacle.com</div>
              <div className="text-xs font-bold text-slate-900 line-clamp-1 mt-0.5">
                {data.seoTitle || data.title || "Article Title"}
              </div>
              <div className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">
                {data.seoDescription || data.excerpt || "Short article description"}
              </div>
            </div>
          </div>
        </div>
      ),
    },

    // 6. Advanced Settings
    {
      key: "advanced",
      label: (
        <span className="font-bold text-slate-800 flex items-center gap-2 text-sm">
          <SettingOutlined className="text-blue-600" />
          Advanced
        </span>
      ),
      children: (
        <div className="space-y-3">
          <div>
            <label className="text-xs font-semibold text-slate-600 block mb-1">Canonical URL (Optional)</label>
            <Input
              value={data.canonicalUrl || ""}
              onChange={(e) => onChange({ canonicalUrl: e.target.value })}
              placeholder="https://nobstacle.com/blog/canonical-slug"
              className="rounded-lg text-xs"
            />
          </div>
          <div className="text-[11px] text-slate-400">
            Use canonical URL if this article was originally published on another publication to avoid search engine duplicate content penalties.
          </div>
        </div>
      ),
    },
  ];

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 sm:p-5 sticky top-20">
      <Collapse
        defaultActiveKey={["publishing", "organization", "featuredImage"]}
        ghost
        expandIconPosition="end"
        items={collapseItems}
      />
    </div>
  );
}

function CheckItem({ ok, label }: { ok: boolean; label: string }) {
  return (
    <div className="flex items-center gap-2">
      {ok ? (
        <CheckCircleFilled className="text-emerald-500 text-xs" />
      ) : (
        <ExclamationCircleFilled className="text-amber-400 text-xs" />
      )}
      <span className={ok ? "text-slate-700" : "text-slate-400"}>{label}</span>
    </div>
  );
}

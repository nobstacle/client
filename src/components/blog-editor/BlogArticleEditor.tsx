"use client";

import React, { useState, useEffect, useCallback } from "react";
import { message, Modal, Spin } from "antd";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import axios from "axios";
import EditorHeader from "./EditorHeader";
import ArticleMainCanvas from "./ArticleMainCanvas";
import ArticleSidebar from "./ArticleSidebar";
import DevicePreviewModal from "./DevicePreviewModal";
import { BlogFormData, EditorMode, SaveStatus } from "./types";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3001";
const API_URL = `${BACKEND_URL}/api/v1`;

const INITIAL_DATA: BlogFormData = {
  title: "",
  slug: "",
  excerpt: "",
  coverImage: "/blog/hospitality_display.jpg",
  coverAlt: "",
  category: "Hospitality Tech",
  tags: ["Hospitality", "Customer Experience"],
  authorName: "",
  authorRole: "",
  authorAvatar: "",
  readTime: "5 min read",
  content: "",
  isPublished: true,
  publishedAt: new Date().toISOString(),
  seoTitle: "",
  seoDescription: "",
  canonicalUrl: "",
};

interface BlogArticleEditorProps {
  initialId?: number;
}

export default function BlogArticleEditor({ initialId }: BlogArticleEditorProps) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const isEditMode = Boolean(initialId);

  const [formData, setFormData] = useState<BlogFormData>(INITIAL_DATA);
  const [loading, setLoading] = useState<boolean>(isEditMode);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [autoSlug, setAutoSlug] = useState<boolean>(!isEditMode);
  const [editorMode, setEditorMode] = useState<EditorMode>("split");
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("saved");
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [isFocusMode, setIsFocusMode] = useState<boolean>(false);
  const [previewOpen, setPreviewOpen] = useState<boolean>(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState<boolean>(false);

  // Auto-slug generator from title
  const generateSlug = (text: string) => {
    return text
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, "")
      .replace(/[\s_-]+/g, "-")
      .replace(/^-+|-+$/g, "");
  };

  // Fetch initial post if in edit mode
  useEffect(() => {
    if (isEditMode && initialId && status === "authenticated") {
      const fetchArticle = async () => {
        setLoading(true);
        try {
          const res = await axios.get(`${API_URL}/superAdmin/blog/${initialId}`, {
            withCredentials: true,
            headers: {
              Authorization: `Bearer ${session?.user?.backendTokens?.at || ""}`,
            },
          });
          if (res.data) {
            setFormData({
              id: res.data.id,
              title: res.data.title || "",
              slug: res.data.slug || "",
              excerpt: res.data.excerpt || "",
              coverImage: res.data.coverImage || "/blog/hospitality_display.jpg",
              coverAlt: res.data.coverAlt || "",
              category: res.data.category || "Hospitality Tech",
              tags: Array.isArray(res.data.tags) ? res.data.tags : [],
              authorName: res.data.authorName || "Nobstacle Team",
              authorRole: res.data.authorRole || "Guest Experience Specialist",
              authorAvatar: res.data.authorAvatar || "",
              readTime: res.data.readTime || "5 min read",
              content: res.data.content || "",
              isPublished: res.data.isPublished ?? true,
              publishedAt: res.data.publishedAt || res.data.createdAt,
              seoTitle: res.data.seoTitle || "",
              seoDescription: res.data.seoDescription || "",
              canonicalUrl: res.data.canonicalUrl || "",
            });
            setAutoSlug(false);
          }
        } catch (err: any) {
          message.error("Failed to load article for editing");
          router.push("/dashboard/blogs");
        } finally {
          setLoading(false);
        }
      };
      fetchArticle();
    }
  }, [isEditMode, initialId, session, status, router]);

  // Handle Form Change Patch
  const handlePatch = (patch: Partial<BlogFormData>) => {
    setFormData((prev) => {
      const updated = { ...prev, ...patch };

      // If title changed and autoSlug enabled, update slug
      if (patch.title !== undefined && autoSlug) {
        updated.slug = generateSlug(patch.title);
      }

      // Auto calculate read time
      if (patch.content !== undefined) {
        const rawText = patch.content.replace(/[#*`_~[\]()-]/g, "").trim();
        const words = rawText ? rawText.split(/\s+/).length : 0;
        const mins = Math.max(1, Math.ceil(words / 200));
        updated.readTime = `${mins} min read`;
      }

      return updated;
    });

    setHasUnsavedChanges(true);
    setSaveStatus("unsaved");
  };

  // Warning when navigating away with unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [hasUnsavedChanges]);

  // Keyboard shortcut: Ctrl+S / Cmd+S
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        handleSave(formData.isPublished);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [formData]);

  // Save / Publish Master Action
  const handleSave = async (publishState: boolean) => {
    if (!formData.title.trim()) {
      message.error("Please enter an article title before saving");
      return;
    }
    if (!formData.slug.trim()) {
      message.error("Please provide a valid URL slug");
      return;
    }
    if (!formData.content.trim()) {
      message.error("Article content cannot be empty");
      return;
    }

    setSubmitting(true);
    setSaveStatus("saving");

    const payload = {
      ...formData,
      isPublished: publishState,
      tags: Array.isArray(formData.tags) ? formData.tags : [],
    };

    try {
      setHasUnsavedChanges(false);

      if (isEditMode && initialId) {
        await axios.patch(`${API_URL}/superAdmin/blog/${initialId}`, payload, {
          withCredentials: true,
          headers: {
            Authorization: `Bearer ${session?.user?.backendTokens?.at || ""}`,
          },
        });
        message.success(publishState ? "Article updated and published live!" : "Draft changes saved!");
        router.push("/dashboard/blogs");
      } else {
        await axios.post(`${API_URL}/superAdmin/blog`, payload, {
          withCredentials: true,
          headers: {
            Authorization: `Bearer ${session?.user?.backendTokens?.at || ""}`,
          },
        });
        message.success(publishState ? "Article published successfully!" : "Draft created successfully!");
        router.push("/dashboard/blogs");
      }

      setSaveStatus("saved");
      setLastSavedAt(new Date());
    } catch (err: any) {
      setSaveStatus("error");
      setHasUnsavedChanges(true);
      message.error(err?.response?.data?.message || "Failed to save article");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-12">
        <Spin size="large" tip="Loading Article Publishing Workspace..." />
      </div>
    );
  }

  return (
    <div className="h-full w-full overflow-y-auto overflow-x-hidden bg-[#F8FAFC] pb-24 text-slate-900">
      {/* 1. Persistent Top Header */}
      <EditorHeader
        isEditMode={isEditMode}
        isPublished={formData.isPublished}
        saveStatus={saveStatus}
        lastSavedAt={lastSavedAt}
        isFocusMode={isFocusMode}
        submitting={submitting}
        onToggleFocusMode={() => setIsFocusMode(!isFocusMode)}
        onOpenPreview={() => setPreviewOpen(true)}
        onSaveDraft={() => handleSave(false)}
        onPublish={() => handleSave(true)}
      />

      {/* 2. Main Two-Column Workspace */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-6 sm:pt-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
          {/* Main Writing Canvas */}
          <div className={isFocusMode ? "lg:col-span-12 max-w-4xl mx-auto w-full transition-all" : "lg:col-span-8 transition-all"}>
            <ArticleMainCanvas
              title={formData.title}
              slug={formData.slug}
              excerpt={formData.excerpt}
              content={formData.content}
              autoSlug={autoSlug}
              editorMode={editorMode}
              onTitleChange={(title) => handlePatch({ title })}
              onSlugChange={(slug) => {
                setAutoSlug(false);
                handlePatch({ slug: generateSlug(slug) });
              }}
              onAutoSlugToggle={() => {
                const next = !autoSlug;
                setAutoSlug(next);
                if (next) {
                  handlePatch({ slug: generateSlug(formData.title) });
                }
              }}
              onExcerptChange={(excerpt) => handlePatch({ excerpt })}
              onContentChange={(content) => handlePatch({ content })}
              onEditorModeChange={(editorMode) => setEditorMode(editorMode)}
            />
          </div>

          {/* Inspector Sidebar */}
          {!isFocusMode && (
            <div className="lg:col-span-4 w-full">
              <ArticleSidebar
                data={formData}
                onChange={(patch) => handlePatch(patch)}
              />
            </div>
          )}
        </div>
      </div>

      {/* 3. Device Simulation Preview Modal */}
      <DevicePreviewModal
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        data={formData}
      />
    </div>
  );
}

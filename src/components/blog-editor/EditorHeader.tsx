"use client";

import React from "react";
import Link from "next/link";
import { Button, Space, Tag, Dropdown, MenuProps } from "antd";
import {
  ArrowLeftOutlined,
  EyeOutlined,
  SaveOutlined,
  CloudUploadOutlined,
  CheckCircleOutlined,
  SyncOutlined,
  WarningOutlined,
  FullscreenOutlined,
  FullscreenExitOutlined,
  MoreOutlined,
} from "@ant-design/icons";
import { SaveStatus } from "./types";

interface EditorHeaderProps {
  isEditMode: boolean;
  isPublished: boolean;
  saveStatus: SaveStatus;
  lastSavedAt: Date | null;
  isFocusMode: boolean;
  submitting: boolean;
  onToggleFocusMode: () => void;
  onOpenPreview: () => void;
  onSaveDraft: () => void;
  onPublish: () => void;
}

export default function EditorHeader({
  isEditMode,
  isPublished,
  saveStatus,
  lastSavedAt,
  isFocusMode,
  submitting,
  onToggleFocusMode,
  onOpenPreview,
  onSaveDraft,
  onPublish,
}: EditorHeaderProps) {
  const getSaveStatusBadge = () => {
    switch (saveStatus) {
      case "saving":
        return (
          <Tag icon={<SyncOutlined spin />} color="processing" className="rounded-full px-2.5 py-0.5">
            Saving...
          </Tag>
        );
      case "saved":
        return (
          <Tag icon={<CheckCircleOutlined />} color="success" className="rounded-full px-2.5 py-0.5">
            {lastSavedAt
              ? `Saved ${lastSavedAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
              : "Saved just now"}
          </Tag>
        );
      case "unsaved":
        return (
          <Tag icon={<WarningOutlined />} color="warning" className="rounded-full px-2.5 py-0.5">
            Unsaved changes
          </Tag>
        );
      case "error":
        return (
          <Tag color="error" className="rounded-full px-2.5 py-0.5">
            Failed to save
          </Tag>
        );
      default:
        return null;
    }
  };

  const moreMenuItems: MenuProps["items"] = [
    {
      key: "discard",
      label: "Discard changes",
      danger: true,
    },
  ];

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-slate-200 px-4 sm:px-6 py-3 transition-all">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        {/* Left Side: Back & Title */}
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/blogs"
            className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors p-1.5 rounded-lg hover:bg-slate-100"
          >
            <ArrowLeftOutlined />
            <span className="hidden sm:inline">Back to Articles</span>
          </Link>

          <div className="h-4 w-px bg-slate-200 hidden sm:block" />

          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-800 text-sm sm:text-base">
              {isEditMode ? "Edit Article" : "Create Article"}
            </span>
            <Tag color={isPublished ? "green" : "default"} className="rounded-full text-[11px] font-semibold">
              {isPublished ? "Published" : "Draft"}
            </Tag>
            {getSaveStatusBadge()}
          </div>
        </div>

        {/* Right Side: Tools & Actions */}
        <div className="flex items-center gap-2 sm:gap-3">
          <Button
            type="text"
            icon={isFocusMode ? <FullscreenExitOutlined /> : <FullscreenOutlined />}
            onClick={onToggleFocusMode}
            title={isFocusMode ? "Exit Focus Mode" : "Distraction-Free Focus Mode"}
            className="text-slate-600 hover:text-slate-900"
          >
            <span className="hidden md:inline">{isFocusMode ? "Exit Focus" : "Focus"}</span>
          </Button>

          <Button
            icon={<EyeOutlined />}
            onClick={onOpenPreview}
            className="font-medium text-slate-700 hover:text-blue-600"
          >
            <span className="hidden sm:inline">Preview</span>
          </Button>

          <Button
            icon={<SaveOutlined />}
            onClick={onSaveDraft}
            loading={submitting && !isPublished}
            className="font-medium text-slate-700"
          >
            <span className="hidden sm:inline">Save Draft</span>
          </Button>

          <Button
            type="primary"
            icon={<CloudUploadOutlined />}
            onClick={onPublish}
            loading={submitting && isPublished}
            className="bg-blue-600 hover:bg-blue-500 font-semibold shadow-sm"
          >
            {isEditMode ? (isPublished ? "Update Article" : "Publish Now") : "Publish Article"}
          </Button>
        </div>
      </div>
    </header>
  );
}

"use client";

import React, { useState } from "react";
import { Modal, Button, Radio, Tag } from "antd";
import {
  DesktopOutlined,
  TabletOutlined,
  MobileOutlined,
  CloseOutlined,
  FieldTimeOutlined,
  CalendarOutlined,
} from "@ant-design/icons";
import { BlogFormData, DeviceView } from "./types";

interface DevicePreviewModalProps {
  open: boolean;
  onClose: () => void;
  data: BlogFormData;
}

export default function DevicePreviewModal({ open, onClose, data }: DevicePreviewModalProps) {
  const [device, setDevice] = useState<DeviceView>("desktop");

  const getContainerWidth = () => {
    switch (device) {
      case "mobile":
        return "max-w-[390px]";
      case "tablet":
        return "max-w-[768px]";
      case "desktop":
      default:
        return "max-w-[1100px]";
    }
  };

  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={null}
      width={1200}
      centered
      className="device-preview-modal"
      title={
        <div className="flex items-center justify-between pr-8">
          <div className="font-bold text-slate-800 text-base">Live Reader Simulation</div>
          <Radio.Group
            value={device}
            onChange={(e) => setDevice(e.target.value)}
            buttonStyle="solid"
            size="small"
          >
            <Radio.Button value="desktop">
              <DesktopOutlined /> Desktop
            </Radio.Button>
            <Radio.Button value="tablet">
              <TabletOutlined /> Tablet
            </Radio.Button>
            <Radio.Button value="mobile">
              <MobileOutlined /> Mobile
            </Radio.Button>
          </Radio.Group>
        </div>
      }
    >
      <div className="bg-slate-100 p-4 sm:p-8 rounded-2xl min-h-[600px] max-h-[80vh] overflow-y-auto flex justify-center">
        <div
          className={`w-full ${getContainerWidth()} bg-white rounded-2xl shadow-xl overflow-hidden transition-all duration-300 border border-slate-200`}
        >
          {/* Article Header (Dark Hero) */}
          <div className="bg-gradient-to-b from-[#0B1528] via-[#0F1C36] to-[#1E293B] text-white p-6 sm:p-12 text-center relative">
            <div className="inline-block px-3 py-1 text-xs font-bold rounded-full bg-blue-500/20 text-blue-300 border border-blue-400/30 mb-4">
              {data.category || "Hospitality Tech"}
            </div>
            <h1 className="text-2xl sm:text-4xl font-black tracking-tight text-white mb-4 leading-tight" style={{ color: '#ffffff' }}>
              {data.title || "Untitled Article"}
            </h1>
            <p className="text-sm sm:text-base text-slate-300 max-w-2xl mx-auto mb-6 leading-relaxed">
              {data.excerpt || "Article summary overview..."}
            </p>

            <div className="flex items-center justify-center gap-4 text-xs text-slate-400">
              <div className="flex items-center gap-2">
                <img
                  src={data.authorAvatar || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150"}
                  alt={data.authorName}
                  className="w-6 h-6 rounded-full object-cover border border-slate-600"
                />
                <span className="font-semibold text-white">{data.authorName || "Author"}</span>
              </div>
              <span>•</span>
              <span className="flex items-center gap-1">
                <CalendarOutlined /> {new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <FieldTimeOutlined /> {data.readTime || "5 min read"}
              </span>
            </div>
          </div>

          {/* Featured Cover Image */}
          {data.coverImage && (
            <div className="p-4 sm:p-8 -mt-6">
              <div className="rounded-2xl overflow-hidden shadow-lg aspect-video bg-slate-900 border border-slate-200">
                <img
                  src={data.coverImage}
                  alt={data.coverAlt || data.title}
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
          )}

          {/* Article Body */}
          <div className="p-6 sm:p-12 prose prose-slate max-w-none text-slate-800 leading-relaxed text-base">
            {data.content ? (
              <div className="space-y-6">
                {data.content.split("\n\n").map((block, i) => {
                  const t = block.trim();
                  if (t.startsWith("## ")) {
                    return <h2 key={i} className="text-2xl font-black text-slate-900 border-b pb-2 pt-4">{t.replace("## ", "")}</h2>;
                  }
                  if (t.startsWith("### ")) {
                    return <h3 key={i} className="text-xl font-extrabold text-slate-800 pt-2">{t.replace("### ", "")}</h3>;
                  }
                  if (t.startsWith("> ")) {
                    return <blockquote key={i} className="border-l-4 border-blue-600 bg-blue-50/40 p-4 rounded-r-xl italic text-slate-700">{t.replace("> ", "")}</blockquote>;
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
                  if (t === "---") {
                    return <hr key={i} className="my-8 border-slate-200" />;
                  }
                  return <p key={i} className="leading-relaxed">{t}</p>;
                })}
              </div>
            ) : (
              <div className="text-slate-400 italic text-center py-12">No article content written yet.</div>
            )}

            {/* Tags */}
            {data.tags && data.tags.length > 0 && (
              <div className="pt-8 mt-8 border-t border-slate-200 flex flex-wrap gap-2">
                {data.tags.map((tag) => (
                  <Tag key={tag} className="rounded-full px-3 py-1 text-xs font-semibold bg-slate-100 border-slate-200 text-slate-700">
                    #{tag}
                  </Tag>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
}

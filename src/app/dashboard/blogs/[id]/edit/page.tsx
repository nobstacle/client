"use client";

import React from "react";
import { useParams } from "next/navigation";
import BlogArticleEditor from "@/components/blog-editor/BlogArticleEditor";

export default function EditBlogPage() {
  const params = useParams();
  const rawId = params?.id;
  const articleId = typeof rawId === "string" ? parseInt(rawId, 10) : undefined;

  return <BlogArticleEditor initialId={articleId} />;
}

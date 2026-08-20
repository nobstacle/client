"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Table,
  Button,
  Space,
  Input,
  Select,
  Switch,
  Tag,
  Typography,
  Card,
  Popconfirm,
  message,
  Row,
  Col,
  Image as AntImage,
} from "antd";
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  EyeOutlined,
  SearchOutlined,
  ReloadOutlined,
} from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import axios from "axios";

const { Title, Text } = Typography;
const { Option } = Select;

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3001";
const API_URL = `${BACKEND_URL}/api/v1`;

interface BlogPostItem {
  id: number;
  slug: string;
  title: string;
  excerpt: string;
  coverImage: string;
  category: string;
  tags: string[];
  authorName: string;
  authorRole: string;
  authorAvatar?: string;
  readTime: string;
  content: string;
  isPublished: boolean;
  publishedAt: string;
  createdAt: string;
  updatedAt: string;
}

const CATEGORY_PRESETS = [
  "Hospitality Tech",
  "Customer Experience",
  "Multilingual AI",
  "Analytics & ROI",
  "Product Updates",
  "Guides & Tutorials",
];

export default function SuperAdminBlogsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [posts, setPosts] = useState<BlogPostItem[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedCategory, setSelectedCategory] = useState<string>("All");

  const isSAdmin = session?.user?.Roles?.includes("SAdmin");

  const fetchPosts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_URL}/superAdmin/blog`, {
        withCredentials: true,
        headers: {
          Authorization: `Bearer ${session?.user?.backendTokens?.at || ""}`,
        },
      });
      if (Array.isArray(res.data)) {
        setPosts(res.data);
      }
    } catch (err: any) {
      console.error("Failed to fetch blog posts:", err);
      // Fallback: try public endpoint
      try {
        const publicRes = await axios.get(`${API_URL}/blog`);
        if (Array.isArray(publicRes.data)) {
          setPosts(publicRes.data);
        }
      } catch {
        message.error("Failed to load blog posts");
      }
    } finally {
      setLoading(false);
    }
  }, [session]);

  useEffect(() => {
    if (status === "authenticated") {
      if (!isSAdmin) {
        message.error("Access denied. SuperAdmin role required.");
        router.push("/dashboard");
        return;
      }
      fetchPosts();
    }
  }, [status, isSAdmin, fetchPosts, router]);

  // Delete Post
  const handleDelete = async (id: number) => {
    try {
      await axios.delete(`${API_URL}/superAdmin/blog/${id}`, {
        withCredentials: true,
        headers: {
          Authorization: `Bearer ${session?.user?.backendTokens?.at || ""}`,
        },
      });
      message.success("Blog post deleted");
      setPosts((prev) => prev.filter((p) => p.id !== id));
    } catch (err: any) {
      message.error(err?.response?.data?.message || "Failed to delete blog post");
    }
  };

  // Toggle Publish Status Quick Action
  const handleTogglePublish = async (post: BlogPostItem) => {
    try {
      await axios.patch(
        `${API_URL}/superAdmin/blog/${post.id}`,
        { isPublished: !post.isPublished },
        {
          withCredentials: true,
          headers: {
            Authorization: `Bearer ${session?.user?.backendTokens?.at || ""}`,
          },
        }
      );
      message.success(`Post ${!post.isPublished ? "published" : "moved to drafts"}`);
      setPosts((prev) =>
        prev.map((p) => (p.id === post.id ? { ...p, isPublished: !p.isPublished } : p))
      );
    } catch {
      message.error("Failed to update publish status");
    }
  };

  // Filtered Table Data
  const filteredPosts = posts.filter((post) => {
    const matchesCategory =
      selectedCategory === "All" || post.category === selectedCategory;
    const matchesSearch =
      searchQuery.trim() === "" ||
      post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      post.slug.toLowerCase().includes(searchQuery.toLowerCase()) ||
      post.authorName.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const columns: ColumnsType<BlogPostItem> = [
    {
      title: "Cover",
      dataIndex: "coverImage",
      key: "coverImage",
      width: 90,
      render: (coverImage: string) => (
        <div className="w-16 h-10 rounded-lg overflow-hidden bg-slate-800 flex items-center justify-center border border-slate-200">
          <AntImage
            src={coverImage}
            alt="cover"
            width={64}
            height={40}
            style={{ objectFit: "cover" }}
            fallback="/Logo_Light.png"
          />
        </div>
      ),
    },
    {
      title: "Title & Slug",
      dataIndex: "title",
      key: "title",
      render: (title: string, record: BlogPostItem) => (
        <div>
          <Link
            href={`/dashboard/blogs/${record.id}/edit`}
            className="text-slate-900 font-bold text-sm block hover:text-blue-600 transition-colors"
          >
            {title}
          </Link>
          <Text type="secondary" className="text-xs text-slate-400 font-mono">
            /{record.slug}
          </Text>
        </div>
      ),
    },
    {
      title: "Category",
      dataIndex: "category",
      key: "category",
      width: 150,
      render: (category: string) => (
        <Tag color="blue" className="rounded-full px-2.5 py-0.5 text-xs font-semibold">
          {category}
        </Tag>
      ),
    },
    {
      title: "Author",
      dataIndex: "authorName",
      key: "authorName",
      width: 160,
      render: (authorName: string, record: BlogPostItem) => (
        <div>
          <span className="text-xs font-bold text-slate-700 block">{authorName}</span>
          <span className="text-[11px] text-slate-400 block">{record.authorRole}</span>
        </div>
      ),
    },
    {
      title: "Status",
      dataIndex: "isPublished",
      key: "isPublished",
      width: 120,
      render: (isPublished: boolean, record: BlogPostItem) => (
        <Switch
          checked={isPublished}
          checkedChildren="Live"
          unCheckedChildren="Draft"
          onChange={() => handleTogglePublish(record)}
        />
      ),
    },
    {
      title: "Date",
      dataIndex: "publishedAt",
      key: "publishedAt",
      width: 120,
      render: (publishedAt: string) => (
        <span className="text-xs text-slate-500">
          {new Date(publishedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
        </span>
      ),
    },
    {
      title: "Actions",
      key: "actions",
      width: 140,
      render: (_: any, record: BlogPostItem) => (
        <Space size="small">
          <Link href={`/blog/${record.slug}`} target="_blank" title="View Public Post">
            <Button size="small" icon={<EyeOutlined />} />
          </Link>
          <Link href={`/dashboard/blogs/${record.id}/edit`} title="Open Editorial Workspace">
            <Button size="small" type="primary" icon={<EditOutlined />} />
          </Link>
          <Popconfirm
            title="Delete this article?"
            description="Are you sure you want to permanently remove this blog post?"
            onConfirm={() => handleDelete(record.id)}
            okText="Yes, Delete"
            cancelText="Cancel"
            okButtonProps={{ danger: true }}
          >
            <Button size="small" danger icon={<DeleteOutlined />} title="Delete Post" />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div className="h-full w-full overflow-y-auto overflow-x-hidden p-6 sm:p-8 max-w-7xl mx-auto space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <Title level={2} className="!mb-1 text-slate-900 font-extrabold tracking-tight">
            Blog Articles
          </Title>
          <Text type="secondary" className="text-slate-500 text-sm">
            Publish, edit, and manage all articles and SEO guides on the Nobstacle public blog.
          </Text>
        </div>
        <Space>
          <Button icon={<ReloadOutlined />} onClick={fetchPosts} loading={loading}>
            Refresh
          </Button>
          <Link href="/dashboard/blogs/create">
            <Button
              type="primary"
              icon={<PlusOutlined />}
              size="large"
              className="bg-blue-600 hover:bg-blue-500 font-semibold shadow-sm"
            >
              Create New Article
            </Button>
          </Link>
        </Space>
      </div>

      {/* Filter & Search Bar */}
      <Card className="shadow-xs border-slate-200 rounded-2xl">
        <Row gutter={[16, 16]} align="middle">
          <Col xs={24} sm={12} md={8}>
            <Input
              placeholder="Search by title, slug, or author..."
              prefix={<SearchOutlined className="text-slate-400" />}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              allowClear
              className="rounded-xl"
            />
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Select
              className="w-full"
              value={selectedCategory}
              onChange={(val) => setSelectedCategory(val)}
            >
              <Option value="All">All Categories</Option>
              {CATEGORY_PRESETS.map((cat) => (
                <Option key={cat} value={cat}>
                  {cat}
                </Option>
              ))}
            </Select>
          </Col>
          <Col xs={24} md={10} className="text-right">
            <Text type="secondary" className="text-xs">
              Showing {filteredPosts.length} of {posts.length} articles
            </Text>
          </Col>
        </Row>
      </Card>

      {/* Main Table */}
      <Card className="shadow-xs border-slate-200 rounded-2xl overflow-hidden">
        <Table
          columns={columns}
          dataSource={filteredPosts}
          rowKey="id"
          loading={loading}
          pagination={{ pageSize: 10 }}
        />
      </Card>
    </div>
  );
}

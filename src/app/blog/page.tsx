"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import Header from "@/components/home/Header";
import Footer from "@/components/home/Footer";
import ScrollObserver from "@/components/client-helpers/ScrollObserver";
import { BlogPost } from "@/data/blogPosts";
import "@/styles/home.css";
import axios from "axios";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3001";
const API_URL = `${BACKEND_URL}/api/v1`;

export default function BlogIndexPage() {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [searchQuery, setSearchQuery] = useState<string>("");

  useEffect(() => {
    let isMounted = true;
    const fetchLivePosts = async () => {
      setLoading(true);
      try {
        const res = await axios.get(`${API_URL}/blog`, { timeout: 10000 });
        if (isMounted && Array.isArray(res.data)) {
          const mapped: BlogPost[] = res.data.map((p: any) => ({
            id: String(p.id),
            slug: p.slug,
            title: p.title,
            excerpt: p.excerpt,
            coverImage: p.coverImage || "https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?w=1200&auto=format&fit=crop&q=80",
            category: p.category || "General",
            tags: p.tags || [],
            author: {
              name: p.authorName || p.author?.name || "Nobstacle Team",
              role: p.authorRole || p.author?.role || "Guest Experience Specialist",
              avatar: p.authorAvatar || p.author?.avatar || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
            },
            publishedAt: p.publishedAt || p.createdAt,
            readTime: p.readTime || "5 min read",
            content: p.content || "",
          }));
          setPosts(mapped);
        }
      } catch (e) {
        console.warn("Failed to fetch blog posts from API:", e);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };
    fetchLivePosts();
    return () => {
      isMounted = false;
    };
  }, []);

  const categories = useMemo(() => {
    const set = new Set<string>(["All"]);
    posts.forEach((p) => {
      if (p.category) set.add(p.category);
    });
    return Array.from(set);
  }, [posts]);

  const filteredPosts = useMemo(() => {
    return posts.filter((post) => {
      const matchesCategory =
        selectedCategory === "All" || post.category === selectedCategory;
      const matchesQuery =
        searchQuery.trim() === "" ||
        post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        post.excerpt.toLowerCase().includes(searchQuery.toLowerCase()) ||
        post.tags.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchesCategory && matchesQuery;
    });
  }, [posts, selectedCategory, searchQuery]);

  const featuredPost = filteredPosts.length > 0 ? filteredPosts[0] : null;
  const regularPosts = filteredPosts.length > 1 ? filteredPosts.slice(1) : [];

  return (
    <main className="min-h-screen bg-[#f8f9fa] text-[#121212] flex flex-col justify-between" style={{ fontFamily: 'var(--font-sans)' }}>
      <ScrollObserver />
      <Header theme="light" />

      {/* Top Hero Section — Clean, bright homepage palette */}
      <section className="relative overflow-hidden bg-gradient-to-b from-white via-[#f0f3f9] to-[#f8f9fa] pt-32 pb-16 border-b border-[#edf0f4]">
        {/* Subtle grid pattern matching homepage accent */}
        <div className="absolute inset-0 opacity-[0.035] bg-[radial-gradient(#3b5998_1.5px,transparent_1.5px)] [background-size:24px_24px] pointer-events-none" />
        
        {/* Soft brand glow */}
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[550px] h-[260px] bg-[#3b5998]/8 blur-[100px] rounded-full pointer-events-none" />

        <div className="container mx-auto px-4 sm:px-6 max-w-5xl relative z-10 text-center">
          <div
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold tracking-wider uppercase mb-5 shadow-sm"
            style={{
              backgroundColor: "rgba(59, 89, 152, 0.08)",
              color: "var(--color-accent)",
              border: "1px solid rgba(59, 89, 152, 0.2)",
            }}
          >
            <span className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: "var(--color-accent)" }} />
            Nobstacle Insights & Guides
          </div>

          <h1
            className="text-3xl sm:text-5xl lg:text-6xl font-bold tracking-tight mb-5 leading-[1.2]"
            style={{ fontFamily: "var(--font-display)", color: "var(--color-text-primary)" }}
          >
            Ideas & Strategies for Modern{" "}
            <span style={{ color: "var(--color-accent)" }}>
              Guest Experiences
            </span>
          </h1>

          <p
            className="text-base sm:text-lg lg:text-xl max-w-2xl mx-auto leading-relaxed mb-8 font-normal"
            style={{ color: "var(--color-text-secondary)" }}
          >
            Actionable playbooks on multilingual customer screens, countertop revenue growth, and frictionless digital check-in.
          </p>

          {/* Search Bar & Filter Controls */}
          <div className="max-w-xl mx-auto mb-6">
            <div className="relative flex items-center bg-white rounded-2xl shadow-sm border border-[#dee2e6] p-1.5 text-slate-800 transition-all focus-within:ring-2 focus-within:ring-[#3b5998] focus-within:border-transparent">
              <svg
                className="w-5 h-5 ml-3 text-[#8a94a0]"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search topics, keywords, guides..."
                className="w-full px-3 py-2 bg-transparent text-sm sm:text-base text-[#121212] placeholder-[#8a94a0] focus:outline-none"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="mr-2 px-2.5 py-1 text-xs font-semibold text-[#5a6472] hover:text-[#121212] bg-[#f0f3f9] rounded-lg transition-colors"
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          {/* Category Filter Pills */}
          {categories.length > 1 && (
            <div className="flex flex-wrap items-center justify-center gap-2">
              {categories.map((category) => {
                const isActive = selectedCategory === category;
                return (
                  <button
                    key={category}
                    onClick={() => setSelectedCategory(category)}
                    className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-200 ${
                      isActive
                        ? "bg-[#3b5998] text-white shadow-sm shadow-[#3b5998]/30 scale-105"
                        : "bg-white text-[#5a6472] hover:bg-[#f0f3f9] hover:text-[#3b5998] border border-[#dee2e6]"
                    }`}
                  >
                    {category}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* Main Content Body */}
      <section className="container mx-auto px-4 sm:px-6 max-w-6xl py-12 relative z-20">
        {/* Loading State Skeleton */}
        {loading && (
          <div className="space-y-12">
            {/* Featured Post Skeleton */}
            <div className="bg-white rounded-2xl overflow-hidden border border-[#edf0f4] shadow-sm animate-pulse">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-0">
                <div className="lg:col-span-7 h-64 sm:h-80 lg:h-[360px] bg-slate-200" />
                <div className="lg:col-span-5 p-6 sm:p-8 flex flex-col justify-between space-y-4">
                  <div className="space-y-3">
                    <div className="h-4 w-24 bg-slate-200 rounded" />
                    <div className="h-7 w-5/6 bg-slate-200 rounded" />
                    <div className="h-7 w-4/6 bg-slate-200 rounded" />
                    <div className="h-4 w-full bg-slate-200 rounded mt-4" />
                    <div className="h-4 w-5/6 bg-slate-200 rounded" />
                  </div>
                  <div className="flex items-center gap-3 pt-4 border-t border-slate-100">
                    <div className="w-9 h-9 rounded-full bg-slate-200" />
                    <div className="space-y-1.5 flex-1">
                      <div className="h-3 w-28 bg-slate-200 rounded" />
                      <div className="h-2.5 w-20 bg-slate-200 rounded" />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Grid Skeletons */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map((n) => (
                <div key={n} className="bg-white rounded-2xl overflow-hidden border border-[#edf0f4] shadow-sm animate-pulse flex flex-col justify-between h-[380px]">
                  <div>
                    <div className="h-48 bg-slate-200" />
                    <div className="p-5 space-y-3">
                      <div className="h-3 w-20 bg-slate-200 rounded" />
                      <div className="h-5 w-4/5 bg-slate-200 rounded" />
                      <div className="h-3 w-full bg-slate-200 rounded" />
                    </div>
                  </div>
                  <div className="px-5 pb-5 pt-3 border-t border-slate-100 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-slate-200" />
                      <div className="h-3 w-20 bg-slate-200 rounded" />
                    </div>
                    <div className="h-3 w-12 bg-slate-200 rounded" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* No results message */}
        {!loading && filteredPosts.length === 0 && (
          <div className="text-center py-16 bg-white rounded-2xl border border-[#dee2e6] shadow-sm">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-slate-100 flex items-center justify-center text-2xl text-slate-400">
              📰
            </div>
            <p className="text-lg font-bold text-[#121212] mb-2" style={{ fontFamily: "var(--font-display)" }}>
              No articles found
            </p>
            <p className="text-sm text-[#5a6472] mb-6">
              {searchQuery || selectedCategory !== "All"
                ? "Try adjusting your search query or switching to another category."
                : "No published blog posts are currently available. Check back soon!"}
            </p>
            {(searchQuery || selectedCategory !== "All") && (
              <button
                onClick={() => {
                  setSelectedCategory("All");
                  setSearchQuery("");
                }}
                className="cta-button text-sm"
              >
                Reset Filters
              </button>
            )}
          </div>
        )}

        {/* Featured Story Section */}
        {!loading && featuredPost && (
          <div className="mb-14">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-bold uppercase tracking-widest text-[#3b5998] flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#3b5998]" />
                Featured Story
              </span>
              <span className="text-xs font-medium text-[#8a94a0]">
                {filteredPosts.length} {filteredPosts.length === 1 ? "article" : "articles"} available
              </span>
            </div>

            <Link
              href={`/blog/${featuredPost.slug}`}
              className="group block bg-white rounded-2xl overflow-hidden border border-[#edf0f4] shadow-sm hover:shadow-lg transition-all duration-300 hover:-translate-y-1"
            >
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-0">
                <div className="relative lg:col-span-7 h-64 sm:h-80 lg:h-auto min-h-[300px] bg-[#f0f3f9] overflow-hidden">
                  <Image
                    src={featuredPost.coverImage}
                    alt={featuredPost.title}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
                    priority
                    unoptimized={!featuredPost.coverImage.startsWith("/")}
                  />
                  <div className="absolute top-4 left-4">
                    <span className="px-3.5 py-1.5 text-xs font-bold rounded-full bg-[#3b5998] text-white shadow-md">
                      {featuredPost.category}
                    </span>
                  </div>
                </div>

                <div className="lg:col-span-5 p-6 sm:p-8 flex flex-col justify-between bg-white">
                  <div>
                    <div className="flex items-center gap-3 text-xs font-semibold text-[#8a94a0] mb-3">
                      <span>{new Date(featuredPost.publishedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
                      <span>•</span>
                      <span>{featuredPost.readTime}</span>
                    </div>

                    <h2
                      className="text-2xl sm:text-3xl font-bold text-[#121212] group-hover:text-[#3b5998] transition-colors mb-3 leading-snug"
                      style={{ fontFamily: "var(--font-display)" }}
                    >
                      {featuredPost.title}
                    </h2>

                    <p className="text-[#5a6472] text-sm sm:text-base line-clamp-3 leading-relaxed mb-5">
                      {featuredPost.excerpt}
                    </p>

                    <div className="flex flex-wrap gap-1.5 mb-5">
                      {featuredPost.tags.slice(0, 3).map((tag) => (
                        <span
                          key={tag}
                          className="px-2.5 py-1 rounded-lg text-xs font-medium bg-[#f0f3f9] text-[#5a6472]"
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-5 border-t border-[#edf0f4]">
                    <div className="flex items-center gap-3">
                      <img
                        src={featuredPost.author.avatar}
                        alt={featuredPost.author.name}
                        className="w-9 h-9 rounded-full object-cover border border-[#dee2e6]"
                      />
                      <div>
                        <p className="text-xs font-bold text-[#121212]">{featuredPost.author.name}</p>
                        <p className="text-[11px] text-[#8a94a0]">{featuredPost.author.role}</p>
                      </div>
                    </div>

                    <span className="inline-flex items-center gap-1 text-sm font-semibold text-[#3b5998] group-hover:translate-x-1 transition-all">
                      Read Story &rarr;
                    </span>
                  </div>
                </div>
              </div>
            </Link>
          </div>
        )}

        {/* Regular Posts Grid */}
        {!loading && regularPosts.length > 0 && (
          <div className="mb-16">
            <h3
              className="text-xl sm:text-2xl font-bold text-[#121212] mb-6 flex items-center gap-2"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Explore More Articles
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {regularPosts.map((post) => (
                <article
                  key={post.id}
                  className="group bg-white rounded-2xl overflow-hidden border border-[#edf0f4] shadow-sm hover:shadow-md transition-all duration-300 flex flex-col justify-between hover:-translate-y-1"
                >
                  <div>
                    <Link
                      href={`/blog/${post.slug}`}
                      className="block relative h-48 bg-[#f0f3f9] overflow-hidden"
                    >
                      <Image
                        src={post.coverImage}
                        alt={post.title}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-500"
                        unoptimized={!post.coverImage.startsWith("/")}
                      />
                      <div className="absolute top-3 left-3">
                        <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-[#121212]/80 text-white backdrop-blur-sm shadow">
                          {post.category}
                        </span>
                      </div>
                    </Link>

                    <div className="p-5">
                      <div className="flex items-center gap-2 text-xs font-semibold text-[#8a94a0] mb-2.5">
                        <span>{new Date(post.publishedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
                        <span>•</span>
                        <span>{post.readTime}</span>
                      </div>

                      <h4
                        className="text-lg font-bold text-[#121212] group-hover:text-[#3b5998] transition-colors mb-2 leading-snug"
                        style={{ fontFamily: "var(--font-display)" }}
                      >
                        <Link href={`/blog/${post.slug}`}>
                          {post.title}
                        </Link>
                      </h4>

                      <p className="text-[#5a6472] text-xs sm:text-sm line-clamp-2 leading-relaxed mb-4">
                        {post.excerpt}
                      </p>

                      <div className="flex flex-wrap gap-1 mb-2">
                        {post.tags.slice(0, 2).map((tag) => (
                          <span
                            key={tag}
                            className="px-2 py-0.5 rounded-md text-[11px] font-medium bg-[#f0f3f9] text-[#5a6472]"
                          >
                            #{tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="px-5 pb-5 pt-3 border-t border-[#edf0f4] flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <img
                        src={post.author.avatar}
                        alt={post.author.name}
                        className="w-7 h-7 rounded-full object-cover border border-[#dee2e6]"
                      />
                      <span className="text-xs font-semibold text-[#5a6472]">{post.author.name}</span>
                    </div>

                    <Link
                      href={`/blog/${post.slug}`}
                      className="text-xs font-bold text-[#3b5998] hover:text-[#2f477a] group-hover:translate-x-1 transition-transform inline-flex items-center gap-1"
                    >
                      Read &rarr;
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* Brand CTA Banner — Exactly matching homepage identity */}
      <div className="cta-banner animate-on-scroll">
        <div className="container cta-banner-inner">
          <div className="cta-banner-text">
            <h3 style={{ fontFamily: "var(--font-display)" }}>
              Ready to Transform Your Customer Experience?
            </h3>
            <p style={{ fontFamily: "var(--font-sans)" }}>
              Deliver seamless multilingual communication, elevate check-in CSAT scores, and maximize countertop upselling conversion with Nobstacle.
            </p>
          </div>
          <div className="cta-banner-actions">
            <a href="/#contact" className="cta-button">Schedule a Consultation</a>
            <a href="/register" className="cta-button cta-button-secondary cta-button-light">Start Free Trial</a>
          </div>
        </div>
      </div>

      <Footer />
    </main>
  );
}

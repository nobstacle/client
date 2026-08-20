"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import Header from "@/components/home/Header";
import Footer from "@/components/home/Footer";
import ScrollObserver from "@/components/client-helpers/ScrollObserver";
import { blogPosts as fallbackPosts, BLOG_CATEGORIES, BlogPost } from "@/data/blogPosts";
import "@/styles/home.css";
import axios from "axios";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3001";
const API_URL = `${BACKEND_URL}/api/v1`;

export default function BlogIndexPage() {
  const [posts, setPosts] = useState<BlogPost[]>(fallbackPosts);
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [searchQuery, setSearchQuery] = useState<string>("");

  useEffect(() => {
    const fetchLivePosts = async () => {
      try {
        const res = await axios.get(`${API_URL}/blog`);
        if (Array.isArray(res.data) && res.data.length > 0) {
          // Normalize author structure if returned flat from DB
          const mapped: BlogPost[] = res.data.map((p: any) => ({
            id: String(p.id),
            slug: p.slug,
            title: p.title,
            excerpt: p.excerpt,
            coverImage: p.coverImage,
            category: p.category,
            tags: p.tags || [],
            author: {
              name: p.authorName || p.author?.name || "Nobstacle Team",
              role: p.authorRole || p.author?.role || "Guest Experience Specialist",
              avatar: p.authorAvatar || p.author?.avatar || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
            },
            publishedAt: p.publishedAt || p.createdAt,
            readTime: p.readTime || "5 min read",
            content: p.content,
          }));
          setPosts(mapped);
        }
      } catch (e) {
        console.warn("Using fallback blog posts:", e);
      }
    };
    fetchLivePosts();
  }, []);

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
    <main className="min-h-screen bg-[#F8FAFC] text-slate-900 flex flex-col justify-between">
      <ScrollObserver />
      <Header theme="dark" />

      {/* Top Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-b from-[#0B1528] via-[#0F1C36] to-[#F8FAFC] pt-36 pb-24 text-white">
        {/* Subtle grid background */}
        <div className="absolute inset-0 opacity-[0.07] bg-[radial-gradient(#ffffff_1.5px,transparent_1.5px)] [background-size:24px_24px] pointer-events-none" />
        
        {/* Ambient glow */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-blue-600/20 blur-[120px] rounded-full pointer-events-none" />

        <div className="container mx-auto px-4 sm:px-6 max-w-6xl relative z-10 text-center">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold tracking-wider uppercase bg-blue-500/15 text-blue-300 border border-blue-400/25 mb-6 shadow-sm">
            <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
            Nobstacle Insights & Guides
          </div>

          <h1
            className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight text-white mb-6 leading-[1.15]"
            style={{ color: "#ffffff" }}
          >
            Ideas & Strategies for Modern{" "}
            <span className="bg-gradient-to-r from-blue-400 via-indigo-300 to-sky-300 bg-clip-text text-transparent">
              Guest Experiences
            </span>
          </h1>

          <p className="text-base sm:text-lg lg:text-xl text-slate-300 max-w-2xl mx-auto leading-relaxed mb-10 font-normal">
            Actionable playbooks on multilingual customer screens, countertop revenue growth, and frictionless digital check-in.
          </p>

          {/* Search Bar & Filter Controls */}
          <div className="max-w-2xl mx-auto mb-4">
            <div className="relative flex items-center bg-white/95 backdrop-blur-md rounded-2xl shadow-xl border border-white/20 p-2 text-slate-800 transition-all focus-within:ring-2 focus-within:ring-blue-400 focus-within:border-transparent">
              <svg
                className="w-5 h-5 ml-3 text-slate-400"
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
                className="w-full px-3 py-2.5 bg-transparent text-sm sm:text-base text-slate-800 placeholder-slate-400 focus:outline-none"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="mr-2 px-2.5 py-1 text-xs font-semibold text-slate-500 hover:text-slate-700 bg-slate-100 rounded-lg transition-colors"
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          {/* Category Filter Pills */}
          <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
            {BLOG_CATEGORIES.map((category) => {
              const isActive = selectedCategory === category;
              return (
                <button
                  key={category}
                  onClick={() => setSelectedCategory(category)}
                  className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-200 ${
                    isActive
                      ? "bg-blue-600 text-white shadow-md shadow-blue-500/25 scale-105"
                      : "bg-white/10 text-slate-300 hover:bg-white/20 hover:text-white border border-white/10"
                  }`}
                >
                  {category}
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* Main Content Body */}
      <section className="container mx-auto px-4 sm:px-6 max-w-6xl py-12 -mt-10 relative z-20">
        {/* No results message */}
        {filteredPosts.length === 0 && (
          <div className="text-center py-20 bg-white rounded-3xl border border-slate-200 shadow-sm">
            <p className="text-xl font-bold text-slate-800 mb-2">No articles found</p>
            <p className="text-sm text-slate-500 mb-6">
              Try adjusting your search query or switching to another category.
            </p>
            <button
              onClick={() => {
                setSelectedCategory("All");
                setSearchQuery("");
              }}
              className="px-5 py-2.5 rounded-xl text-sm font-semibold bg-blue-600 text-white hover:bg-blue-700 transition-colors"
            >
              Reset Filters
            </button>
          </div>
        )}

        {/* Featured Story Section */}
        {featuredPost && (
          <div className="mb-16">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-bold uppercase tracking-widest text-blue-600 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-blue-600" />
                Featured Story
              </span>
              <span className="text-xs font-medium text-slate-500">
                {filteredPosts.length} {filteredPosts.length === 1 ? "article" : "articles"} available
              </span>
            </div>

            <Link
              href={`/blog/${featuredPost.slug}`}
              className="group block bg-white rounded-3xl overflow-hidden border border-slate-200/80 shadow-md hover:shadow-2xl transition-all duration-300 hover:-translate-y-1"
            >
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-0">
                <div className="relative lg:col-span-7 h-64 sm:h-80 lg:h-auto min-h-[320px] bg-slate-900 overflow-hidden">
                  <Image
                    src={featuredPost.coverImage}
                    alt={featuredPost.title}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
                    priority
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/60 via-transparent to-transparent lg:hidden" />
                  <div className="absolute top-4 left-4">
                    <span className="px-3.5 py-1.5 text-xs font-bold rounded-full bg-blue-600 text-white shadow-lg backdrop-blur-md">
                      {featuredPost.category}
                    </span>
                  </div>
                </div>

                <div className="lg:col-span-5 p-6 sm:p-10 flex flex-col justify-between bg-white">
                  <div>
                    <div className="flex items-center gap-3 text-xs font-semibold text-slate-400 mb-4">
                      <span>{new Date(featuredPost.publishedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
                      <span>•</span>
                      <span>{featuredPost.readTime}</span>
                    </div>

                    <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 group-hover:text-blue-600 transition-colors mb-4 leading-snug">
                      {featuredPost.title}
                    </h2>

                    <p className="text-slate-600 text-sm sm:text-base line-clamp-3 leading-relaxed mb-6">
                      {featuredPost.excerpt}
                    </p>

                    <div className="flex flex-wrap gap-1.5 mb-6">
                      {featuredPost.tags.slice(0, 3).map((tag) => (
                        <span
                          key={tag}
                          className="px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-100 text-slate-600"
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-6 border-t border-slate-100">
                    <div className="flex items-center gap-3">
                      <img
                        src={featuredPost.author.avatar}
                        alt={featuredPost.author.name}
                        className="w-10 h-10 rounded-full object-cover border-2 border-slate-200"
                      />
                      <div>
                        <p className="text-xs font-bold text-slate-900">{featuredPost.author.name}</p>
                        <p className="text-[11px] text-slate-500">{featuredPost.author.role}</p>
                      </div>
                    </div>

                    <span className="inline-flex items-center gap-1.5 text-sm font-bold text-blue-600 group-hover:text-blue-700 group-hover:translate-x-1 transition-all">
                      Read Story &rarr;
                    </span>
                  </div>
                </div>
              </div>
            </Link>
          </div>
        )}

        {/* Regular Posts Grid */}
        {regularPosts.length > 0 && (
          <div className="mb-20">
            <h3 className="text-xl sm:text-2xl font-black text-slate-900 mb-8 flex items-center gap-2">
              Explore More Articles
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {regularPosts.map((post) => (
                <article
                  key={post.id}
                  className="group bg-white rounded-2xl overflow-hidden border border-slate-200/90 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col justify-between hover:-translate-y-1.5"
                >
                  <div>
                    <Link
                      href={`/blog/${post.slug}`}
                      className="block relative h-52 bg-slate-900 overflow-hidden"
                    >
                      <Image
                        src={post.coverImage}
                        alt={post.title}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                      <div className="absolute top-3.5 left-3.5">
                        <span className="px-3 py-1 text-xs font-bold rounded-full bg-slate-900/85 text-white backdrop-blur-md shadow">
                          {post.category}
                        </span>
                      </div>
                    </Link>

                    <div className="p-6">
                      <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 mb-3">
                        <span>{new Date(post.publishedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
                        <span>•</span>
                        <span>{post.readTime}</span>
                      </div>

                      <h4 className="text-lg font-bold text-slate-900 group-hover:text-blue-600 transition-colors mb-2.5 leading-snug">
                        <Link href={`/blog/${post.slug}`}>
                          {post.title}
                        </Link>
                      </h4>

                      <p className="text-slate-600 text-xs sm:text-sm line-clamp-2 leading-relaxed mb-4">
                        {post.excerpt}
                      </p>

                      <div className="flex flex-wrap gap-1 mb-2">
                        {post.tags.slice(0, 2).map((tag) => (
                          <span
                            key={tag}
                            className="px-2 py-0.5 rounded-md text-[11px] font-medium bg-slate-100 text-slate-600"
                          >
                            #{tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="px-6 pb-6 pt-3 border-t border-slate-100 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <img
                        src={post.author.avatar}
                        alt={post.author.name}
                        className="w-7 h-7 rounded-full object-cover border border-slate-200"
                      />
                      <span className="text-xs font-semibold text-slate-700">{post.author.name}</span>
                    </div>

                    <Link
                      href={`/blog/${post.slug}`}
                      className="text-xs font-bold text-blue-600 hover:text-blue-800 group-hover:translate-x-1 transition-transform inline-flex items-center gap-1"
                    >
                      Read &rarr;
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          </div>
        )}

        {/* High-Converting CTA Banner */}
        <div className="bg-gradient-to-r from-blue-950 via-indigo-950 to-slate-950 text-white rounded-3xl p-8 sm:p-14 text-center relative overflow-hidden shadow-2xl border border-blue-900/40">
          <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/10 blur-3xl rounded-full pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-indigo-500/10 blur-3xl rounded-full pointer-events-none" />

          <div className="max-w-2xl mx-auto relative z-10">
            <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider bg-blue-500/20 text-blue-300 border border-blue-400/30 mb-4">
              Get Started Today
            </span>
            <h3
              className="text-2xl sm:text-3xl lg:text-4xl font-extrabold mb-4 tracking-tight leading-tight"
              style={{ color: "#ffffff" }}
            >
              Ready to modernize your frontline customer displays?
            </h3>
            <p className="text-slate-300 text-sm sm:text-base mb-8 leading-relaxed font-normal max-w-xl mx-auto">
              Deliver seamless multilingual communication, elevate check-in CSAT scores, and maximize countertop upselling conversion with Nobstacle.
            </p>
            <div className="flex flex-col sm:flex-row gap-3.5 justify-center items-center">
              <a
                href="/#contact"
                className="w-full sm:w-auto px-7 py-3.5 rounded-xl font-bold bg-blue-600 hover:bg-blue-500 text-white transition-all shadow-lg hover:shadow-blue-500/30 text-sm"
              >
                Schedule 1-on-1 Consultation
              </a>
              <a
                href="/register"
                className="w-full sm:w-auto px-7 py-3.5 rounded-xl font-bold bg-white/10 hover:bg-white/20 text-white transition-all border border-white/20 text-sm backdrop-blur-sm"
              >
                Start Free Trial
              </a>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}

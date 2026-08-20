import { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import Header from "@/components/home/Header";
import Footer from "@/components/home/Footer";
import ScrollObserver from "@/components/client-helpers/ScrollObserver";
import { blogPosts, BlogPost } from "@/data/blogPosts";
import "@/styles/home.css";

interface Props {
  params: {
    slug: string;
  };
}

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3001";
const API_URL = `${BACKEND_URL}/api/v1`;

async function fetchPostBySlug(slug: string): Promise<BlogPost | null> {
  try {
    const res = await fetch(`${API_URL}/blog/${slug}`, {
      next: { revalidate: 60 },
    });
    if (res.ok) {
      const data = await res.json();
      return {
        id: String(data.id),
        slug: data.slug,
        title: data.title,
        excerpt: data.excerpt,
        coverImage: data.coverImage,
        category: data.category,
        tags: data.tags || [],
        author: {
          name: data.authorName || data.author?.name || "Nobstacle Team",
          role: data.authorRole || data.author?.role || "Guest Experience Specialist",
          avatar: data.authorAvatar || data.author?.avatar || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
        },
        publishedAt: data.publishedAt || data.createdAt,
        readTime: data.readTime || "5 min read",
        content: data.content,
      };
    }
  } catch (e) {
    console.warn(`Failed to fetch /blog/${slug} from API, using fallback:`, e);
  }
  return blogPosts.find((p) => p.slug === slug) || null;
}

export async function generateStaticParams() {
  return blogPosts.map((post) => ({
    slug: post.slug,
  }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const post = await fetchPostBySlug(params.slug);

  if (!post) {
    return {
      title: "Article Not Found | Nobstacle Blog",
    };
  }

  return {
    title: `${post.title} | Nobstacle Blog`,
    description: post.excerpt,
    authors: [{ name: post.author.name }],
    openGraph: {
      title: post.title,
      description: post.excerpt,
      type: "article",
      publishedTime: post.publishedAt,
      modifiedTime: post.updatedAt || post.publishedAt,
      authors: [post.author.name],
      tags: post.tags,
      url: `https://nobstacle.com/blog/${post.slug}`,
      images: [
        {
          url: post.coverImage.startsWith("http") ? post.coverImage : `https://nobstacle.com${post.coverImage}`,
          width: 1200,
          height: 630,
          alt: post.title,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: post.title,
      description: post.excerpt,
    },
    alternates: {
      canonical: `https://nobstacle.com/blog/${post.slug}`,
    },
  };
}

export default async function BlogPostPage({ params }: Props) {
  const post = await fetchPostBySlug(params.slug);

  if (!post) {
    notFound();
  }

  const relatedPosts = blogPosts.filter((p) => p.slug !== post.slug).slice(0, 3);

  // Schema.org Article Structured Data for SEO
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: post.excerpt,
    image: post.coverImage.startsWith("http") ? post.coverImage : `https://nobstacle.com${post.coverImage}`,
    datePublished: post.publishedAt,
    dateModified: post.updatedAt || post.publishedAt,
    author: {
      "@type": "Person",
      name: post.author.name,
      jobTitle: post.author.role,
    },
    publisher: {
      "@type": "Organization",
      name: "Nobstacle",
      logo: {
        "@type": "ImageObject",
        url: "https://nobstacle.com/Logo_Light.png",
      },
    },
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": `https://nobstacle.com/blog/${post.slug}`,
    },
  };

  return (
    <main className="min-h-screen bg-[#f8f9fa] text-[#121212] flex flex-col justify-between" style={{ fontFamily: 'var(--font-sans)' }}>
      <ScrollObserver />
      <Header theme="light" />

      {/* JSON-LD for Search Engines */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Article Header */}
      <article className="pb-20">
        <header className="relative overflow-hidden bg-gradient-to-b from-white via-[#f0f3f9] to-[#f8f9fa] pt-32 pb-16 px-4 sm:px-6 border-b border-[#edf0f4]">
          <div className="absolute inset-0 opacity-[0.035] bg-[radial-gradient(#3b5998_1.5px,transparent_1.5px)] [background-size:24px_24px] pointer-events-none" />

          <div className="container mx-auto max-w-4xl relative z-10">
            {/* Breadcrumbs */}
            <nav className="flex items-center gap-2 text-xs font-semibold text-[#8a94a0] mb-5">
              <Link href="/" className="hover:text-[#3b5998] transition-colors">Home</Link>
              <span>/</span>
              <Link href="/blog" className="hover:text-[#3b5998] transition-colors">Blog</Link>
              <span>/</span>
              <span className="text-[#3b5998] truncate max-w-xs">{post.category}</span>
            </nav>

            <span
              className="inline-block px-3.5 py-1.5 text-xs font-semibold rounded-full mb-4 shadow-sm"
              style={{
                backgroundColor: "rgba(59, 89, 152, 0.08)",
                color: "var(--color-accent)",
                border: "1px solid rgba(59, 89, 152, 0.2)",
              }}
            >
              {post.category}
            </span>

            <h1
              className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight mb-5 leading-[1.2]"
              style={{ fontFamily: "var(--font-display)", color: "var(--color-text-primary)" }}
            >
              {post.title}
            </h1>

            <p
              className="text-base sm:text-lg mb-6 leading-relaxed max-w-3xl"
              style={{ color: "var(--color-text-secondary)" }}
            >
              {post.excerpt}
            </p>

            {/* Author Meta */}
            <div className="flex flex-wrap items-center justify-between gap-4 pt-5 border-t border-[#dee2e6]">
              <div className="flex items-center gap-3">
                <img
                  src={post.author.avatar}
                  alt={post.author.name}
                  className="w-10 h-10 rounded-full object-cover border border-[#dee2e6]"
                />
                <div>
                  <p className="text-sm font-bold text-[#121212]">{post.author.name}</p>
                  <p className="text-xs text-[#8a94a0]">{post.author.role}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 text-xs font-medium text-[#8a94a0]">
                <span>Published {new Date(post.publishedAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</span>
                <span>•</span>
                <span>{post.readTime}</span>
              </div>
            </div>
          </div>
        </header>

        {/* Featured Cover Image */}
        <div className="container mx-auto max-w-4xl px-4 sm:px-6 -mt-8 mb-12 relative z-20">
          <div className="relative h-72 sm:h-96 lg:h-[420px] rounded-2xl overflow-hidden shadow-lg border border-[#edf0f4] bg-[#f0f3f9]">
            <Image
              src={post.coverImage}
              alt={post.title}
              fill
              className="object-cover"
              priority
            />
          </div>
        </div>

        {/* Article Body Content */}
        <div className="container mx-auto max-w-3xl px-4 sm:px-6">
          <div className="bg-white rounded-2xl p-6 sm:p-12 border border-[#edf0f4] shadow-sm">
            <div className="prose prose-slate prose-lg max-w-none prose-headings:font-bold prose-h2:text-2xl sm:prose-h2:text-3xl prose-h2:mt-10 prose-h2:mb-4 prose-h2:text-[#121212] prose-p:leading-relaxed prose-p:text-[#374151] prose-li:my-1.5 prose-li:text-[#374151]">
              {post.content.split("\n\n").map((paragraph, index) => {
                const trimmed = paragraph.trim();
                if (trimmed.startsWith("## ")) {
                  return (
                    <h2
                      key={index}
                      className="text-2xl sm:text-3xl font-bold text-[#121212] mt-10 mb-4 border-b border-[#edf0f4] pb-3"
                      style={{ fontFamily: "var(--font-display)" }}
                    >
                      {trimmed.replace("## ", "")}
                    </h2>
                  );
                }
                if (trimmed.startsWith("### ")) {
                  return (
                    <h3
                      key={index}
                      className="text-xl font-bold text-[#121212] mt-7 mb-3"
                      style={{ fontFamily: "var(--font-display)" }}
                    >
                      {trimmed.replace("### ", "")}
                    </h3>
                  );
                }
                if (trimmed.startsWith("- ")) {
                  const items = trimmed.split("\n").map((line) => line.replace(/^- /, ""));
                  return (
                    <ul key={index} className="list-disc pl-6 my-4 space-y-2 text-[#374151]">
                      {items.map((item, i) => (
                        <li key={i}>{item}</li>
                      ))}
                    </ul>
                  );
                }
                if (trimmed === "---") {
                  return <hr key={index} className="my-10 border-[#edf0f4]" />;
                }
                return (
                  <p key={index} className="text-[#374151] leading-relaxed mb-5 text-base sm:text-lg">
                    {trimmed}
                  </p>
                );
              })}
            </div>

            {/* Tags */}
            <div className="mt-12 pt-6 border-t border-[#edf0f4] flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold uppercase text-[#8a94a0] mr-2">Tags:</span>
              {post.tags.map((tag) => (
                <span
                  key={tag}
                  className="px-3 py-1 rounded-xl text-xs font-semibold bg-[#f0f3f9] text-[#5a6472]"
                >
                  #{tag}
                </span>
              ))}
            </div>
          </div>

          {/* Related Articles */}
          {relatedPosts.length > 0 && (
            <div className="mt-14">
              <h3
                className="text-2xl font-bold text-[#121212] mb-6"
                style={{ fontFamily: "var(--font-display)" }}
              >
                Related Insights
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                {relatedPosts.map((related) => (
                  <Link
                    key={related.id}
                    href={`/blog/${related.slug}`}
                    className="group block bg-white rounded-2xl overflow-hidden border border-[#edf0f4] p-5 shadow-sm hover:shadow-md transition-all hover:-translate-y-1"
                  >
                    <span className="text-xs font-semibold text-[#3b5998] mb-2 block">{related.category}</span>
                    <h4
                      className="font-bold text-[#121212] group-hover:text-[#3b5998] transition-colors text-sm mb-2 line-clamp-2 leading-snug"
                      style={{ fontFamily: "var(--font-display)" }}
                    >
                      {related.title}
                    </h4>
                    <p className="text-[#5a6472] text-xs line-clamp-2 leading-relaxed">{related.excerpt}</p>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Back to Blog Button */}
          <div className="mt-12 text-center">
            <Link
              href="/blog"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-white border border-[#dee2e6] hover:bg-[#f0f3f9] text-[#121212] text-sm font-semibold shadow-sm transition-all hover:-translate-y-0.5"
            >
              &larr; Back to all guides & articles
            </Link>
          </div>
        </div>
      </article>

      <Footer />
    </main>
  );
}

"use client";

import { useState, useEffect, useRef } from "react";
import { createClient } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// ── Twemoji ───────────────────────────────────────────────────────────────────

function getTwemojiUrl(emoji: string): string {
  const cp = [...emoji].map((c) => c.codePointAt(0)!.toString(16)).join("-");
  return `https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/svg/${cp}.svg`;
}

function renderWithTwemoji(text: string): React.ReactNode[] {
  const tokenRegex = /(https?:\/\/[^\s]+|(?<!\w)(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]*[a-zA-Z0-9])?\.)+(?:com|net|org|io|dev|app|co|gg|tv|me|uk|us|ca|au)[^\s]*|(?<![a-zA-Z0-9])@[a-zA-Z0-9]{1,16}|(?<![a-zA-Z0-9])#[a-zA-Z0-9_]{1,32})/g;
  const emojiRegex = /(\p{Emoji_Presentation}|\p{Extended_Pictographic})/gu;
  const nodes: React.ReactNode[] = [];
  let last = 0;
  let keyIdx = 0;
  let match;

  function renderEmojis(segment: string): React.ReactNode[] {
    const parts: React.ReactNode[] = [];
    let eLast = 0;
    emojiRegex.lastIndex = 0;
    let em;
    while ((em = emojiRegex.exec(segment)) !== null) {
      if (em.index > eLast) parts.push(segment.slice(eLast, em.index));
      parts.push(
        <img key={keyIdx++} src={getTwemojiUrl(em[0])} alt={em[0]}
          style={{ width: "1.15em", height: "1.15em", display: "inline-block", verticalAlign: "-0.2em", margin: "0 0.05em" }} />
      );
      eLast = em.index + em[0].length;
    }
    if (eLast < segment.length) parts.push(segment.slice(eLast));
    return parts;
  }

  tokenRegex.lastIndex = 0;
  while ((match = tokenRegex.exec(text)) !== null) {
    if (match.index > last) nodes.push(...renderEmojis(text.slice(last, match.index)));
    const token = match[0];
    if (token.startsWith("#")) {
      nodes.push(<span key={keyIdx++} style={{ color: "#4a9eff", fontWeight: 600 }}>{token}</span>);
    } else if (token.startsWith("@")) {
      nodes.push(<span key={keyIdx++} style={{ color: "#4a9eff", fontWeight: 600 }}>{token}</span>);
    } else {
      let href = token;
      if (!href.startsWith("http")) href = "https://" + href;
      nodes.push(
        <a key={keyIdx++} href={href} target="_blank" rel="noopener noreferrer"
          style={{ color: "#4a9eff", textDecoration: "underline", wordBreak: "break-all" }}>
          {token}
        </a>
      );
    }
    last = match.index + token.length;
  }
  if (last < text.length) nodes.push(...renderEmojis(text.slice(last)));
  return nodes;
}

// ── Types ─────────────────────────────────────────────────────────────────────

interface Post {
  id: string;
  user_id: string;
  username: string;
  pfp_url: string | null;
  content: string;
  image_url: string | null;
  likes: number;
  liked_by: string[];
  bookmarked_by: string[];
  comments: unknown[];
  created_at: string;
  edited?: boolean;
}

// ── Avatar ────────────────────────────────────────────────────────────────────

function Avatar({ url, username, size = 36 }: { url: string | null; username: string; size?: number }) {
  const initials = username?.slice(0, 2).toUpperCase() ?? "??";
  if (url) return <img src={url} alt={username} style={{ width: size, height: size, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} />;
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%", background: "#646669",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: size * 0.35, fontWeight: 700, flexShrink: 0, color: "#fff",
    }}>{initials}</div>
  );
}

// ── Post Card (read-only, no likes/comments interaction) ──────────────────────

function PostCard({ post }: { post: Post }) {
  return (
    <div style={{ background: "#2c2e31", borderRadius: 12, padding: "16px 20px", marginBottom: 12, border: "1px solid #3a3d42" }}>
      <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
        <Avatar url={post.pfp_url} username={post.username} size={40} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ marginBottom: 4 }}>
            <span style={{ color: "#e2b714", fontWeight: 700, fontSize: 14 }}>@{post.username}</span>
          </div>
          <div style={{ fontSize: 15, lineHeight: 1.5, wordBreak: "break-word", color: "#d1d0c5" }}>
            {renderWithTwemoji(post.content)}
            {post.edited && <span style={{ opacity: 0.5, fontSize: 12, marginLeft: 6 }}>(edited)</span>}
          </div>
          {post.image_url && (
            <img src={post.image_url} alt="post" style={{ maxWidth: "100%", borderRadius: 8, maxHeight: 320, objectFit: "cover", display: "block", marginTop: 10 }} />
          )}
          <div style={{ display: "flex", gap: 16, marginTop: 10, color: "#646669", fontSize: 13 }}>
            <span>❤️ {post.likes ?? 0}</span>
            <span>💬 {(post.comments ?? []).length}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [results, setResults] = useState<Post[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  // On load, check if there's a tag in the URL hash
  useEffect(() => {
    const hash = window.location.hash; // e.g. #keyboard
    if (hash.startsWith("#")) {
      const tag = decodeURIComponent(hash.slice(1));
      setQuery(`#${tag}`);
      setActiveTag(tag.toLowerCase());
      searchTag(tag.toLowerCase());
    }
    inputRef.current?.focus();
  }, []);

  async function searchTag(tag: string) {
    setLoading(true);
    setSearched(true);
    setActiveTag(tag);

    // Update URL
    window.history.pushState(null, "", `/search/%23${tag}`);

    // Search posts that contain the tag
    const { data } = await supabase
      .from("posts")
      .select("*")
      .ilike("content", `%#${tag}%`)
      .order("created_at", { ascending: false });

    setResults((data as Post[]) ?? []);
    setLoading(false);
  }

  function handleSearch() {
    let tag = query.trim();
    if (!tag) return;
    if (tag.startsWith("#")) tag = tag.slice(1);
    tag = tag.toLowerCase().replace(/[^a-z0-9_]/g, "");
    if (!tag) return;
    searchTag(tag);
  }

  return (
    <main style={{ minHeight: "100vh", background: "#323437", fontFamily: "var(--font-roboto-mono), monospace", display: "flex", flexDirection: "column" }}>
      {/* Topbar */}
      <div style={{ width: "100%", padding: "16px 32px", borderBottom: "1px solid #3a3d42", display: "flex", alignItems: "center", gap: 16, position: "sticky", top: 0, background: "#323437", zIndex: 10 }}>
        <a href="/" style={{ fontSize: 22, fontWeight: 700, color: "#e2b714", letterSpacing: "-0.5px", textDecoration: "none" }}>monkeypost</a>

        {/* Search input */}
        <div style={{ display: "flex", alignItems: "center", flex: 1, maxWidth: 480, background: "#2c2e31", border: "1px solid #3a3d42", borderRadius: 8, overflow: "hidden" }}>
          <span style={{ padding: "0 12px", color: "#646669" }}>
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" width={15} height={15}>
              <path d="M11 19C15.4183 19 19 15.4183 19 11C19 6.58172 15.4183 3 11 3C6.58172 3 3 6.58172 3 11C3 15.4183 6.58172 19 11 19Z" stroke="#646669" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M21 21L16.65 16.65" stroke="#646669" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </span>
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            placeholder="#keyboard, #typeracer, #wpm..."
            style={{
              flex: 1, background: "none", border: "none", padding: "10px 0",
              color: "#d1d0c5", fontSize: 14, fontFamily: "inherit", outline: "none",
            }}
          />
          {query && (
            <button onClick={() => { setQuery(""); setSearched(false); setResults([]); setActiveTag(null); window.history.pushState(null, "", "/search"); }}
              style={{ background: "none", border: "none", padding: "0 12px", color: "#646669", cursor: "pointer", fontSize: 18, lineHeight: 1 }}>
              ×
            </button>
          )}
        </div>

        <button onClick={handleSearch}
          style={{ background: "#e2b714", border: "none", borderRadius: 8, padding: "9px 18px", color: "#323437", fontWeight: 700, fontSize: 13, fontFamily: "inherit", cursor: "pointer" }}>
          Search
        </button>
      </div>

      {/* Content */}
      <div style={{ maxWidth: 680, width: "100%", margin: "0 auto", padding: "24px 16px" }}>

        {/* Active tag header */}
        {activeTag && (
          <div style={{ marginBottom: 20 }}>
            <h2 style={{ color: "#e2b714", fontSize: 20, fontWeight: 700, margin: 0 }}>
              #{activeTag}
            </h2>
            {!loading && (
              <div style={{ color: "#646669", fontSize: 13, marginTop: 4 }}>
                {results.length} {results.length === 1 ? "post" : "posts"}
              </div>
            )}
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div style={{ display: "flex", justifyContent: "center", marginTop: 60 }}>
            <svg viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg" fill="none"
              className="animate-spin" style={{ animationDuration: "1.4s" }} width={36} height={36}>
              <g fill="#ffffff" fillRule="evenodd" clipRule="evenodd">
                <path d="M8 1.5a6.5 6.5 0 100 13 6.5 6.5 0 000-13zM0 8a8 8 0 1116 0A8 8 0 010 8z" opacity=".2"/>
                <path d="M7.25.75A.75.75 0 018 0a8 8 0 018 8 .75.75 0 01-1.5 0A6.5 6.5 0 008 1.5a.75.75 0 01-.75-.75z"/>
              </g>
            </svg>
          </div>
        )}

        {/* No results */}
        {!loading && searched && results.length === 0 && (
          <div style={{ textAlign: "center", marginTop: 80, color: "#646669" }}>
            <div style={{ fontSize: 40, marginBottom: 16 }}>🔍</div>
            <div style={{ fontSize: 16, color: "#d1d0c5", marginBottom: 8 }}>
              Sorry, there is no post with this tag.
            </div>
            <div style={{ fontSize: 14 }}>
              You could be the first!{" "}
              <a href="/" style={{ color: "#e2b714", textDecoration: "none" }}>Go post it →</a>
            </div>
          </div>
        )}

        {/* Empty state before searching */}
        {!loading && !searched && (
          <div style={{ textAlign: "center", marginTop: 80, color: "#646669" }}>
            <div style={{ fontSize: 40, marginBottom: 16 }}>🏷️</div>
            <div style={{ fontSize: 15 }}>Search for a tag to find posts</div>
            <div style={{ fontSize: 13, marginTop: 8, color: "#3a3d42" }}>try #keyboard, #wpm, #typeracer</div>
          </div>
        )}

        {/* Results */}
        {!loading && results.map((post) => (
          <PostCard key={post.id} post={post} />
        ))}
      </div>
    </main>
  );
}

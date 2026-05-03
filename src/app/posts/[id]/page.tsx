"use client";

import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";
import { useParams } from "next/navigation";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

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
      parts.push(<img key={keyIdx++} src={getTwemojiUrl(em[0])} alt={em[0]} style={{ width: "1.15em", height: "1.15em", display: "inline-block", verticalAlign: "-0.2em", margin: "0 0.05em" }} />);
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
      nodes.push(<a key={keyIdx++} href={`/search/%23${token.slice(1)}`} style={{ color: "#4a9eff", fontWeight: 600, textDecoration: "none" }}>{token}</a>);
    } else if (token.startsWith("@")) {
      nodes.push(<span key={keyIdx++} style={{ color: "#4a9eff", fontWeight: 600 }}>{token}</span>);
    } else {
      let href = token;
      if (!href.startsWith("http")) href = "https://" + href;
      nodes.push(<a key={keyIdx++} href={href} target="_blank" rel="noopener noreferrer" style={{ color: "#4a9eff", textDecoration: "underline", wordBreak: "break-all" }}>{token}</a>);
    }
    last = match.index + token.length;
  }
  if (last < text.length) nodes.push(...renderEmojis(text.slice(last)));
  return nodes;
}

const HeartIcon = ({ filled }: { filled?: boolean }) => (
  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" width={18} height={18}>
    <path d="M15.7 4C18.87 4 21 6.98 21 9.76C21 15.39 12.16 20 12 20C11.84 20 3 15.39 3 9.76C3 6.98 5.13 4 8.3 4C10.12 4 11.31 4.91 12 5.71C12.69 4.91 13.88 4 15.7 4Z"
      stroke="#ffffff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill={filled ? "#ffffff" : "none"} />
  </svg>
);

const RepostIcon = ({ active }: { active?: boolean }) => (
  <svg fill="none" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" width={18} height={18}>
    <path d="M6,14V9A6,6,0,0,1,16.89,5.54" style={{ stroke: active ? "#22c55e" : "#ffffff", strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2 }}/>
    <path d="M18,10v5A6,6,0,0,1,7.11,18.46" style={{ stroke: active ? "#22c55e" : "#ffffff", strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2 }}/>
    <polyline points="8 12 6 14 4 12" style={{ fill: "none", stroke: active ? "#22c55e" : "#ffffff", strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2 }}/>
    <polyline points="16 12 18 10 20 12" style={{ fill: "none", stroke: active ? "#22c55e" : "#ffffff", strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2 }}/>
  </svg>
);

const ViewsIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" width={16} height={16}>
    <path d="M15.0007 12C15.0007 13.6569 13.6576 15 12.0007 15C10.3439 15 9.00073 13.6569 9.00073 12C9.00073 10.3431 10.3439 9 12.0007 9C13.6576 9 15.0007 10.3431 15.0007 12Z" stroke="#646669" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M12.0012 5C7.52354 5 3.73326 7.94288 2.45898 12C3.73324 16.0571 7.52354 19 12.0012 19C16.4788 19 20.2691 16.0571 21.5434 12C20.2691 7.94291 16.4788 5 12.0012 5Z" stroke="#646669" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

function Avatar({ url, username, size = 36 }: { url: string | null; username: string; size?: number }) {
  const initials = username?.slice(0, 2).toUpperCase() ?? "??";
  if (url) return <img src={url} alt={username} style={{ width: size, height: size, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} />;
  return (
    <div style={{ width: size, height: size, borderRadius: "50%", background: "#646669", display: "flex", alignItems: "center", justifyContent: "center", fontSize: size * 0.35, fontWeight: 700, flexShrink: 0, color: "#fff" }}>
      {initials}
    </div>
  );
}

const VERIFIED_USERS = new Set(["kiirod", "puppyboy", "asd", "ripvip", "testaccount123"]);
const OwnerBadge = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#e2b714" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width={16} height={16} style={{ display: "inline-block", verticalAlign: "middle", marginLeft: 4 }}>
    <path d="M12 3a3.6 3.6 0 00-3.05 1.68 3.6 3.6 0 00-.9-.1 3.6 3.6 0 00-2.42 1.06 3.6 3.6 0 00-.94 3.32A3.6 3.6 0 003 12a3.6 3.6 0 001.69 3.05 3.6 3.6 0 00.95 3.32 3.6 3.6 0 003.35.96A3.6 3.6 0 0012 21a3.6 3.6 0 003.04-1.67 3.6 3.6 0 004.3-4.3A3.6 3.6 0 0021 12a3.6 3.6 0 00-1.67-3.04v0a3.6 3.6 0 00-4.3-4.3A3.6 3.6 0 0012 3z" />
    <path d="M15 10l-4 4" /><path d="M9 12l2 2" />
  </svg>
);

interface Comment {
  id: string;
  username: string;
  pfp_url: string | null;
  content: string;
  created_at: string;
  replies?: Comment[];
}

interface Post {
  id: string;
  user_id: string;
  username: string;
  handle?: string;
  pfp_url: string | null;
  content: string;
  image_url: string | null;
  likes: number;
  liked_by: string[];
  reposted_by: string[];
  comments: Comment[];
  created_at: string;
  edited?: boolean;
  views?: number;
}

function ReplyThread({ comment, depth }: { comment: Comment; depth: number }) {
  const avatarSize = depth === 0 ? 28 : depth === 1 ? 24 : 20;
  const fontSize = depth === 0 ? 13 : 12;
  return (
    <div style={{ marginLeft: depth > 0 ? 20 : 0, marginBottom: depth === 0 ? 14 : 8 }}>
      <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
        <Avatar url={comment.pfp_url} username={comment.username} size={avatarSize} />
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 2 }}>
            <span style={{ color: "#e2b714", fontSize: fontSize - 1, fontWeight: 700 }}>@{comment.username}</span>
            {VERIFIED_USERS.has(comment.username.toLowerCase()) && <OwnerBadge />}
          </div>
          <div style={{ color: "#d1d0c5", fontSize, lineHeight: 1.4, wordBreak: "break-word" }}>
            {renderWithTwemoji(comment.content)}
          </div>
          {(comment.replies ?? []).length > 0 && (
            <div style={{ marginTop: 8, paddingLeft: 4, borderLeft: "2px solid #3a3d42" }}>
              {(comment.replies ?? []).map((r) => (
                <ReplyThread key={r.id} comment={r as Comment} depth={depth + 1} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function PostPage() {
  const params = useParams();
  const postId = params.id as string;

  const [post, setPost] = useState<Post | null>(null);
  const [currentUser, setCurrentUser] = useState<{ id: string; username: string; pfp_url: string | null } | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [commentText, setCommentText] = useState("");

  useEffect(() => {
    async function load() {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const { data: me } = await supabase.from("profiles").select("*").eq("id", session.user.id).single();
        if (me) setCurrentUser({ id: me.id, username: me.username, pfp_url: me.pfp_url });
      }

      const { data } = await supabase.from("posts").select("*").eq("id", postId).single();
      if (!data) { setNotFound(true); setLoading(false); return; }

      setPost(data as Post);

      // Increment view count
      await supabase.from("posts").update({ views: (data.views ?? 0) + 1 }).eq("id", postId);

      setLoading(false);
    }
    load();
  }, [postId]);

  async function handleLike() {
    if (!currentUser || !post) return;
    const liked = post.liked_by?.includes(currentUser.id);
    const newLikedBy = liked ? post.liked_by.filter((id) => id !== currentUser.id) : [...(post.liked_by ?? []), currentUser.id];
    const newLikes = liked ? post.likes - 1 : post.likes + 1;
    setPost((p) => p ? { ...p, likes: newLikes, liked_by: newLikedBy } : p);
    await supabase.from("posts").update({ likes: newLikes, liked_by: newLikedBy }).eq("id", postId);
  }

  async function handleRepost() {
    if (!currentUser || !post) return;
    const reposted = (post.reposted_by ?? []).includes(currentUser.id);
    const newRepostedBy = reposted ? post.reposted_by.filter((id) => id !== currentUser.id) : [...(post.reposted_by ?? []), currentUser.id];
    setPost((p) => p ? { ...p, reposted_by: newRepostedBy } : p);
    await supabase.from("posts").update({ reposted_by: newRepostedBy }).eq("id", postId);
  }

  async function submitComment() {
    if (!commentText.trim() || !currentUser || !post) return;
    const newComment: Comment = {
      id: crypto.randomUUID(),
      username: currentUser.username,
      pfp_url: currentUser.pfp_url,
      content: commentText.trim(),
      created_at: new Date().toISOString(),
      replies: [],
    };
    const updated = [...post.comments, newComment];
    setPost((p) => p ? { ...p, comments: updated } : p);
    setCommentText("");
    await supabase.from("posts").update({ comments: updated }).eq("id", postId);
  }

  if (loading) return (
    <main style={{ minHeight: "100vh", background: "#323437", fontFamily: "var(--font-roboto-mono), monospace", display: "flex", flexDirection: "column" }}>
      <div style={{ width: "100%", padding: "16px 32px", borderBottom: "1px solid #3a3d42", display: "flex", alignItems: "center" }}>
        <a href="/" style={{ fontSize: 22, fontWeight: 700, color: "#e2b714", textDecoration: "none" }}>monkeypost</a>
      </div>
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <svg viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg" fill="none" className="animate-spin" style={{ animationDuration: "1.4s" }} width={36} height={36}>
          <g fill="#ffffff" fillRule="evenodd" clipRule="evenodd">
            <path d="M8 1.5a6.5 6.5 0 100 13 6.5 6.5 0 000-13zM0 8a8 8 0 1116 0A8 8 0 010 8z" opacity=".2"/>
            <path d="M7.25.75A.75.75 0 018 0a8 8 0 018 8 .75.75 0 01-1.5 0A6.5 6.5 0 008 1.5a.75.75 0 01-.75-.75z"/>
          </g>
        </svg>
      </div>
    </main>
  );

  if (notFound) return (
    <main style={{ minHeight: "100vh", background: "#323437", fontFamily: "var(--font-roboto-mono), monospace", display: "flex", flexDirection: "column" }}>
      <div style={{ width: "100%", padding: "16px 32px", borderBottom: "1px solid #3a3d42", display: "flex", alignItems: "center" }}>
        <a href="/" style={{ fontSize: 22, fontWeight: 700, color: "#e2b714", textDecoration: "none" }}>monkeypost</a>
      </div>
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 12 }}>
        <div style={{ fontSize: 40 }}>📭</div>
        <div style={{ color: "#d1d0c5", fontSize: 16 }}>Post not found.</div>
        <a href="/" style={{ color: "#e2b714", fontSize: 13 }}>← Back to feed</a>
      </div>
    </main>
  );

  const liked = currentUser ? post!.liked_by?.includes(currentUser.id) : false;
  const reposted = currentUser ? (post!.reposted_by ?? []).includes(currentUser.id) : false;

  return (
    <main style={{ minHeight: "100vh", background: "#323437", fontFamily: "var(--font-roboto-mono), monospace", display: "flex", flexDirection: "column" }}>
      <div style={{ width: "100%", padding: "16px 32px", borderBottom: "1px solid #3a3d42", display: "flex", alignItems: "center", gap: 16, position: "sticky", top: 0, background: "#323437", zIndex: 10 }}>
        <a href="/" style={{ fontSize: 22, fontWeight: 700, color: "#e2b714", textDecoration: "none", letterSpacing: "-0.5px" }}>monkeypost</a>
        <button onClick={() => window.history.back()} style={{ background: "none", border: "none", color: "#646669", fontSize: 13, fontFamily: "inherit", cursor: "pointer", marginLeft: 8 }}>← Back</button>
      </div>

      <div style={{ maxWidth: 680, width: "100%", margin: "0 auto", padding: "24px 16px" }}>
        {/* Post */}
        <div style={{ background: "#2c2e31", borderRadius: 12, padding: "20px", border: "1px solid #3a3d42", marginBottom: 16 }}>
          <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
            <a href={`/users/${post!.handle ?? post!.username.toLowerCase()}`} style={{ textDecoration: "none", flexShrink: 0 }}>
              <Avatar url={post!.pfp_url} username={post!.username} size={48} />
            </a>
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 2 }}>
                <a href={`/users/${post!.handle ?? post!.username.toLowerCase()}`} style={{ color: "#e2b714", fontWeight: 700, fontSize: 15, textDecoration: "none" }}>{post!.username}</a>
                {VERIFIED_USERS.has(post!.username.toLowerCase()) && <OwnerBadge />}
              </div>
              <div style={{ color: "#646669", fontSize: 12, marginBottom: 12 }}>@{post!.handle ?? post!.username.toLowerCase()}</div>
              <div style={{ fontSize: 16, lineHeight: 1.6, wordBreak: "break-word", color: "#d1d0c5", marginBottom: 16 }}>
                {renderWithTwemoji(post!.content)}
                {post!.edited && <span style={{ opacity: 0.5, fontSize: 12, marginLeft: 6 }}>(edited)</span>}
              </div>
              {post!.image_url && (
                <img src={post!.image_url} alt="post" style={{ maxWidth: "100%", borderRadius: 8, maxHeight: 400, objectFit: "cover", display: "block", marginBottom: 16 }} />
              )}
              <div style={{ display: "flex", gap: 20, alignItems: "center", paddingTop: 12, borderTop: "1px solid #3a3d42" }}>
                <button onClick={handleLike} style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", cursor: "pointer", color: liked ? "#e2b714" : "#646669", fontSize: 13, padding: 0 }}>
                  <HeartIcon filled={liked} /> {post!.likes ?? 0}
                </button>
                <button onClick={handleRepost} style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", cursor: "pointer", color: reposted ? "#22c55e" : "#646669", fontSize: 13, padding: 0 }}>
                  <RepostIcon active={reposted} /> {(post!.reposted_by ?? []).length}
                </button>
                <div style={{ display: "flex", alignItems: "center", gap: 4, color: "#646669", fontSize: 13 }}>
                  <ViewsIcon /> {post!.views ?? 0}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Comments */}
        <div style={{ background: "#2c2e31", borderRadius: 12, padding: "16px 20px", border: "1px solid #3a3d42" }}>
          <h3 style={{ color: "#646669", fontSize: 12, textTransform: "uppercase", letterSpacing: 1, marginBottom: 16, marginTop: 0 }}>
            Replies ({post!.comments.length})
          </h3>
          {post!.comments.map((c) => (
            <ReplyThread key={c.id} comment={c} depth={0} />
          ))}
          {currentUser && (
            <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
              <input value={commentText} onChange={(e) => setCommentText(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && submitComment()}
                placeholder="Write a reply..." maxLength={180}
                style={{ flex: 1, background: "#3a3d42", border: "none", borderRadius: 8, padding: "8px 12px", color: "#fff", fontSize: 13, fontFamily: "inherit", outline: "none" }} />
              <button onClick={submitComment}
                style={{ background: "#e2b714", border: "none", borderRadius: 8, padding: "8px 14px", color: "#323437", fontWeight: 700, fontSize: 13, fontFamily: "inherit", cursor: "pointer" }}>
                Reply
              </button>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

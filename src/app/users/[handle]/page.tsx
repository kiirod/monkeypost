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

const CommentIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" width={18} height={18}>
    <path d="M7 9H17M7 13H12M21 20L17.6757 18.3378C17.4237 18.2118 17.2977 18.1488 17.1656 18.1044C17.0484 18.065 16.9277 18.0365 16.8052 18.0193C16.6672 18 16.5263 18 16.2446 18H6.2C5.07989 18 4.51984 18 4.09202 17.782C3.71569 17.5903 3.40973 17.2843 3.21799 16.908C3 16.4802 3 15.9201 3 14.8V7.2C3 6.07989 3 5.51984 3.21799 5.09202C3.40973 4.71569 3.71569 4.40973 4.09202 4.21799C4.51984 4 5.0799 4 6.2 4H17.8C18.9201 4 19.4802 4 19.908 4.21799C20.2843 4.40973 20.5903 4.71569 20.782 5.09202C21 5.51984 21 6.0799 21 7.2V20Z"
      stroke="#ffffff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
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
  bookmarked_by: string[];
  comments: unknown[];
  created_at: string;
  edited?: boolean;
  views?: number;
}

interface Profile {
  id: string;
  username: string;
  handle: string;
  pfp_url: string | null;
}

export default function UserProfile() {
  const params = useParams();
  const handle = params.handle as string;

  const [profile, setProfile] = useState<Profile | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [currentUser, setCurrentUser] = useState<{ id: string; username: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);
  const [followerCount, setFollowerCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);

  useEffect(() => {
    async function load() {
      // Get current user session
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const { data: me } = await supabase.from("profiles").select("id, username").eq("id", session.user.id).single();
        if (me) setCurrentUser({ id: me.id, username: me.username });
      }

      // Load profile by handle
      const { data: profileData } = await supabase
        .from("profiles")
        .select("*")
        .eq("handle", handle.toLowerCase())
        .single();

      if (!profileData) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      setProfile(profileData as Profile);

      // Load their posts
      const { data: postsData } = await supabase
        .from("posts")
        .select("*")
        .eq("user_id", profileData.id)
        .order("created_at", { ascending: false });

      setPosts((postsData as Post[]) ?? []);

      // Load follow/block status
      if (session?.user) {
        const { data: followData } = await supabase
          .from("follows")
          .select("id")
          .eq("follower_id", session.user.id)
          .eq("following_id", profileData.id)
          .single();
        setIsFollowing(!!followData);

        const { data: blockData } = await supabase
          .from("blocks")
          .select("id")
          .eq("blocker_id", session.user.id)
          .eq("blocked_id", profileData.id)
          .single();
        setIsBlocked(!!blockData);
      }

      // Load follower/following counts
      const { count: fc } = await supabase.from("follows").select("*", { count: "exact", head: true }).eq("following_id", profileData.id);
      const { count: fgc } = await supabase.from("follows").select("*", { count: "exact", head: true }).eq("follower_id", profileData.id);
      setFollowerCount(fc ?? 0);
      setFollowingCount(fgc ?? 0);

      setLoading(false);
    }
    load();
  }, [handle]);

  async function handleFollow() {
    if (!currentUser || !profile) return;
    if (isFollowing) {
      await supabase.from("follows").delete().eq("follower_id", currentUser.id).eq("following_id", profile.id);
      setIsFollowing(false);
      setFollowerCount((p) => p - 1);
    } else {
      await supabase.from("follows").insert({ follower_id: currentUser.id, following_id: profile.id });
      setIsFollowing(true);
      setFollowerCount((p) => p + 1);
    }
  }

  async function handleBlock() {
    if (!currentUser || !profile) return;
    if (isBlocked) {
      await supabase.from("blocks").delete().eq("blocker_id", currentUser.id).eq("blocked_id", profile.id);
      setIsBlocked(false);
    } else {
      await supabase.from("blocks").insert({ blocker_id: currentUser.id, blocked_id: profile.id });
      setIsBlocked(true);
      setIsFollowing(false);
      await supabase.from("follows").delete().eq("follower_id", currentUser.id).eq("following_id", profile.id);
    }
  }

  const isOwnProfile = currentUser?.id === profile?.id;

  if (loading) {
    return (
      <main style={{ minHeight: "100vh", background: "#323437", fontFamily: "var(--font-roboto-mono), monospace", display: "flex", flexDirection: "column" }}>
        <div style={{ width: "100%", padding: "16px 32px", borderBottom: "1px solid #3a3d42", display: "flex", alignItems: "center", gap: 16 }}>
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
  }

  if (notFound) {
    return (
      <main style={{ minHeight: "100vh", background: "#323437", fontFamily: "var(--font-roboto-mono), monospace", display: "flex", flexDirection: "column" }}>
        <div style={{ width: "100%", padding: "16px 32px", borderBottom: "1px solid #3a3d42", display: "flex", alignItems: "center" }}>
          <a href="/" style={{ fontSize: 22, fontWeight: 700, color: "#e2b714", textDecoration: "none" }}>monkeypost</a>
        </div>
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 12 }}>
          <div style={{ fontSize: 40 }}>👤</div>
          <div style={{ color: "#d1d0c5", fontSize: 16 }}>User not found.</div>
          <a href="/" style={{ color: "#e2b714", fontSize: 13 }}>← Back to feed</a>
        </div>
      </main>
    );
  }

  return (
    <main style={{ minHeight: "100vh", background: "#323437", fontFamily: "var(--font-roboto-mono), monospace", display: "flex", flexDirection: "column" }}>
      {/* Topbar */}
      <div style={{ width: "100%", padding: "16px 32px", borderBottom: "1px solid #3a3d42", display: "flex", alignItems: "center", gap: 16, position: "sticky", top: 0, background: "#323437", zIndex: 10 }}>
        <a href="/" style={{ fontSize: 22, fontWeight: 700, color: "#e2b714", textDecoration: "none", letterSpacing: "-0.5px" }}>monkeypost</a>
        <a href="/search" style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 8, background: "#2c2e31", border: "1px solid #3a3d42", borderRadius: 8, padding: "7px 14px", color: "#646669", fontSize: 13, fontFamily: "inherit", textDecoration: "none" }}>
          <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" width={15} height={15}>
            <path d="M11 19C15.4183 19 19 15.4183 19 11C19 6.58172 15.4183 3 11 3C6.58172 3 3 6.58172 3 11C3 15.4183 6.58172 19 11 19Z" stroke="#646669" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M21 21L16.65 16.65" stroke="#646669" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Search tags
        </a>
      </div>

      <div style={{ maxWidth: 680, width: "100%", margin: "0 auto", padding: "32px 16px" }}>
        {/* Profile header */}
        <div style={{ background: "#2c2e31", borderRadius: 14, padding: "24px", border: "1px solid #3a3d42", marginBottom: 24 }}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 16 }}>
            <Avatar url={profile!.pfp_url} username={profile!.username} size={72} />
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
                <span style={{ color: "#e2b714", fontWeight: 700, fontSize: 20 }}>{profile!.username}</span>
                {VERIFIED_USERS.has(profile!.username.toLowerCase()) && <OwnerBadge />}
              </div>
              <div style={{ color: "#646669", fontSize: 14, marginBottom: 12 }}>@{profile!.handle || profile!.username.toLowerCase()}</div>
              <div style={{ display: "flex", gap: 20, marginBottom: 16 }}>
                <span style={{ color: "#d1d0c5", fontSize: 13 }}><span style={{ color: "#fff", fontWeight: 700 }}>{followerCount}</span> followers</span>
                <span style={{ color: "#d1d0c5", fontSize: 13 }}><span style={{ color: "#fff", fontWeight: 700 }}>{followingCount}</span> following</span>
                <span style={{ color: "#d1d0c5", fontSize: 13 }}><span style={{ color: "#fff", fontWeight: 700 }}>{posts.length}</span> posts</span>
              </div>
              {!isOwnProfile && currentUser && (
                <div style={{ display: "flex", gap: 8 }}>
                  <button onClick={handleFollow}
                    style={{
                      background: isFollowing ? "#3a3d42" : "#e2b714", border: "none", borderRadius: 8,
                      padding: "8px 18px", color: isFollowing ? "#d1d0c5" : "#323437",
                      fontWeight: 700, fontSize: 13, fontFamily: "inherit", cursor: "pointer",
                    }}>
                    {isFollowing ? "Unfollow" : "Follow"}
                  </button>
                  <button onClick={handleBlock}
                    style={{
                      background: isBlocked ? "#ca4754" : "#3a3d42", border: "none", borderRadius: 8,
                      padding: "8px 18px", color: isBlocked ? "#fff" : "#d1d0c5",
                      fontWeight: 700, fontSize: 13, fontFamily: "inherit", cursor: "pointer",
                    }}>
                    {isBlocked ? "Unblock" : "Block"}
                  </button>
                </div>
              )}
              {isOwnProfile && (
                <div style={{ color: "#646669", fontSize: 13 }}>This is your profile.</div>
              )}
            </div>
          </div>
        </div>

        {/* Posts */}
        <h3 style={{ color: "#646669", fontSize: 13, marginBottom: 16, textTransform: "uppercase", letterSpacing: 1 }}>Posts</h3>
        {posts.length === 0 && (
          <div style={{ color: "#646669", textAlign: "center", marginTop: 40, fontSize: 14 }}>No posts yet.</div>
        )}
        {posts.map((post) => (
          <div key={post.id}
            onClick={() => window.location.href = `/posts/${post.id}`}
            style={{ background: "#2c2e31", borderRadius: 12, padding: "16px 20px", marginBottom: 12, border: "1px solid #3a3d42", cursor: "pointer" }}
            onMouseEnter={(e) => (e.currentTarget.style.borderColor = "#646669")}
            onMouseLeave={(e) => (e.currentTarget.style.borderColor = "#3a3d42")}
          >
            <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
              <Avatar url={post.pfp_url} username={post.username} size={40} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 4 }}>
                  <span style={{ color: "#e2b714", fontWeight: 700, fontSize: 14 }}>{post.username}</span>
                  {VERIFIED_USERS.has(post.username.toLowerCase()) && <OwnerBadge />}
                  <span style={{ color: "#646669", fontSize: 12 }}>@{post.handle || post.username.toLowerCase()}</span>
                </div>
                <div style={{ fontSize: 15, lineHeight: 1.5, wordBreak: "break-word", color: "#d1d0c5" }}>
                  {renderWithTwemoji(post.content)}
                  {post.edited && <span style={{ opacity: 0.5, fontSize: 12, marginLeft: 6 }}>(edited)</span>}
                </div>
                {post.image_url && (
                  <img src={post.image_url} alt="post" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "100%", borderRadius: 8, maxHeight: 320, objectFit: "cover", display: "block", marginTop: 10 }} />
                )}
                <div style={{ display: "flex", gap: 20, marginTop: 12, alignItems: "center" }}>
                  <span style={{ display: "flex", alignItems: "center", gap: 6, color: "#646669", fontSize: 13 }}>
                    <HeartIcon /> {post.likes ?? 0}
                  </span>
                  <span style={{ display: "flex", alignItems: "center", gap: 6, color: "#646669", fontSize: 13 }}>
                    <RepostIcon /> {(post.reposted_by ?? []).length}
                  </span>
                  <span style={{ display: "flex", alignItems: "center", gap: 6, color: "#646669", fontSize: 13 }}>
                    <CommentIcon /> {(post.comments ?? []).length}
                  </span>
                  <span style={{ display: "flex", alignItems: "center", gap: 4, color: "#646669", fontSize: 13 }}>
                    <ViewsIcon /> {post.views ?? 0}
                  </span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}

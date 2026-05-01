"use client";

import { useState, useRef, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// ── SVGs 

const LoadingSpinner = () => (
  <svg
    viewBox="0 0 16 16"
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    className="animate-spin"
    style={{ animationDuration: "1.4s" }}
    width={40}
    height={40}
  >
    <g fill="#ffffff" fillRule="evenodd" clipRule="evenodd">
      <path
        d="M8 1.5a6.5 6.5 0 100 13 6.5 6.5 0 000-13zM0 8a8 8 0 1116 0A8 8 0 010 8z"
        opacity=".2"
      />
      <path d="M7.25.75A.75.75 0 018 0a8 8 0 018 8 .75.75 0 01-1.5 0A6.5 6.5 0 008 1.5a.75.75 0 01-.75-.75z" />
    </g>
  </svg>
);

const HeartIcon = ({ filled }: { filled?: boolean }) => (
  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" width={18} height={18}>
    <path
      d="M15.7 4C18.87 4 21 6.98 21 9.76C21 15.39 12.16 20 12 20C11.84 20 3 15.39 3 9.76C3 6.98 5.13 4 8.3 4C10.12 4 11.31 4.91 12 5.71C12.69 4.91 13.88 4 15.7 4Z"
      stroke="#ffffff"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      fill={filled ? "#ffffff" : "none"}
    />
  </svg>
);

const BookmarkIcon = ({ filled }: { filled?: boolean }) => (
  <svg viewBox="-4 0 30 30" version="1.1" xmlns="http://www.w3.org/2000/svg" width={18} height={18}>
    <g fill={filled ? "#ffffff" : "none"} stroke="#ffffff" strokeWidth={filled ? 0 : 1.5}>
      <path d="M437,153 L423,153 C420.791,153 419,154.791 419,157 L419,179 C419,181.209 420.791,183 423,183 L430,176 L437,183 C439.209,183 441,181.209 441,179 L441,157 C441,154.791 439.209,153 437,153" transform="translate(-419, -153)" fill={filled ? "#ffffff" : "none"} />
    </g>
    {/* simpler bookmark */}
    <path d="M5 3h12a1 1 0 011 1v20l-7-5-7 5V4a1 1 0 011-1z" fill={filled ? "#ffffff" : "none"} stroke="#ffffff" strokeWidth="1.5" strokeLinejoin="round" />
  </svg>
);

const CommentIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" width={18} height={18}>
    <path
      d="M7 9H17M7 13H12M21 20L17.6757 18.3378C17.4237 18.2118 17.2977 18.1488 17.1656 18.1044C17.0484 18.065 16.9277 18.0365 16.8052 18.0193C16.6672 18 16.5263 18 16.2446 18H6.2C5.07989 18 4.51984 18 4.09202 17.782C3.71569 17.5903 3.40973 17.2843 3.21799 16.908C3 16.4802 3 15.9201 3 14.8V7.2C3 6.07989 3 5.51984 3.21799 5.09202C3.40973 4.71569 3.71569 4.40973 4.09202 4.21799C4.51984 4 5.0799 4 6.2 4H17.8C18.9201 4 19.4802 4 19.908 4.21799C20.2843 4.40973 20.5903 4.71569 20.782 5.09202C21 5.51984 21 6.0799 21 7.2V20Z"
      stroke="#ffffff"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const ImageIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" width={20} height={20}>
    <path
      d="M14.2639 15.9375L12.5958 14.2834C11.7909 13.4851 11.3884 13.086 10.9266 12.9401C10.5204 12.8118 10.0838 12.8165 9.68048 12.9536C9.22188 13.1095 8.82814 13.5172 8.04068 14.3326L4.04409 18.2801M14.2639 15.9375L14.6053 15.599C15.4112 14.7998 15.8141 14.4002 16.2765 14.2543C16.6831 14.126 17.12 14.1311 17.5236 14.2687C17.9824 14.4251 18.3761 14.8339 19.1634 15.6514L20 16.4934M14.2639 15.9375L18.275 19.9565M18.275 19.9565C17.9176 20 17.4543 20 16.8 20H7.2C6.07989 20 5.51984 20 5.09202 19.782C4.71569 19.5903 4.40973 19.2843 4.21799 18.908C4.12796 18.7313 4.07512 18.5321 4.04409 18.2801M18.275 19.9565C18.5293 19.9256 18.7301 19.8727 18.908 19.782C19.2843 19.5903 19.5903 19.2843 19.782 18.908C20 18.4802 20 17.9201 20 16.8V16.4934M4.04409 18.2801C4 17.9221 4 17.4575 4 16.8V7.2C4 6.0799 4 5.51984 4.21799 5.09202C4.40973 4.71569 4.71569 4.40973 5.09202 4.21799C5.51984 4 6.07989 4 7.2 4H16.8C17.9201 4 18.4802 4 18.908 4.21799C19.2843 4.40973 19.5903 4.71569 19.782 5.09202C20 5.51984 20 6.0799 20 7.2V16.4934M17 8.99989C17 10.1045 16.1046 10.9999 15 10.9999C13.8954 10.9999 13 10.1045 13 8.99989C13 7.89532 13.8954 6.99989 15 6.99989C16.1046 6.99989 17 7.89532 17 8.99989Z"
      stroke="#ffffff"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const PostsIcon = () => (
  <svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" width={20} height={20}>
    <path fillRule="evenodd" clipRule="evenodd" d="M8 0L0 6V8H1V15H4V10H7V15H15V8H16V6L14 4.5V1H11V2.25L8 0ZM9 10H12V13H9V10Z" fill="#ffffff" />
  </svg>
);

const DevIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" width={20} height={20}>
    <path fillRule="evenodd" clipRule="evenodd" d="M3 18C3 15.3945 4.66081 13.1768 6.98156 12.348C7.61232 12.1227 8.29183 12 9 12C9.70817 12 10.3877 12.1227 11.0184 12.348C11.3611 12.4703 11.6893 12.623 12 12.8027C12.3107 12.623 12.6389 12.4703 12.9816 12.348C13.6123 12.1227 14.2918 12 15 12C15.7082 12 16.3877 12.1227 17.0184 12.348C19.3392 13.1768 21 15.3945 21 18V21H15.75V19.5H19.5V18C19.5 15.5147 17.4853 13.5 15 13.5C14.4029 13.5 13.833 13.6163 13.3116 13.8275C14.3568 14.9073 15 16.3785 15 18V21H3V18ZM9 11.25C8.31104 11.25 7.66548 11.0642 7.11068 10.74C5.9977 10.0896 5.25 8.88211 5.25 7.5C5.25 5.42893 6.92893 3.75 9 3.75C10.2267 3.75 11.3158 4.33901 12 5.24963C12.6842 4.33901 13.7733 3.75 15 3.75C17.0711 3.75 18.75 5.42893 18.75 7.5C18.75 8.88211 18.0023 10.0896 16.8893 10.74C16.3345 11.0642 15.689 11.25 15 11.25C14.311 11.25 13.6655 11.0642 13.1107 10.74C12.6776 10.4869 12.2999 10.1495 12 9.75036C11.7001 10.1496 11.3224 10.4869 10.8893 10.74C10.3345 11.0642 9.68896 11.25 9 11.25ZM13.5 18V19.5H4.5V18C4.5 15.5147 6.51472 13.5 9 13.5C11.4853 13.5 13.5 15.5147 13.5 18ZM11.25 7.5C11.25 8.74264 10.2426 9.75 9 9.75C7.75736 9.75 6.75 8.74264 6.75 7.5C6.75 6.25736 7.75736 5.25 9 5.25C10.2426 5.25 11.25 6.25736 11.25 7.5ZM15 5.25C13.7574 5.25 12.75 6.25736 12.75 7.5C12.75 8.74264 13.7574 9.75 15 9.75C16.2426 9.75 17.25 8.74264 17.25 7.5C17.25 6.25736 16.2426 5.25 15 5.25Z" fill="#ffffff" />
  </svg>
);

const SupportIcon = () => (
  <svg fill="#ffffff" viewBox="0 0 32 32" version="1.1" xmlns="http://www.w3.org/2000/svg" width={20} height={20}>
    <path d="M30 16l-8.485 8.485-2.828-2.828 5.656-5.657-5.657-5.657 2.828-2.828 8.486 8.485zM2 16l8.485-8.485 2.828 2.828-5.656 5.657 5.657 5.657-2.828 2.828-8.486-8.485z" />
  </svg>
);

// ── Types 

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
  comments: Comment[];
  created_at: string;
}

interface Comment {
  id: string;
  username: string;
  pfp_url: string | null;
  content: string;
  created_at: string;
}

// ── Helpers 

function Avatar({ url, username, size = 36 }: { url: string | null; username: string; size?: number }) {
  const initials = username?.slice(0, 2).toUpperCase() ?? "??";
  if (url) {
    return (
      <img
        src={url}
        alt={username}
        style={{ width: size, height: size, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }}
      />
    );
  }
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        background: "#646669",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: size * 0.35,
        fontWeight: 700,
        flexShrink: 0,
        color: "#fff",
      }}
    >
      {initials}
    </div>
  );
}

// ── Post Card

function PostCard({
  post,
  currentUser,
  onLike,
  onBookmark,
}: {
  post: Post;
  currentUser: { id: string; username: string; pfp_url: string | null } | null;
  onLike: (id: string) => void;
  onBookmark: (id: string) => void;
}) {
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [localComments, setLocalComments] = useState<Comment[]>(post.comments ?? []);

  const liked = currentUser ? post.liked_by?.includes(currentUser.id) : false;
  const bookmarked = currentUser ? post.bookmarked_by?.includes(currentUser.id) : false;

  async function submitComment() {
    if (!commentText.trim() || !currentUser) return;
    const newComment: Comment = {
      id: crypto.randomUUID(),
      username: currentUser.username,
      pfp_url: currentUser.pfp_url,
      content: commentText.trim(),
      created_at: new Date().toISOString(),
    };
    const updatedComments = [...localComments, newComment];
    setLocalComments(updatedComments);
    setCommentText("");
    await supabase.from("posts").update({ comments: updatedComments }).eq("id", post.id);
  }

  return (
    <div
      style={{
        background: "#2c2e31",
        borderRadius: 12,
        padding: "16px 20px",
        marginBottom: 12,
        border: "1px solid #3a3d42",
      }}
    >
      <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
        <Avatar url={post.pfp_url} username={post.username} size={40} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ color: "#e2b714", fontWeight: 700, fontSize: 14, marginBottom: 4 }}>
            @{post.username}
          </div>
          <div style={{ fontSize: 15, lineHeight: 1.5, wordBreak: "break-word", color: "#d1d0c5" }}>
            {post.content}
          </div>
          {post.image_url && (
            <img
              src={post.image_url}
              alt="post"
              style={{ marginTop: 10, maxWidth: "100%", borderRadius: 8, maxHeight: 320, objectFit: "cover" }}
            />
          )}

          {/* Action buttons */}
          <div style={{ display: "flex", gap: 20, marginTop: 12, alignItems: "center" }}>
            {/* Like */}
            <button
              onClick={() => onLike(post.id)}
              style={{
                display: "flex", alignItems: "center", gap: 6,
                background: "none", border: "none", cursor: "pointer",
                color: liked ? "#e2b714" : "#646669", fontSize: 13, padding: 0,
                transition: "color 0.15s",
              }}
            >
              <HeartIcon filled={liked} />
              <span>{post.likes ?? 0}</span>
            </button>

            {/* Bookmark */}
            <button
              onClick={() => onBookmark(post.id)}
              style={{
                display: "flex", alignItems: "center", gap: 6,
                background: "none", border: "none", cursor: "pointer",
                color: bookmarked ? "#e2b714" : "#646669", padding: 0,
                transition: "color 0.15s",
              }}
            >
              <BookmarkIcon filled={bookmarked} />
            </button>

            {/* Comment */}
            <button
              onClick={() => setShowComments((v) => !v)}
              style={{
                display: "flex", alignItems: "center", gap: 6,
                background: "none", border: "none", cursor: "pointer",
                color: "#646669", padding: 0, transition: "color 0.15s",
              }}
            >
              <CommentIcon />
              <span style={{ fontSize: 13 }}>{localComments.length}</span>
            </button>
          </div>

          {/* Comments section */}
          {showComments && (
            <div style={{ marginTop: 12 }}>
              {localComments.map((c) => (
                <div key={c.id} style={{ display: "flex", gap: 8, marginBottom: 8, alignItems: "flex-start" }}>
                  <Avatar url={c.pfp_url} username={c.username} size={26} />
                  <div>
                    <span style={{ color: "#e2b714", fontSize: 12, fontWeight: 700 }}>@{c.username} </span>
                    <span style={{ color: "#d1d0c5", fontSize: 13 }}>{c.content}</span>
                  </div>
                </div>
              ))}
              {currentUser && (
                <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                  <input
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && submitComment()}
                    placeholder="Write a reply..."
                    maxLength={180}
                    style={{
                      flex: 1, background: "#3a3d42", border: "none", borderRadius: 8,
                      padding: "8px 12px", color: "#fff", fontSize: 13, fontFamily: "inherit",
                      outline: "none",
                    }}
                  />
                  <button
                    onClick={submitComment}
                    style={{
                      background: "#e2b714", border: "none", borderRadius: 8,
                      padding: "8px 14px", color: "#323437", fontWeight: 700,
                      fontSize: 13, cursor: "pointer", fontFamily: "inherit",
                    }}
                  >
                    Reply
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main Component 

export default function Home() {
  // Auth state
  const [step, setStep] = useState<"signup" | "loading" | "app">("signup");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [pfpFile, setPfpFile] = useState<File | null>(null);
  const [pfpPreview, setPfpPreview] = useState<string | null>(null);
  const [signupError, setSignupError] = useState("");

  // App state
  const [currentUser, setCurrentUser] = useState<{ id: string; username: string; pfp_url: string | null } | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [view, setView] = useState<"posts" | "bookmarks">("posts");

  // New post
  const [postText, setPostText] = useState("");
  const [postImageFile, setPostImageFile] = useState<File | null>(null);
  const [postImagePreview, setPostImagePreview] = useState<string | null>(null);
  const [posting, setPosting] = useState(false);

  const pfpInputRef = useRef<HTMLInputElement>(null);
  const postImageRef = useRef<HTMLInputElement>(null);

  // Load posts
  async function loadPosts() {
    const { data } = await supabase
      .from("posts")
      .select("*")
      .order("created_at", { ascending: false });
    if (data) setPosts(data as Post[]);
  }

  // Handle pfp file pick
  function handlePfpPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPfpFile(file);
    setPfpPreview(URL.createObjectURL(file));
  }

  // Username validation
  function validateUsername(val: string) {
    return /^[a-z0-9]{1,16}$/i.test(val);
  }

  // Sign up
  async function handleSignup() {
    setSignupError("");
    if (!validateUsername(username)) {
      setSignupError("Username must be 1–16 chars, letters and numbers only.");
      return;
    }
    if (!password || password.length < 6) {
      setSignupError("Password must be at least 6 characters.");
      return;
    }

    setStep("loading");

    // Create auth user
    const { data: authData, error: authErr } = await supabase.auth.signUp({
      email: `${username.toLowerCase()}@monkeypost.local`,
      password,
    });

    if (authErr || !authData.user) {
      setStep("signup");
      setSignupError(authErr?.message ?? "Sign up failed.");
      return;
    }

    const uid = authData.user.id;
    let pfp_url: string | null = null;

    // Upload pfp
    if (pfpFile) {
      const ext = pfpFile.name.split(".").pop();
      const { data: uploadData } = await supabase.storage
        .from("pfps")
        .upload(`${uid}.${ext}`, pfpFile, { upsert: true });
      if (uploadData) {
        const { data: urlData } = supabase.storage.from("pfps").getPublicUrl(uploadData.path);
        pfp_url = urlData.publicUrl;
      }
    }

    // Save profile
    await supabase.from("profiles").upsert({ id: uid, username, pfp_url });
    setCurrentUser({ id: uid, username, pfp_url });

    await loadPosts();
    setStep("app");
  }

  // Handle post image pick
  function handlePostImagePick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPostImageFile(file);
    setPostImagePreview(URL.createObjectURL(file));
  }

  // Submit post
  async function submitPost() {
    if (!postText.trim() || !currentUser) return;
    setPosting(true);

    let image_url: string | null = null;
    if (postImageFile) {
      const ext = postImageFile.name.split(".").pop();
      const path = `post_${Date.now()}.${ext}`;
      const { data: upData } = await supabase.storage
        .from("post-images")
        .upload(path, postImageFile);
      if (upData) {
        const { data: urlData } = supabase.storage.from("post-images").getPublicUrl(upData.path);
        image_url = urlData.publicUrl;
      }
    }

    await supabase.from("posts").insert({
      user_id: currentUser.id,
      username: currentUser.username,
      pfp_url: currentUser.pfp_url,
      content: postText.trim(),
      image_url,
      likes: 0,
      liked_by: [],
      bookmarked_by: [],
      comments: [],
    });

    setPostText("");
    setPostImageFile(null);
    setPostImagePreview(null);
    await loadPosts();
    setPosting(false);
  }

  // Like
  async function handleLike(postId: string) {
    if (!currentUser) return;
    const post = posts.find((p) => p.id === postId);
    if (!post) return;
    const liked = post.liked_by?.includes(currentUser.id);
    const newLikedBy = liked
      ? post.liked_by.filter((id) => id !== currentUser.id)
      : [...(post.liked_by ?? []), currentUser.id];
    const newLikes = liked ? post.likes - 1 : post.likes + 1;
    setPosts((prev) =>
      prev.map((p) => p.id === postId ? { ...p, likes: newLikes, liked_by: newLikedBy } : p)
    );
    await supabase.from("posts").update({ likes: newLikes, liked_by: newLikedBy }).eq("id", postId);
  }

  // Bookmark
  async function handleBookmark(postId: string) {
    if (!currentUser) return;
    const post = posts.find((p) => p.id === postId);
    if (!post) return;
    const bookmarked = post.bookmarked_by?.includes(currentUser.id);
    const newBookmarkedBy = bookmarked
      ? post.bookmarked_by.filter((id) => id !== currentUser.id)
      : [...(post.bookmarked_by ?? []), currentUser.id];
    setPosts((prev) =>
      prev.map((p) => p.id === postId ? { ...p, bookmarked_by: newBookmarkedBy } : p)
    );
    await supabase.from("posts").update({ bookmarked_by: newBookmarkedBy }).eq("id", postId);
  }

  const visiblePosts =
    view === "bookmarks" && currentUser
      ? posts.filter((p) => p.bookmarked_by?.includes(currentUser.id))
      : posts;

  // ── Render: Signup

  if (step === "signup") {
    return (
      <main
        style={{
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          background: "#323437",
          fontFamily: "var(--font-roboto-mono), monospace",
        }}
      >
        {/* Topbar */}
        <div
          style={{
            width: "100%",
            padding: "20px 32px",
            borderBottom: "1px solid #3a3d42",
            display: "flex",
            alignItems: "center",
          }}
        >
          <span style={{ fontSize: 22, fontWeight: 700, color: "#e2b714", letterSpacing: "-0.5px" }}>
            monkeypost
          </span>
        </div>

        {/* Sign up form */}
        <div
          style={{
            marginTop: 60,
            width: "100%",
            maxWidth: 400,
            padding: "0 24px",
            display: "flex",
            flexDirection: "column",
            gap: 16,
          }}
        >
          <h2 style={{ fontSize: 26, fontWeight: 700, marginBottom: 8, color: "#d1d0c5" }}>
            Sign up
          </h2>

          <input
            value={username}
            onChange={(e) => {
              const val = e.target.value.replace(/[^a-zA-Z0-9]/g, "").slice(0, 16);
              setUsername(val);
            }}
            placeholder="Username"
            maxLength={16}
            style={{
              background: "#2c2e31",
              border: "1px solid #3a3d42",
              borderRadius: 8,
              padding: "12px 16px",
              color: "#fff",
              fontSize: 15,
              fontFamily: "inherit",
              outline: "none",
              width: "100%",
              boxSizing: "border-box",
            }}
          />

          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            style={{
              background: "#2c2e31",
              border: "1px solid #3a3d42",
              borderRadius: 8,
              padding: "12px 16px",
              color: "#fff",
              fontSize: 15,
              fontFamily: "inherit",
              outline: "none",
              width: "100%",
              boxSizing: "border-box",
            }}
          />

          {/* Profile picture button */}
          <input
            ref={pfpInputRef}
            type="file"
            accept=".jpeg,.jpg,.png,.gif,.avif,.webp"
            style={{ display: "none" }}
            onChange={handlePfpPick}
          />
          <button
            onClick={() => pfpInputRef.current?.click()}
            style={{
              background: "#2c2e31",
              border: "1px solid #3a3d42",
              borderRadius: 8,
              padding: "12px 16px",
              color: "#d1d0c5",
              fontSize: 15,
              fontFamily: "inherit",
              cursor: "pointer",
              textAlign: "left",
              display: "flex",
              alignItems: "center",
              gap: 10,
            }}
          >
            {pfpPreview ? (
              <>
                <img src={pfpPreview} alt="pfp" style={{ width: 28, height: 28, borderRadius: "50%", objectFit: "cover" }} />
                <span style={{ color: "#e2b714" }}>Profile picture selected</span>
              </>
            ) : (
              <>
                <span style={{ color: "#646669" }}>📷</span>
                <span>Upload Profile Picture</span>
              </>
            )}
          </button>

          {signupError && (
            <div style={{ color: "#ca4754", fontSize: 13 }}>{signupError}</div>
          )}

          <button
            onClick={handleSignup}
            style={{
              background: "#e2b714",
              border: "none",
              borderRadius: 8,
              padding: "13px 16px",
              color: "#323437",
              fontSize: 15,
              fontWeight: 700,
              fontFamily: "inherit",
              cursor: "pointer",
              marginTop: 4,
              transition: "opacity 0.15s",
            }}
          >
            Sign up!
          </button>
        </div>
      </main>
    );
  }

  // ── Render: Loading

  if (step === "loading") {
    return (
      <main
        style={{
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          background: "#323437",
          fontFamily: "var(--font-roboto-mono), monospace",
        }}
      >
        {/* Topbar */}
        <div style={{ width: "100%", padding: "20px 32px", borderBottom: "1px solid #3a3d42" }}>
          <span style={{ fontSize: 22, fontWeight: 700, color: "#e2b714" }}>monkeypost</span>
        </div>
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <LoadingSpinner />
        </div>
      </main>
    );
  }

  // ── Render: App

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#323437",
        fontFamily: "var(--font-roboto-mono), monospace",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Topbar */}
      <div
        style={{
          width: "100%",
          padding: "16px 32px",
          borderBottom: "1px solid #3a3d42",
          display: "flex",
          alignItems: "center",
          position: "sticky",
          top: 0,
          background: "#323437",
          zIndex: 10,
        }}
      >
        <span style={{ fontSize: 22, fontWeight: 700, color: "#e2b714", letterSpacing: "-0.5px" }}>
          monkeypost
        </span>
      </div>

      <div style={{ display: "flex", flex: 1, maxWidth: 1100, margin: "0 auto", width: "100%", padding: "0 16px" }}>
        {/* Left sidebar */}
        <aside
          style={{
            width: 220,
            flexShrink: 0,
            padding: "32px 0",
            display: "flex",
            flexDirection: "column",
            justifyContent: "flex-end",
            position: "sticky",
            top: 64,
            height: "calc(100vh - 64px)",
            paddingBottom: 32,
          }}
        >
          <nav style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 24 }}>
            {[
              { label: "Posts", icon: <PostsIcon />, action: () => setView("posts") },
              { label: "Developers", icon: <DevIcon />, action: () => window.location.href = "/dev" },
              { label: "Support Developing", icon: <SupportIcon />, action: () => window.location.href = "/discord" },
              { label: "Bookmarks", icon: <BookmarkIcon filled />, action: () => setView("bookmarks") },
            ].map(({ label, icon, action }) => (
              <button
                key={label}
                onClick={action}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: "#d1d0c5",
                  fontSize: 14,
                  fontFamily: "inherit",
                  padding: "10px 12px",
                  borderRadius: 8,
                  textAlign: "left",
                  transition: "background 0.15s",
                  width: "100%",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "#2c2e31")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
              >
                {icon}
                <span>{label}</span>
              </button>
            ))}
          </nav>

          {/* User info */}
          {currentUser && (
            <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px" }}>
              <Avatar url={currentUser.pfp_url} username={currentUser.username} size={36} />
              <span style={{ color: "#e2b714", fontSize: 14, fontWeight: 700 }}>@{currentUser.username}</span>
            </div>
          )}
        </aside>

        {/* Main content */}
        <div style={{ flex: 1, padding: "24px 24px 24px 32px", maxWidth: 680 }}>

          {/* Compose post */}
          {view === "posts" && currentUser && (
            <div
              style={{
                background: "#2c2e31",
                borderRadius: 12,
                padding: "16px 20px",
                marginBottom: 20,
                border: "1px solid #3a3d42",
              }}
            >
              <textarea
                value={postText}
                onChange={(e) => setPostText(e.target.value.slice(0, 180))}
                placeholder="I just got 150WPM in 60s!"
                maxLength={180}
                rows={3}
                style={{
                  width: "100%",
                  background: "none",
                  border: "none",
                  color: "#d1d0c5",
                  fontSize: 15,
                  fontFamily: "inherit",
                  resize: "none",
                  outline: "none",
                  lineHeight: 1.5,
                  boxSizing: "border-box",
                }}
              />
              <div style={{ fontSize: 12, color: "#646669", textAlign: "right", marginBottom: 10 }}>
                {postText.length}/180
              </div>

              {/* Post image preview */}
              {postImagePreview && (
                <div style={{ position: "relative", marginBottom: 10 }}>
                  <img
                    src={postImagePreview}
                    alt="post img"
                    style={{ maxWidth: "100%", borderRadius: 8, maxHeight: 240, objectFit: "cover" }}
                  />
                  <button
                    onClick={() => { setPostImageFile(null); setPostImagePreview(null); }}
                    style={{
                      position: "absolute", top: 6, right: 6,
                      background: "#323437cc", border: "none", borderRadius: "50%",
                      width: 24, height: 24, cursor: "pointer", color: "#fff", fontSize: 14,
                    }}
                  >×</button>
                </div>
              )}

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ display: "flex", gap: 8 }}>
                  {/* Image attach */}
                  <input
                    ref={postImageRef}
                    type="file"
                    accept=".jpeg,.jpg,.png,.avif,.webp"
                    style={{ display: "none" }}
                    onChange={handlePostImagePick}
                  />
                  <button
                    onClick={() => postImageRef.current?.click()}
                    style={{
                      background: "none", border: "none", cursor: "pointer",
                      padding: 6, borderRadius: 6, color: "#646669",
                      transition: "color 0.15s",
                    }}
                    title="Attach image"
                  >
                    <ImageIcon />
                  </button>
                </div>

                <button
                  onClick={submitPost}
                  disabled={posting || !postText.trim()}
                  style={{
                    background: posting || !postText.trim() ? "#3a3d42" : "#e2b714",
                    border: "none",
                    borderRadius: 8,
                    padding: "8px 18px",
                    color: posting || !postText.trim() ? "#646669" : "#323437",
                    fontWeight: 700,
                    fontSize: 14,
                    fontFamily: "inherit",
                    cursor: posting || !postText.trim() ? "not-allowed" : "pointer",
                    transition: "background 0.15s",
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  {posting ? <><LoadingSpinner /> Posting...</> : "Post!"}
                </button>
              </div>
            </div>
          )}

          {/* Posts feed */}
          <div>
            {view === "bookmarks" && (
              <h3 style={{ color: "#646669", fontSize: 13, marginBottom: 16, textTransform: "uppercase", letterSpacing: 1 }}>
                Bookmarks
              </h3>
            )}
            {visiblePosts.length === 0 && (
              <div style={{ color: "#646669", textAlign: "center", marginTop: 60, fontSize: 15 }}>
                {view === "bookmarks" ? "No bookmarks yet." : "No posts yet. Be the first!"}
              </div>
            )}
            {visiblePosts.map((post) => (
              <PostCard
                key={post.id}
                post={post}
                currentUser={currentUser}
                onLike={handleLike}
                onBookmark={handleBookmark}
              />
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}

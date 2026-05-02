"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { createClient } from "@supabase/supabase-js";

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
  const parts: React.ReactNode[] = [];
  let last = 0;
  let i = 0;
  const regex = new RegExp(/(\p{Emoji_Presentation}|\p{Extended_Pictographic})/gu);
  const str = text;
  regex.lastIndex = 0;
  let match;
  while ((match = regex.exec(str)) !== null) {
    if (match.index > last) {
      parts.push(str.slice(last, match.index));
    }
    const em = match[0];
    parts.push(
      <img
        key={i++}
        src={getTwemojiUrl(em)}
        alt={em}
        style={{ width: "1.15em", height: "1.15em", display: "inline-block", verticalAlign: "-0.2em", margin: "0 0.05em" }}
      />
    );
    last = match.index + em.length;
  }
  if (last < str.length) parts.push(str.slice(last));
  return parts;
}

// ── Blocked words filter ──────────────────────────────────────────────────────

async function loadBlockedWords(): Promise<string[]> {
  try {
    const res = await fetch("/blocked.json");
    return await res.json();
  } catch {
    return [];
  }
}

let _blockedWords: string[] | null = null;
async function getBlockedWords(): Promise<string[]> {
  if (_blockedWords) return _blockedWords;
  _blockedWords = await loadBlockedWords();
  return _blockedWords;
}

function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .replace(/0/g, "o")
    .replace(/1/g, "i")
    .replace(/3/g, "e")
    .replace(/4/g, "a")
    .replace(/5/g, "s")
    .replace(/8/g, "b")
    .replace(/@/g, "a")
    .replace(/\$/g, "s")
    .replace(/\*/g, "")
    .replace(/[^a-z\s]/g, "");
}

// Words that are short/ambiguous and should only match as whole words
const WHOLE_WORD_ONLY = new Set([
  "ass", "sex", "cum", "bj", "mf", "nut", "wet", "lay", "raw", "bang", "bone",
  "bust", "drip", "pipe", "rail", "shag", "simp", "smash", "thot", "hoe",
  "clit", "tit", "ass", "balls", "anal",
]);

async function containsBlockedWord(text: string): Promise<boolean> {
  const blocked = await getBlockedWords();
  const normalized = normalizeText(text);
  const plain = text.toLowerCase().replace(/[^a-z0-9\s]/g, "");

  for (const word of blocked) {
    const normWord = normalizeText(word);
    const cleanWord = word.toLowerCase().replace(/[^a-z0-9\s]/g, "");

    if (WHOLE_WORD_ONLY.has(cleanWord) || WHOLE_WORD_ONLY.has(normWord)) {
      // Whole-word match only
      const wordBoundaryRegex = new RegExp(`(?<![a-z])${normWord.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?![a-z])`, "i");
      if (wordBoundaryRegex.test(normalized)) return true;
    } else {
      // Substring match for longer/unambiguous words
      if (normalized.includes(normWord) || plain.includes(cleanWord)) {
        return true;
      }
    }
  }
  return false;
}

// ── Strip image metadata ──────────────────────────────────────────────────────

async function stripImageMetadata(file: File): Promise<File> {
  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0);
      URL.revokeObjectURL(url);
      canvas.toBlob(
        (blob) => {
          if (!blob) { resolve(file); return; }
          resolve(new File([blob], file.name.replace(/\.[^.]+$/, ".jpg"), { type: "image/jpeg" }));
        },
        "image/jpeg",
        0.92
      );
    };
    img.onerror = () => { URL.revokeObjectURL(url); resolve(file); };
    img.src = url;
  });
}

// ── SVGs ──────────────────────────────────────────────────────────────────────

const LoadingSpinner = () => (
  <svg viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg" fill="none"
    className="animate-spin" style={{ animationDuration: "1.4s" }} width={40} height={40}>
    <g fill="#ffffff" fillRule="evenodd" clipRule="evenodd">
      <path d="M8 1.5a6.5 6.5 0 100 13 6.5 6.5 0 000-13zM0 8a8 8 0 1116 0A8 8 0 010 8z" opacity=".2" />
      <path d="M7.25.75A.75.75 0 018 0a8 8 0 018 8 .75.75 0 01-1.5 0A6.5 6.5 0 008 1.5a.75.75 0 01-.75-.75z" />
    </g>
  </svg>
);

const HeartIcon = ({ filled }: { filled?: boolean }) => (
  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" width={18} height={18}>
    <path d="M15.7 4C18.87 4 21 6.98 21 9.76C21 15.39 12.16 20 12 20C11.84 20 3 15.39 3 9.76C3 6.98 5.13 4 8.3 4C10.12 4 11.31 4.91 12 5.71C12.69 4.91 13.88 4 15.7 4Z"
      stroke="#ffffff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill={filled ? "#ffffff" : "none"} />
  </svg>
);

const BookmarkIcon = ({ filled }: { filled?: boolean }) => (
  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" width={18} height={18}>
    <path d="M5 3h14a1 1 0 011 1v18l-8-5.5L4 22V4a1 1 0 011-1z"
      fill={filled ? "#ffffff" : "none"} stroke="#ffffff" strokeWidth="1.5" strokeLinejoin="round" />
  </svg>
);

const CommentIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" width={18} height={18}>
    <path d="M7 9H17M7 13H12M21 20L17.6757 18.3378C17.4237 18.2118 17.2977 18.1488 17.1656 18.1044C17.0484 18.065 16.9277 18.0365 16.8052 18.0193C16.6672 18 16.5263 18 16.2446 18H6.2C5.07989 18 4.51984 18 4.09202 17.782C3.71569 17.5903 3.40973 17.2843 3.21799 16.908C3 16.4802 3 15.9201 3 14.8V7.2C3 6.07989 3 5.51984 3.21799 5.09202C3.40973 4.71569 3.71569 4.40973 4.09202 4.21799C4.51984 4 5.0799 4 6.2 4H17.8C18.9201 4 19.4802 4 19.908 4.21799C20.2843 4.40973 20.5903 4.71569 20.782 5.09202C21 5.51984 21 6.0799 21 7.2V20Z"
      stroke="#ffffff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const ImageIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" width={20} height={20}>
    <path d="M14.2639 15.9375L12.5958 14.2834C11.7909 13.4851 11.3884 13.086 10.9266 12.9401C10.5204 12.8118 10.0838 12.8165 9.68048 12.9536C9.22188 13.1095 8.82814 13.5172 8.04068 14.3326L4.04409 18.2801M14.2639 15.9375L14.6053 15.599C15.4112 14.7998 15.8141 14.4002 16.2765 14.2543C16.6831 14.126 17.12 14.1311 17.5236 14.2687C17.9824 14.4251 18.3761 14.8339 19.1634 15.6514L20 16.4934M14.2639 15.9375L18.275 19.9565M18.275 19.9565C17.9176 20 17.4543 20 16.8 20H7.2C6.07989 20 5.51984 20 5.09202 19.782C4.71569 19.5903 4.40973 19.2843 4.21799 18.908C4.12796 18.7313 4.07512 18.5321 4.04409 18.2801M18.275 19.9565C18.5293 19.9256 18.7301 19.8727 18.908 19.782C19.2843 19.5903 19.5903 19.2843 19.782 18.908C20 18.4802 20 17.9201 20 16.8V16.4934M4.04409 18.2801C4 17.9221 4 17.4575 4 16.8V7.2C4 6.0799 4 5.51984 4.21799 5.09202C4.40973 4.71569 4.71569 4.40973 5.09202 4.21799C5.51984 4 6.07989 4 7.2 4H16.8C17.9201 4 18.4802 4 18.908 4.21799C19.2843 4.40973 19.5903 4.71569 19.782 5.09202C20 5.51984 20 6.0799 20 7.2V16.4934M17 8.99989C17 10.1045 16.1046 10.9999 15 10.9999C13.8954 10.9999 13 10.1045 13 8.99989C13 7.89532 13.8954 6.99989 15 6.99989C16.1046 6.99989 17 7.89532 17 8.99989Z"
      stroke="#ffffff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
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

const TrashIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" width={16} height={16}>
    <path d="M3 6H5H21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M8 6V4C8 3.46957 8.21071 2.96086 8.58579 2.58579C8.96086 2.21071 9.46957 2 10 2H14C14.5304 2 15.0391 2.21071 15.4142 2.58579C15.7893 2.96086 16 3.46957 16 4V6M19 6L18.1168 19.1042C18.0504 20.1554 17.1886 21 16.135 21H7.86502C6.81138 21 5.94962 20.1554 5.88316 19.1042L5 6H19Z"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const EditIcon = () => (
  <svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" width={16} height={16}>
    <path d="M8.29289 3.70711L1 11V15H5L12.2929 7.70711L8.29289 3.70711Z" fill="currentColor" />
    <path d="M9.70711 2.29289L13.7071 6.29289L15.1716 4.82843C15.702 4.29799 16 3.57857 16 2.82843C16 1.26633 14.7337 0 13.1716 0C12.4214 0 11.702 0.297995 11.1716 0.828428L9.70711 2.29289Z" fill="currentColor" />
  </svg>
);

const DownloadIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" width={20} height={20}>
    <path d="M12.5535 16.5061C12.4114 16.6615 12.2106 16.75 12 16.75C11.7894 16.75 11.5886 16.6615 11.4465 16.5061L7.44648 12.1311C7.16698 11.8254 7.18822 11.351 7.49392 11.0715C7.79963 10.792 8.27402 10.8132 8.55352 11.1189L11.25 14.0682V3C11.25 2.58579 11.5858 2.25 12 2.25C12.4142 2.25 12.75 2.58579 12.75 3V14.0682L15.4465 11.1189C15.726 10.8132 16.2004 10.792 16.5061 11.0715C16.8118 11.351 16.833 11.8254 16.5535 12.1311L12.5535 16.5061Z" fill="#ffffff" />
    <path d="M3.75 15C3.75 14.5858 3.41422 14.25 3 14.25C2.58579 14.25 2.25 14.5858 2.25 15V15.0549C2.24998 16.4225 2.24996 17.5248 2.36652 18.3918C2.48754 19.2919 2.74643 20.0497 3.34835 20.6516C3.95027 21.2536 4.70814 21.5125 5.60825 21.6335C6.47522 21.75 7.57754 21.75 8.94513 21.75H15.0549C16.4225 21.75 17.5248 21.75 18.3918 21.6335C19.2919 21.5125 20.0497 21.2536 20.6517 20.6516C21.2536 20.0497 21.5125 19.2919 21.6335 18.3918C21.75 17.5248 21.75 16.4225 21.75 15.0549V15C21.75 14.5858 21.4142 14.25 21 14.25C20.5858 14.25 20.25 14.5858 20.25 15C20.25 16.4354 20.2484 17.4365 20.1469 18.1919C20.0482 18.9257 19.8678 19.3142 19.591 19.591C19.3142 19.8678 18.9257 20.0482 18.1919 20.1469C17.4365 20.2484 16.4354 20.25 15 20.25H9C7.56459 20.25 6.56347 20.2484 5.80812 20.1469C5.07435 20.0482 4.68577 19.8678 4.40901 19.591C4.13225 19.3142 3.9518 18.9257 3.85315 18.1919C3.75159 17.4365 3.75 16.4354 3.75 15Z" fill="#ffffff" />
  </svg>
);

const NotificationIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" width={20} height={20}>
    <path d="M9.00195 17H5.60636C4.34793 17 3.71872 17 3.58633 16.9023C3.4376 16.7925 3.40126 16.7277 3.38515 16.5436C3.37082 16.3797 3.75646 15.7486 4.52776 14.4866C5.32411 13.1835 6.00031 11.2862 6.00031 8.6C6.00031 7.11479 6.63245 5.69041 7.75766 4.6402C8.88288 3.59 10.409 3 12.0003 3C13.5916 3 15.1177 3.59 16.2429 4.6402C17.3682 5.69041 18.0003 7.11479 18.0003 8.6C18.0003 11.2862 18.6765 13.1835 19.4729 14.4866C20.2441 15.7486 20.6298 16.3797 20.6155 16.5436C20.5994 16.7277 20.563 16.7925 20.4143 16.9023C20.2819 17 19.6527 17 18.3943 17H15.0003M9.00195 17L9.00031 18C9.00031 19.6569 10.3435 21 12.0003 21C13.6572 21 15.0003 19.6569 15.0003 18V17M9.00195 17H15.0003" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

// here are the users with the verified checkmark

const VERIFIED_USERS = new Set(["kiirod", "testaccount123", "puppyboy", "asd", "RIPVIP"]);

const OwnerBadge = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#e2b714" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width={16} height={16} style={{ display: "inline-block", verticalAlign: "middle", marginLeft: 4 }}>
    <path d="M12 3a3.6 3.6 0 00-3.05 1.68 3.6 3.6 0 00-.9-.1 3.6 3.6 0 00-2.42 1.06 3.6 3.6 0 00-.94 3.32A3.6 3.6 0 003 12a3.6 3.6 0 001.69 3.05 3.6 3.6 0 00.95 3.32 3.6 3.6 0 003.35.96A3.6 3.6 0 0012 21a3.6 3.6 0 003.04-1.67 3.6 3.6 0 004.3-4.3A3.6 3.6 0 0021 12a3.6 3.6 0 00-1.67-3.04v0a3.6 3.6 0 00-4.3-4.3A3.6 3.6 0 0012 3z" />
    <path d="M15 10l-4 4" />
    <path d="M9 12l2 2" />
  </svg>
);

const RefreshIcon = ({ spinning }: { spinning?: boolean }) => (
  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" width={16} height={16}
    style={spinning ? { animation: "spin 0.7s linear infinite" } : undefined}>
    <path d="M4.06189 13C4.02104 12.6724 4 12.3387 4 12C4 7.58172 7.58172 4 12 4C14.5006 4 16.7332 5.14727 18.2002 6.94416M19.9381 11C19.979 11.3276 20 11.6613 20 12C20 16.4183 16.4183 20 12 20C9.61061 20 7.46589 18.9525 6 17.2916M9 17H6V17.2916M18.2002 4V6.94416M18.2002 6.94416V6.99993L15.2002 7M6 20V17.2916"
      stroke="#ffffff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

// ── Types ─────────────────────────────────────────────────────────────────────

interface Reply {
  id: string;
  username: string;
  pfp_url: string | null;
  content: string;
  created_at: string;
  replies?: Reply[];
}

interface Comment {
  id: string;
  username: string;
  pfp_url: string | null;
  content: string;
  created_at: string;
  replies?: Reply[];
}

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
  edited?: boolean;
}

interface Notification {
  id: string;
  type: "like" | "comment" | "reply";
  from_username: string;
  post_id: string;
  post_content: string;
  message_content?: string;
  created_at: string;
  read: boolean;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function Avatar({ url, username, size = 36 }: { url: string | null; username: string; size?: number }) {
  const initials = username?.slice(0, 2).toUpperCase() ?? "??";
  if (url) {
    return <img src={url} alt={username}
      style={{ width: size, height: size, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} />;
  }
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%", background: "#646669",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: size * 0.35, fontWeight: 700, flexShrink: 0, color: "#fff",
    }}>
      {initials}
    </div>
  );
}

// ── Hoverable image with download button ──────────────────────────────────────

function HoverableImage({ src, alt, style }: { src: string; alt: string; style?: React.CSSProperties }) {
  const [hovered, setHovered] = useState(false);

  async function handleDownload() {
    try {
      const res = await fetch(src);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "monkeypost-image.jpg";
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      window.open(src, "_blank");
    }
  }

  return (
    <div style={{ position: "relative", display: "inline-block", width: "100%" }}
      onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}>
      <img src={src} alt={alt} style={style} />
      {hovered && (
        <button onClick={handleDownload}
          title="Download image"
          style={{
            position: "absolute", top: 8, left: 8,
            background: "#323437cc",
            border: "none", borderRadius: 6,
            width: 34, height: 34, cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
            transition: "background 0.15s",
          }}>
          <DownloadIcon />
        </button>
      )}
    </div>
  );
}

// ── Reply Tree ────────────────────────────────────────────────────────────────

function ReplyItem({
  reply,
  depth,
  currentUser,
  postId,
  commentId,
  replyPath,
  onUpdate,
}: {
  reply: Reply;
  depth: number;
  currentUser: { id: string; username: string; pfp_url: string | null } | null;
  postId: string;
  commentId: string;
  replyPath: number[];
  onUpdate: (updatedComments: Comment[]) => void;
}) {
  const [showReplyInput, setShowReplyInput] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [replyError, setReplyError] = useState("");
  const isOwner = currentUser?.username === reply.username;

  async function submitNestedReply() {
    if (!replyText.trim() || !currentUser) return;
    const blocked = await containsBlockedWord(replyText);
    if (blocked) { setReplyError("Your message has a word that is disallowed."); return; }
    setReplyError("");

    const newReply: Reply = {
      id: crypto.randomUUID(),
      username: currentUser.username,
      pfp_url: currentUser.pfp_url,
      content: replyText.trim(),
      created_at: new Date().toISOString(),
      replies: [],
    };

    const { data: postData } = await supabase.from("posts").select("comments").eq("id", postId).single();
    if (!postData) return;
    const comments: Comment[] = postData.comments ?? [];

    function insertReply(list: Reply[], path: number[]): Reply[] {
      if (path.length === 0) return [...list, newReply];
      return list.map((r, i) =>
        i === path[0]
          ? { ...r, replies: insertReply(r.replies ?? [], path.slice(1)) }
          : r
      );
    }

    const updated = comments.map((c) =>
      c.id === commentId
        ? { ...c, replies: insertReply(c.replies ?? [], replyPath) }
        : c
    );

    await supabase.from("posts").update({ comments: updated }).eq("id", postId);
    onUpdate(updated);
    setReplyText("");
    setShowReplyInput(false);
  }

  async function deleteNestedReply() {
    if (!isOwner) return;
    const { data: postData } = await supabase.from("posts").select("comments").eq("id", postId).single();
    if (!postData) return;
    const comments: Comment[] = postData.comments ?? [];

    function removeReply(list: Reply[], path: number[]): Reply[] {
      if (path.length === 1) return list.filter((_, i) => i !== path[0]);
      return list.map((r, i) =>
        i === path[0] ? { ...r, replies: removeReply(r.replies ?? [], path.slice(1)) } : r
      );
    }

    const updated = comments.map((c) =>
      c.id === commentId
        ? { ...c, replies: removeReply(c.replies ?? [], replyPath) }
        : c
    );

    await supabase.from("posts").update({ comments: updated }).eq("id", postId);
    onUpdate(updated);
  }

  const fontSize = depth >= 2 ? 12 : 13;
  const avatarSize = depth >= 2 ? 20 : 24;

  return (
    <div style={{ marginLeft: depth > 0 ? 16 : 0, marginTop: 6 }}>
      <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
        <Avatar url={reply.pfp_url} username={reply.username} size={avatarSize} />
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ color: "#e2b714", fontSize: fontSize - 1, fontWeight: 700 }}>@{reply.username}</span>
            {VERIFIED_USERS.has(reply.username.toLowerCase()) && <OwnerBadge />}
            <span style={{ color: "#d1d0c5", fontSize }}>
              {renderWithTwemoji(reply.content)}
            </span>
          </div>
          <div style={{ display: "flex", gap: 10, marginTop: 3 }}>
            {currentUser && depth < 4 && (
              <button onClick={() => setShowReplyInput((v) => !v)}
                style={{ background: "none", border: "none", color: "#646669", fontSize: 11, cursor: "pointer", padding: 0 }}>
                reply
              </button>
            )}
            {isOwner && (
              <button onClick={deleteNestedReply}
                style={{ background: "none", border: "none", color: "#646669", fontSize: 11, cursor: "pointer", padding: 0 }}>
                delete
              </button>
            )}
          </div>
          {showReplyInput && (
            <div style={{ marginTop: 6 }}>
              <div style={{ display: "flex", gap: 6 }}>
                <input value={replyText} onChange={(e) => setReplyText(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && submitNestedReply()}
                  placeholder="Reply..." maxLength={180}
                  style={{
                    flex: 1, background: "#3a3d42", border: "none", borderRadius: 6,
                    padding: "6px 10px", color: "#fff", fontSize: 12, fontFamily: "inherit", outline: "none",
                  }} />
                <button onClick={submitNestedReply}
                  style={{
                    background: "#e2b714", border: "none", borderRadius: 6,
                    padding: "6px 10px", color: "#323437", fontWeight: 700, fontSize: 12, cursor: "pointer", fontFamily: "inherit",
                  }}>↵</button>
              </div>
              {replyError && <div style={{ color: "#ca4754", fontSize: 11, marginTop: 4 }}>{replyError}</div>}
            </div>
          )}
          {(reply.replies ?? []).map((r, i) => (
            <ReplyItem key={r.id} reply={r} depth={depth + 1} currentUser={currentUser}
              postId={postId} commentId={commentId} replyPath={[...replyPath, i]} onUpdate={onUpdate} />
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Post Card ─────────────────────────────────────────────────────────────────

function PostCard({
  post,
  currentUser,
  onLike,
  onBookmark,
  onDelete,
  onEdit,
}: {
  post: Post;
  currentUser: { id: string; username: string; pfp_url: string | null } | null;
  onLike: (id: string) => void;
  onBookmark: (id: string) => void;
  onDelete: (id: string) => void;
  onEdit: (id: string, newContent: string) => void;
}) {
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [commentError, setCommentError] = useState("");
  const [localComments, setLocalComments] = useState<Comment[]>(post.comments ?? []);
  const [deleteHovered, setDeleteHovered] = useState(false);
  const [editHovered, setEditHovered] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState(post.content);
  const [editError, setEditError] = useState("");

  useEffect(() => { setLocalComments(post.comments ?? []); }, [post.comments]);

  const liked = currentUser ? post.liked_by?.includes(currentUser.id) : false;
  const bookmarked = currentUser ? post.bookmarked_by?.includes(currentUser.id) : false;
  const isOwner = currentUser?.id === post.user_id;
  const canEdit = isOwner && !post.edited;

  async function submitComment() {
    if (!commentText.trim() || !currentUser) return;
    const blocked = await containsBlockedWord(commentText);
    if (blocked) { setCommentError("Your message has a word that is disallowed."); return; }
    setCommentError("");
    const newComment: Comment = {
      id: crypto.randomUUID(),
      username: currentUser.username,
      pfp_url: currentUser.pfp_url,
      content: commentText.trim(),
      created_at: new Date().toISOString(),
      replies: [],
    };
    const updatedComments = [...localComments, newComment];
    setLocalComments(updatedComments);
    setCommentText("");
    await supabase.from("posts").update({ comments: updatedComments }).eq("id", post.id);
  }

  async function deleteComment(commentId: string, commentUsername: string) {
    if (!currentUser || currentUser.username !== commentUsername) return;
    const updated = localComments.filter((c) => c.id !== commentId);
    setLocalComments(updated);
    await supabase.from("posts").update({ comments: updated }).eq("id", post.id);
  }

  async function submitEdit() {
    if (!editText.trim() || !currentUser || post.edited) return;
    const blocked = await containsBlockedWord(editText);
    if (blocked) { setEditError("Your message has a word that is disallowed."); return; }
    setEditError("");
    onEdit(post.id, editText.trim());
    setEditing(false);
  }

  function handleCommentsUpdate(updated: Comment[]) {
    setLocalComments(updated);
  }

  return (
    <div style={{ background: "#2c2e31", borderRadius: 12, padding: "16px 20px", marginBottom: 12, border: "1px solid #3a3d42" }}>
      <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
        <Avatar url={post.pfp_url} username={post.username} size={40} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ marginBottom: 4, display: "flex", alignItems: "center", gap: 4 }}>
            <span style={{ color: "#e2b714", fontWeight: 700, fontSize: 14 }}>@{post.username}</span>
            {VERIFIED_USERS.has(post.username.toLowerCase()) && <OwnerBadge />}
          </div>
          {VERIFIED_USERS.has(post.username.toLowerCase()) && (
            <div style={{ color: "#e2b714", opacity: 0.5, fontSize: 11, marginTop: -2, marginBottom: 4 }}>Staff</div>
          )}

          {editing ? (
            <div>
              <textarea value={editText} onChange={(e) => setEditText(e.target.value.slice(0, 180))}
                rows={3} maxLength={180}
                style={{
                  width: "100%", background: "#3a3d42", border: "1px solid #646669",
                  borderRadius: 8, color: "#d1d0c5", fontSize: 15, fontFamily: "inherit",
                  resize: "none", outline: "none", lineHeight: 1.5, padding: "8px 12px", boxSizing: "border-box",
                }} />
              {editError && <div style={{ color: "#ca4754", fontSize: 12, marginTop: 4 }}>{editError}</div>}
              <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                <button onClick={submitEdit}
                  style={{
                    background: "#e2b714", border: "none", borderRadius: 6, padding: "6px 14px",
                    color: "#323437", fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: "inherit",
                  }}>Save</button>
                <button onClick={() => { setEditing(false); setEditText(post.content); setEditError(""); }}
                  style={{
                    background: "#3a3d42", border: "none", borderRadius: 6, padding: "6px 14px",
                    color: "#d1d0c5", fontSize: 13, cursor: "pointer", fontFamily: "inherit",
                  }}>Cancel</button>
              </div>
            </div>
          ) : (
            <div style={{ fontSize: 15, lineHeight: 1.5, wordBreak: "break-word", color: "#d1d0c5" }}>
              {renderWithTwemoji(post.content)}
              {post.edited && (
                <span style={{ opacity: 0.5, fontSize: 12, marginLeft: 6 }}>(edited)</span>
              )}
            </div>
          )}

          {post.image_url && (
            <div style={{ marginTop: 10 }}>
              <HoverableImage src={post.image_url} alt="post"
                style={{ maxWidth: "100%", borderRadius: 8, maxHeight: 320, objectFit: "cover", display: "block" }} />
            </div>
          )}

          {/* Actions */}
          <div style={{ display: "flex", gap: 20, marginTop: 12, alignItems: "center" }}>
            <button onClick={() => onLike(post.id)}
              style={{
                display: "flex", alignItems: "center", gap: 6, background: "none", border: "none",
                cursor: "pointer", color: liked ? "#e2b714" : "#646669", fontSize: 13, padding: 0, transition: "color 0.15s",
              }}>
              <HeartIcon filled={liked} />
              <span>{post.likes ?? 0}</span>
            </button>

            <button onClick={() => onBookmark(post.id)}
              style={{
                display: "flex", alignItems: "center", gap: 6, background: "none", border: "none",
                cursor: "pointer", color: bookmarked ? "#e2b714" : "#646669", padding: 0, transition: "color 0.15s",
              }}>
              <BookmarkIcon filled={bookmarked} />
            </button>

            <button onClick={() => setShowComments((v) => !v)}
              style={{
                display: "flex", alignItems: "center", gap: 6, background: "none", border: "none",
                cursor: "pointer", color: "#646669", padding: 0, transition: "color 0.15s",
              }}>
              <CommentIcon />
              <span style={{ fontSize: 13 }}>{localComments.length}</span>
            </button>

            {isOwner && (
              <div style={{ display: "flex", gap: 8, marginLeft: "auto", alignItems: "center" }}>
                {canEdit && (
                  <button onClick={() => setEditing(true)}
                    onMouseEnter={() => setEditHovered(true)}
                    onMouseLeave={() => setEditHovered(false)}
                    title="Edit post (once only)"
                    style={{
                      display: "flex", alignItems: "center", background: "none", border: "none",
                      cursor: "pointer", color: editHovered ? "#e2b714" : "#646669",
                      padding: 0, transition: "color 0.15s",
                    }}>
                    <EditIcon />
                  </button>
                )}
                <button onClick={() => onDelete(post.id)}
                  onMouseEnter={() => setDeleteHovered(true)}
                  onMouseLeave={() => setDeleteHovered(false)}
                  title="Delete post"
                  style={{
                    display: "flex", alignItems: "center", background: "none", border: "none",
                    cursor: "pointer", color: deleteHovered ? "#ca4754" : "#646669",
                    padding: 0, transition: "color 0.15s",
                  }}>
                  <TrashIcon />
                </button>
              </div>
            )}
          </div>

          {/* Comments */}
          {showComments && (
            <div style={{ marginTop: 12 }}>
              {localComments.map((c, ci) => (
                <div key={c.id} style={{ marginBottom: 10 }}>
                  <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                    <Avatar url={c.pfp_url} username={c.username} size={26} />
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <span style={{ color: "#e2b714", fontSize: 12, fontWeight: 700 }}>@{c.username}</span>
                        {VERIFIED_USERS.has(c.username.toLowerCase()) && <OwnerBadge />}
                        <span style={{ color: "#d1d0c5", fontSize: 13 }}>{renderWithTwemoji(c.content)}</span>
                      </div>
                      <div style={{ display: "flex", gap: 10, marginTop: 3 }}>
                        {currentUser && (
                          <CommentReplyButton postId={post.id} commentId={c.id} commentIndex={ci}
                            currentUser={currentUser} localComments={localComments}
                            onUpdate={handleCommentsUpdate} />
                        )}
                        {currentUser?.username === c.username && (
                          <button onClick={() => deleteComment(c.id, c.username)}
                            style={{ background: "none", border: "none", color: "#646669", fontSize: 11, cursor: "pointer", padding: 0 }}>
                            delete
                          </button>
                        )}
                      </div>
                      {(c.replies ?? []).map((r, ri) => (
                        <ReplyItem key={r.id} reply={r} depth={1} currentUser={currentUser}
                          postId={post.id} commentId={c.id} replyPath={[ri]} onUpdate={handleCommentsUpdate} />
                      ))}
                    </div>
                  </div>
                </div>
              ))}

              {currentUser && (
                <div style={{ marginTop: 8 }}>
                  <div style={{ display: "flex", gap: 8 }}>
                    <input value={commentText} onChange={(e) => setCommentText(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && submitComment()}
                      placeholder="Write a reply..." maxLength={180}
                      style={{
                        flex: 1, background: "#3a3d42", border: "none", borderRadius: 8,
                        padding: "8px 12px", color: "#fff", fontSize: 13, fontFamily: "inherit", outline: "none",
                      }} />
                    <button onClick={submitComment}
                      style={{
                        background: "#e2b714", border: "none", borderRadius: 8,
                        padding: "8px 14px", color: "#323437", fontWeight: 700, fontSize: 13,
                        cursor: "pointer", fontFamily: "inherit",
                      }}>Reply</button>
                  </div>
                  {commentError && <div style={{ color: "#ca4754", fontSize: 12, marginTop: 4 }}>{commentError}</div>}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Inline comment reply button ───────────────────────────────────────────────

function CommentReplyButton({
  postId, commentId, commentIndex, currentUser, localComments, onUpdate,
}: {
  postId: string; commentId: string; commentIndex: number;
  currentUser: { id: string; username: string; pfp_url: string | null };
  localComments: Comment[];
  onUpdate: (updated: Comment[]) => void;
}) {
  const [show, setShow] = useState(false);
  const [text, setText] = useState("");
  const [error, setError] = useState("");

  async function submit() {
    if (!text.trim()) return;
    const blocked = await containsBlockedWord(text);
    if (blocked) { setError("Your message has a word that is disallowed."); return; }
    setError("");
    const newReply: Reply = {
      id: crypto.randomUUID(),
      username: currentUser.username,
      pfp_url: currentUser.pfp_url,
      content: text.trim(),
      created_at: new Date().toISOString(),
      replies: [],
    };
    const updated = localComments.map((c, i) =>
      i === commentIndex ? { ...c, replies: [...(c.replies ?? []), newReply] } : c
    );
    await supabase.from("posts").update({ comments: updated }).eq("id", postId);
    onUpdate(updated);
    setText("");
    setShow(false);
  }

  return (
    <>
      <button onClick={() => setShow((v) => !v)}
        style={{ background: "none", border: "none", color: "#646669", fontSize: 11, cursor: "pointer", padding: 0 }}>
        reply
      </button>
      {show && (
        <div style={{ marginTop: 6, width: "100%" }}>
          <div style={{ display: "flex", gap: 6 }}>
            <input value={text} onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submit()}
              placeholder="Reply..." maxLength={180}
              style={{
                flex: 1, background: "#3a3d42", border: "none", borderRadius: 6,
                padding: "6px 10px", color: "#fff", fontSize: 12, fontFamily: "inherit", outline: "none",
              }} />
            <button onClick={submit}
              style={{
                background: "#e2b714", border: "none", borderRadius: 6,
                padding: "6px 10px", color: "#323437", fontWeight: 700, fontSize: 12,
                cursor: "pointer", fontFamily: "inherit",
              }}>↵</button>
          </div>
          {error && <div style={{ color: "#ca4754", fontSize: 11, marginTop: 4 }}>{error}</div>}
        </div>
      )}
    </>
  );
}

// ── Edit Profile Modal ────────────────────────────────────────────────────────

function EditProfileModal({
  currentUser,
  onClose,
  onSave,
}: {
  currentUser: { id: string; username: string; pfp_url: string | null };
  onClose: () => void;
  onSave: (newUsername: string, newPfpUrl: string | null) => void;
}) {
  const [newUsername, setNewUsername] = useState(currentUser.username);
  const [pfpFile, setPfpFile] = useState<File | null>(null);
  const [pfpPreview, setPfpPreview] = useState<string | null>(currentUser.pfp_url);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [usernameLastChanged, setUsernameLastChanged] = useState<string | null>(null);
  const pfpRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    async function fetchProfile() {
      const { data } = await supabase
        .from("profiles")
        .select("username_last_changed")
        .eq("id", currentUser.id)
        .single();
      if (data?.username_last_changed) setUsernameLastChanged(data.username_last_changed);
    }
    fetchProfile();
  }, [currentUser.id]);

  const canChangeUsername = (() => {
    if (!usernameLastChanged) return true;
    const last = new Date(usernameLastChanged).getTime();
    const now = Date.now();
    return now - last >= 30 * 24 * 60 * 60 * 1000;
  })();

  const daysUntilUsernameChange = (() => {
    if (!usernameLastChanged) return 0;
    const last = new Date(usernameLastChanged).getTime();
    const now = Date.now();
    const diff = 30 * 24 * 60 * 60 * 1000 - (now - last);
    return Math.ceil(diff / (24 * 60 * 60 * 1000));
  })();

  function handlePfpPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPfpFile(file);
    setPfpPreview(URL.createObjectURL(file));
  }

  async function handleSave() {
    setError("");
    if (!/^[a-z0-9]{1,16}$/i.test(newUsername)) {
      setError("Username must be 1–16 chars, letters and numbers only.");
      return;
    }
    setSaving(true);

    let pfp_url = currentUser.pfp_url;

    // Upload new pfp if changed
    if (pfpFile) {
      const stripped = await stripImageMetadata(pfpFile);
      const { data: uploadData } = await supabase.storage
        .from("pfps")
        .upload(`${currentUser.id}.jpg`, stripped, { upsert: true });
      if (uploadData) {
        const { data: urlData } = supabase.storage.from("pfps").getPublicUrl(uploadData.path);
        pfp_url = urlData.publicUrl + `?t=${Date.now()}`;
      }
    }

    const usernameChanged = newUsername !== currentUser.username;

    if (usernameChanged && !canChangeUsername) {
      setError(`You can change your username again in ${daysUntilUsernameChange} day(s).`);
      setSaving(false);
      return;
    }

    // Check username uniqueness if changed
    if (usernameChanged) {
      const { data: existing } = await supabase
        .from("profiles")
        .select("id")
        .eq("username", newUsername)
        .neq("id", currentUser.id)
        .single();
      if (existing) {
        setError("That username is already taken.");
        setSaving(false);
        return;
      }
    }

    // Update profile
    const updateData: Record<string, string | null> = { pfp_url };
    if (usernameChanged) {
      updateData.username = newUsername;
      updateData.username_last_changed = new Date().toISOString();
    }
    await supabase.from("profiles").update(updateData).eq("id", currentUser.id);

    // Update all posts by this user
    if (usernameChanged || pfpFile) {
      const { data: userPosts } = await supabase
        .from("posts")
        .select("id, comments")
        .eq("user_id", currentUser.id);

      if (userPosts) {
        for (const post of userPosts) {
          const updatedPost: Record<string, unknown> = {};
          if (pfpFile) updatedPost.pfp_url = pfp_url;
          if (usernameChanged) updatedPost.username = newUsername;

          // Update comments/replies that belong to this user
          const updatedComments = updateUsernameInComments(
            post.comments ?? [],
            currentUser.username,
            usernameChanged ? newUsername : currentUser.username,
            pfpFile ? pfp_url : currentUser.pfp_url
          );
          updatedPost.comments = updatedComments;

          await supabase.from("posts").update(updatedPost).eq("id", post.id);
        }
      }

      // Also update comments on other people's posts
      if (usernameChanged || pfpFile) {
        const { data: allPosts } = await supabase
          .from("posts")
          .select("id, comments")
          .neq("user_id", currentUser.id);

        if (allPosts) {
          for (const post of allPosts) {
            const updatedComments = updateUsernameInComments(
              post.comments ?? [],
              currentUser.username,
              usernameChanged ? newUsername : currentUser.username,
              pfpFile ? pfp_url : currentUser.pfp_url
            );
            const hasChanges = JSON.stringify(updatedComments) !== JSON.stringify(post.comments);
            if (hasChanges) {
              await supabase.from("posts").update({ comments: updatedComments }).eq("id", post.id);
            }
          }
        }
      }
    }

    setSaving(false);
    onSave(usernameChanged ? newUsername : currentUser.username, pfp_url);
  }

  return (
    <div style={{
      position: "fixed", inset: 0, background: "#000000aa", zIndex: 100,
      display: "flex", alignItems: "center", justifyContent: "center",
    }} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{
        background: "#2c2e31", borderRadius: 14, padding: "28px 28px",
        width: "100%", maxWidth: 400, border: "1px solid #3a3d42",
        display: "flex", flexDirection: "column", gap: 18,
      }}>
        <h2 style={{ color: "#e2b714", fontSize: 18, fontWeight: 700, margin: 0 }}>Edit Profile</h2>

        {/* PFP section */}
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <Avatar url={pfpPreview} username={newUsername} size={56} />
          <div>
            <input ref={pfpRef} type="file" accept=".jpeg,.jpg,.png,.gif,.avif,.webp" style={{ display: "none" }} onChange={handlePfpPick} />
            <button onClick={() => pfpRef.current?.click()}
              style={{
                background: "#3a3d42", border: "none", borderRadius: 8,
                padding: "8px 14px", color: "#d1d0c5", fontSize: 13,
                fontFamily: "inherit", cursor: "pointer",
              }}>
              Change profile picture
            </button>
            {pfpFile && <div style={{ color: "#e2b714", fontSize: 11, marginTop: 4 }}>New picture selected</div>}
          </div>
        </div>

        {/* Username section */}
        <div>
          <label style={{ color: "#646669", fontSize: 12, display: "block", marginBottom: 6 }}>Username</label>
          <input
            value={newUsername}
            onChange={(e) => {
              if (canChangeUsername) {
                setNewUsername(e.target.value.replace(/[^a-zA-Z0-9]/g, "").slice(0, 16));
              }
            }}
            disabled={!canChangeUsername}
            maxLength={16}
            style={{
              width: "100%", background: canChangeUsername ? "#3a3d42" : "#2c2e31",
              border: "1px solid #3a3d42", borderRadius: 8,
              padding: "10px 14px", color: canChangeUsername ? "#fff" : "#646669",
              fontSize: 14, fontFamily: "inherit", outline: "none", boxSizing: "border-box",
              cursor: canChangeUsername ? "text" : "not-allowed",
            }} />
          {!canChangeUsername && (
            <div style={{ color: "#646669", fontSize: 11, marginTop: 4 }}>
              You can change your username again in {daysUntilUsernameChange} day(s).
            </div>
          )}
        </div>

        {error && <div style={{ color: "#ca4754", fontSize: 13 }}>{error}</div>}

        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={handleSave} disabled={saving}
            style={{
              flex: 1, background: saving ? "#3a3d42" : "#e2b714", border: "none", borderRadius: 8,
              padding: "10px 0", color: saving ? "#646669" : "#323437",
              fontWeight: 700, fontSize: 14, fontFamily: "inherit", cursor: saving ? "not-allowed" : "pointer",
            }}>
            {saving ? "Saving..." : "Save"}
          </button>
          <button onClick={onClose}
            style={{
              flex: 1, background: "#3a3d42", border: "none", borderRadius: 8,
              padding: "10px 0", color: "#d1d0c5", fontSize: 14, fontFamily: "inherit", cursor: "pointer",
            }}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

// Helper to recursively update username/pfp in comments and replies
function updateUsernameInComments(
  comments: Comment[],
  oldUsername: string,
  newUsername: string,
  newPfpUrl: string | null
): Comment[] {
  return comments.map((c) => {
    const updatedReplies = updateUsernameInReplies(c.replies ?? [], oldUsername, newUsername, newPfpUrl);
    if (c.username === oldUsername) {
      return { ...c, username: newUsername, pfp_url: newPfpUrl, replies: updatedReplies };
    }
    return { ...c, replies: updatedReplies };
  });
}

function updateUsernameInReplies(
  replies: Reply[],
  oldUsername: string,
  newUsername: string,
  newPfpUrl: string | null
): Reply[] {
  return replies.map((r) => {
    const updatedReplies = updateUsernameInReplies(r.replies ?? [], oldUsername, newUsername, newPfpUrl);
    if (r.username === oldUsername) {
      return { ...r, username: newUsername, pfp_url: newPfpUrl, replies: updatedReplies };
    }
    return { ...r, replies: updatedReplies };
  });
}

// ── Delete Account Modal ──────────────────────────────────────────────────────

function DeleteAccountModal({
  currentUser,
  onClose,
  onDeleted,
}: {
  currentUser: { id: string; username: string; pfp_url: string | null };
  onClose: () => void;
  onDeleted: () => void;
}) {
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    setDeleting(true);

    // Delete all posts by this user
    await supabase.from("posts").delete().eq("user_id", currentUser.id);

    // Remove this user's comments and replies from all other posts
    const { data: allPosts } = await supabase.from("posts").select("id, comments");
    if (allPosts) {
      for (const post of allPosts) {
        const filtered = removeUserFromComments(post.comments ?? [], currentUser.username);
        const changed = JSON.stringify(filtered) !== JSON.stringify(post.comments);
        if (changed) {
          await supabase.from("posts").update({ comments: filtered }).eq("id", post.id);
        }
      }
    }

    // Delete profile
    await supabase.from("profiles").delete().eq("id", currentUser.id);

    // Sign out
    await supabase.auth.signOut();

    setDeleting(false);
    onDeleted();
  }

  return (
    <div style={{
      position: "fixed", inset: 0, background: "#000000bb", zIndex: 200,
      display: "flex", alignItems: "center", justifyContent: "center",
    }}>
      <div style={{
        background: "#2c2e31", borderRadius: 14, padding: "28px",
        width: "100%", maxWidth: 380, border: "1px solid #3a3d42",
        display: "flex", flexDirection: "column", gap: 16,
      }}>
        <h2 style={{ color: "#ca4754", fontSize: 18, fontWeight: 700, margin: 0 }}>Delete Account</h2>
        <p style={{ color: "#d1d0c5", fontSize: 14, lineHeight: 1.6, margin: 0 }}>
          Do you wish to delete your account? This will delete all your posts, replies, and username.
        </p>
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={handleDelete} disabled={deleting}
            style={{
              flex: 1, background: deleting ? "#3a3d42" : "#ca4754", border: "none", borderRadius: 8,
              padding: "10px 0", color: "#fff", fontWeight: 700, fontSize: 14,
              fontFamily: "inherit", cursor: deleting ? "not-allowed" : "pointer",
            }}>
            {deleting ? "Deleting..." : "Yes!"}
          </button>
          <button onClick={onClose} disabled={deleting}
            style={{
              flex: 1, background: "#3a3d42", border: "none", borderRadius: 8,
              padding: "10px 0", color: "#d1d0c5", fontSize: 14,
              fontFamily: "inherit", cursor: "pointer",
            }}>
            No
          </button>
        </div>
      </div>
    </div>
  );
}

function removeUserFromComments(comments: Comment[], username: string): Comment[] {
  return comments
    .filter((c) => c.username !== username)
    .map((c) => ({ ...c, replies: removeUserFromReplies(c.replies ?? [], username) }));
}

function removeUserFromReplies(replies: Reply[], username: string): Reply[] {
  return replies
    .filter((r) => r.username !== username)
    .map((r) => ({ ...r, replies: removeUserFromReplies(r.replies ?? [], username) }));
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function Home() {
  const [step, setStep] = useState<"signup" | "loading" | "app">("loading");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [pfpFile, setPfpFile] = useState<File | null>(null);
  const [pfpPreview, setPfpPreview] = useState<string | null>(null);
  const [signupError, setSignupError] = useState("");
  const [authMode, setAuthMode] = useState<"signup" | "login">("signup");

  const [currentUser, setCurrentUser] = useState<{ id: string; username: string; pfp_url: string | null } | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [view, setView] = useState<"posts" | "bookmarks" | "notifications">("posts");

  const [postText, setPostText] = useState("");
  const [postError, setPostError] = useState("");
  const [postImageFile, setPostImageFile] = useState<File | null>(null);
  const [postImagePreview, setPostImagePreview] = useState<string | null>(null);
  const [posting, setPosting] = useState(false);

  const [userHovered, setUserHovered] = useState(false);
  const userHoverTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [showEditProfile, setShowEditProfile] = useState(false);
  const [showDeleteAccount, setShowDeleteAccount] = useState(false);

  // Notifications
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadNotifCount, setUnreadNotifCount] = useState(0);

  // Pagination
  const PAGE_SIZE = 20;
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const postRefs = useRef<(HTMLDivElement | null)[]>([]);

  const [refreshing, setRefreshing] = useState(false);

  const pfpInputRef = useRef<HTMLInputElement>(null);
  const postImageRef = useRef<HTMLInputElement>(null);

  // ── Realtime subscriptions ──────────────────────────────────────────────────
  const currentUserRef = useRef(currentUser);
  useEffect(() => { currentUserRef.current = currentUser; }, [currentUser]);

  useEffect(() => {
    if (step !== "app") return;

    // Posts channel — live updates for likes, comments, new/deleted posts
    const postsChannel = supabase
      .channel("posts-realtime")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "posts" }, (payload) => {
        setPosts((prev) => {
          if (prev.find((p) => p.id === payload.new.id)) return prev;
          return [payload.new as Post, ...prev];
        });
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "posts" }, (payload) => {
        setPosts((prev) => prev.map((p) => p.id === payload.new.id ? (payload.new as Post) : p));
      })
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "posts" }, (payload) => {
        setPosts((prev) => prev.filter((p) => p.id !== payload.old.id));
      })
      .subscribe();

    return () => {
      supabase.removeChannel(postsChannel);
    };
  }, [step]);

  useEffect(() => {
    if (step !== "app" || !currentUser) return;

    // Notifications channel — only for current user
    const notifChannel = supabase
      .channel(`notifications-${currentUser.id}`)
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "notifications",
        filter: `user_id=eq.${currentUser.id}`,
      }, (payload) => {
        const newNotif = payload.new as Notification;
        setNotifications((prev) => [newNotif, ...prev]);
        setUnreadNotifCount((prev) => prev + 1);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(notifChannel);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, currentUser?.id]);

  useEffect(() => {
    async function restoreSession() {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const { data: profile } = await supabase.from("profiles").select("*").eq("id", session.user.id).single();
        if (profile) {
          setCurrentUser({ id: session.user.id, username: profile.username, pfp_url: profile.pfp_url });
          await loadPostsInner();
          await loadNotifications(session.user.id);
          setStep("app");
          return;
        }
      }
      setStep("signup");
    }
    restoreSession();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadNotifications(userId: string) {
    const { data } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    if (data) {
      setNotifications(data as Notification[]);
      setUnreadNotifCount(data.filter((n: Notification) => !n.read).length);
    }
  }

  async function loadPostsInner() {
    const { data } = await supabase.from("posts").select("*").order("created_at", { ascending: false });
    if (data) setPosts(data as Post[]);
  }

  async function loadPosts() { await loadPostsInner(); }

  async function handleRefresh() {
    setRefreshing(true);
    await loadPostsInner();
    setRefreshing(false);
  }

  // Infinite scroll: when 18th visible post enters view, load 20 more
  useEffect(() => {
    if (view !== "posts" && view !== "bookmarks") return;
    const targetIndex = visibleCount - 3;
    const target = postRefs.current[targetIndex];
    if (!target) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setVisibleCount((prev) => prev + PAGE_SIZE);
        }
      },
      { threshold: 0.1 }
    );
    observer.observe(target);
    return () => observer.disconnect();
  }, [visibleCount, view, posts.length]);

  function handlePfpPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPfpFile(file);
    setPfpPreview(URL.createObjectURL(file));
  }

  function validateUsername(val: string) { return /^[a-z0-9]{1,16}$/i.test(val); }

  async function handleSignup() {
    setSignupError("");
    if (!validateUsername(username)) { setSignupError("Username must be 1–16 chars, letters and numbers only."); return; }
    if (!password || password.length < 6) { setSignupError("Password must be at least 6 characters."); return; }
    setStep("loading");

    const { data: authData, error: authErr } = await supabase.auth.signUp({
      email: `${username.toLowerCase()}@monkeypost.local`,
      password,
    });

    if (authErr || !authData.user) { setStep("signup"); setSignupError(authErr?.message ?? "Sign up failed."); return; }

    const uid = authData.user.id;
    let pfp_url: string | null = null;

    if (pfpFile) {
      const stripped = await stripImageMetadata(pfpFile);
      const ext = "jpg";
      const { data: uploadData } = await supabase.storage.from("pfps").upload(`${uid}.${ext}`, stripped, { upsert: true });
      if (uploadData) {
        const { data: urlData } = supabase.storage.from("pfps").getPublicUrl(uploadData.path);
        pfp_url = urlData.publicUrl;
      }
    }

    await supabase.from("profiles").upsert({ id: uid, username, pfp_url });
    setCurrentUser({ id: uid, username, pfp_url });
    await loadPosts();
    setStep("app");
  }

  async function handleLogin() {
    setSignupError("");
    if (!username.trim() || !password) { setSignupError("Please enter your username and password."); return; }
    setStep("loading");
    const { data: authData, error: authErr } = await supabase.auth.signInWithPassword({
      email: `${username.toLowerCase()}@monkeypost.local`,
      password,
    });
    if (authErr || !authData.user) { setStep("signup"); setSignupError("Invalid username or password."); return; }
    const { data: profile } = await supabase.from("profiles").select("*").eq("id", authData.user.id).single();
    if (!profile) { setStep("signup"); setSignupError("Account not found."); return; }
    setCurrentUser({ id: authData.user.id, username: profile.username, pfp_url: profile.pfp_url });
    await loadPosts();
    await loadNotifications(authData.user.id);
    setStep("app");
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    setCurrentUser(null);
    setPosts([]);
    setNotifications([]);
    setUnreadNotifCount(0);
    setStep("signup");
  }

  function handlePostImagePick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPostImageFile(file);
    setPostImagePreview(URL.createObjectURL(file));
  }

  async function submitPost() {
    if (!postText.trim() || !currentUser) return;
    const blocked = await containsBlockedWord(postText);
    if (blocked) { setPostError("Your message has a word that is disallowed."); return; }
    setPostError("");
    setPosting(true);

    let image_url: string | null = null;
    if (postImageFile) {
      const stripped = await stripImageMetadata(postImageFile);
      const path = `post_${Date.now()}.jpg`;
      const { data: upData } = await supabase.storage.from("post-images").upload(path, stripped);
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
      edited: false,
    });

    setPostText("");
    setPostImageFile(null);
    setPostImagePreview(null);
    await loadPosts();
    setPosting(false);
  }

  async function handleLike(postId: string) {
    if (!currentUser) return;
    const post = posts.find((p) => p.id === postId);
    if (!post) return;
    const liked = post.liked_by?.includes(currentUser.id);
    const newLikedBy = liked
      ? post.liked_by.filter((id) => id !== currentUser.id)
      : [...(post.liked_by ?? []), currentUser.id];
    const newLikes = liked ? post.likes - 1 : post.likes + 1;
    setPosts((prev) => prev.map((p) => p.id === postId ? { ...p, likes: newLikes, liked_by: newLikedBy } : p));
    await supabase.from("posts").update({ likes: newLikes, liked_by: newLikedBy }).eq("id", postId);

    // Add notification if liking (not unliking), and not liking own post
    if (!liked && post.user_id !== currentUser.id) {
      await supabase.from("notifications").insert({
        user_id: post.user_id,
        type: "like",
        from_username: currentUser.username,
        post_id: postId,
        post_content: post.content,
        read: false,
        created_at: new Date().toISOString(),
      });
    }
  }

  async function handleBookmark(postId: string) {
    if (!currentUser) return;
    const post = posts.find((p) => p.id === postId);
    if (!post) return;
    const bookmarked = post.bookmarked_by?.includes(currentUser.id);
    const newBookmarkedBy = bookmarked
      ? post.bookmarked_by.filter((id) => id !== currentUser.id)
      : [...(post.bookmarked_by ?? []), currentUser.id];
    setPosts((prev) => prev.map((p) => p.id === postId ? { ...p, bookmarked_by: newBookmarkedBy } : p));
    await supabase.from("posts").update({ bookmarked_by: newBookmarkedBy }).eq("id", postId);
  }

  async function handleDelete(postId: string) {
    if (!currentUser) return;
    const post = posts.find((p) => p.id === postId);
    if (!post || post.user_id !== currentUser.id) return;
    setPosts((prev) => prev.filter((p) => p.id !== postId));
    await supabase.from("posts").delete().eq("id", postId);
  }

  async function handleEdit(postId: string, newContent: string) {
    setPosts((prev) => prev.map((p) => p.id === postId ? { ...p, content: newContent, edited: true } : p));
    await supabase.from("posts").update({ content: newContent, edited: true }).eq("id", postId);
  }

  function handleEditProfileSave(newUsername: string, newPfpUrl: string | null) {
    setCurrentUser((prev) => prev ? { ...prev, username: newUsername, pfp_url: newPfpUrl } : prev);
    // Also update all posts in local state
    setPosts((prev) => prev.map((p) => {
      if (p.user_id === currentUser?.id) {
        return { ...p, username: newUsername, pfp_url: newPfpUrl };
      }
      return p;
    }));
    setShowEditProfile(false);
    loadPostsInner();
  }

  async function markNotificationsRead() {
    if (!currentUser) return;
    setUnreadNotifCount(0);
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    await supabase.from("notifications").update({ read: true }).eq("user_id", currentUser.id);
  }

  const allVisiblePosts = view === "bookmarks" && currentUser
    ? posts.filter((p) => p.bookmarked_by?.includes(currentUser.id))
    : posts;

  const visiblePosts = allVisiblePosts.slice(0, visibleCount);

  // ── Signup screen ──────────────────────────────────────────────────────────

  if (step === "signup") {
    return (
      <main style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", background: "#323437", fontFamily: "var(--font-roboto-mono), monospace" }}>
        <div style={{ width: "100%", padding: "20px 32px", borderBottom: "1px solid #3a3d42", display: "flex", alignItems: "center" }}>
          <span style={{ fontSize: 22, fontWeight: 700, color: "#e2b714", letterSpacing: "-0.5px" }}>monkeypost</span>
        </div>
        <div style={{ marginTop: 60, width: "100%", maxWidth: 400, padding: "0 24px", display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ display: "flex", gap: 0, marginBottom: 4, background: "#2c2e31", borderRadius: 8, padding: 4 }}>
            {(["signup", "login"] as const).map((mode) => (
              <button key={mode} onClick={() => { setAuthMode(mode); setSignupError(""); }}
                style={{
                  flex: 1, padding: "8px 0", border: "none", borderRadius: 6,
                  background: authMode === mode ? "#e2b714" : "none",
                  color: authMode === mode ? "#323437" : "#646669",
                  fontWeight: 700, fontSize: 14, fontFamily: "inherit", cursor: "pointer",
                  transition: "background 0.15s, color 0.15s",
                }}>
                {mode === "signup" ? "Sign up" : "Log in"}
              </button>
            ))}
          </div>

          <input value={username} onChange={(e) => { const val = e.target.value.replace(/[^a-zA-Z0-9]/g, "").slice(0, 16); setUsername(val); }}
            placeholder="Username" maxLength={16}
            style={{ background: "#2c2e31", border: "1px solid #3a3d42", borderRadius: 8, padding: "12px 16px", color: "#fff", fontSize: 15, fontFamily: "inherit", outline: "none", width: "100%", boxSizing: "border-box" }} />

          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && (authMode === "login" ? handleLogin() : handleSignup())}
            placeholder="Password"
            style={{ background: "#2c2e31", border: "1px solid #3a3d42", borderRadius: 8, padding: "12px 16px", color: "#fff", fontSize: 15, fontFamily: "inherit", outline: "none", width: "100%", boxSizing: "border-box" }} />

          {authMode === "signup" && (
            <>
              <input ref={pfpInputRef} type="file" accept=".jpeg,.jpg,.png,.gif,.avif,.webp" style={{ display: "none" }} onChange={handlePfpPick} />
              <button onClick={() => pfpInputRef.current?.click()}
                style={{ background: "#2c2e31", border: "1px solid #3a3d42", borderRadius: 8, padding: "12px 16px", color: "#d1d0c5", fontSize: 15, fontFamily: "inherit", cursor: "pointer", textAlign: "left", display: "flex", alignItems: "center", gap: 10 }}>
                {pfpPreview ? (
                  <><img src={pfpPreview} alt="pfp" style={{ width: 28, height: 28, borderRadius: "50%", objectFit: "cover" }} /><span style={{ color: "#e2b714" }}>Profile picture selected</span></>
                ) : (
                  <><span style={{ color: "#646669" }}>📷</span><span>Upload Profile Picture</span></>
                )}
              </button>
            </>
          )}

          {signupError && <div style={{ color: "#ca4754", fontSize: 13 }}>{signupError}</div>}

          <button onClick={authMode === "login" ? handleLogin : handleSignup}
            style={{ background: "#e2b714", border: "none", borderRadius: 8, padding: "13px 16px", color: "#323437", fontSize: 15, fontWeight: 700, fontFamily: "inherit", cursor: "pointer", marginTop: 4, transition: "opacity 0.15s" }}>
            {authMode === "login" ? "Log in!" : "Sign up!"}
          </button>
        </div>
      </main>
    );
  }

  // ── Loading screen ─────────────────────────────────────────────────────────

  if (step === "loading") {
    return (
      <main style={{ minHeight: "100vh", display: "flex", flexDirection: "column", background: "#323437", fontFamily: "var(--font-roboto-mono), monospace" }}>
        <div style={{ width: "100%", padding: "20px 32px", borderBottom: "1px solid #3a3d42" }}>
          <span style={{ fontSize: 22, fontWeight: 700, color: "#e2b714" }}>monkeypost</span>
        </div>
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <LoadingSpinner />
        </div>
      </main>
    );
  }

  // ── App ────────────────────────────────────────────────────────────────────

  return (
    <main style={{ minHeight: "100vh", background: "#323437", fontFamily: "var(--font-roboto-mono), monospace", display: "flex", flexDirection: "column" }}>
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
      {showEditProfile && currentUser && (
        <EditProfileModal
          currentUser={currentUser}
          onClose={() => setShowEditProfile(false)}
          onSave={handleEditProfileSave}
        />
      )}
      {showDeleteAccount && currentUser && (
        <DeleteAccountModal
          currentUser={currentUser}
          onClose={() => setShowDeleteAccount(false)}
          onDeleted={() => {
            setCurrentUser(null);
            setPosts([]);
            setNotifications([]);
            setUnreadNotifCount(0);
            setStep("signup");
          }}
        />
      )}

      <div style={{ width: "100%", padding: "16px 32px", borderBottom: "1px solid #3a3d42", display: "flex", alignItems: "center", position: "sticky", top: 0, background: "#323437", zIndex: 10 }}>
        <span style={{ fontSize: 22, fontWeight: 700, color: "#e2b714", letterSpacing: "-0.5px" }}>monkeypost</span>
      </div>

      <div style={{ display: "flex", flex: 1, maxWidth: 1100, margin: "0 auto", width: "100%", padding: "0 16px" }}>
        {/* Sidebar */}
        <aside style={{ width: 220, flexShrink: 0, padding: "32px 0", display: "flex", flexDirection: "column", justifyContent: "flex-end", position: "sticky", top: 64, height: "calc(100vh - 64px)", paddingBottom: 32 }}>
          <nav style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 24 }}>
            {[
              { label: "Posts", icon: <PostsIcon />, action: () => setView("posts") },
              {
                label: "Notifications",
                icon: (
                  <div style={{ position: "relative", display: "inline-flex" }}>
                    <NotificationIcon />
                    {unreadNotifCount > 0 && (
                      <span style={{
                        position: "absolute", top: -3, left: -3,
                        background: "#e2b714", borderRadius: "50%",
                        width: 10, height: 10, border: "2px solid #323437",
                      }} />
                    )}
                  </div>
                ),
                action: () => {
                  setView("notifications");
                  markNotificationsRead();
                }
              },
              { label: "Developers", icon: <DevIcon />, action: () => window.location.href = "/dev" },
              { label: "Support Developing", icon: <SupportIcon />, action: () => window.location.href = "/discord" },
              { label: "Bookmarks", icon: <BookmarkIcon filled />, action: () => setView("bookmarks") },
            ].map(({ label, icon, action }) => (
              <button key={label} onClick={action}
                style={{ display: "flex", alignItems: "center", gap: 12, background: "none", border: "none", cursor: "pointer", color: "#d1d0c5", fontSize: 14, fontFamily: "inherit", padding: "10px 12px", borderRadius: 8, textAlign: "left", transition: "background 0.15s", width: "100%" }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "#2c2e31")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "none")}>
                {icon}<span>{label}</span>
              </button>
            ))}
          </nav>

          {/* User card with logout/edit on hover */}
          {currentUser && (
            <div style={{ position: "relative" }}
              onMouseEnter={() => {
                if (userHoverTimeout.current) clearTimeout(userHoverTimeout.current);
                setUserHovered(true);
              }}
              onMouseLeave={() => {
                userHoverTimeout.current = setTimeout(() => setUserHovered(false), 2000);
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 8, background: userHovered ? "#2c2e31" : "none", transition: "background 0.15s", cursor: "default" }}>
                <Avatar url={currentUser.pfp_url} username={currentUser.username} size={36} />
                <span style={{ color: "#e2b714", fontSize: 14, fontWeight: 700 }}>@{currentUser.username}</span>
              </div>
              {userHovered && (
                <div style={{
                  position: "absolute", bottom: "calc(100% + 4px)", left: 12,
                  display: "flex", gap: 6, flexWrap: "wrap",
                }}>
                  <button onClick={() => { setShowEditProfile(true); setUserHovered(false); }}
                    style={{
                      background: "#3a3d42", border: "none", borderRadius: 6,
                      padding: "6px 14px", color: "#d1d0c5", fontWeight: 700,
                      fontSize: 13, fontFamily: "inherit", cursor: "pointer",
                      whiteSpace: "nowrap",
                    }}>
                    Edit Profile
                  </button>
                  <button onClick={handleLogout}
                    style={{
                      background: "#ca4754", border: "none", borderRadius: 6,
                      padding: "6px 14px", color: "#fff", fontWeight: 700,
                      fontSize: 13, fontFamily: "inherit", cursor: "pointer",
                      whiteSpace: "nowrap",
                    }}>
                    Logout
                  </button>
                  <button onClick={() => { setShowDeleteAccount(true); setUserHovered(false); }}
                    style={{
                      background: "#2c2e31", border: "1px solid #ca4754", borderRadius: 6,
                      padding: "6px 14px", color: "#ca4754", fontWeight: 700,
                      fontSize: 13, fontFamily: "inherit", cursor: "pointer",
                      whiteSpace: "nowrap",
                    }}>
                    Delete Account
                  </button>
                </div>
              )}
            </div>
          )}
        </aside>

        {/* Feed */}
        <div style={{ flex: 1, padding: "24px 24px 24px 32px", maxWidth: 680 }}>
          {view === "posts" && currentUser && (
            <div style={{ background: "#2c2e31", borderRadius: 12, padding: "16px 20px", marginBottom: 20, border: "1px solid #3a3d42" }}>
              <textarea value={postText} onChange={(e) => setPostText(e.target.value.slice(0, 180))}
                placeholder="I just got 150WPM in 60s!" maxLength={180} rows={3}
                style={{ width: "100%", background: "none", border: "none", color: "#d1d0c5", fontSize: 15, fontFamily: "inherit", resize: "none", outline: "none", lineHeight: 1.5, boxSizing: "border-box" }} />
              <div style={{ fontSize: 12, color: "#646669", textAlign: "right", marginBottom: 10 }}>{postText.length}/180</div>

              {postImagePreview && (
                <div style={{ position: "relative", marginBottom: 10 }}>
                  <img src={postImagePreview} alt="post img" style={{ maxWidth: "100%", borderRadius: 8, maxHeight: 240, objectFit: "cover" }} />
                  <button onClick={() => { setPostImageFile(null); setPostImagePreview(null); }}
                    style={{ position: "absolute", top: 6, right: 6, background: "#323437cc", border: "none", borderRadius: "50%", width: 24, height: 24, cursor: "pointer", color: "#fff", fontSize: 14 }}>×</button>
                </div>
              )}

              {postError && <div style={{ color: "#ca4754", fontSize: 13, marginBottom: 8 }}>{postError}</div>}

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ display: "flex", gap: 8 }}>
                  <input ref={postImageRef} type="file" accept=".jpeg,.jpg,.png,.avif,.webp" style={{ display: "none" }} onChange={handlePostImagePick} />
                  <button onClick={() => postImageRef.current?.click()}
                    style={{ background: "none", border: "none", cursor: "pointer", padding: 6, borderRadius: 6, color: "#646669", transition: "color 0.15s" }}
                    title="Attach image">
                    <ImageIcon />
                  </button>
                </div>
                <button onClick={submitPost} disabled={posting || !postText.trim()}
                  style={{
                    background: posting || !postText.trim() ? "#3a3d42" : "#e2b714", border: "none", borderRadius: 8,
                    padding: "8px 18px", color: posting || !postText.trim() ? "#646669" : "#323437",
                    fontWeight: 700, fontSize: 14, fontFamily: "inherit",
                    cursor: posting || !postText.trim() ? "not-allowed" : "pointer",
                    transition: "background 0.15s", display: "flex", alignItems: "center", gap: 6,
                  }}>
                  {posting ? <><LoadingSpinner /> Posting...</> : "Post!"}
                </button>
              </div>
            </div>
          )}

          {/* Refresh button — always visible in posts view */}
          {view === "posts" && (
            <div style={{ marginBottom: 16 }}>
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                style={{
                  display: "flex", alignItems: "center", gap: 8,
                  background: "#2c2e31", border: "1px solid #3a3d42", borderRadius: 8,
                  padding: "8px 16px", color: refreshing ? "#646669" : "#d1d0c5",
                  fontSize: 13, fontFamily: "inherit", cursor: refreshing ? "not-allowed" : "pointer",
                  transition: "background 0.15s, border-color 0.15s",
                }}
                onMouseEnter={(e) => { if (!refreshing) { (e.currentTarget as HTMLButtonElement).style.borderColor = "#646669"; } }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = "#3a3d42"; }}
              >
                <RefreshIcon spinning={refreshing} />
                {refreshing ? "Refreshing..." : "Refresh"}
              </button>
            </div>
          )}

          {/* Notifications view */}
          {view === "notifications" && (
            <div>
              <h3 style={{ color: "#646669", fontSize: 13, marginBottom: 16, textTransform: "uppercase", letterSpacing: 1 }}>Notifications</h3>
              {notifications.length === 0 && (
                <div style={{ color: "#646669", textAlign: "center", marginTop: 60, fontSize: 15 }}>
                  No notifications yet.
                </div>
              )}
              {notifications.map((notif) => (
                <div key={notif.id} style={{
                  background: notif.read ? "#2c2e31" : "#2c2e31",
                  borderRadius: 12, padding: "14px 18px", marginBottom: 10,
                  border: `1px solid ${notif.read ? "#3a3d42" : "#e2b714"}`,
                  opacity: notif.read ? 0.7 : 1,
                }}>
                  <div style={{ color: "#e2b714", fontSize: 13, fontWeight: 700, marginBottom: 4 }}>
                    @{notif.from_username}{" "}
                    <span style={{ color: "#d1d0c5", fontWeight: 400 }}>
                      {notif.type === "like" ? "liked your post!" : notif.type === "comment" ? "replied to your post!" : "replied to your post!"}
                    </span>
                  </div>
                  {notif.post_content && (
                    <div style={{ color: "#646669", fontSize: 12, marginTop: 2 }}>
                      "{notif.post_content.slice(0, 80)}{notif.post_content.length > 80 ? "…" : ""}"
                    </div>
                  )}
                  {notif.message_content && (
                    <div style={{ color: "#d1d0c5", fontSize: 12, marginTop: 4, background: "#3a3d42", borderRadius: 6, padding: "6px 10px" }}>
                      {notif.message_content}
                    </div>
                  )}
                  <div style={{ color: "#646669", fontSize: 11, marginTop: 6 }}>
                    {new Date(notif.created_at).toLocaleDateString()}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Posts / Bookmarks view */}
          {(view === "posts" || view === "bookmarks") && (
            <div>
              {view === "bookmarks" && (
                <h3 style={{ color: "#646669", fontSize: 13, marginBottom: 16, textTransform: "uppercase", letterSpacing: 1 }}>Bookmarks</h3>
              )}
              {visiblePosts.length === 0 && (
                <div style={{ color: "#646669", textAlign: "center", marginTop: 60, fontSize: 15 }}>
                  {view === "bookmarks" ? "No bookmarks yet." : "No posts yet. Be the first!"}
                </div>
              )}
              {visiblePosts.map((post, index) => (
                <div key={post.id} ref={(el) => { postRefs.current[index] = el; }}>
                  <PostCard post={post} currentUser={currentUser}
                    onLike={handleLike} onBookmark={handleBookmark} onDelete={handleDelete} onEdit={handleEdit} />
                </div>
              ))}
              {visibleCount < allVisiblePosts.length && (
                <div style={{ color: "#646669", textAlign: "center", padding: "20px 0", fontSize: 13 }}>
                  Loading more posts...
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const ADMIN_USER = "kiirod";

// ── Twemoji ───────────────────────────────────────────────────────────────────

function getTwemojiUrl(emoji: string): string {
  const cp = [...emoji].map((c) => c.codePointAt(0)!.toString(16)).join("-");
  return `https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/svg/${cp}.svg`;
}

function renderWithTwemoji(text: string, onMentionClick?: (username: string) => void): React.ReactNode[] {
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
    if (match.index > last) {
      nodes.push(...renderEmojis(text.slice(last, match.index)));
    }
    const token = match[0];
    if (token.startsWith("#")) {
      const tag = token.slice(1);
      nodes.push(
        <a key={keyIdx++}
          href={`/search/%23${tag}`}
          style={{ color: "#4a9eff", fontWeight: 600, textDecoration: "none", cursor: "pointer" }}
          onClick={(e) => e.stopPropagation()}>
          {token}
        </a>
      );
    } else if (token.startsWith("@")) {
      const username = token.slice(1);
      nodes.push(
        <span key={keyIdx++}
          onClick={() => onMentionClick?.(username)}
          style={{ color: "#4a9eff", cursor: onMentionClick ? "pointer" : "default", fontWeight: 600 }}>
          {token}
        </span>
      );
    } else {
      let href = token;
      if (!href.startsWith("http")) href = "https://" + href;
      nodes.push(
        <a key={keyIdx++} href={href} target="_blank" rel="noopener noreferrer"
          style={{ color: "#4a9eff", textDecoration: "underline", wordBreak: "break-all" }}
          onClick={(e) => e.stopPropagation()}>
          {token}
        </a>
      );
    }
    last = match.index + token.length;
  }
  if (last < text.length) nodes.push(...renderEmojis(text.slice(last)));
  return nodes;
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
    .replace(/а/g, "a").replace(/е/g, "e").replace(/о/g, "o")
    .replace(/р/g, "p").replace(/с/g, "c").replace(/х/g, "x")
    .replace(/ѕ/g, "s").replace(/і/g, "i").replace(/ј/g, "j")
    .replace(/0/g, "o").replace(/1/g, "i").replace(/3/g, "e")
    .replace(/4/g, "a").replace(/5/g, "s").replace(/6/g, "g")
    .replace(/7/g, "t").replace(/8/g, "b").replace(/9/g, "g")
    .replace(/@/g, "a").replace(/\$/g, "s").replace(/\|/g, "i")
    .replace(/\(/g, "c").replace(/\+/g, "t").replace(/!/g, "i")
    .replace(/[^a-z\s]/g, "");
}

function collapseRepeats(text: string): string {
  return text.replace(/(.)\1{2,}/g, "$1$1");
}

function removeSpacingBypass(text: string): string {
  return text.replace(/(\b\w)\s*[\s.\-_*]+\s*(?=\w\b)/g, "$1");
}

async function containsBlockedWord(text: string): Promise<boolean> {
  const blocked = await getBlockedWords();
  const stripped = text
    .replace(/https?:\/\/[^\s]+/g, "")
    .replace(/(?<!\w)(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]*[a-zA-Z0-9])?\.)+(?:com|net|org|io|dev|app|co|gg|tv|me|uk|us|ca|au)[^\s]*/g, "")
    .replace(/@[a-zA-Z0-9]{1,16}/g, "");
  const processed = normalizeText(collapseRepeats(removeSpacingBypass(stripped)));
  const words = processed.split(/\s+/);
  for (const blockedWord of blocked) {
    const normalizedBlocked = normalizeText(blockedWord);
    for (const word of words) {
      if (word === normalizedBlocked) return true;
    }
    if (normalizedBlocked.includes(" ")) {
      const escaped = normalizedBlocked.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      if (new RegExp(`\\b${escaped}\\b`).test(processed)) return true;
    }
    if (normalizedBlocked.length >= 6) {
      if (processed.includes(normalizedBlocked)) return true;
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

const BanIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" width={16} height={16}>
    <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2"/>
    <path d="M5.63 5.63l12.74 12.74" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
  </svg>
);

const OwnerBadge = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#e2b714" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width={16} height={16} style={{ display: "inline-block", verticalAlign: "middle", marginLeft: 4 }}>
    <path d="M12 3a3.6 3.6 0 00-3.05 1.68 3.6 3.6 0 00-.9-.1 3.6 3.6 0 00-2.42 1.06 3.6 3.6 0 00-.94 3.32A3.6 3.6 0 003 12a3.6 3.6 0 001.69 3.05 3.6 3.6 0 00.95 3.32 3.6 3.6 0 003.35.96A3.6 3.6 0 0012 21a3.6 3.6 0 003.04-1.67 3.6 3.6 0 004.3-4.3A3.6 3.6 0 0021 12a3.6 3.6 0 00-1.67-3.04v0a3.6 3.6 0 00-4.3-4.3A3.6 3.6 0 0012 3z" />
    <path d="M15 10l-4 4" />
    <path d="M9 12l2 2" />
  </svg>
);

const HelperBadge = () => (
  <svg fill="#e2b714" viewBox="0 0 1920 1920" xmlns="http://www.w3.org/2000/svg"
    width={14} height={14} style={{ display: "inline-block", verticalAlign: "middle", marginLeft: 3 }}>
    <path d="M1556.611 1920c-54.084 0-108.168-20.692-149.333-61.857L740.095 1190.96c-198.162 41.712-406.725-19.269-550.475-163.019C14.449 852.771-35.256 582.788 65.796 356.27l32.406-72.696 390.194 390.193c24.414 24.305 64.266 24.305 88.68 0l110.687-110.686c11.824-11.934 18.283-27.59 18.283-44.34 0-16.751-6.46-32.516-18.283-44.34L297.569 84.207 370.265 51.8C596.893-49.252 866.875.453 1041.937 175.515c155.026 155.136 212.833 385.157 151.851 594.815l650.651 650.651c39.961 39.852 61.967 92.95 61.967 149.443 0 56.383-22.006 109.482-61.967 149.334l-138.275 138.385c-41.275 41.165-95.36 61.857-149.553 61.857Z"
      fillRule="evenodd"/>
  </svg>
);

const SupporterBadge = () => (
  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"
    width={15} height={15} style={{ display: "inline-block", verticalAlign: "middle", marginLeft: 3 }}>
    <path d="M15.7 4C18.87 4 21 6.98 21 9.76C21 15.39 12.16 20 12 20C11.84 20 3 15.39 3 9.76C3 6.98 5.13 4 8.3 4C10.12 4 11.31 4.91 12 5.71C12.69 4.91 13.88 4 15.7 4Z"
      stroke="#e2b714" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const CoolKidsBadge = () => (
  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"
    width={15} height={15} style={{ display: "inline-block", verticalAlign: "middle", marginLeft: 3 }}>
    <path d="M9 14C9.18131 14.4723 9.47841 14.8915 9.864 15.219C11.0903 16.2483 12.8748 16.2613 14.116 15.25C14.5069 14.9283 14.8109 14.5136 15 14.044"
      stroke="#e2b714" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    <path fillRule="evenodd" clipRule="evenodd"
      d="M19 12C19 15.866 15.866 19 12 19C8.13401 19 5 15.866 5 12C5 8.13401 8.13401 5 12 5C13.8565 5 15.637 5.7375 16.9497 7.05025C18.2625 8.36301 19 10.1435 19 12Z"
      stroke="#e2b714" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M8.99985 10.0002L9.9997 11L8.99985 11.9998"
      stroke="#e2b714" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M15.0001 10.0001L14.0003 11L15.0001 11.9998"
      stroke="#e2b714" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const FlagIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" width={16} height={16} style={{ transform: "scaleX(-1)" }}>
    <path fillRule="evenodd" clipRule="evenodd" d="M4 1C3.44772 1 3 1.44772 3 2V22C3 22.5523 3.44772 23 4 23C4.55228 23 5 22.5523 5 22V13.5983C5.46602 13.3663 6.20273 13.0429 6.99251 12.8455C8.40911 12.4914 9.54598 12.6221 10.168 13.555C11.329 15.2964 13.5462 15.4498 15.2526 15.2798C17.0533 15.1004 18.8348 14.5107 19.7354 14.1776C20.5267 13.885 21 13.1336 21 12.3408V5.72337C21 4.17197 19.3578 3.26624 18.0489 3.85981C16.9875 4.34118 15.5774 4.87875 14.3031 5.0563C12.9699 5.24207 12.1956 4.9907 11.832 4.44544C10.5201 2.47763 8.27558 2.24466 6.66694 2.37871C6.0494 2.43018 5.47559 2.53816 5 2.65249V2C5 1.44772 4.55228 1 4 1ZM5 4.72107V11.4047C5.44083 11.2247 5.95616 11.043 6.50747 10.9052C8.09087 10.5094 10.454 10.3787 11.832 12.4455C12.3106 13.1634 13.4135 13.4531 15.0543 13.2897C16.5758 13.1381 18.1422 12.6321 19 12.3172V5.72337C19 5.67794 18.9081 5.66623 18.875 5.68126C17.7575 6.18804 16.1396 6.81972 14.5791 7.03716C13.0776 7.24639 11.2104 7.1185 10.168 5.55488C9.47989 4.52284 8.2244 4.25586 6.83304 4.3718C6.12405 4.43089 5.46427 4.58626 5 4.72107Z" fill="currentColor"/>
  </svg>
);

const RefreshIcon = ({ spinning }: { spinning?: boolean }) => (
  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" width={16} height={16}
    style={spinning ? { animation: "spin 0.7s linear infinite" } : undefined}>
    <path d="M4.06189 13C4.02104 12.6724 4 12.3387 4 12C4 7.58172 7.58172 4 12 4C14.5006 4 16.7332 5.14727 18.2002 6.94416M19.9381 11C19.979 11.3276 20 11.6613 20 12C20 16.4183 16.4183 20 12 20C9.61061 20 7.46589 18.9525 6 17.2916M9 17H6V17.2916M18.2002 4V6.94416M18.2002 6.94416V6.99993L15.2002 7M6 20V17.2916"
      stroke="#ffffff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

// ── UserBadges helper ─────────────────────────────────────────────────────────

function UserBadges({
  username, verifiedUsers, helperUsers, supporterUsers, coolKidsUsers,
}: {
  username: string;
  verifiedUsers: Set<string>;
  helperUsers: Set<string>;
  supporterUsers: Set<string>;
  coolKidsUsers: Set<string>;
}) {
  const lower = username.toLowerCase();
  return (
    <>
      {verifiedUsers.has(lower)  && <OwnerBadge />}
      {helperUsers.has(lower)    && <HelperBadge />}
      {supporterUsers.has(lower) && <SupporterBadge />}
      {coolKidsUsers.has(lower)  && <CoolKidsBadge />}
    </>
  );
}

// ── Skeleton Components ───────────────────────────────────────────────────────

const SkeletonBlock = ({ width, height, borderRadius = 6, style = {} }: {
  width?: string | number;
  height?: string | number;
  borderRadius?: number;
  style?: React.CSSProperties;
}) => (
  <div style={{
    width: width ?? "100%",
    height: height ?? 16,
    borderRadius,
    background: "linear-gradient(90deg, #2c2e31 25%, #3a3d42 50%, #2c2e31 75%)",
    backgroundSize: "200% 100%",
    animation: "shimmer 1.6s infinite",
    flexShrink: 0,
    ...style,
  }} />
);

function SkeletonPost() {
  return (
    <div style={{ background: "#2c2e31", borderRadius: 12, padding: "16px 20px", marginBottom: 12, border: "1px solid #3a3d42" }}>
      <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
        <SkeletonBlock width={40} height={40} borderRadius={20} />
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <SkeletonBlock width={100} height={14} />
            <SkeletonBlock width={70} height={12} />
          </div>
          <SkeletonBlock width="90%" height={14} />
          <SkeletonBlock width="75%" height={14} />
          <div style={{ display: "flex", gap: 20, marginTop: 4 }}>
            <SkeletonBlock width={40} height={12} />
            <SkeletonBlock width={40} height={12} />
            <SkeletonBlock width={40} height={12} />
            <SkeletonBlock width={40} height={12} />
          </div>
        </div>
      </div>
    </div>
  );
}

function SkeletonFeed() {
  return (
    <div>
      {[1, 2, 3, 4, 5].map((i) => <SkeletonPost key={i} />)}
    </div>
  );
}

// ── Types ─────────────────────────────────────────────────────────────────────

interface Reply {
  id: string;
  username: string;
  display_name?: string;
  pfp_url: string | null;
  content: string;
  created_at: string;
  replies?: Reply[];
}

interface Comment {
  id: string;
  username: string;
  display_name?: string;
  pfp_url: string | null;
  content: string;
  created_at: string;
  replies?: Reply[];
}

interface Post {
  id: string;
  user_id: string;
  username: string;
  display_name?: string;
  handle?: string;
  pfp_url: string | null;
  content: string;
  image_url: string | null;
  likes: number;
  liked_by: string[];
  bookmarked_by: string[];
  reposted_by: string[];
  comments: Comment[];
  created_at: string;
  edited?: boolean;
  views?: number;
  verified?: boolean;
  helper?: boolean;
  supporter?: boolean;
  cool_kids?: boolean;
}

interface Notification {
  id: string;
  type: "like" | "comment" | "reply" | "mention";
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
        <button onClick={handleDownload} title="Download image"
          style={{
            position: "absolute", top: 8, left: 8, background: "#323437cc",
            border: "none", borderRadius: 6, width: 34, height: 34, cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
          <DownloadIcon />
        </button>
      )}
    </div>
  );
}

// ── Reply Tree ────────────────────────────────────────────────────────────────

function ReplyItem({
  reply, depth, currentUser, postId, commentId, replyPath, onUpdate,
  isAdmin, isShadowbannedUser, onAdminShadowban,
  verifiedUsers, helperUsers, supporterUsers, coolKidsUsers,
}: {
  reply: Reply; depth: number;
  currentUser: { id: string; username: string; display_name?: string; pfp_url: string | null } | null;
  postId: string; commentId: string; replyPath: number[];
  onUpdate: (updatedComments: Comment[]) => void;
  isAdmin: boolean;
  isShadowbannedUser: (username: string) => boolean;
  onAdminShadowban: (username: string) => void;
  verifiedUsers: Set<string>; helperUsers: Set<string>;
  supporterUsers: Set<string>; coolKidsUsers: Set<string>;
}) {
  const [showReplyInput, setShowReplyInput] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [replyError, setReplyError] = useState("");
  const isOwner = currentUser?.username === reply.username;
  const replyIsShadowbanned = isShadowbannedUser(reply.username);

  async function adminDeleteReply() {
    const { data: postData } = await supabase.from("posts").select("comments").eq("id", postId).single();
    if (!postData) return;
    const comments: Comment[] = postData.comments ?? [];
    function removeReply(list: Reply[], path: number[]): Reply[] {
      if (path.length === 1) return list.filter((_, i) => i !== path[0]);
      return list.map((r, i) => i === path[0] ? { ...r, replies: removeReply(r.replies ?? [], path.slice(1)) } : r);
    }
    const updated = comments.map((c) =>
      c.id === commentId ? { ...c, replies: removeReply(c.replies ?? [], replyPath) } : c
    );
    await supabase.from("posts").update({ comments: updated }).eq("id", postId);
    onUpdate(updated);
  }

  async function submitNestedReply() {
    if (!replyText.trim() || !currentUser) return;
    const blocked = await containsBlockedWord(replyText);
    if (blocked) { setReplyError("Your message has a word that is disallowed."); return; }
    setReplyError("");
    const newReply: Reply = {
      id: crypto.randomUUID(),
      username: currentUser.username,
      display_name: currentUser.display_name,
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
        i === path[0] ? { ...r, replies: insertReply(r.replies ?? [], path.slice(1)) } : r
      );
    }
    const updated = comments.map((c) =>
      c.id === commentId ? { ...c, replies: insertReply(c.replies ?? [], replyPath) } : c
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
      c.id === commentId ? { ...c, replies: removeReply(c.replies ?? [], replyPath) } : c
    );
    await supabase.from("posts").update({ comments: updated }).eq("id", postId);
    onUpdate(updated);
  }

  const fontSize = depth >= 2 ? 12 : 13;
  const avatarSize = depth >= 2 ? 20 : 24;
  const displayName = reply.display_name || reply.username;

  return (
    <div style={{ marginLeft: depth > 0 ? 16 : 0, marginTop: 6 }}>
      <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
        <Avatar url={reply.pfp_url} username={reply.username} size={avatarSize} />
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 2, flexWrap: "wrap" }}>
            <span style={{ color: "#e2b714", fontSize: fontSize - 1, fontWeight: 700 }}>{displayName}</span>
            <span style={{ color: "#646669", fontSize: fontSize - 2, opacity: 0.7 }}>@{reply.username}</span>
            <UserBadges username={reply.username} verifiedUsers={verifiedUsers}
              helperUsers={helperUsers} supporterUsers={supporterUsers} coolKidsUsers={coolKidsUsers} />
            {replyIsShadowbanned && isAdmin && (
              <span style={{ color: "#ca4754", fontSize: 10, background: "#ca475422", borderRadius: 4, padding: "1px 6px" }}>shadowbanned</span>
            )}
            {isAdmin && reply.username.toLowerCase() !== ADMIN_USER && (
              <div style={{ display: "flex", gap: 4, marginLeft: 4 }}>
                <button onClick={adminDeleteReply} title="Admin delete reply"
                  style={{ background: "none", border: "none", cursor: "pointer", color: "#ca4754", padding: 0, display: "flex", opacity: 0.7 }}>
                  <TrashIcon />
                </button>
                {!replyIsShadowbanned && (
                  <button onClick={() => onAdminShadowban(reply.username)} title="Shadowban user"
                    style={{ background: "none", border: "none", cursor: "pointer", color: "#ca4754", padding: 0, display: "flex", opacity: 0.7 }}>
                    <BanIcon />
                  </button>
                )}
              </div>
            )}
          </div>
          <div style={{ color: "#d1d0c5", fontSize, lineHeight: 1.4, wordBreak: "break-word" }}>
            {renderWithTwemoji(reply.content)}
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
                  style={{ flex: 1, background: "#3a3d42", border: "none", borderRadius: 6, padding: "6px 10px", color: "#fff", fontSize: 12, fontFamily: "inherit", outline: "none" }} />
                <button onClick={submitNestedReply}
                  style={{ background: "#e2b714", border: "none", borderRadius: 6, padding: "6px 10px", color: "#323437", fontWeight: 700, fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>↵</button>
              </div>
              {replyError && <div style={{ color: "#ca4754", fontSize: 11, marginTop: 4 }}>{replyError}</div>}
            </div>
          )}
          {(reply.replies ?? []).map((r, i) => (
            <ReplyItem key={r.id} reply={r} depth={depth + 1} currentUser={currentUser}
              postId={postId} commentId={commentId} replyPath={[...replyPath, i]} onUpdate={onUpdate}
              isAdmin={isAdmin} isShadowbannedUser={isShadowbannedUser} onAdminShadowban={onAdminShadowban}
              verifiedUsers={verifiedUsers} helperUsers={helperUsers}
              supporterUsers={supporterUsers} coolKidsUsers={coolKidsUsers} />
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Report Button ─────────────────────────────────────────────────────────────

function ReportButton({ postId, onReport }: { postId: string; onReport: (id: string) => void }) {
  const [hovered, setHovered] = useState(false);
  return (
    <button onClick={(e) => { e.stopPropagation(); onReport(postId); }}
      onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
      title="Report post"
      style={{ display: "flex", alignItems: "center", background: "none", border: "none", cursor: "pointer", color: hovered ? "#ca4754" : "#646669", padding: 0, transition: "color 0.15s" }}>
      <FlagIcon />
    </button>
  );
}

// ── Post Card ─────────────────────────────────────────────────────────────────

function PostCard({
  post, currentUser, onLike, onBookmark, onDelete, onEdit,
  isAdmin, isShadowbanned, onAdminDelete, onAdminShadowban, onRepost,
  blockedUsers, verifiedUsers, helperUsers, supporterUsers, coolKidsUsers, onReport,
}: {
  post: Post;
  currentUser: { id: string; username: string; display_name?: string; pfp_url: string | null } | null;
  onLike: (id: string) => void;
  onBookmark: (id: string) => void;
  onDelete: (id: string) => void;
  onEdit: (id: string, newContent: string) => void;
  isAdmin: boolean;
  isShadowbanned: boolean;
  onAdminDelete: (id: string) => void;
  onAdminShadowban: (username: string) => void;
  onRepost: (id: string) => void;
  blockedUsers: Set<string>;
  verifiedUsers: Set<string>;
  helperUsers: Set<string>;
  supporterUsers: Set<string>;
  coolKidsUsers: Set<string>;
  onReport: (id: string) => void;
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

  const prevCommentsRef = useRef<string>("");
  useEffect(() => {
    const incoming = JSON.stringify(post.comments ?? []);
    if (incoming !== prevCommentsRef.current) {
      prevCommentsRef.current = incoming;
      setLocalComments(post.comments ?? []);
    }
  }, [post.comments]);

  const reposted = currentUser ? (post.reposted_by ?? []).includes(currentUser.id) : false;
  const isBlocked = blockedUsers.has(post.user_id);
  if (isBlocked) return null;

  const liked = currentUser ? post.liked_by?.includes(currentUser.id) : false;
  const bookmarked = currentUser ? post.bookmarked_by?.includes(currentUser.id) : false;
  const isOwner = currentUser?.id === post.user_id;
  const canEdit = isOwner && !post.edited;

  // Display name vs handle
  const displayName = post.display_name || post.username;
  const handle = post.handle || post.username.toLowerCase();

  async function submitComment() {
    if (!commentText.trim() || !currentUser) return;
    const blocked = await containsBlockedWord(commentText);
    if (blocked) { setCommentError("Your message has a word that is disallowed."); return; }
    setCommentError("");
    const newComment: Comment = {
      id: crypto.randomUUID(),
      username: currentUser.username,
      display_name: currentUser.display_name,
      pfp_url: currentUser.pfp_url,
      content: commentText.trim(),
      created_at: new Date().toISOString(),
      replies: [],
    };
    const updatedComments = [...localComments, newComment];
    setLocalComments(updatedComments);
    setCommentText("");
    await supabase.from("posts").update({ comments: updatedComments }).eq("id", post.id);
    if (post.user_id !== currentUser.id) {
      await supabase.from("notifications").insert({
        user_id: post.user_id, type: "comment", from_username: currentUser.username,
        post_id: post.id, post_content: post.content, message_content: commentText.trim(),
        read: false, created_at: new Date().toISOString(),
      });
    }
    const mentionRegex = /@([a-zA-Z0-9]{1,16})/g;
    const mentioned = new Set<string>();
    let mm;
    while ((mm = mentionRegex.exec(commentText)) !== null) {
      const u = mm[1].toLowerCase();
      if (u !== currentUser.username.toLowerCase()) mentioned.add(u);
    }
    if (mentioned.size > 0) {
      const { data: profiles } = await supabase.from("profiles").select("id, username").in("username", [...mentioned]);
      if (profiles) {
        for (const profile of profiles) {
          await supabase.from("notifications").insert({
            user_id: profile.id, type: "mention", from_username: currentUser.username,
            post_id: post.id, post_content: post.content, message_content: commentText.trim(),
            read: false, created_at: new Date().toISOString(),
          });
        }
      }
    }
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
        <a href={`/users/${handle}`} onClick={(e) => e.stopPropagation()} style={{ textDecoration: "none", flexShrink: 0 }}>
          <Avatar url={post.pfp_url} username={post.username} size={40} />
        </a>
        <div style={{ flex: 1, minWidth: 0, cursor: "pointer" }}
          onClick={(e) => { if ((e.target as HTMLElement).closest("a,button,input,textarea")) return; window.location.href = `/posts/${post.id}`; }}>

          {/* Display name + handle row */}
          <div style={{ marginBottom: 4, display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
            <span style={{ color: "#e2b714", fontWeight: 700, fontSize: 14 }}>{displayName}</span>
            <span style={{ color: "#646669", fontSize: 12, opacity: 0.7 }}>@{handle}</span>
            <UserBadges username={post.username} verifiedUsers={verifiedUsers}
              helperUsers={helperUsers} supporterUsers={supporterUsers} coolKidsUsers={coolKidsUsers} />
            {isShadowbanned && isAdmin && (
              <span style={{ color: "#ca4754", fontSize: 10, background: "#ca475422", borderRadius: 4, padding: "1px 6px" }}>shadowbanned</span>
            )}
            {isAdmin && post.username.toLowerCase() !== ADMIN_USER && (
              <div style={{ display: "flex", gap: 4, marginLeft: 2 }}>
                <button onClick={(e) => { e.stopPropagation(); onAdminDelete(post.id); }} title="Admin delete post"
                  style={{ background: "none", border: "none", cursor: "pointer", color: "#ca4754", padding: 0, display: "flex", opacity: 0.7 }}>
                  <TrashIcon />
                </button>
                {!isShadowbanned && (
                  <button onClick={(e) => { e.stopPropagation(); onAdminShadowban(post.username); }} title="Shadowban user"
                    style={{ background: "none", border: "none", cursor: "pointer", color: "#ca4754", padding: 0, display: "flex", opacity: 0.7 }}>
                    <BanIcon />
                  </button>
                )}
              </div>
            )}
          </div>

          {post.verified && (
            <div style={{ color: "#e2b714", opacity: 0.5, fontSize: 11, marginTop: -2, marginBottom: 4 }}>Staff</div>
          )}

          {editing ? (
            <div>
              <textarea value={editText} onChange={(e) => setEditText(e.target.value.slice(0, 180))}
                rows={3} maxLength={180}
                style={{ width: "100%", background: "#3a3d42", border: "1px solid #646669", borderRadius: 8, color: "#d1d0c5", fontSize: 15, fontFamily: "inherit", resize: "none", outline: "none", lineHeight: 1.5, padding: "8px 12px", boxSizing: "border-box" }} />
              {editError && <div style={{ color: "#ca4754", fontSize: 12, marginTop: 4 }}>{editError}</div>}
              <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                <button onClick={submitEdit}
                  style={{ background: "#e2b714", border: "none", borderRadius: 6, padding: "6px 14px", color: "#323437", fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>Save</button>
                <button onClick={() => { setEditing(false); setEditText(post.content); setEditError(""); }}
                  style={{ background: "#3a3d42", border: "none", borderRadius: 6, padding: "6px 14px", color: "#d1d0c5", fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>Cancel</button>
              </div>
            </div>
          ) : (
            <div style={{ fontSize: 15, lineHeight: 1.5, wordBreak: "break-word", color: "#d1d0c5" }}>
              {renderWithTwemoji(post.content)}
              {post.edited && <span style={{ opacity: 0.5, fontSize: 12, marginLeft: 6 }}>(edited)</span>}
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
            <button onClick={(e) => { e.stopPropagation(); onLike(post.id); }}
              style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", cursor: "pointer", color: liked ? "#e2b714" : "#646669", fontSize: 13, padding: 0, transition: "color 0.15s" }}>
              <HeartIcon filled={liked} />
              <span>{isShadowbanned && currentUser?.id === post.user_id ? post.likes : isShadowbanned ? (post.liked_by?.filter(id => id !== currentUser?.id).length ?? 0) : (post.likes ?? 0)}</span>
            </button>
            <button onClick={(e) => { e.stopPropagation(); onRepost(post.id); }}
              style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", cursor: "pointer", color: reposted ? "#22c55e" : "#646669", fontSize: 13, padding: 0, transition: "color 0.15s" }}>
              <RepostIcon active={reposted} />
              <span>{(post.reposted_by ?? []).length}</span>
            </button>
            <button onClick={(e) => { e.stopPropagation(); onBookmark(post.id); }}
              style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", cursor: "pointer", color: bookmarked ? "#e2b714" : "#646669", padding: 0, transition: "color 0.15s" }}>
              <BookmarkIcon filled={bookmarked} />
            </button>
            <button onClick={(e) => { e.stopPropagation(); setShowComments((v) => !v); }}
              style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", cursor: "pointer", color: "#646669", padding: 0, transition: "color 0.15s" }}>
              <CommentIcon />
              <span style={{ fontSize: 13 }}>{localComments.length}</span>
            </button>
            <div style={{ display: "flex", alignItems: "center", gap: 4, color: "#646669", fontSize: 13 }}>
              <ViewsIcon />
              <span>{post.views ?? 0}</span>
            </div>
            {!isOwner && <ReportButton postId={post.id} onReport={onReport} />}
            {isOwner && (
              <div style={{ display: "flex", gap: 8, marginLeft: "auto", alignItems: "center" }}>
                {canEdit && (
                  <button onClick={() => setEditing(true)}
                    onMouseEnter={() => setEditHovered(true)} onMouseLeave={() => setEditHovered(false)}
                    title="Edit post (once only)"
                    style={{ display: "flex", alignItems: "center", background: "none", border: "none", cursor: "pointer", color: editHovered ? "#e2b714" : "#646669", padding: 0, transition: "color 0.15s" }}>
                    <EditIcon />
                  </button>
                )}
                <button onClick={() => onDelete(post.id)}
                  onMouseEnter={() => setDeleteHovered(true)} onMouseLeave={() => setDeleteHovered(false)}
                  title="Delete post"
                  style={{ display: "flex", alignItems: "center", background: "none", border: "none", cursor: "pointer", color: deleteHovered ? "#ca4754" : "#646669", padding: 0, transition: "color 0.15s" }}>
                  <TrashIcon />
                </button>
              </div>
            )}
          </div>

          {/* Comments */}
          {showComments && (
            <div style={{ marginTop: 12 }}>
              {localComments.map((c, ci) => {
                const commentDisplay = c.display_name || c.username;
                return (
                  <div key={c.id} style={{ marginBottom: 10 }}>
                    <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                      <Avatar url={c.pfp_url} username={c.username} size={26} />
                      <div style={{ flex: 1 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 2, flexWrap: "wrap" }}>
                          <span style={{ color: "#e2b714", fontSize: 12, fontWeight: 700 }}>{commentDisplay}</span>
                          <span style={{ color: "#646669", fontSize: 11, opacity: 0.7 }}>@{c.username}</span>
                          <UserBadges username={c.username} verifiedUsers={verifiedUsers}
                            helperUsers={helperUsers} supporterUsers={supporterUsers} coolKidsUsers={coolKidsUsers} />
                          {isAdmin && c.username.toLowerCase() !== ADMIN_USER && (
                            <div style={{ display: "flex", gap: 4, marginLeft: 4 }}>
                              <button onClick={async () => {
                                const updated = localComments.filter((lc) => lc.id !== c.id);
                                setLocalComments(updated);
                                await supabase.from("posts").update({ comments: updated }).eq("id", post.id);
                              }} title="Admin delete comment"
                                style={{ background: "none", border: "none", cursor: "pointer", color: "#ca4754", padding: 0, display: "flex", opacity: 0.7 }}>
                                <TrashIcon />
                              </button>
                            </div>
                          )}
                        </div>
                        <div style={{ color: "#d1d0c5", fontSize: 13, lineHeight: 1.4, wordBreak: "break-word", marginBottom: 3 }}>
                          {renderWithTwemoji(c.content)}
                        </div>
                        <div style={{ display: "flex", gap: 10, marginTop: 3 }}>
                          {currentUser && (
                            <CommentReplyButton postId={post.id} commentId={c.id} commentIndex={ci}
                              currentUser={currentUser} localComments={localComments} onUpdate={handleCommentsUpdate} />
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
                            postId={post.id} commentId={c.id} replyPath={[ri]} onUpdate={handleCommentsUpdate}
                            isAdmin={isAdmin} isShadowbannedUser={() => isShadowbanned} onAdminShadowban={onAdminShadowban}
                            verifiedUsers={verifiedUsers} helperUsers={helperUsers}
                            supporterUsers={supporterUsers} coolKidsUsers={coolKidsUsers} />
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })}
              {currentUser && (
                <div style={{ marginTop: 8 }}>
                  <div style={{ display: "flex", gap: 8 }}>
                    <input value={commentText} onChange={(e) => setCommentText(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && submitComment()}
                      placeholder="Write a reply..." maxLength={180}
                      style={{ flex: 1, background: "#3a3d42", border: "none", borderRadius: 8, padding: "8px 12px", color: "#fff", fontSize: 13, fontFamily: "inherit", outline: "none" }} />
                    <button onClick={submitComment}
                      style={{ background: "#e2b714", border: "none", borderRadius: 8, padding: "8px 14px", color: "#323437", fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>Reply</button>
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
  currentUser: { id: string; username: string; display_name?: string; pfp_url: string | null };
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
      display_name: currentUser.display_name,
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
              style={{ flex: 1, background: "#3a3d42", border: "none", borderRadius: 6, padding: "6px 10px", color: "#fff", fontSize: 12, fontFamily: "inherit", outline: "none" }} />
            <button onClick={submit}
              style={{ background: "#e2b714", border: "none", borderRadius: 6, padding: "6px 10px", color: "#323437", fontWeight: 700, fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>↵</button>
          </div>
          {error && <div style={{ color: "#ca4754", fontSize: 11, marginTop: 4 }}>{error}</div>}
        </div>
      )}
    </>
  );
}

// ── Edit Profile Modal ────────────────────────────────────────────────────────

function EditProfileModal({
  currentUser, onClose, onSave,
}: {
  currentUser: { id: string; username: string; display_name?: string; pfp_url: string | null };
  onClose: () => void;
  onSave: (newUsername: string, newPfpUrl: string | null, newHandle: string, newDisplayName: string) => void;
}) {
  const [newDisplayName, setNewDisplayName] = useState(currentUser.display_name || currentUser.username);
  const [newHandle, setNewHandle] = useState("");
  const [pfpFile, setPfpFile] = useState<File | null>(null);
  const [pfpPreview, setPfpPreview] = useState<string | null>(currentUser.pfp_url);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [usernameLastChanged, setUsernameLastChanged] = useState<string | null>(null);
  const pfpRef = useRef<HTMLInputElement>(null);
  const [originalHandle, setOriginalHandle] = useState("");
  const [bio, setBio] = useState("");
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [bannerPreview, setBannerPreview] = useState<string | null>(null);
  const [bannerPosition, setBannerPosition] = useState(50);
  const [isDraggingBanner, setIsDraggingBanner] = useState(false);
  const bannerRef = useRef<HTMLInputElement>(null);
  const bannerDragRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function fetchProfile() {
      const { data } = await supabase.from("profiles")
        .select("username_last_changed, handle, bio, banner_url, banner_position, display_name")
        .eq("id", currentUser.id).single();
      if (data?.username_last_changed) setUsernameLastChanged(data.username_last_changed);
      if (data?.handle) { setNewHandle(data.handle); setOriginalHandle(data.handle); }
      if (data?.bio) setBio(data.bio);
      if (data?.banner_url) setBannerPreview(data.banner_url);
      if (data?.banner_position !== null && data?.banner_position !== undefined) setBannerPosition(data.banner_position);
      if (data?.display_name) setNewDisplayName(data.display_name);
    }
    fetchProfile();
  }, [currentUser.id]);

  const canChangeHandle = (() => {
    if (!usernameLastChanged) return true;
    return Date.now() - new Date(usernameLastChanged).getTime() >= 30 * 24 * 60 * 60 * 1000;
  })();

  const daysUntilHandleChange = (() => {
    if (!usernameLastChanged) return 0;
    const diff = 30 * 24 * 60 * 60 * 1000 - (Date.now() - new Date(usernameLastChanged).getTime());
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
    if (!newDisplayName.trim()) { setError("Display name cannot be empty."); return; }
    setSaving(true);

    let pfp_url = currentUser.pfp_url;
    let banner_url: string | null = null;

    if (bannerFile) {
      const stripped = await stripImageMetadata(bannerFile);
      const { data: bannerUpload } = await supabase.storage.from("pfps").upload(`banner_${currentUser.id}.jpg`, stripped, { upsert: true });
      if (bannerUpload) {
        const { data: bannerUrlData } = supabase.storage.from("pfps").getPublicUrl(bannerUpload.path);
        banner_url = bannerUrlData.publicUrl + `?t=${Date.now()}`;
      }
    }

    if (pfpFile) {
      const stripped = await stripImageMetadata(pfpFile);
      const { data: uploadData } = await supabase.storage.from("pfps").upload(`${currentUser.id}.jpg`, stripped, { upsert: true });
      if (uploadData) {
        const { data: urlData } = supabase.storage.from("pfps").getPublicUrl(uploadData.path);
        pfp_url = urlData.publicUrl + `?t=${Date.now()}`;
      }
    }

    const handleChanged = newHandle !== originalHandle;
    if (handleChanged && !canChangeHandle) {
      setError(`You can change your handle again in ${daysUntilHandleChange} day(s).`);
      setSaving(false);
      return;
    }

    const updateData: Record<string, unknown> = {
      pfp_url,
      display_name: newDisplayName.trim(),
      bio: bio.trim() || null,
      banner_position: bannerPosition,
    };
    if (handleChanged) {
      updateData.handle = newHandle;
      updateData.username_last_changed = new Date().toISOString();
    }
    if (banner_url) updateData.banner_url = banner_url;

    await supabase.from("profiles").update(updateData).eq("id", currentUser.id);

    if (pfpFile) {
      await supabase.from("posts").update({ pfp_url, display_name: newDisplayName.trim() }).eq("user_id", currentUser.id);
    } else {
      await supabase.from("posts").update({ display_name: newDisplayName.trim() }).eq("user_id", currentUser.id);
    }

    setSaving(false);
    onSave(currentUser.username, pfp_url, newHandle || originalHandle, newDisplayName.trim());
  }

  return (
    <div style={{ position: "fixed", inset: 0, background: "#000000aa", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{ background: "#2c2e31", borderRadius: 14, padding: "28px", width: "100%", maxWidth: 400, border: "1px solid #3a3d42", display: "flex", flexDirection: "column", gap: 18, maxHeight: "90vh", overflowY: "auto" }}>
        <h2 style={{ color: "#e2b714", fontSize: 18, fontWeight: 700, margin: 0 }}>Edit Profile</h2>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <Avatar url={pfpPreview} username={currentUser.username} size={56} />
          <div>
            <input ref={pfpRef} type="file" accept=".jpeg,.jpg,.png,.gif,.avif,.webp" style={{ display: "none" }} onChange={handlePfpPick} />
            <button onClick={() => pfpRef.current?.click()}
              style={{ background: "#3a3d42", border: "none", borderRadius: 8, padding: "8px 14px", color: "#d1d0c5", fontSize: 13, fontFamily: "inherit", cursor: "pointer" }}>
              Change profile picture
            </button>
            {pfpFile && <div style={{ color: "#e2b714", fontSize: 11, marginTop: 4 }}>New picture selected</div>}
          </div>
        </div>

        <div>
          <label style={{ color: "#646669", fontSize: 12, display: "block", marginBottom: 6 }}>Display Name <span style={{ opacity: 0.5 }}>(shown on posts)</span></label>
          <input value={newDisplayName} onChange={(e) => setNewDisplayName(e.target.value.slice(0, 32))} maxLength={32}
            style={{ width: "100%", background: "#3a3d42", border: "1px solid #3a3d42", borderRadius: 8, padding: "10px 14px", color: "#fff", fontSize: 14, fontFamily: "inherit", outline: "none", boxSizing: "border-box" }} />
        </div>

        <div>
          <label style={{ color: "#646669", fontSize: 12, display: "block", marginBottom: 6 }}>Handle <span style={{ opacity: 0.5 }}>(lowercase, for login & URLs)</span></label>
          <input value={newHandle} onChange={(e) => { if (canChangeHandle) setNewHandle(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "").slice(0, 16)); }}
            disabled={!canChangeHandle} maxLength={16}
            placeholder={currentUser.username.toLowerCase()}
            style={{ width: "100%", background: canChangeHandle ? "#3a3d42" : "#2c2e31", border: "1px solid #3a3d42", borderRadius: 8, padding: "10px 14px", color: canChangeHandle ? "#fff" : "#646669", fontSize: 14, fontFamily: "inherit", outline: "none", boxSizing: "border-box", cursor: canChangeHandle ? "text" : "not-allowed" }} />
          {!canChangeHandle && <div style={{ color: "#646669", fontSize: 11, marginTop: 4 }}>Handle can change again in {daysUntilHandleChange} day(s).</div>}
        </div>

        <div>
          <label style={{ color: "#646669", fontSize: 12, display: "block", marginBottom: 6 }}>Profile Banner</label>
          <input ref={bannerRef} type="file" accept=".jpeg,.jpg,.png,.avif,.webp" style={{ display: "none" }}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              setBannerFile(file);
              setBannerPreview(URL.createObjectURL(file));
              setBannerPosition(50);
            }} />
          {bannerPreview ? (
            <div style={{ marginBottom: 6 }}>
              <div ref={bannerDragRef} style={{ position: "relative", borderRadius: 8, overflow: "hidden", height: 120, cursor: isDraggingBanner ? "grabbing" : "grab", userSelect: "none" }}
                onMouseDown={(e) => {
                  e.preventDefault();
                  setIsDraggingBanner(true);
                  const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
                  const onMove = (me: MouseEvent) => {
                    const pct = Math.max(0, Math.min(100, ((me.clientY - rect.top) / rect.height) * 100));
                    setBannerPosition(pct);
                  };
                  const onUp = () => { setIsDraggingBanner(false); window.removeEventListener("mousemove", onMove); window.removeEventListener("mouseup", onUp); };
                  window.addEventListener("mousemove", onMove);
                  window.addEventListener("mouseup", onUp);
                }}>
                <img src={bannerPreview} alt="banner" draggable={false}
                  style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: `center ${bannerPosition}%`, display: "block", pointerEvents: "none" }} />
                <div style={{ position: "absolute", inset: 0, background: "#00000033", display: "flex", alignItems: "center", justifyContent: "center", pointerEvents: "none" }}>
                  <span style={{ color: "#ffffffcc", fontSize: 12, background: "#00000066", padding: "4px 10px", borderRadius: 6 }}>↕ Drag to reposition</span>
                </div>
              </div>
              <button onClick={() => bannerRef.current?.click()}
                style={{ marginTop: 6, background: "#3a3d42", border: "none", borderRadius: 8, padding: "6px 14px", color: "#d1d0c5", fontSize: 13, fontFamily: "inherit", cursor: "pointer" }}>
                Change Banner
              </button>
            </div>
          ) : (
            <button onClick={() => bannerRef.current?.click()}
              style={{ background: "#3a3d42", border: "none", borderRadius: 8, padding: "8px 14px", color: "#d1d0c5", fontSize: 13, fontFamily: "inherit", cursor: "pointer" }}>
              Upload Banner
            </button>
          )}
        </div>

        <div>
          <label style={{ color: "#646669", fontSize: 12, display: "block", marginBottom: 6 }}>Bio <span style={{ opacity: 0.5 }}>({bio.length}/180)</span></label>
          <textarea value={bio} onChange={(e) => setBio(e.target.value.slice(0, 180))} rows={3}
            placeholder="Tell people about yourself..."
            style={{ width: "100%", background: "#3a3d42", border: "1px solid #3a3d42", borderRadius: 8, padding: "10px 14px", color: "#fff", fontSize: 14, fontFamily: "inherit", outline: "none", boxSizing: "border-box", resize: "none" }} />
        </div>

        {error && <div style={{ color: "#ca4754", fontSize: 13 }}>{error}</div>}

        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={handleSave} disabled={saving}
            style={{ flex: 1, background: saving ? "#3a3d42" : "#e2b714", border: "none", borderRadius: 8, padding: "10px 0", color: saving ? "#646669" : "#323437", fontWeight: 700, fontSize: 14, fontFamily: "inherit", cursor: saving ? "not-allowed" : "pointer" }}>
            {saving ? "Saving..." : "Save"}
          </button>
          <button onClick={onClose}
            style={{ flex: 1, background: "#3a3d42", border: "none", borderRadius: 8, padding: "10px 0", color: "#d1d0c5", fontSize: 14, fontFamily: "inherit", cursor: "pointer" }}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Force Email Modal ─────────────────────────────────────────────────────────

function ForceEmailModal({ currentUser, onDone }: {
  currentUser: { id: string; username: string };
  onDone: () => void;
}) {
  const [email, setEmail] = useState("");
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  const isValid = email.includes("@") || email.includes("#");

  async function handleSubmit() {
    if (!isValid) return;
    setSaving(true);
    setError("");
    try {
      // Update Supabase auth email
      const { error: authErr } = await supabase.auth.updateUser({ email });
      if (authErr) {
        setError(authErr.message);
        setSaving(false);
        return;
      }
      // Store in profiles
      await supabase.from("profiles").update({ email, email_set: true }).eq("id", currentUser.id);
      setDone(true);
      setTimeout(() => { onDone(); }, 2200);
    } catch (e) {
      setError("Something went wrong. Try again.");
    }
    setSaving(false);
  }

  return (
    <div style={{
      position: "fixed", inset: 0, background: "#000000cc", zIndex: 500,
      display: "flex", alignItems: "center", justifyContent: "center",
    }}>
      <div style={{
        background: "#2c2e31", borderRadius: 16, padding: "36px 32px",
        width: "100%", maxWidth: 420, border: "1px solid #3a3d42",
        display: "flex", flexDirection: "column", gap: 20,
        animation: "toastIn 0.3s ease",
      }}>
        {done ? (
          <div style={{ textAlign: "center", padding: "20px 0" }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>✓</div>
            <div style={{ color: "#e2b714", fontWeight: 700, fontSize: 20, marginBottom: 8 }}>All done. Thank you!</div>
            <div style={{ color: "#646669", fontSize: 14 }}>Your email has been saved.</div>
          </div>
        ) : (
          <>
            <div>
              <div style={{ color: "#e2b714", fontWeight: 700, fontSize: 20, marginBottom: 8 }}>Add an email, quickly.</div>
              <div style={{ color: "#d1d0c5", fontSize: 14, lineHeight: 1.6, opacity: 0.8 }}>
                Your account currently uses a temporary login. Add a real email so you can recover your account and log in with email or handle.
              </div>
            </div>
            <div>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && isValid && handleSubmit()}
                placeholder="you@example.com"
                autoFocus
                style={{
                  width: "100%", background: "#3a3d42", border: `1px solid ${isValid ? "#e2b714" : "#3a3d42"}`,
                  borderRadius: 10, padding: "12px 16px", color: "#fff", fontSize: 15,
                  fontFamily: "inherit", outline: "none", boxSizing: "border-box",
                  transition: "border-color 0.2s",
                }}
              />
              {error && <div style={{ color: "#ca4754", fontSize: 12, marginTop: 6 }}>{error}</div>}
            </div>
            <button
              onClick={handleSubmit}
              disabled={!isValid || saving}
              style={{
                background: isValid && !saving ? "#e2b714" : "#3a3d42",
                border: "none", borderRadius: 10, padding: "13px 0",
                color: isValid && !saving ? "#323437" : "#646669",
                fontWeight: 700, fontSize: 15, fontFamily: "inherit",
                cursor: isValid && !saving ? "pointer" : "not-allowed",
                transition: "background 0.2s, color 0.2s",
              }}
            >
              {saving ? "Saving..." : "Continue"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// ── Delete Account Modal ──────────────────────────────────────────────────────

function DeleteAccountModal({
  currentUser, onClose, onDeleted,
}: {
  currentUser: { id: string; username: string; pfp_url: string | null };
  onClose: () => void;
  onDeleted: () => void;
}) {
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    setDeleting(true);
    await supabase.from("posts").delete().eq("user_id", currentUser.id);
    const { data: allPosts } = await supabase.from("posts").select("id, comments");
    if (allPosts) {
      for (const post of allPosts) {
        const filtered = removeUserFromComments(post.comments ?? [], currentUser.username);
        const changed = JSON.stringify(filtered) !== JSON.stringify(post.comments);
        if (changed) await supabase.from("posts").update({ comments: filtered }).eq("id", post.id);
      }
    }
    await supabase.from("notifications").delete().eq("user_id", currentUser.id);
    await supabase.from("profiles").delete().eq("id", currentUser.id);
    const { data: { session } } = await supabase.auth.getSession();
    await fetch("/api/delete-account", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${session?.access_token}` },
      body: JSON.stringify({ userId: currentUser.id }),
    });
    await supabase.auth.signOut();
    setDeleting(false);
    onDeleted();
  }

  return (
    <div style={{ position: "fixed", inset: 0, background: "#000000bb", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ background: "#2c2e31", borderRadius: 14, padding: "28px", width: "100%", maxWidth: 380, border: "1px solid #3a3d42", display: "flex", flexDirection: "column", gap: 16 }}>
        <h2 style={{ color: "#ca4754", fontSize: 18, fontWeight: 700, margin: 0 }}>Delete Account</h2>
        <p style={{ color: "#d1d0c5", fontSize: 14, lineHeight: 1.6, margin: 0 }}>
          Do you wish to delete your account? This will delete all your posts, replies, and username.
        </p>
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={handleDelete} disabled={deleting}
            style={{ flex: 1, background: deleting ? "#3a3d42" : "#ca4754", border: "none", borderRadius: 8, padding: "10px 0", color: "#fff", fontWeight: 700, fontSize: 14, fontFamily: "inherit", cursor: deleting ? "not-allowed" : "pointer" }}>
            {deleting ? "Deleting..." : "Yes!"}
          </button>
          <button onClick={onClose} disabled={deleting}
            style={{ flex: 1, background: "#3a3d42", border: "none", borderRadius: 8, padding: "10px 0", color: "#d1d0c5", fontSize: 14, fontFamily: "inherit", cursor: "pointer" }}>
            No
          </button>
        </div>
      </div>
    </div>
  );
}

function removeUserFromComments(comments: Comment[], username: string): Comment[] {
  return comments.filter((c) => c.username !== username)
    .map((c) => ({ ...c, replies: removeUserFromReplies(c.replies ?? [], username) }));
}

function removeUserFromReplies(replies: Reply[], username: string): Reply[] {
  return replies.filter((r) => r.username !== username)
    .map((r) => ({ ...r, replies: removeUserFromReplies(r.replies ?? [], username) }));
}

// ── Accounts Modal ────────────────────────────────────────────────────────────

function AccountsModal({
  currentUser, linkedAccounts, onClose, onSwitch, onAdd, onRemove,
}: {
  currentUser: { id: string; username: string; pfp_url: string | null };
  linkedAccounts: { id: string; username: string; pfp_url: string | null }[];
  onClose: () => void;
  onSwitch: (account: { id: string; username: string; pfp_url: string | null }, password: string) => Promise<string | null>;
  onAdd: (account: { id: string; username: string; pfp_url: string | null }, password: string) => void;
  onRemove: (id: string) => void;
}) {
  const [mode, setMode] = useState<"list" | "add">(linkedAccounts.length === 0 ? "add" : "list");
  const [addUsername, setAddUsername] = useState("");
  const [addPassword, setAddPassword] = useState("");
  const [addError, setAddError] = useState("");
  const [adding, setAdding] = useState(false);
  const [switchingId, setSwitchingId] = useState<string | null>(null);
  const [switchError, setSwitchError] = useState<string>("");

  const allAccounts = [currentUser, ...linkedAccounts.filter((a) => a.id !== currentUser.id)];
  const canAddMore = linkedAccounts.length < 4;

  async function handleAdd() {
    if (!addUsername.trim() || !addPassword) { setAddError("Please fill in both fields."); return; }
    if (addUsername.toLowerCase() === currentUser.username.toLowerCase()) { setAddError("That's your current account."); return; }
    if (linkedAccounts.find((a) => a.username.toLowerCase() === addUsername.toLowerCase())) { setAddError("Account already added."); return; }
    setAdding(true);
    setAddError("");
    const { data: { session: currentSession } } = await supabase.auth.getSession();
    const { data, error } = await supabase.auth.signInWithPassword({
      email: `${addUsername.toLowerCase()}@monkeypost.local`,
      password: addPassword,
    });
    if (error || !data.user) {
      if (currentSession?.refresh_token) await supabase.auth.refreshSession({ refresh_token: currentSession.refresh_token });
      setAddError("Invalid username or password.");
      setAdding(false);
      return;
    }
    const { data: profile } = await supabase.from("profiles").select("*").eq("id", data.user.id).single();
    if (currentSession?.refresh_token) await supabase.auth.refreshSession({ refresh_token: currentSession.refresh_token });
    if (!profile) { setAddError("Account not found."); setAdding(false); return; }
    const newAccount = { id: data.user.id, username: profile.username, pfp_url: profile.pfp_url };
    onAdd(newAccount, addPassword);
    setAddUsername("");
    setAddPassword("");
    setMode("list");
    setAdding(false);
  }

  async function handleSwitch(account: { id: string; username: string; pfp_url: string | null }) {
    if (account.id === currentUser.id) return;
    setSwitchingId(account.id);
    setSwitchError("");
    const saved = JSON.parse(localStorage.getItem("mp_account_passwords") ?? "{}");
    const pw = saved[account.id];
    if (!pw) { setSwitchError("Password not found, try removing and re-adding this account."); setSwitchingId(null); return; }
    const err = await onSwitch(account, pw);
    if (err) { setSwitchError(err); setSwitchingId(null); } else { onClose(); }
  }

  return (
    <div style={{ position: "fixed", inset: 0, background: "#000000aa", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{ background: "#2c2e31", borderRadius: 14, padding: "24px", width: "100%", maxWidth: 380, border: "1px solid #3a3d42", display: "flex", flexDirection: "column", gap: 16 }}>
        <h2 style={{ color: "#e2b714", fontSize: 18, fontWeight: 700, margin: 0 }}>
          {mode === "add" ? "Add Account" : "Accounts"}
        </h2>
        {mode === "list" && (
          <>
            {switchError && <div style={{ color: "#ca4754", fontSize: 12 }}>{switchError}</div>}
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {allAccounts.map((account) => {
                const isActive = account.id === currentUser.id;
                const isSwitching = switchingId === account.id;
                return (
                  <div key={account.id} onClick={() => !isActive && handleSwitch(account)}
                    style={{ background: "#3a3d42", borderRadius: 10, padding: "12px 14px", display: "flex", alignItems: "center", gap: 10, cursor: isActive ? "default" : "pointer", border: isActive ? "1px solid #e2b714" : "1px solid transparent", opacity: isSwitching ? 0.6 : 1 }}>
                    <Avatar url={account.pfp_url} username={account.username} size={32} />
                    <span style={{ color: "#e2b714", fontWeight: 700, fontSize: 14, flex: 1 }}>
                      @{account.username}
                      {isSwitching && <span style={{ color: "#646669", fontWeight: 400, fontSize: 12, marginLeft: 8 }}>Switching...</span>}
                    </span>
                    {isActive && (
                      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" width={18} height={18}>
                        <path d="M5 13L9 17L19 7" stroke="#e2b714" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                    {!isActive && (
                      <button onClick={(e) => { e.stopPropagation(); onRemove(account.id); }}
                        style={{ background: "none", border: "none", cursor: "pointer", color: "#646669", padding: 0, display: "flex" }} title="Remove account">
                        <TrashIcon />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
            {canAddMore && (
              <button onClick={() => setMode("add")}
                style={{ background: "#3a3d42", border: "none", borderRadius: 8, padding: "10px 0", color: "#d1d0c5", fontSize: 13, fontFamily: "inherit", cursor: "pointer", fontWeight: 700 }}>
                + Add More ({allAccounts.length}/5)
              </button>
            )}
          </>
        )}
        {mode === "add" && (
          <>
            <input value={addUsername} onChange={(e) => setAddUsername(e.target.value.replace(/[^a-zA-Z0-9]/g, "").slice(0, 16))}
              placeholder="Username" maxLength={16}
              style={{ background: "#3a3d42", border: "none", borderRadius: 8, padding: "10px 14px", color: "#fff", fontSize: 14, fontFamily: "inherit", outline: "none" }} />
            <input type="password" value={addPassword} onChange={(e) => setAddPassword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAdd()} placeholder="Password"
              style={{ background: "#3a3d42", border: "none", borderRadius: 8, padding: "10px 14px", color: "#fff", fontSize: 14, fontFamily: "inherit", outline: "none" }} />
            {addError && <div style={{ color: "#ca4754", fontSize: 13 }}>{addError}</div>}
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={handleAdd} disabled={adding}
                style={{ flex: 1, background: adding ? "#3a3d42" : "#e2b714", border: "none", borderRadius: 8, padding: "10px 0", color: adding ? "#646669" : "#323437", fontWeight: 700, fontSize: 14, fontFamily: "inherit", cursor: adding ? "not-allowed" : "pointer" }}>
                {adding ? "Checking..." : "Confirm"}
              </button>
              {linkedAccounts.length > 0 && (
                <button onClick={() => { setMode("list"); setAddError(""); }}
                  style={{ flex: 1, background: "#3a3d42", border: "none", borderRadius: 8, padding: "10px 0", color: "#d1d0c5", fontSize: 14, fontFamily: "inherit", cursor: "pointer" }}>
                  Back
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ── User Menu (click-to-toggle) ───────────────────────────────────────────────

function UserMenu({
  currentUser, linkedAccounts, onEditProfile, onAccounts, onLogout, onDeleteAccount,
}: {
  currentUser: { id: string; username: string; display_name?: string; pfp_url: string | null };
  linkedAccounts: { id: string; username: string; pfp_url: string | null }[];
  onEditProfile: () => void;
  onAccounts: () => void;
  onLogout: () => void;
  onDeleteAccount: () => void;
}) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const displayName = currentUser.display_name || currentUser.username;

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  return (
    <div ref={menuRef} style={{ position: "relative" }}>
      <button
        onClick={() => setOpen((v) => !v)}
        style={{
          display: "flex", alignItems: "center", gap: 10, padding: "10px 12px",
          borderRadius: 8, background: open ? "#2c2e31" : "none",
          border: "none", cursor: "pointer", width: "100%",
          transition: "background 0.15s",
        }}
        onMouseEnter={(e) => { if (!open) (e.currentTarget as HTMLButtonElement).style.background = "#2c2e31"; }}
        onMouseLeave={(e) => { if (!open) (e.currentTarget as HTMLButtonElement).style.background = "none"; }}
      >
        <Avatar url={currentUser.pfp_url} username={currentUser.username} size={36} />
        <div style={{ textAlign: "left", flex: 1, minWidth: 0 }}>
          <div style={{ color: "#e2b714", fontSize: 14, fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{displayName}</div>
          <div style={{ color: "#646669", fontSize: 11, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>@{currentUser.username}</div>
        </div>
        <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" width={14} height={14}
          style={{ transform: open ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s", flexShrink: 0 }}>
          <path d="M6 9l6 6 6-6" stroke="#646669" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open && (
        <div style={{
          position: "absolute", bottom: "calc(100% + 6px)", left: 0, right: 0,
          background: "#2c2e31", border: "1px solid #3a3d42", borderRadius: 10,
          overflow: "hidden", boxShadow: "0 8px 24px #00000066",
          animation: "menuIn 0.15s ease",
        }}>
          {[
            { label: "Edit Profile", action: () => { onEditProfile(); setOpen(false); }, color: "#d1d0c5" },
            { label: linkedAccounts.length > 0 ? "View Accounts" : "Add Account", action: () => { onAccounts(); setOpen(false); }, color: "#d1d0c5" },
            { label: "Logout", action: () => { onLogout(); setOpen(false); }, color: "#ca4754" },
            { label: "Delete Account", action: () => { onDeleteAccount(); setOpen(false); }, color: "#ca4754", subtle: true },
          ].map(({ label, action, color, subtle }) => (
            <button key={label} onClick={action}
              style={{
                width: "100%", background: "none", border: "none", padding: "11px 16px",
                color, fontSize: 13, fontFamily: "inherit", cursor: "pointer", textAlign: "left",
                display: "block", opacity: subtle ? 0.7 : 1,
                borderTop: label === "Logout" ? "1px solid #3a3d42" : "none",
              }}
              onMouseEnter={(e) => (e.currentTarget as HTMLButtonElement).style.background = "#3a3d42"}
              onMouseLeave={(e) => (e.currentTarget as HTMLButtonElement).style.background = "none"}>
              {label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Helper fns ────────────────────────────────────────────────────────────────

function updateUsernameInComments(comments: Comment[], oldUsername: string, newUsername: string, newPfpUrl: string | null): Comment[] {
  return comments.map((c) => {
    const updatedReplies = updateUsernameInReplies(c.replies ?? [], oldUsername, newUsername, newPfpUrl);
    if (c.username === oldUsername) return { ...c, username: newUsername, pfp_url: newPfpUrl, replies: updatedReplies };
    return { ...c, replies: updatedReplies };
  });
}

function updateUsernameInReplies(replies: Reply[], oldUsername: string, newUsername: string, newPfpUrl: string | null): Reply[] {
  return replies.map((r) => {
    const updatedReplies = updateUsernameInReplies(r.replies ?? [], oldUsername, newUsername, newPfpUrl);
    if (r.username === oldUsername) return { ...r, username: newUsername, pfp_url: newPfpUrl, replies: updatedReplies };
    return { ...r, replies: updatedReplies };
  });
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function Home() {
  const [step, setStep] = useState<"signup" | "loading" | "app">("loading");
  const [username, setUsername] = useState("");       // display name at signup
  const [signupHandle, setSignupHandle] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pfpFile, setPfpFile] = useState<File | null>(null);
  const [pfpPreview, setPfpPreview] = useState<string | null>(null);
  const [signupError, setSignupError] = useState("");
  const [authMode, setAuthMode] = useState<"signup" | "login">("signup");
  const [loginIdentifier, setLoginIdentifier] = useState(""); // email or handle

  const [currentUser, setCurrentUser] = useState<{ id: string; username: string; display_name?: string; pfp_url: string | null } | null>(null);
  const [showForceEmail, setShowForceEmail] = useState(false);
  const [posts, setPosts] = useState<Post[]>([]);
  const [postsLoaded, setPostsLoaded] = useState(false);
  const [view, setView] = useState<"posts" | "bookmarks" | "notifications">("posts");

  const [postText, setPostText] = useState("");
  const [postError, setPostError] = useState("");
  const [postImageFile, setPostImageFile] = useState<File | null>(null);
  const [postImagePreview, setPostImagePreview] = useState<string | null>(null);
  const [posting, setPosting] = useState(false);

  const [showEditProfile, setShowEditProfile] = useState(false);
  const [showDeleteAccount, setShowDeleteAccount] = useState(false);
  const [showAccountsModal, setShowAccountsModal] = useState(false);

  const [linkedAccounts, setLinkedAccounts] = useState<{ id: string; username: string; pfp_url: string | null }[]>(() => {
    if (typeof window === "undefined") return [];
    try { return JSON.parse(localStorage.getItem("mp_linked_accounts") ?? "[]"); } catch { return []; }
  });

  const [blockedUsers, setBlockedUsers] = useState<Set<string>>(new Set());
  const [shadowbannedUsers, setShadowbannedUsers] = useState<Set<string>>(new Set());
  const [verifiedUsers,    setVerifiedUsers]    = useState<Set<string>>(new Set());
  const [helperUsers,      setHelperUsers]      = useState<Set<string>>(new Set());
  const [supporterUsers,   setSupporterUsers]   = useState<Set<string>>(new Set());
  const [coolKidsUsers,    setCoolKidsUsers]    = useState<Set<string>>(new Set());

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadNotifCount, setUnreadNotifCount] = useState(0);

  const PAGE_SIZE = 20;
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const postRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [reportToast, setReportToast] = useState(false);
  const pfpInputRef = useRef<HTMLInputElement>(null);
  const postImageRef = useRef<HTMLInputElement>(null);

  // ── Load helpers ────────────────────────────────────────────────────────────

  async function loadBlockedUsers(userId: string) {
    const { data } = await supabase.from("blocks").select("blocked_id").eq("blocker_id", userId);
    if (data) setBlockedUsers(new Set(data.map((b: { blocked_id: string }) => b.blocked_id)));
  }
  async function loadShadowbannedUsers() {
    const { data } = await supabase.from("profiles").select("username").eq("shadowbanned", true);
    if (data) setShadowbannedUsers(new Set(data.map((p: { username: string }) => p.username.toLowerCase())));
  }
  async function loadVerifiedUsers() {
    const { data } = await supabase.from("profiles").select("username").eq("verified", true);
    if (data) setVerifiedUsers(new Set(data.map((p: { username: string }) => p.username.toLowerCase())));
  }
  async function loadHelperUsers() {
    const { data } = await supabase.from("profiles").select("username").eq("helper", true);
    if (data) setHelperUsers(new Set(data.map((p: { username: string }) => p.username.toLowerCase())));
  }
  async function loadSupporterUsers() {
    const { data } = await supabase.from("profiles").select("username").eq("supporter", true);
    if (data) setSupporterUsers(new Set(data.map((p: { username: string }) => p.username.toLowerCase())));
  }
  async function loadCoolKidsUsers() {
    const { data } = await supabase.from("profiles").select("username").eq("cool_kids", true);
    if (data) setCoolKidsUsers(new Set(data.map((p: { username: string }) => p.username.toLowerCase())));
  }
  async function loadNotifications(userId: string) {
    const { data } = await supabase.from("notifications").select("*").eq("user_id", userId).order("created_at", { ascending: false });
    if (data) { setNotifications(data as Notification[]); setUnreadNotifCount(data.filter((n: Notification) => !n.read).length); }
  }
  async function loadPostsInner() {
    const { data } = await supabase.from("posts").select("*").order("created_at", { ascending: false });
    if (data) { setPosts(data as Post[]); setPostsLoaded(true); }
  }

  // ── Check email set ─────────────────────────────────────────────────────────

  async function checkEmailSet(userId: string) {
    const { data } = await supabase.from("profiles").select("email_set").eq("id", userId).single();
    if (!data?.email_set) setShowForceEmail(true);
  }

  // ── Realtime ────────────────────────────────────────────────────────────────

  const currentUserRef = useRef(currentUser);
  useEffect(() => { currentUserRef.current = currentUser; }, [currentUser]);

  useEffect(() => {
    if (step !== "app") return;
    const postsChannel = supabase.channel("posts-realtime")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "posts" }, (payload) => {
        setPosts((prev) => { if (prev.find((p) => p.id === payload.new.id)) return prev; return [payload.new as Post, ...prev]; });
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "posts" }, (payload) => {
        setPosts((prev) => prev.map((p) => p.id === payload.new.id ? (payload.new as Post) : p));
      })
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "posts" }, (payload) => {
        setPosts((prev) => prev.filter((p) => p.id !== payload.old.id));
      })
      .subscribe();
    return () => { supabase.removeChannel(postsChannel); };
  }, [step]);

  useEffect(() => {
    if (step !== "app" || !currentUser) return;
    const notifChannel = supabase.channel(`notifications-${currentUser.id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${currentUser.id}` }, (payload) => {
        const newNotif = payload.new as Notification;
        setNotifications((prev) => [newNotif, ...prev]);
        setUnreadNotifCount((prev) => prev + 1);
      })
      .subscribe();
    return () => { supabase.removeChannel(notifChannel); };
  }, [step, currentUser?.id]);

  useEffect(() => {
    async function restoreSession() {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const { data: profile } = await supabase.from("profiles").select("*").eq("id", session.user.id).single();
        if (profile) {
          setCurrentUser({ id: session.user.id, username: profile.username, display_name: profile.display_name || profile.username, pfp_url: profile.pfp_url });
          await loadPostsInner();
          await loadNotifications(session.user.id);
          await Promise.all([loadShadowbannedUsers(), loadVerifiedUsers(), loadHelperUsers(), loadSupporterUsers(), loadCoolKidsUsers(), loadBlockedUsers(session.user.id)]);
          setStep("app");
          await checkEmailSet(session.user.id);
          return;
        }
      }
      setStep("signup");
    }
    restoreSession();
  }, []);

  async function handleRefresh() {
    setRefreshing(true);
    setPostsLoaded(false);
    sortedPostsRef.current = [];
    lastBatchRef.current = 0;
    setVisibleCount(PAGE_SIZE);
    await Promise.all([loadPostsInner(), loadShadowbannedUsers(), loadVerifiedUsers(), loadHelperUsers(), loadSupporterUsers(), loadCoolKidsUsers()]);
    setRefreshing(false);
  }

  useEffect(() => {
    if (view !== "posts" && view !== "bookmarks") return;
    if (visibleCount >= posts.length) return;
    const renderedCount = Math.min(visibleCount, posts.length);
    const targetIndex = Math.max(0, renderedCount - 3);
    const target = postRefs.current[targetIndex];
    if (!target) return;
    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) setVisibleCount((prev) => prev + PAGE_SIZE);
    }, { threshold: 0.1 });
    observer.observe(target);
    return () => observer.disconnect();
  }, [visibleCount, view, posts.length]);

  // ── Auth ────────────────────────────────────────────────────────────────────

  function validateEmail(val: string) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val);
  }

  async function handleSignup() {
    setSignupError("");
    if (!username.trim() || username.length < 1 || username.length > 32) { setSignupError("Display name must be 1–32 characters."); return; }
    if (!/^[a-z0-9_]{1,16}$/.test(signupHandle)) { setSignupError("Handle must be 1–16 chars: lowercase letters, numbers, underscores only."); return; }
    if (!validateEmail(signupEmail)) { setSignupError("Please enter a valid email address."); return; }
    if (!password || password.length < 6) { setSignupError("Password must be at least 6 characters."); return; }
    setStep("loading");

    // Check handle is free
    const { data: existingHandle } = await supabase.from("profiles").select("id").eq("handle", signupHandle).single();
    if (existingHandle) { setStep("signup"); setSignupError("That handle is already taken."); return; }

    // Sign up with real email
    const { data: authData, error: authErr } = await supabase.auth.signUp({ email: signupEmail, password });
    if (authErr || !authData.user) { setStep("signup"); setSignupError(authErr?.message ?? "Sign up failed."); return; }

    const uid = authData.user.id;
    let pfp_url: string | null = null;

    if (pfpFile) {
      const stripped = await stripImageMetadata(pfpFile);
      const { data: uploadData } = await supabase.storage.from("pfps").upload(`${uid}.jpg`, stripped, { upsert: true });
      if (uploadData) {
        const { data: urlData } = supabase.storage.from("pfps").getPublicUrl(uploadData.path);
        pfp_url = urlData.publicUrl;
      }
    }

    const displayName = username.trim();
    await supabase.from("profiles").upsert({
      id: uid,
      username: signupHandle,       // handle is the "username" key
      handle: signupHandle,
      display_name: displayName,
      pfp_url,
      email: signupEmail,
      email_set: true,
    });

    setCurrentUser({ id: uid, username: signupHandle, display_name: displayName, pfp_url });
    await loadPostsInner();
    setStep("app");
  }

  async function handleLogin() {
    setSignupError("");
    if (!loginIdentifier.trim() || !password) { setSignupError("Please enter your email or handle, and password."); return; }
    setStep("loading");

    let email = loginIdentifier.trim();

    // If it looks like a handle (no @domain), look up their email
    if (!email.includes("@") || !email.includes(".")) {
      // Try as handle
      const handle = email.toLowerCase().replace(/^@/, "");
      const { data: profile } = await supabase.from("profiles").select("email, username").eq("handle", handle).single();
      if (profile?.email) {
        email = profile.email;
      } else {
        // Fallback: old-style monkeypost.local
        email = `${handle}@monkeypost.local`;
      }
    }

    const { data: authData, error: authErr } = await supabase.auth.signInWithPassword({ email, password });
    if (authErr || !authData.user) { setStep("signup"); setSignupError("Invalid email/handle or password."); return; }

    const { data: profile } = await supabase.from("profiles").select("*").eq("id", authData.user.id).single();
    if (!profile) { setStep("signup"); setSignupError("Account not found."); return; }

    setCurrentUser({ id: authData.user.id, username: profile.username, display_name: profile.display_name || profile.username, pfp_url: profile.pfp_url });
    await loadPostsInner();
    await loadNotifications(authData.user.id);
    await Promise.all([loadShadowbannedUsers(), loadVerifiedUsers(), loadHelperUsers(), loadSupporterUsers(), loadCoolKidsUsers(), loadBlockedUsers(authData.user.id)]);
    setStep("app");
    await checkEmailSet(authData.user.id);
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    setCurrentUser(null);
    setPosts([]);
    setPostsLoaded(false);
    setNotifications([]);
    setUnreadNotifCount(0);
    setStep("signup");
  }

  function saveLinkedAccounts(accounts: { id: string; username: string; pfp_url: string | null }[]) {
    setLinkedAccounts(accounts);
    localStorage.setItem("mp_linked_accounts", JSON.stringify(accounts));
  }

  async function switchToAccount(account: { id: string; username: string; pfp_url: string | null }, password: string): Promise<string | null> {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: `${account.username.toLowerCase()}@monkeypost.local`,
      password,
    });
    if (error || !data.user) return error?.message ?? "Invalid password";
    const { data: profile } = await supabase.from("profiles").select("*").eq("id", data.user.id).single();
    if (!profile) return "Account not found";
    setCurrentUser({ id: data.user.id, username: profile.username, display_name: profile.display_name || profile.username, pfp_url: profile.pfp_url });
    await loadPostsInner();
    await loadNotifications(data.user.id);
    sortedPostsRef.current = [];
    lastBatchRef.current = 0;
    return null;
  }

  // ── Post actions ────────────────────────────────────────────────────────────

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

    if (shadowbannedUsers.has(currentUser.username.toLowerCase())) {
      const fakePost: Post = {
        id: crypto.randomUUID(), user_id: currentUser.id,
        username: currentUser.username, display_name: currentUser.display_name,
        pfp_url: currentUser.pfp_url, content: postText.trim(), image_url: null,
        likes: 0, liked_by: [], bookmarked_by: [], reposted_by: [], comments: [],
        created_at: new Date().toISOString(), edited: false,
      };
      setPosts((prev) => [fakePost, ...prev]);
      setPostText(""); setPostImageFile(null); setPostImagePreview(null); setPosting(false);
      return;
    }

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

    const { data: myProfile } = await supabase.from("profiles").select("handle, display_name").eq("id", currentUser.id).single();
    const currentHandle = myProfile?.handle ?? currentUser.username.toLowerCase();
    const currentDisplayName = myProfile?.display_name || currentUser.display_name || currentUser.username;

    await supabase.from("posts").insert({
      user_id: currentUser.id, username: currentUser.username,
      display_name: currentDisplayName, handle: currentHandle,
      pfp_url: currentUser.pfp_url, content: postText.trim(), image_url,
      likes: 0, liked_by: [], bookmarked_by: [], reposted_by: [], comments: [],
      edited: false, views: 0,
      verified: verifiedUsers.has(currentUser.username.toLowerCase()),
      helper: helperUsers.has(currentUser.username.toLowerCase()),
      supporter: supporterUsers.has(currentUser.username.toLowerCase()),
      cool_kids: coolKidsUsers.has(currentUser.username.toLowerCase()),
    });

    await sendMentionNotifications(postText.trim(), currentUser.username, null, postText.trim());
    setPostText(""); setPostImageFile(null); setPostImagePreview(null);
    await loadPostsInner();
    setPosting(false);
  }

  async function sendMentionNotifications(text: string, fromUsername: string, postId: string | null, postContent: string) {
    const mentionRegex = /@([a-zA-Z0-9]{1,16})/g;
    const mentioned = new Set<string>();
    let m;
    while ((m = mentionRegex.exec(text)) !== null) {
      const u = m[1].toLowerCase();
      if (u !== fromUsername.toLowerCase()) mentioned.add(u);
    }
    if (mentioned.size === 0) return;
    const { data: profiles } = await supabase.from("profiles").select("id, username").in("username", [...mentioned]);
    if (!profiles) return;
    for (const profile of profiles) {
      await supabase.from("notifications").insert({
        user_id: profile.id, type: "mention", from_username: fromUsername,
        post_id: postId, post_content: postContent, message_content: text,
        read: false, created_at: new Date().toISOString(),
      });
    }
  }

  async function handleLike(postId: string) {
    if (!currentUser) return;
    const post = posts.find((p) => p.id === postId);
    if (!post) return;
    const liked = post.liked_by?.includes(currentUser.id);
    const newLikedBy = liked ? post.liked_by.filter((id) => id !== currentUser.id) : [...(post.liked_by ?? []), currentUser.id];
    const newLikes = liked ? post.likes - 1 : post.likes + 1;
    setPosts((prev) => prev.map((p) => p.id === postId ? { ...p, likes: newLikes, liked_by: newLikedBy } : p));
    if (!shadowbannedUsers.has(currentUser.username.toLowerCase())) {
      await supabase.from("posts").update({ likes: newLikes, liked_by: newLikedBy }).eq("id", postId);
      if (!liked && post.user_id !== currentUser.id) {
        await supabase.from("notifications").insert({
          user_id: post.user_id, type: "like", from_username: currentUser.username,
          post_id: postId, post_content: post.content, read: false, created_at: new Date().toISOString(),
        });
      }
    }
  }

  async function handleBookmark(postId: string) {
    if (!currentUser) return;
    const post = posts.find((p) => p.id === postId);
    if (!post) return;
    const bookmarked = post.bookmarked_by?.includes(currentUser.id);
    const newBookmarkedBy = bookmarked ? post.bookmarked_by.filter((id) => id !== currentUser.id) : [...(post.bookmarked_by ?? []), currentUser.id];
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

  async function handleRepost(postId: string) {
    if (!currentUser) return;
    const post = posts.find((p) => p.id === postId);
    if (!post) return;
    const reposted = (post.reposted_by ?? []).includes(currentUser.id);
    const newRepostedBy = reposted ? post.reposted_by.filter((id) => id !== currentUser.id) : [...(post.reposted_by ?? []), currentUser.id];
    setPosts((prev) => prev.map((p) => p.id === postId ? { ...p, reposted_by: newRepostedBy } : p));
    await supabase.from("posts").update({ reposted_by: newRepostedBy }).eq("id", postId);
  }

  async function handleReport(postId: string) {
    setReportToast(true);
    setTimeout(() => setReportToast(false), 3000);
    const postUrl = `${window.location.origin}/posts/${postId}`;
    try { await navigator.clipboard.writeText(postUrl); } catch {}
    try {
      await fetch("/api/report", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ postId, postUrl, reportedBy: currentUser?.username ?? "anonymous" }) });
    } catch {}
  }

  async function handleAdminDelete(postId: string) {
    setPosts((prev) => prev.filter((p) => p.id !== postId));
    const { error } = await supabase.from("posts").delete().eq("id", postId);
    if (error) { console.error("Admin delete failed:", error.message); await loadPostsInner(); }
  }

  async function handleAdminShadowban(username: string) {
    await supabase.from("profiles").update({ shadowbanned: true }).eq("username", username);
    setShadowbannedUsers((prev) => new Set([...prev, username.toLowerCase()]));
  }

  function handleEditProfileSave(newUsername: string, newPfpUrl: string | null, newHandle: string, newDisplayName: string) {
    setCurrentUser((prev) => prev ? { ...prev, username: newUsername, display_name: newDisplayName, pfp_url: newPfpUrl } : prev);
    setPosts((prev) => prev.map((p) => {
      if (p.user_id === currentUser?.id) return { ...p, username: newUsername, display_name: newDisplayName, pfp_url: newPfpUrl, handle: newHandle };
      return p;
    }));
    if (currentUser) {
      const updated = linkedAccounts.map((a) => a.id === currentUser.id ? { ...a, username: newUsername, pfp_url: newPfpUrl } : a);
      saveLinkedAccounts(updated);
    }
    setShowEditProfile(false);
    loadPostsInner();
  }

  async function markNotificationsRead() {
    if (!currentUser) return;
    setUnreadNotifCount(0);
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    await supabase.from("notifications").update({ read: true }).eq("user_id", currentUser.id);
  }

  // ── IMPROVED ALGORITHM ─────────────────────────────────────────────────────
  // Goals: relevance, freshness, author diversity, discovery, anti-spam

  function scorePost(post: Post, now: number): number {
    const ageMs = now - new Date(post.created_at).getTime();
    const ageHours = ageMs / (1000 * 60 * 60);

    const likes = post.likes ?? 0;
    const comments = (post.comments ?? []).length;
    const reposts = (post.reposted_by ?? []).length;
    const views = Math.max(post.views ?? 1, 1);

    // Engagement rate — weighted interactions per view
    const weightedInteractions = likes * 1.0 + comments * 2.5 + reposts * 4.0;
    const engagementRate = weightedInteractions / views;

    // Volume log score
    const volumeScore = Math.log1p(likes + comments * 2 + reposts * 3);

    // Count nested replies for depth bonus
    function countAllReplies(list: Comment[]): number {
      let n = 0;
      for (const c of list) n += 1 + countAllReplies((c.replies ?? []) as Comment[]);
      return n;
    }
    const totalReplies = countAllReplies(post.comments ?? []);
    const depthBonus = Math.log1p(totalReplies) * 0.5;

    // Velocity: interactions per hour in first 8 hours (extended window)
    let velocityMultiplier = 1.0;
    if (ageHours < 8 && ageHours > 0) {
      const interactionsPerHour = weightedInteractions / ageHours;
      velocityMultiplier = 1.0 + Math.min(interactionsPerHour / 30, 2.0);
    }

    // Recency freshness bump (fades smoothly over 2h)
    const freshnessBump = ageHours < 2 ? Math.pow(1 - ageHours / 2, 1.5) * 0.4 : 0;

    // Quality signals
    const imageBonus  = post.image_url ? 0.18 : 0;
    const verifiedBonus = post.verified ? 0.12 : 0;

    // Content length bonus (longer = more effort, slight boost)
    const contentLen = (post.content ?? "").length;
    const lengthBonus = contentLen > 80 ? 0.08 : contentLen > 40 ? 0.04 : 0;

    // Exponential decay — 16-hour half-life (faster churn than before)
    const HALF_LIFE_HOURS = 16;
    const decayFactor = Math.pow(0.5, ageHours / HALF_LIFE_HOURS);

    // Combine
    const rawScore =
      (engagementRate * 55 + volumeScore * 22 + depthBonus + imageBonus + verifiedBonus + lengthBonus + freshnessBump)
      * velocityMultiplier
      * decayFactor;

    return rawScore;
  }

  const sortedPostsRef = useRef<Post[]>([]);
  const lastBatchRef = useRef<number>(0);

  function getSortedPosts(postList: Post[], batchEnd: number): Post[] {
    // On subsequent renders without new batch needed, update in-place
    if (batchEnd <= lastBatchRef.current && sortedPostsRef.current.length > 0) {
      const existingIds = new Set(sortedPostsRef.current.map((p) => p.id));
      const currentIds = new Set(postList.map((p) => p.id));
      let merged = sortedPostsRef.current.filter((p) => currentIds.has(p.id));
      merged = merged.map((p) => postList.find((np) => np.id === p.id) ?? p);
      const newPosts = postList.filter((p) => !existingIds.has(p.id));
      merged = [...newPosts, ...merged];
      sortedPostsRef.current = merged;
      return merged;
    }

    lastBatchRef.current = batchEnd;
    const now = Date.now();
    const THREE_HOURS_MS = 3 * 60 * 60 * 1000;

    // Buckets
    const fresh: Post[] = [];       // <3h old — always shown near top
    const hot: Post[] = [];         // ranked by algorithm
    const warm: Post[] = [];        // moderate engagement, older
    const discovery: Post[] = [];   // low/no engagement — surface hidden gems

    for (const post of postList) {
      const ageMs = now - new Date(post.created_at).getTime();
      const totalInteractions = (post.likes ?? 0) + (post.comments?.length ?? 0) + (post.reposted_by?.length ?? 0);

      if (ageMs < THREE_HOURS_MS) {
        fresh.push(post);
      } else if (totalInteractions >= 5) {
        hot.push(post);
      } else if (totalInteractions >= 1) {
        warm.push(post);
      } else {
        discovery.push(post);
      }
    }

    fresh.sort((a, b) => scorePost(b, now) - scorePost(a, now));
    hot.sort((a, b) => scorePost(b, now) - scorePost(a, now));
    warm.sort((a, b) => scorePost(b, now) - scorePost(a, now));
    // Shuffle discovery with slight recency tilt
    discovery.sort((a, b) => {
      const recencyA = new Date(a.created_at).getTime();
      const recencyB = new Date(b.created_at).getTime();
      return (Math.random() * 0.6 + 0.2) * (recencyB - recencyA);
    });

    // Author diversity: no author appears 3x in a row
    function applyAuthorDiversity(list: Post[]): Post[] {
      const result: Post[] = [];
      const recentAuthors: string[] = [];
      const pending = [...list];
      const deferred: Post[] = [];

      while (pending.length > 0 || deferred.length > 0) {
        let placed = false;
        const source = [...pending, ...deferred];
        for (let i = 0; i < source.length; i++) {
          const post = source[i];
          const lastTwo = recentAuthors.slice(-2);
          if (lastTwo.length < 2 || !lastTwo.every((a) => a === post.user_id)) {
            result.push(post);
            recentAuthors.push(post.user_id);
            const pi = pending.indexOf(post);
            if (pi !== -1) pending.splice(pi, 1);
            else deferred.splice(deferred.indexOf(post), 1);
            placed = true;
            break;
          }
        }
        if (!placed) {
          const forced = pending.shift() ?? deferred.shift()!;
          result.push(forced);
          recentAuthors.push(forced.user_id);
        }
      }
      return result;
    }

    const diverseHot = applyAuthorDiversity(hot);
    const diverseWarm = applyAuthorDiversity(warm);

    // Interleave: fresh → hot (with warm & discovery sprinkled in)
    const result: Post[] = [...fresh];
    const HOT_PER_WARM = 6;     // insert 1 warm every 6 hot posts
    const DISCOVERY_INTERVAL = 9; // insert 1 discovery every 9 posts total

    let warmIdx = 0;
    let discoveryIdx = 0;

    for (let i = 0; i < diverseHot.length; i++) {
      result.push(diverseHot[i]);

      // Warm insertion
      if ((i + 1) % HOT_PER_WARM === 0 && warmIdx < diverseWarm.length) {
        result.push(diverseWarm[warmIdx++]);
      }

      // Discovery insertion (based on total result length)
      if (result.length % DISCOVERY_INTERVAL === 0 && discoveryIdx < discovery.length) {
        result.push(discovery[discoveryIdx++]);
      }
    }

    // Append remaining warm
    while (warmIdx < diverseWarm.length) result.push(diverseWarm[warmIdx++]);
    // Append remaining discovery
    while (discoveryIdx < discovery.length) result.push(discovery[discoveryIdx++]);

    sortedPostsRef.current = result;
    return result;
  }

  // ── Filtered & sorted posts ─────────────────────────────────────────────────

  const allVisiblePosts = view === "bookmarks" && currentUser
    ? posts.filter((p) => p.bookmarked_by?.includes(currentUser.id))
    : getSortedPosts(
        posts.filter((p) => {
          const isBanned = shadowbannedUsers.has(p.username.toLowerCase());
          if (!isBanned) return true;
          if (currentUser?.username.toLowerCase() === ADMIN_USER) return true;
          if (currentUser?.username.toLowerCase() === p.username.toLowerCase()) return true;
          return false;
        }),
        visibleCount
      );

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

          {authMode === "signup" ? (
            <>
              <input value={username}
                onChange={(e) => setUsername(e.target.value.slice(0, 32))}
                placeholder="Display Name (shown on posts)" maxLength={32}
                style={{ background: "#2c2e31", border: "1px solid #3a3d42", borderRadius: 8, padding: "12px 16px", color: "#fff", fontSize: 15, fontFamily: "inherit", outline: "none", width: "100%", boxSizing: "border-box" }} />
              <input value={signupHandle}
                onChange={(e) => setSignupHandle(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "").slice(0, 16))}
                placeholder="Handle (e.g. kiirod)" maxLength={16}
                style={{ background: "#2c2e31", border: "1px solid #3a3d42", borderRadius: 8, padding: "12px 16px", color: "#fff", fontSize: 15, fontFamily: "inherit", outline: "none", width: "100%", boxSizing: "border-box" }} />
              <input type="email" value={signupEmail}
                onChange={(e) => setSignupEmail(e.target.value)}
                placeholder="Email address"
                style={{ background: "#2c2e31", border: "1px solid #3a3d42", borderRadius: 8, padding: "12px 16px", color: "#fff", fontSize: 15, fontFamily: "inherit", outline: "none", width: "100%", boxSizing: "border-box" }} />
            </>
          ) : (
            <input value={loginIdentifier}
              onChange={(e) => setLoginIdentifier(e.target.value)}
              placeholder="Email or handle"
              style={{ background: "#2c2e31", border: "1px solid #3a3d42", borderRadius: 8, padding: "12px 16px", color: "#fff", fontSize: 15, fontFamily: "inherit", outline: "none", width: "100%", boxSizing: "border-box" }} />
          )}

          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && (authMode === "login" ? handleLogin() : handleSignup())}
            placeholder="Password"
            style={{ background: "#2c2e31", border: "1px solid #3a3d42", borderRadius: 8, padding: "12px 16px", color: "#fff", fontSize: 15, fontFamily: "inherit", outline: "none", width: "100%", boxSizing: "border-box" }} />

          {authMode === "signup" && (
            <>
              <input ref={pfpInputRef} type="file" accept=".jpeg,.jpg,.png,.gif,.avif,.webp" style={{ display: "none" }} onChange={(e) => { const f = e.target.files?.[0]; if (!f) return; setPfpFile(f); setPfpPreview(URL.createObjectURL(f)); }} />
              <button onClick={() => pfpInputRef.current?.click()}
                style={{ background: "#2c2e31", border: "1px solid #3a3d42", borderRadius: 8, padding: "12px 16px", color: "#d1d0c5", fontSize: 15, fontFamily: "inherit", cursor: "pointer", textAlign: "left", display: "flex", alignItems: "center", gap: 10 }}>
                {pfpPreview ? (
                  <><img src={pfpPreview} alt="pfp" style={{ width: 28, height: 28, borderRadius: "50%", objectFit: "cover" }} /><span style={{ color: "#e2b714" }}>Profile picture selected</span></>
                ) : (
                  <><span style={{ color: "#646669" }}>📷</span><span>Upload Profile Picture (optional)</span></>
                )}
              </button>
            </>
          )}

          {signupError && <div style={{ color: "#ca4754", fontSize: 13 }}>{signupError}</div>}

          <button onClick={authMode === "login" ? handleLogin : handleSignup}
            style={{ background: "#e2b714", border: "none", borderRadius: 8, padding: "13px 16px", color: "#323437", fontSize: 15, fontWeight: 700, fontFamily: "inherit", cursor: "pointer", marginTop: 4 }}>
            {authMode === "login" ? "Log in!" : "Sign up!"}
          </button>
        </div>
      </main>
    );
  }

  // ── Loading / skeleton screen ──────────────────────────────────────────────

  if (step === "loading") {
    return (
      <main style={{ minHeight: "100vh", display: "flex", flexDirection: "column", background: "#323437", fontFamily: "var(--font-roboto-mono), monospace" }}>
        <style>{`
          @keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
        `}</style>
        {/* Skeleton header */}
        <div style={{ width: "100%", padding: "16px 32px", borderBottom: "1px solid #3a3d42", display: "flex", alignItems: "center", gap: 16 }}>
          <span style={{ fontSize: 22, fontWeight: 700, color: "#e2b714" }}>monkeypost</span>
          <div style={{ marginLeft: "auto" }}>
            <SkeletonBlock width={120} height={34} borderRadius={8} />
          </div>
        </div>
        <div style={{ display: "flex", maxWidth: 1100, margin: "0 auto", width: "100%", padding: "0 16px" }}>
          {/* Skeleton sidebar */}
          <aside style={{ width: 220, flexShrink: 0, padding: "32px 0", display: "flex", flexDirection: "column", gap: 12 }}>
            {[1,2,3,4,5].map(i => <SkeletonBlock key={i} width="80%" height={36} borderRadius={8} />)}
            <div style={{ marginTop: "auto", paddingTop: 24 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px" }}>
                <SkeletonBlock width={36} height={36} borderRadius={18} style={{ flexShrink: 0 }} />
                <SkeletonBlock width={100} height={14} />
              </div>
            </div>
          </aside>
          {/* Skeleton feed */}
          <div style={{ flex: 1, padding: "24px 24px 24px 32px", maxWidth: 680 }}>
            <SkeletonBlock width="100%" height={110} borderRadius={12} style={{ marginBottom: 20 }} />
            <SkeletonFeed />
          </div>
        </div>
      </main>
    );
  }

  // ── App ────────────────────────────────────────────────────────────────────

  return (
    <main style={{ minHeight: "100vh", background: "#323437", fontFamily: "var(--font-roboto-mono), monospace", display: "flex", flexDirection: "column" }}>
      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes toastIn { from { opacity: 0; transform: translateY(-12px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes menuIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
        @keyframes notifFlash { 0% { border-color: #3a3d42; } 30% { border-color: #e2b714; box-shadow: 0 0 8px #e2b71440; } 70% { border-color: #e2b714; box-shadow: 0 0 8px #e2b71440; } 100% { border-color: #3a3d42; } }
        .notif-new { animation: notifFlash 1s ease forwards; }
      `}</style>

      {/* Force email modal */}
      {showForceEmail && currentUser && (
        <ForceEmailModal currentUser={currentUser} onDone={() => setShowForceEmail(false)} />
      )}

      {showEditProfile && currentUser && (
        <EditProfileModal currentUser={currentUser} onClose={() => setShowEditProfile(false)} onSave={handleEditProfileSave} />
      )}
      {showAccountsModal && currentUser && (
        <AccountsModal
          currentUser={currentUser} linkedAccounts={linkedAccounts}
          onClose={() => setShowAccountsModal(false)} onSwitch={switchToAccount}
          onAdd={(account, password) => {
            saveLinkedAccounts([...linkedAccounts, account]);
            const saved = JSON.parse(localStorage.getItem("mp_account_passwords") ?? "{}");
            saved[account.id] = password;
            localStorage.setItem("mp_account_passwords", JSON.stringify(saved));
          }}
          onRemove={(id) => {
            saveLinkedAccounts(linkedAccounts.filter((a) => a.id !== id));
            const saved = JSON.parse(localStorage.getItem("mp_account_passwords") ?? "{}");
            delete saved[id];
            localStorage.setItem("mp_account_passwords", JSON.stringify(saved));
          }} />
      )}
      {showDeleteAccount && currentUser && (
        <DeleteAccountModal currentUser={currentUser} onClose={() => setShowDeleteAccount(false)}
          onDeleted={() => { setCurrentUser(null); setPosts([]); setPostsLoaded(false); setNotifications([]); setUnreadNotifCount(0); setStep("signup"); }} />
      )}

      {reportToast && (
        <div style={{ position: "fixed", top: 20, left: 20, zIndex: 999, background: "#2c2e31", border: "1px solid #ca4754", borderRadius: 10, padding: "12px 20px", color: "#d1d0c5", fontSize: 14, fontWeight: 600, animation: "toastIn 0.25s ease", display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ color: "#ca4754" }}>⚑</span> Post reported. Link copied.
        </div>
      )}

      {/* Header */}
      <div style={{ width: "100%", padding: "16px 32px", borderBottom: "1px solid #3a3d42", display: "flex", alignItems: "center", gap: 16, position: "sticky", top: 0, background: "#323437", zIndex: 10 }}>
        <span style={{ fontSize: 22, fontWeight: 700, color: "#e2b714", letterSpacing: "-0.5px" }}>monkeypost</span>
        <a href="/search"
          style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 8, background: "#2c2e31", border: "1px solid #3a3d42", borderRadius: 8, padding: "7px 14px", color: "#646669", fontSize: 13, fontFamily: "inherit", textDecoration: "none", cursor: "pointer", transition: "border-color 0.15s" }}
          onMouseEnter={(e) => (e.currentTarget.style.borderColor = "#646669")}
          onMouseLeave={(e) => (e.currentTarget.style.borderColor = "#3a3d42")}>
          <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" width={15} height={15}>
            <path d="M11 19C15.4183 19 19 15.4183 19 11C19 6.58172 15.4183 3 11 3C6.58172 3 3 6.58172 3 11C3 15.4183 6.58172 19 11 19Z" stroke="#646669" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M21 21L16.65 16.65" stroke="#646669" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Search tags
        </a>
      </div>

      <div style={{ display: "flex", flex: 1, maxWidth: 1100, margin: "0 auto", width: "100%", padding: "0 16px" }}>
        {/* Sidebar */}
        <aside style={{ width: 220, flexShrink: 0, padding: "32px 0", display: "flex", flexDirection: "column", justifyContent: "flex-end", position: "sticky", top: 64, height: "calc(100vh - 64px)", paddingBottom: 32 }}>
          <nav style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 24 }}>
            {[
              { label: "Posts", icon: <PostsIcon />, action: () => { setView("posts"); window.history.pushState(null, "", "/"); } },
              {
                label: "Notifications",
                icon: (
                  <div style={{ position: "relative", display: "inline-flex" }}>
                    <NotificationIcon />
                    {unreadNotifCount > 0 && (
                      <span style={{ position: "absolute", top: -3, left: -3, background: "#e2b714", borderRadius: "50%", width: 10, height: 10, border: "2px solid #323437" }} />
                    )}
                  </div>
                ),
                action: () => { setView("notifications"); markNotificationsRead(); window.history.pushState(null, "", "/notif"); }
              },
              { label: "Developers", icon: <DevIcon />, action: () => window.location.href = "/dev" },
              { label: "GitHub", icon: <SupportIcon />, action: () => window.location.href = "/gh" },
              { label: "Bookmarks", icon: <BookmarkIcon filled />, action: () => { setView("bookmarks"); window.history.pushState(null, "", "/bookmarks"); } },
            ].map(({ label, icon, action }) => {
              const isActive = (label === "Posts" && view === "posts") || (label === "Bookmarks" && view === "bookmarks") || (label === "Notifications" && view === "notifications");
              return (
                <button key={label} onClick={action}
                  style={{
                    display: "flex", alignItems: "center", gap: 12,
                    background: isActive ? "#2c2e31" : "none",
                    border: "none", cursor: isActive ? "default" : "pointer",
                    color: isActive ? "#646669" : "#d1d0c5",
                    fontSize: 14, fontFamily: "inherit", padding: "10px 12px", borderRadius: 8,
                    textAlign: "left", transition: "background 0.15s, color 0.15s", width: "100%",
                  }}
                  onMouseEnter={(e) => { if (!isActive) (e.currentTarget as HTMLButtonElement).style.background = "#2c2e31"; }}
                  onMouseLeave={(e) => { if (!isActive) (e.currentTarget as HTMLButtonElement).style.background = "none"; }}>
                  {icon}<span>{label}</span>
                </button>
              );
            })}
          </nav>

          {/* Click-to-toggle user menu */}
          {currentUser && (
            <UserMenu
              currentUser={currentUser}
              linkedAccounts={linkedAccounts}
              onEditProfile={() => setShowEditProfile(true)}
              onAccounts={() => setShowAccountsModal(true)}
              onLogout={handleLogout}
              onDeleteAccount={() => setShowDeleteAccount(true)}
            />
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
                    style={{ background: "none", border: "none", cursor: "pointer", padding: 6, borderRadius: 6, color: "#646669" }} title="Attach image">
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
                  {posting ? "Posting..." : "Post!"}
                </button>
              </div>
            </div>
          )}

          {view === "posts" && (
            <div style={{ marginBottom: 16 }}>
              <button onClick={handleRefresh} disabled={refreshing}
                style={{
                  display: "flex", alignItems: "center", gap: 8, background: "#2c2e31", border: "1px solid #3a3d42",
                  borderRadius: 8, padding: "8px 16px", color: refreshing ? "#646669" : "#d1d0c5",
                  fontSize: 13, fontFamily: "inherit", cursor: refreshing ? "not-allowed" : "pointer", transition: "border-color 0.15s",
                }}
                onMouseEnter={(e) => { if (!refreshing) (e.currentTarget as HTMLButtonElement).style.borderColor = "#646669"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = "#3a3d42"; }}>
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
                <div style={{ color: "#646669", textAlign: "center", marginTop: 60, fontSize: 15 }}>No notifications yet.</div>
              )}
              {notifications.filter((n) => Date.now() - new Date(n.created_at).getTime() < 7 * 24 * 60 * 60 * 1000).map((notif) => (
                <div key={notif.id} className={!notif.read ? "notif-new" : ""}
                  style={{ background: "#2c2e31", borderRadius: 12, padding: "14px 18px", marginBottom: 10, border: `1px solid ${notif.read ? "#3a3d42" : "#e2b714"}`, opacity: notif.read ? 0.7 : 1 }}>
                  <div style={{ color: "#e2b714", fontSize: 13, fontWeight: 700, marginBottom: 4 }}>
                    @{notif.from_username}{" "}
                    <span style={{ color: "#d1d0c5", fontWeight: 400 }}>
                      {notif.type === "like" ? "liked your post!" : notif.type === "mention" ? "mentioned you!" : "replied to your post!"}
                    </span>
                  </div>
                  {notif.post_content && (
                    <div style={{ color: "#646669", fontSize: 12, marginTop: 2 }}>
                      &quot;{notif.post_content.slice(0, 80)}{notif.post_content.length > 80 ? "…" : ""}&quot;
                    </div>
                  )}
                  {notif.message_content && (
                    <div style={{ color: "#d1d0c5", fontSize: 12, marginTop: 4, background: "#3a3d42", borderRadius: 6, padding: "6px 10px" }}>
                      {notif.message_content}
                    </div>
                  )}
                  <div style={{ color: "#646669", fontSize: 11, marginTop: 6 }}>{new Date(notif.created_at).toLocaleDateString()}</div>
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

              {/* Skeleton while loading */}
              {!postsLoaded && view === "posts" && <SkeletonFeed />}

              {postsLoaded && visiblePosts.length === 0 && (
                <div style={{ color: "#646669", textAlign: "center", marginTop: 60, fontSize: 15 }}>
                  {view === "bookmarks" ? "No bookmarks yet." : "No posts yet. Be the first!"}
                </div>
              )}
              {postsLoaded && visiblePosts.map((post, index) => (
                <div key={post.id} ref={(el) => { postRefs.current[index] = el; }}>
                  <PostCard
                    post={post} currentUser={currentUser}
                    onLike={handleLike} onBookmark={handleBookmark}
                    onDelete={handleDelete} onEdit={handleEdit} onRepost={handleRepost}
                    blockedUsers={blockedUsers} verifiedUsers={verifiedUsers}
                    helperUsers={helperUsers} supporterUsers={supporterUsers}
                    coolKidsUsers={coolKidsUsers} onReport={handleReport}
                    isAdmin={currentUser?.username.toLowerCase() === ADMIN_USER}
                    isShadowbanned={shadowbannedUsers.has(post.username.toLowerCase())}
                    onAdminDelete={handleAdminDelete} onAdminShadowban={handleAdminShadowban} />
                </div>
              ))}
              {visibleCount < allVisiblePosts.length && (
                <div style={{ color: "#646669", textAlign: "center", padding: "20px 0", fontSize: 13 }}>Loading more posts...</div>
              )}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

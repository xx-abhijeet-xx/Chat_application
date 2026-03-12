import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export const cn = (...i: ClassValue[]) => twMerge(clsx(i));

export const COLORS = ["blue","purple","pink","green","orange","teal"] as const;
export const randomColor = () => COLORS[Math.floor(Math.random() * COLORS.length)];

export const avatarGrad: Record<string,string> = {
  blue:   "from-[#63b3ff] to-[#3b82f6]",
  purple: "from-[#a78bfa] to-[#7c3aed]",
  pink:   "from-[#f472b6] to-[#ec4899]",
  green:  "from-[#4ade80] to-[#059669]",
  orange: "from-[#fb923c] to-[#f97316]",
  teal:   "from-[#2dd4bf] to-[#0891b2]",
};

export const initials = (name: string) =>
  name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0,2);

export const formatTime = (d: string | Date) =>
  new Date(d).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });

export const formatDate = (d: string | Date) => {
  const date  = new Date(d);
  const today = new Date();
  const yest  = new Date(); yest.setDate(yest.getDate() - 1);
  if (date.toDateString() === today.toDateString()) return "Today";
  if (date.toDateString() === yest.toDateString())  return "Yesterday";
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
};

export const formatSize = (bytes: number) => {
  if (bytes < 1024)       return `${bytes} B`;
  if (bytes < 1024*1024)  return `${(bytes/1024).toFixed(1)} KB`;
  return `${(bytes/(1024*1024)).toFixed(1)} MB`;
};

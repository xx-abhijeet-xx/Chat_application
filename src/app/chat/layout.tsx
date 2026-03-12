import type { Metadata } from "next";
export const metadata: Metadata = { title: "NexChat" };
export default function ChatLayout({ children }: { children: React.ReactNode }) {
  return <div className="h-full">{children}</div>;
}

import type { Metadata } from "next";
import "./globals.css";
import { NavBar } from "@/components/nav-bar";

export const metadata: Metadata = {
  title: "Open Mic AI",
  description: "Take the mic, get an AI-written caption, and see if it kills or bombs.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-neutral-950 text-neutral-100">
        <NavBar />
        {children}
      </body>
    </html>
  );
}

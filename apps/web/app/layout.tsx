import type { Metadata } from "next";
import { Suspense } from "react";
import { Outfit, Source_Serif_4, DM_Mono } from "next/font/google";
import { Sidebar } from "@/components/Sidebar";
import "./globals.css";

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

const sourceSerif = Source_Serif_4({
  variable: "--font-source-serif",
  subsets: ["latin"],
  weight: ["200", "400", "500", "600"],
});

const dmMono = DM_Mono({
  variable: "--font-dm-mono",
  subsets: ["latin"],
  weight: ["300", "400", "500"],
});

export const metadata: Metadata = {
  title: "Bluebex Teams",
  robots: { index: false, follow: false },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${outfit.variable} ${sourceSerif.variable} ${dmMono.variable} h-full antialiased`}
    >
      <body className="bb-app bb-admin min-h-full">
        <div className="bb-shell">
          <Suspense>
            <Sidebar />
          </Suspense>
          <div className="bb-shell-main">{children}</div>
        </div>
      </body>
    </html>
  );
}

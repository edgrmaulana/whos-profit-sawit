import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SAWIT-HAZE.MONEY · Who's Profiting From the Sawit Haze?",

  description: "Who's profiting from the current sawit haze, and the track record of it. Fire points, concessions and owners mapped.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Hanken+Grotesk:wght@300;400;500;600&family=IBM+Plex+Mono:wght@400;500&display=swap"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}

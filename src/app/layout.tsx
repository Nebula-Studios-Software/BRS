import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "BRS - Blender Render Suite",
  description: "A modern interface for rendering Blender files",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="font-sans">{children}</body>
    </html>
  );
}

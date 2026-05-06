import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "NutriSport Pro",
  description: "A personal nutritionist dashboard for clients and plans.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

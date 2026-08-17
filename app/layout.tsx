import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Burgershot Mirrorpark – Kassensystem",
  description: "Internes POS-/Kassensystem für Burgershot Mirrorpark",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-coal-950 text-ink">{children}</body>
    </html>
  );
}
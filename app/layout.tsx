import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "InstrumentVision",
  description: "Recognize instruments from images or audio and play them in the browser."
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

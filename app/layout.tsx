import type { Metadata } from "next";
import "./globals.css";
import { Navbar } from "./components/Navbar";



export const metadata: Metadata = {
  title: "3D Builder", // need a better name
  description: "Web application for creating buildings", // need a better description
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-950 text-slate">
        <Navbar />
        {children}
      </body>
    </html>
  );
}

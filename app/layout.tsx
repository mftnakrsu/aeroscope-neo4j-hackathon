import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AeroScope — Aerospace Requirements Traceability on Neo4j Aura",
  description:
    "AeroScope is a Neo4j Aura Agent for aerospace requirements traceability, impact analysis, and compliance reasoning across 30 modules spanning four fictional UAV platforms (Stratos-7, AeroLynx-X2, Skyrunner-T1, Nimbus-C3).",
  metadataBase: new URL("https://aeroscope-neo4j-hackathon.vercel.app"),
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" data-theme="dark">
      <body>{children}</body>
    </html>
  );
}

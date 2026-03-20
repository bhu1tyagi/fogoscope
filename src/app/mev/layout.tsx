import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "MEV Transparency | FogoScope",
  description: "Real-time MEV detection and transparency for the Fogo blockchain",
  openGraph: {
    title: "Fogo MEV Transparency Report",
    description: "Fogo's fair ordering keeps your trades protected from MEV",
    images: [{ url: "/api/og/mev", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Fogo MEV Transparency",
    images: ["/api/og/mev"],
  },
};

export default function MEVLayout({ children }: { children: React.ReactNode }) {
  return children;
}

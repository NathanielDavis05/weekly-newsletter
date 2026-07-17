import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://cfa-west-bryan-weekly.sites.openai.com"),
  title: {
    default: "CFA West Bryan | Weekly team newsletter",
    template: "%s | CFA West Bryan",
  },
  description:
    "A mobile-first weekly team briefing for CFA West Bryan: priorities, recognition, events, and results.",
  openGraph: {
    type: "website",
    title: "CFA West Bryan | This week, at a glance",
    description:
      "The July 10 team update: action required, recognition, local events, and June results.",
    images: [
      {
        url: "/og.png",
        width: 1760,
        height: 917,
        alt: "CFA West Bryan — This week, at a glance",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "CFA West Bryan | This week, at a glance",
    description: "The July 10 team update.",
    images: ["/og.png"],
  },
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

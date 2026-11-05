import type { Metadata } from "next";
import { notFound } from "next/navigation";

export const metadata: Metadata = {
  robots: { index: false, follow: true },
};

export default function LandingLayout() {
  // Campaigns are paused. Restore the children passthrough to enable them.
  notFound();
}

import type { Metadata } from "next";
import { PublicFeaturePage } from "@/components/public/PublicFeaturePage";

export const metadata: Metadata = {
  title: "Screens | Nobstacle",
  description: "Screen control and public display management.",
};

export default function ScreensPage() {
  return (
    <PublicFeaturePage
      title="Screens"
      description="Coordinate what appears on each screen, keep layouts synchronized, and manage live content across your entire venue from one place."
      imageLabel={"2048 px to\n2048 px\nimage"}
      features={[
        "Track and organize screen-specific content by station",
        "Keep playback and templates aligned across locations",
        "Built for reliable public display workflows",
      ]}
    />
  );
}

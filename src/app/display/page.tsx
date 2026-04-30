import type { Metadata } from "next";
import { PublicFeaturePage } from "@/components/public/PublicFeaturePage";

export const metadata: Metadata = {
  title: "Display | Nobstacle",
  description: "Display templates and digital signage experiences.",
};

export default function DisplayPage() {
  return (
    <PublicFeaturePage
      title="Display"
      description="Create and manage visually rich content for screens, signage, and in-lobby displays with a simple workflow that keeps your team moving quickly."
      imageLabel={"2048 px to\n2048 px\nimage"}
      features={[
        "Drag-and-drop display templates for promotions and announcements",
        "Language-aware content handling for regional deployments",
        "Fast preview and publish flow for public-facing screens",
      ]}
    />
  );
}

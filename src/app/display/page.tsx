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
      description="Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua."
      imageSrc="/Display.png"
      imageAlt="Display page preview"
      features={[
        "Lorem ipsum dolor sit amet, consectetur adipiscing elit",
        "Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua",
        "Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris",
      ]}
    />
  );
}

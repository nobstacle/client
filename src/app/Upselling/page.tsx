import type { Metadata } from "next";
import { PublicFeaturePage } from "@/components/public/PublicFeaturePage";

export const metadata: Metadata = {
  title: "Upselling | Nobstacle",
  description: "Upsell packages and revenue-driving offers.",
};

export default function UpsellingPage() {
  return (
    <PublicFeaturePage
      title="Upselling"
      description="Show targeted upgrades, add-ons, and package offers that help your team increase order value without interrupting the guest experience."
      imageLabel={"2048 px to\n2048 px\nimage"}
      features={[
        "Promote room upgrades, add-ons, and premium packages",
        "Custom offer cards that fit seamlessly into your workflow",
        "Fast publishing for seasonal campaigns and live promotions",
      ]}
    />
  );
}

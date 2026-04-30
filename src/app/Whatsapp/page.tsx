import type { Metadata } from "next";
import { PublicFeaturePage } from "@/components/public/PublicFeaturePage";

export const metadata: Metadata = {
  title: "WhatsApp | Nobstacle",
  description: "WhatsApp messaging workflows and templates.",
};

export default function WhatsappPage() {
  return (
    <PublicFeaturePage
      title="WhatsApp"
      description="Send fast, personalized WhatsApp messages to guests and teams with reusable templates and a clean, consistent messaging experience."
      imageLabel={"2048 px to\n2048 px\nimage"}
      features={[
        "Template-driven WhatsApp messaging",
        "Quick access to guest and team communication flows",
        "Designed for live operations and repeatable outreach",
      ]}
    />
  );
}

import type { Metadata } from "next";
import { PublicFeaturePage } from "@/components/public/PublicFeaturePage";

export const metadata: Metadata = {
  title: "Registration | Nobstacle",
  description: "Registration and onboarding pages for new users.",
};

export default function RegisterationPage() {
  return (
    <PublicFeaturePage
      title="Registration"
      description="Lorem ipsum dolor sit amet, consectetur adipiscing elit. Integer nec odio. Praesent libero. Sed cursus ante dapibus diam."
      imageSrc="/Registeration.png"
      imageAlt="Registration page preview"
      features={[
        "Lorem ipsum dolor sit amet, consectetur adipiscing elit",
        "Integer nec odio. Praesent libero. Sed cursus ante dapibus diam",
        "Sed nisi. Nulla quis sem at nibh elementum imperdiet",
      ]}
    />
  );
}

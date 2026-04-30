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
      description="Let new users sign up, capture key details, and get started with the right permissions and station settings from the very first screen."
      imageLabel={"2048 px to\n2048 px\nimage"}
      features={[
        "Simple sign-up flow for guests, staff, and operators",
        "Responsive form layout for laptop, tablet, and mobile use",
        "Clear validation and friendly guidance for first-time users",
      ]}
    />
  );
}

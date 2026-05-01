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
      description="Lorem ipsum dolor sit amet, consectetur adipiscing elit. Vivamus sagittis lacus vel augue laoreet rutrum faucibus dolor auctor."
      imageSrc="/Upsell.png"
      imageAlt="Upselling page preview"
      features={[
        "Lorem ipsum dolor sit amet, consectetur adipiscing elit",
        "Vivamus sagittis lacus vel augue laoreet rutrum faucibus dolor auctor",
        "Maecenas sed diam eget risus varius blandit sit amet non magna",
      ]}
    />
  );
}

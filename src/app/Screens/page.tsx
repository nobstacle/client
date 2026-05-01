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
      description="Lorem ipsum dolor sit amet, consectetur adipiscing elit. Aenean quam elit, consequat sit amet sapien non, varius ornare ligula."
      imageSrc="/Screens.png"
      imageAlt="Screens page preview"
      features={[
        "Lorem ipsum dolor sit amet, consectetur adipiscing elit",
        "Aenean commodo ligula eget dolor. Aenean massa",
        "Cum sociis natoque penatibus et magnis dis parturient montes",
      ]}
    />
  );
}

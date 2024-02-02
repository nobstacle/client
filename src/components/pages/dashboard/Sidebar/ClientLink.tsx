"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { TextIcon } from "../../../icons/sidebar/TextIcon";
import { ChatIcon } from "../../../icons/sidebar/ChatIcon";
import { ImageIcon } from "../../../icons/sidebar/ImageIcon";
import { VideoIcon } from "../../../icons/sidebar/VideoIcon";
import { SlideshowIcon } from "../../../icons/sidebar/SlideshowIcon";
import { MapsIcon } from "../../../icons/sidebar/MapsIcon";
import { SurveyIcon } from "../../../icons/sidebar/SurveyIcon";
import { SettingsIcon } from "../../../icons/sidebar/SettingsIcon";

export const ClientLink = ({
  href,
  title,
}: {
  href: string;
  title: string;
}) => {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const params = new URLSearchParams(searchParams).toString();

  return (
    <li
      style={{
        backgroundColor: pathname === href ? "rgb(46, 68,113)" : "transparent",
      }}
      className="flex items-center gap-2 p-4"
    >
      <div>
        {title === "Text" && <TextIcon />}
        {title === "Chat" && <ChatIcon />}
        {title === "Image" && <ImageIcon />}
        {title === "Video" && <VideoIcon />}
        {title === "Slideshow" && <SlideshowIcon />}
        {title === "Maps" && <MapsIcon />}
        {title === "Survey" && <SurveyIcon />}
        {title === "Settings" && <SettingsIcon />}
      </div>
      <Link className="font-medium text-white" href={`${href}?${params}`}>
        {title}
      </Link>
    </li>
  );
};

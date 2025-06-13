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
import { WebsiteIcon } from "../../../icons/sidebar/WebsiteIcon";
import { MicIcon } from "../../../icons/MicIcon";
// Add these new icon imports
import { HandoverIcon } from "../../../icons/sidebar/newIcons";
import { ReminderIcon } from "../../../icons/sidebar/newIcons";
import { InformationIcon } from "../../../icons/sidebar/newIcons";
import { WhatsappIcon } from "../../../icons/sidebar/newIcons";
import { EmailIcon } from "../../../icons/sidebar/newIcons";
import { UpsellingIcon } from "../../../icons/sidebar/newIcons";
import { AssignFormsIcon } from "../../../icons/sidebar/newIcons";

export const ClientLink = ({
  href,
  title,
  className,
}: {
  href: string;
  title: string;
  className?: string;
}) => {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const params = new URLSearchParams(searchParams).toString();

  return (
    <Link
      href={`${href}?${params}`}
      className={className || `
        flex items-center gap-2 p-4 font-medium text-white
        ${pathname === href ? 'bg-[rgb(46,68,113)]' : 'bg-transparent'}
      `}
    >
      <div style={{ marginRight: "10px" }}>
        {/* Existing icons - unchanged */}
        {title === "Text" && <TextIcon />}
        {title === "Chat" && <ChatIcon />}
        {title === "Image" && <ImageIcon />}
        {title === "Video" && <VideoIcon />}
        {title === "Slideshow" && <SlideshowIcon />}
        {title === "Maps" && <MapsIcon />}
        {title === "Survey" && <SurveyIcon />}
        {title === "Settings" && <SettingsIcon />}
        {title === "Website" && <WebsiteIcon />}
        {title === "Test Mic" && <MicIcon fill="#ffffff" />}
        {title === "Form" && <WebsiteIcon />}
        {title === "Documents" && <WebsiteIcon />}
        {title === "Responses" && <WebsiteIcon />}

        {/* New icons for missing routes */}
        {title === "Handover" && <HandoverIcon />}
        {title === "Reminider" && <ReminderIcon />}
        {title === "Information" && <InformationIcon />}
        {title === "Whatsapp" && <WhatsappIcon />}
        {title === "Email" && <EmailIcon />}
        {title === "Upselling" && <UpsellingIcon />}
        {title === "Assign Forms" && <AssignFormsIcon />}
      </div>
      <span>{title}</span>
    </Link>
  );
};
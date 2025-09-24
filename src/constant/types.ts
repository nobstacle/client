export enum ChatType {
  Text = "Text",
  Image = "Image",
  Video = "Video",
  Slideshow = "Slideshow",
  Map = "Map",
  Survey = "Survey",
  Website = "Website",
  Form = "Form",
  Document = "Document",
  TeamDocument = "Team-document",
}

export type ReceivedType =
  | ChatType
  | "TextTemplateMessage"
  | "ChatMessage"
  | "MapTemplateMessage"
  | "Survey"
  | "WebsiteTemplateMessage"
  | "Packages"
  | "JotFormTemplateMessage";

export interface SendTemplatePayloadType {
  refId: number;
  refType: ReceivedType;
  station: number;
  langCode: string;
  directContent?: string;
  contentExtra?: any;
  self?: boolean;
}

export interface SendJotFormTemplate {
  refId: number;
  refType: ReceivedType;
  station: number;
  langCode: string;
  directContent?: string;
  contentExtra?: any;
  self?: boolean;
}

export interface SendMessagePayloadType {
  message: string;
  station: number;
  refType: ReceivedType;
  langCode: string;
  uuid?: boolean;
}

export type ReceivedTemplateContent = {
  id: number | string;
  content?: string;
  extraContent?: string;
  contents?: string[];
  langCode: string;
  type: ReceivedType;
};

export type ReceivedMessageContent = {
  id: number | string;
  station: number;
  message: string;
  originalMessage: string;
  role: "User" | "Admin" | "Staff";
  type: ReceivedType;
};

export interface CleanMessagesPayloadType {
  station: number;
}

export interface SendSurveyMessagePayloadType {
  tag: string;
  value: number;
  station: number;
}

export interface SendSurveyPayloadType {
  tag: string;
  station: number;
}

export interface SendLangCodeMessagePayloadType {
  station: number;
  langCode: string;
}

export interface ReceivedResponseType {
  id: number | string;
  station: number;
  responseData: any;
  submittedAt?: string;
  source?: "Form" | "Survey" | "API" | string;
}

// Add package-related types
export interface SendPackagePayloadType {
  refId: number;
  langCode: string;
  refType: string;
  station: number;
  contentExtra?: string;
  sentBy: string
}

export interface ReceivedPackageContent {
  id: number;
  tag: string;
  packageCode?: string;
  packageName?: string;
  originalPrice?: string;
  discountedPrice?: string;
  currency?: string;
  langCode: string[];
  station: number;
  timestamp?: string;
  content?: string;
  title?: string;
  images?: Array<{
    alt: string;
    url: string;
    signedUrl: string;
    order: number;
  }>;
  benefits?: string[];
  description?: string;
  active?: boolean;
}

export interface ReceivedUpsellPackageContent {
  id: number;
  type: string;
  langCode: string[];
  station: number;

}

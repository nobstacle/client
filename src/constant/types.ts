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
  Scroll = 'Scroll',
  Screens = 'Screens'
}

export type ReceivedType =
  | ChatType
  | "TextTemplateMessage"
  | "ChatMessage"
  | "MapTemplateQr"
  | "MapTemplateMessage"
  | "Survey"
  | "WebsiteTemplateMessage"
  | "Packages"
  | "WebsiteTemplateQr"
  | "Recording"
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
  adminMessage?: string;
  clientMessage?: string;
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
  userId: number
}

export interface SendSurveyPayloadType {
  tag: string;
  station: number;
  langCode: string;
  sentBy: string
}

export interface SendRecordingPayloadType {
  tag: string;
  station: number;
  langCode: string;
}


export interface SendRecordingPayloadType {
  tag: string;
  station: number;
  langCode: string;
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
  source?: "Form" | "Survey" | "API" | string | 'recordings';
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

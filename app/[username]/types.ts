import type {
  ProfileAvatarMedia,
  ProfileGalleryMedia,
  ProfileVideoMedia,
} from "@/src/components/profile/profile-media";

export type ProfileData = {
  username: string;
  templateId: string;
  published: boolean;
  theme: {
    mode?: "light" | "dark";
    primary?: string;
    accent?: string;
    background?: string;
  };
  content: {
    avatar?: ProfileAvatarMedia | null;
    gallery?: ProfileGalleryMedia[];
    videos?: ProfileVideoMedia[];
    [key: string]: any;
  };
  media?: {
    videos?: string[];
  };
  plan: "free" | "pro" | "business";
  active: boolean;
  showBranding: boolean;
};

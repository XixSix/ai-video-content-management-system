import {
  Home,
  Library,
  Clapperboard,
  Mic,
  Share2,
  Send,
  Settings,
} from "lucide-react";

export const navigationConfig = [
  {
    title: "Home",
    href: "/",
    icon: Home,
  },
  {
    title: "Media Library",
    href: "/media",
    icon: Library,
  },
  {
    title: "Studio",
    href: "/studio",
    icon: Clapperboard,
  },
  {
    title: "Text to Speech",
    href: "/text-to-speech",
    icon: Mic,
  },
  {
    title: "Social Accounts",
    href: "/social-accounts",
    icon: Share2,
  },
  {
    title: "Publishing",
    href: "/publishing",
    icon: Send,
  },
  {
    title: "Settings",
    href: "/settings",
    icon: Settings,
  },
];

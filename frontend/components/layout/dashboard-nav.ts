import {
  Home,
  Library,
  Clapperboard,
  Mic,
  Share2,
  Send,
  Settings,
} from "lucide-react";

type RouteNavigationItem = {
  title: string
  href: string
  icon: typeof Home
}

type ActionNavigationItem = {
  title: string
  action: "open-social-accounts"
  icon: typeof Home
}

export type NavigationItem = RouteNavigationItem | ActionNavigationItem

export const navigationConfig: NavigationItem[] = [
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
    action: "open-social-accounts",
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

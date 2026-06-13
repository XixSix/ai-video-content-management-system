import {
  Home,
  Library,
  Clapperboard,
  Scissors,
  Mic,
  Share2,
  Send,
  Settings,
} from "lucide-react";

type RouteNavigationItem = {
  title: string
  href: string
  icon: typeof Home
  section: "primary" | "create" | "account"
}

type ActionNavigationItem = {
  title: string
  action: "open-social-accounts"
  icon: typeof Home
  section: "primary" | "create" | "account"
}

export type NavigationItem = RouteNavigationItem | ActionNavigationItem

export const navigationConfig: NavigationItem[] = [
  {
    title: "Home",
    href: "/",
    icon: Home,
    section: "primary",
  },
  {
    title: "Media Library",
    href: "/media-library",
    icon: Library,
    section: "primary",
  },
  {
    title: "Studio",
    href: "/studio",
    icon: Clapperboard,
    section: "primary",
  },
  {
    title: "Long to Short",
    href: "/long-to-short",
    icon: Scissors,
    section: "create",
  },
  {
    title: "Text to Speech",
    href: "/text-to-speech",
    icon: Mic,
    section: "create",
  },
  {
    title: "Social Accounts",
    action: "open-social-accounts",
    icon: Share2,
    section: "account",
  },
  {
    title: "Publishing",
    href: "/publishing",
    icon: Send,
    section: "create",
  },
  {
    title: "Settings",
    href: "/settings",
    icon: Settings,
    section: "account",
  },
];

import type {
  ConnectedAccount,
  PlatformFilterValue,
  PlatformInfo,
} from "./social-accounts.types"

export const platformInfoList: PlatformInfo[] = [
  {
    id: "youtube",
    name: "YouTube",
    description: "Channel",
    color: "#FF0000",
    mockAccountName: "VidPilot Studio",
    backendSupported: true,
    backendId: "YOUTUBE",
  },
  {
    id: "facebook",
    name: "Facebook",
    description: "Page",
    color: "#1877F2",
    mockAccountName: "VidPilot",
    backendSupported: true,
    backendId: "FACEBOOK",
  },
  {
    id: "tiktok",
    name: "TikTok",
    description: "Feed or Inbox",
    color: "#000000",
    badgeLabel: "Soon",
    mockAccountName: "vidpilot_creator",
    backendSupported: false,
  },
  {
    id: "instagram",
    name: "Instagram",
    description: "Business or creator",
    color: "#E4405F",
    badgeLabel: "Soon",
    mockAccountName: "vidpilot.business",
    backendSupported: false,
  },
  {
    id: "linkedin",
    name: "LinkedIn",
    description: "Personal page or profile",
    color: "#0A66C2",
    badgeLabel: "Soon",
    mockAccountName: "VidPilot Team",
    backendSupported: false,
  },
  {
    id: "x",
    name: "X",
    description: "Profile",
    color: "#000000",
    badgeLabel: "Soon",
    mockAccountName: "VidPilot X",
    backendSupported: false,
  },
]

export const platformFilterOptions: {
  label: string
  value: PlatformFilterValue
}[] = [
  { label: "All platforms", value: "all" },
  { label: "YouTube", value: "youtube" },
  { label: "Facebook Page", value: "facebook" },
]


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
  },
  {
    id: "tiktok",
    name: "TikTok",
    description: "Feed or Inbox",
    color: "#000000",
    mockAccountName: "vidpilot_creator",
  },
  {
    id: "linkedin",
    name: "LinkedIn",
    description: "Personal page or profile",
    color: "#0A66C2",
    mockAccountName: "VidPilot Team",
  },
  {
    id: "facebook",
    name: "Facebook",
    description: "Page",
    color: "#1877F2",
    mockAccountName: "VidPilot",
  },
  {
    id: "instagram",
    name: "Instagram",
    description: "Business or creator",
    color: "#E4405F",
    mockAccountName: "vidpilot.business",
  },
  {
    id: "x",
    name: "X",
    description: "Profile",
    color: "#000000",
    badgeLabel: "Soon",
    mockAccountName: "VidPilot X",
  },
]

export const platformFilterOptions: {
  label: string
  value: PlatformFilterValue
}[] = [
  { label: "All platforms", value: "all" },
  { label: "YouTube", value: "youtube" },
  { label: "TikTok", value: "tiktok" },
  { label: "Instagram Business", value: "instagram" },
  { label: "Facebook Page", value: "facebook" },
  { label: "LinkedIn", value: "linkedin" },
  { label: "X", value: "x" },
]

export const connectedAccountsSeed: ConnectedAccount[] = [
  {
    id: "sa-1",
    platform: "facebook",
    displayName: "VidPilot",
    profileUrl: "https://facebook.com/vidpilot",
    avatarUrl: null,
    connectedAt: "2026-06-05T10:30:00.000Z",
  },
  {
    id: "sa-2",
    platform: "youtube",
    displayName: "VidPilot Studio",
    profileUrl: "https://youtube.com/@vidpilotstudio",
    avatarUrl: null,
    connectedAt: "2026-06-03T14:20:00.000Z",
  },
  {
    id: "sa-3",
    platform: "tiktok",
    displayName: "vidpilot_creator",
    profileUrl: "https://tiktok.com/@vidpilot_creator",
    avatarUrl: null,
    connectedAt: "2026-06-01T09:15:00.000Z",
  },
  {
    id: "sa-4",
    platform: "instagram",
    displayName: "vidpilot.business",
    profileUrl: "https://instagram.com/vidpilot.business",
    avatarUrl: null,
    connectedAt: "2026-05-29T08:45:00.000Z",
  },
]

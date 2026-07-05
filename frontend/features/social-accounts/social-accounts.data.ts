import type {
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
]

export const platformFilterOptions: {
  label: string
  value: PlatformFilterValue
}[] = [
  { label: "All platforms", value: "all" },
  { label: "YouTube", value: "youtube" },
  { label: "Facebook Page", value: "facebook" },
]

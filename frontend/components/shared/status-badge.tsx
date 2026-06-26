import { Badge } from "@/components/ui/badge"

type StatusValue =
  | "UPLOADING"
  | "UPLOADED"
  | "READY"
  | "PROCESSING"
  | "FAILED"
  | "QUEUED"
  | "DRAFT"
  | "SCHEDULED"
  | "PUBLISHING"
  | "PUBLISHED"
  | "CANCELED"
  | "DELETED"

const statusConfig: Record<
  StatusValue,
  {
    label: string
    variant: React.ComponentProps<typeof Badge>["variant"]
  }
> = {
  UPLOADING: {
    label: "Uploading",
    variant: "warning",
  },
  UPLOADED: {
    label: "Uploaded",
    variant: "success",
  },
  READY: {
    label: "Ready",
    variant: "success",
  },
  PROCESSING: {
    label: "Processing",
    variant: "info",
  },
  FAILED: {
    label: "Failed",
    variant: "danger",
  },
  QUEUED: {
    label: "Queued",
    variant: "neutral",
  },
  DRAFT: {
    label: "Draft",
    variant: "neutral",
  },
  SCHEDULED: {
    label: "Scheduled",
    variant: "warning",
  },
  PUBLISHING: {
    label: "Publishing",
    variant: "info",
  },
  PUBLISHED: {
    label: "Published",
    variant: "success",
  },
  CANCELED: {
    label: "Canceled",
    variant: "neutral",
  },
  DELETED: {
    label: "Deleted",
    variant: "neutral",
  },
}

type StatusBadgeProps = {
  status: StatusValue
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const config = statusConfig[status]

  return <Badge variant={config.variant}>{config.label}</Badge>
}

import Image from "next/image"
import { FileMusic, ImageIcon, Video } from "lucide-react"

import type {
  StudioProjectMediaItem,
  StudioProjectMediaType,
} from "@/features/studio-editor/studio.types"

function MediaFileIcon({ type }: { type: StudioProjectMediaType }) {
  if (type === "AUDIO") {
    return <FileMusic className="size-9 text-muted-foreground" />
  }

  if (type === "IMAGE") {
    return <ImageIcon className="size-9 text-muted-foreground" />
  }

  return <Video className="size-9 text-muted-foreground" />
}

export function MediaThumbnail({ item }: { item: StudioProjectMediaItem }) {
  if (item.thumbnailUrl) {
    if (item.thumbnailUrl.startsWith("blob:")) {
      return (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={item.thumbnailUrl}
          alt=""
          className="absolute inset-0 size-full object-cover"
        />
      )
    }

    return (
      <Image
        src={item.thumbnailUrl}
        alt=""
        fill
        sizes="12rem"
        className="absolute inset-0 object-cover"
      />
    )
  }

  if (item.type === "VIDEO") {
    return (
      <div className="absolute inset-0 overflow-hidden rounded-[inherit] bg-[linear-gradient(135deg,#273749,#16202f)]">
        <div className="absolute inset-x-[16%] bottom-[16%] h-[14%] rounded bg-black/45" />
        <div className="absolute right-[10%] top-[14%] h-[34%] w-[24%] rounded-full bg-white/25 blur-[1px]" />
        <div className="absolute left-[12%] top-[18%] h-[54%] w-[28%] rounded-xl bg-white/12" />
      </div>
    )
  }

  if (item.type === "IMAGE") {
    return (
      <div className="absolute inset-0 rounded-[inherit] bg-[linear-gradient(90deg,rgba(0,0,0,0.03)_1px,transparent_1px),linear-gradient(180deg,rgba(0,0,0,0.03)_1px,transparent_1px)] bg-[length:12px_12px]">
        <div className="absolute inset-x-4 bottom-3 h-5 rounded border border-border bg-background/70" />
      </div>
    )
  }

  return (
    <div className="absolute inset-0 flex items-center justify-center rounded-[inherit] bg-surface-muted">
      <MediaFileIcon type={item.type} />
    </div>
  )
}

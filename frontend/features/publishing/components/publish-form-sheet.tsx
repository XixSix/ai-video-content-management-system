"use client"

import { useMemo, useState } from "react"
import { CalendarClock, Hash, Send } from "lucide-react"

import { Calendar } from "@/components/ui/calendar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { cn } from "@/lib/utils"
import {
  publishAccountOptions,
  publishSourceOptions,
} from "../publishing.data"
import type {
  NewPublishPayload,
} from "../publishing.types"
import { PublishThumbnail } from "./publish-thumbnail"
import { PublishingPlatformIcon } from "./publishing-platform-icon"

type PublishFormSheetProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreate: (payload: NewPublishPayload) => void
}

function parseHashtags(value: string) {
  return value
    .split(/[,\s]+/)
    .map((item) => item.trim())
    .filter(Boolean)
    .map((item) => (item.startsWith("#") ? item : `#${item}`))
}

export function PublishFormSheet({
  open,
  onOpenChange,
  onCreate,
}: PublishFormSheetProps) {
  const [selectedSourceId, setSelectedSourceId] = useState(
    publishSourceOptions[0]?.id ?? ""
  )
  const [selectedAccountId, setSelectedAccountId] = useState(
    publishAccountOptions[0]?.id ?? ""
  )
  const [title, setTitle] = useState("")
  const [caption, setCaption] = useState("")
  const [hashtags, setHashtags] = useState("#aivideo #contentworkflow")
  const [scheduledDate, setScheduledDate] = useState<Date | undefined>(
    new Date("2026-06-14T09:00:00.000Z")
  )
  const [formError, setFormError] = useState<string | null>(null)

  const selectedSource = useMemo(
    () =>
      publishSourceOptions.find((source) => source.id === selectedSourceId) ??
      publishSourceOptions[0],
    [selectedSourceId]
  )
  const selectedAccount = useMemo(
    () =>
      publishAccountOptions.find((account) => account.id === selectedAccountId) ??
      publishAccountOptions[0],
    [selectedAccountId]
  )

  const resetForm = () => {
    setSelectedSourceId(publishSourceOptions[0]?.id ?? "")
    setSelectedAccountId(publishAccountOptions[0]?.id ?? "")
    setTitle("")
    setCaption("")
    setHashtags("#aivideo #contentworkflow")
    setScheduledDate(new Date("2026-06-14T09:00:00.000Z"))
    setFormError(null)
  }

  const submit = (status: NewPublishPayload["status"]) => {
    if (!selectedSource || !selectedAccount) {
      setFormError("Choose a source and platform account before continuing.")
      return
    }

    if (status !== "DRAFT" && !scheduledDate) {
      setFormError("Choose a date before scheduling or publishing.")
      return
    }

    onCreate({
      source: selectedSource,
      account: selectedAccount,
      title: title.trim(),
      caption: caption.trim(),
      hashtags: parseHashtags(hashtags),
      scheduledDate,
      status,
    })
    resetForm()
    onOpenChange(false)
  }

  return (
    <Sheet
      open={open}
      onOpenChange={(nextOpen) => {
        onOpenChange(nextOpen)
        if (!nextOpen) {
          resetForm()
        }
      }}
    >
      <SheetContent
        side="right"
        className="w-full overflow-y-auto p-0 sm:max-w-xl"
      >
        <SheetHeader className="border-b border-border/70 p-6">
          <SheetTitle>New publish task</SheetTitle>
          <SheetDescription>
            Pick a source, choose a connected platform, then save a draft,
            schedule it, or start publishing now.
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-6 p-6">
          <section className="space-y-3">
            <div className="space-y-1">
              <h3 className="text-sm font-semibold text-foreground">
                1. Source
              </h3>
              <p className="text-sm text-muted-foreground">
                Choose a source media item or generated short clip.
              </p>
            </div>
            <div className="grid gap-2">
              {publishSourceOptions.map((source) => {
                const isSelected = source.id === selectedSourceId

                return (
                  <button
                    key={source.id}
                    type="button"
                    className={cn(
                      "flex cursor-pointer gap-3 rounded-xl border border-border/70 bg-background p-3 text-left transition hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/40",
                      isSelected && "border-foreground/30 bg-muted/50"
                    )}
                    onClick={() => setSelectedSourceId(source.id)}
                  >
                    <PublishThumbnail
                      task={{
                        thumbnailUrl: source.thumbnailUrl,
                        sourceTitle: source.title,
                        aspectRatio: source.aspectRatio,
                        durationLabel: source.durationLabel,
                      }}
                      compact
                    />
                    <div className="min-w-0 flex-1">
                      <p className="line-clamp-1 text-sm font-semibold text-foreground">
                        {source.title}
                      </p>
                      <p className="line-clamp-2 text-sm text-muted-foreground">
                        {source.meta}
                      </p>
                    </div>
                  </button>
                )
              })}
            </div>
          </section>

          <section className="space-y-3">
            <div className="space-y-1">
              <h3 className="text-sm font-semibold text-foreground">
                2. Platform
              </h3>
              <p className="text-sm text-muted-foreground">
                Select the connected account that will publish this post.
              </p>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              {publishAccountOptions.map((account) => {
                const isSelected = account.id === selectedAccountId

                return (
                  <button
                    key={account.id}
                    type="button"
                    className={cn(
                      "flex cursor-pointer items-center gap-3 rounded-xl border border-border/70 bg-background p-3 text-left transition hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/40",
                      isSelected && "border-foreground/30 bg-muted/50"
                    )}
                    onClick={() => setSelectedAccountId(account.id)}
                  >
                    <PublishingPlatformIcon platform={account.platform} size={20} />
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold text-foreground">
                        {account.accountName}
                      </span>
                      <span className="block text-xs text-muted-foreground">
                        {account.platform}
                      </span>
                    </span>
                  </button>
                )
              })}
            </div>
          </section>

          <section className="space-y-3">
            <div className="space-y-1">
              <h3 className="text-sm font-semibold text-foreground">
                3. Post content
              </h3>
              <p className="text-sm text-muted-foreground">
                Draft platform copy and choose a schedule date.
              </p>
            </div>

            <div className="space-y-3">
              <label className="space-y-1.5">
                <span className="text-sm font-medium text-foreground">Title</span>
                <Input
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder="Add a platform title..."
                  className="h-10 rounded-xl"
                />
              </label>

              <label className="space-y-1.5">
                <span className="text-sm font-medium text-foreground">Caption</span>
                <textarea
                  value={caption}
                  onChange={(event) => setCaption(event.target.value)}
                  placeholder="Write the post caption..."
                  className="min-h-28 w-full resize-none rounded-xl border border-input bg-background px-3 py-2 text-sm text-foreground shadow-xs outline-none transition placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                />
              </label>

              <label className="space-y-1.5">
                <span className="inline-flex items-center gap-1 text-sm font-medium text-foreground">
                  <Hash className="size-3.5 text-muted-foreground" />
                  Hashtags
                </span>
                <Input
                  value={hashtags}
                  onChange={(event) => setHashtags(event.target.value)}
                  placeholder="#videoworkflow #shorts"
                  className="h-10 rounded-xl"
                />
              </label>

              <div className="space-y-2">
                <span className="inline-flex items-center gap-1 text-sm font-medium text-foreground">
                  <CalendarClock className="size-3.5 text-muted-foreground" />
                  Schedule date
                </span>
                <div className="rounded-xl border border-border/70 bg-background p-2">
                  <Calendar
                    mode="single"
                    selected={scheduledDate}
                    onSelect={setScheduledDate}
                    className="mx-auto"
                  />
                </div>
              </div>
            </div>
          </section>

          {formError ? (
            <div className="rounded-xl border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
              {formError}
            </div>
          ) : null}
        </div>

        <SheetFooter className="border-t border-border/70 bg-background/95 p-4">
          <div className="grid gap-2 sm:grid-cols-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => submit("DRAFT")}
            >
              Save draft
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => submit("SCHEDULED")}
            >
              <CalendarClock className="size-4" />
              Schedule
            </Button>
            <Button type="button" onClick={() => submit("PUBLISHING")}>
              <Send className="size-4" />
              Publish now
            </Button>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}

"use client"

import type { ChangeEvent } from "react"
import { useMemo, useRef, useState } from "react"
import {
  CalendarClock,
  AudioLines,
  Clapperboard,
  Hash,
  Library,
  Send,
  UploadCloud,
  X,
} from "lucide-react"

import { Calendar } from "@/components/ui/calendar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { cn } from "@/lib/utils"
import {
  publishAccountOptions,
  publishPlatformLabels,
  publishSourceOptions,
} from "../publishing.data"
import type {
  NewPublishPayload,
  PublishPlatform,
  PublishSourceOption,
} from "../publishing.types"
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

function buildUploadedPublishSource(file: File): PublishSourceOption {
  const isVertical = file.name.toLowerCase().includes("short")

  return {
    id: `uploaded-source-${Date.now()}`,
    sourceType: "MEDIA",
    mediaId: `uploaded-media-${Date.now()}`,
    shortClipId: null,
    title: file.name.replace(/\.[^/.]+$/, ""),
    meta: "Uploaded from New publish",
    thumbnailUrl: null,
    aspectRatio: isVertical ? "9:16" : "16:9",
    durationLabel: isVertical ? "0:30" : "Pending",
  }
}

function getSourceMeta(source: PublishSourceOption) {
  return `${source.meta} · ${source.durationLabel} · ${source.aspectRatio}`
}

function SourceOptionRow({
  source,
  selected,
  onSelect,
}: {
  source: PublishSourceOption
  selected: boolean
  onSelect: () => void
}) {
  const Icon = source.sourceType === "SHORT_CLIP" ? Clapperboard : AudioLines

  return (
    <button
      type="button"
      className={cn(
        "flex cursor-pointer items-center gap-3 rounded-xl border border-border/70 bg-background px-4 py-3 text-left transition hover:border-foreground/18 hover:bg-muted/30 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/40",
        selected && "border-foreground/30 bg-muted/45"
      )}
      onClick={onSelect}
    >
      <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-xl border border-border/70 bg-muted/60 text-muted-foreground">
        <Icon className="size-4" />
      </span>
      <span className="min-w-0">
        <span className="block truncate text-sm font-semibold text-foreground">
          {source.title}
        </span>
        <span className="mt-1 block truncate text-xs text-muted-foreground">
          {getSourceMeta(source)}
        </span>
      </span>
    </button>
  )
}

export function PublishFormSheet({
  open,
  onOpenChange,
  onCreate,
}: PublishFormSheetProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [selectedSourceId, setSelectedSourceId] = useState(
    publishSourceOptions[0]?.id ?? ""
  )
  const [uploadedSource, setUploadedSource] = useState<PublishSourceOption | null>(
    null
  )
  const [isLibraryPickerOpen, setIsLibraryPickerOpen] = useState(false)
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
  const sourceOptions = useMemo(
    () => (uploadedSource ? [uploadedSource, ...publishSourceOptions] : publishSourceOptions),
    [uploadedSource]
  )

  const selectedSource = useMemo(
    () =>
      sourceOptions.find((source) => source.id === selectedSourceId) ??
      sourceOptions[0],
    [selectedSourceId, sourceOptions]
  )
  const selectedAccount = useMemo(
    () =>
      publishAccountOptions.find((account) => account.id === selectedAccountId) ??
      publishAccountOptions[0],
    [selectedAccountId]
  )
  const selectedPlatform = selectedAccount?.platform ?? publishAccountOptions[0]?.platform
  const platformOptions = useMemo(
    () =>
      Array.from(
        new Set(publishAccountOptions.map((account) => account.platform))
      ) as PublishPlatform[],
    []
  )
  const accountOptions = useMemo(
    () =>
      publishAccountOptions.filter(
        (account) => account.platform === selectedPlatform
      ),
    [selectedPlatform]
  )

  const resetForm = () => {
    setSelectedSourceId(publishSourceOptions[0]?.id ?? "")
    setUploadedSource(null)
    setIsLibraryPickerOpen(false)
    setSelectedAccountId(publishAccountOptions[0]?.id ?? "")
    setTitle("")
    setCaption("")
    setHashtags("#aivideo #contentworkflow")
    setScheduledDate(new Date("2026-06-14T09:00:00.000Z"))
    setFormError(null)
  }

  const selectPlatform = (platform: PublishPlatform) => {
    const firstAccount = publishAccountOptions.find(
      (account) => account.platform === platform
    )

    if (firstAccount) {
      setSelectedAccountId(firstAccount.id)
    }
  }

  const handleUploadSelection = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]

    if (!file) {
      return
    }

    const nextSource = buildUploadedPublishSource(file)
    setUploadedSource(nextSource)
    setSelectedSourceId(nextSource.id)
    setIsLibraryPickerOpen(false)
    setFormError(null)
    event.target.value = ""
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
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        onOpenChange(nextOpen)
        if (!nextOpen) {
          resetForm()
        }
      }}
    >
      <DialogContent
        className="max-h-[90vh] max-w-[min(96vw,64rem)] gap-0 overflow-hidden p-0 sm:max-w-[min(96vw,64rem)]"
      >
        <DialogHeader className="border-b border-border/70 px-6 pb-4 pr-14 pt-6 sm:px-8 sm:pt-7">
          <DialogTitle className="text-[1.7rem] font-semibold tracking-normal">
            New publish task
          </DialogTitle>
          <DialogDescription className="max-w-xl text-[15px] leading-6">
            Pick a source, choose a connected platform, then save a draft,
            schedule it, or start publishing now.
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[calc(90vh-11rem)] space-y-6 overflow-y-auto p-6">
          <section className="space-y-3">
            <div className="space-y-1">
              <h3 className="text-sm font-semibold text-foreground">
                1. Source
              </h3>
              <p className="text-sm text-muted-foreground">
                Choose a source media item or generated short clip.
              </p>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="video/*,audio/*"
              className="sr-only"
              onChange={handleUploadSelection}
            />

            <div className="grid gap-3 sm:grid-cols-2">
              <Button
                type="button"
                size="lg"
                className="h-12 justify-center"
                onClick={() => fileInputRef.current?.click()}
              >
                <UploadCloud className="size-4" />
                Upload
              </Button>
              <Button
                type="button"
                size="lg"
                variant="outline"
                className="h-12 justify-center"
                onClick={() => setIsLibraryPickerOpen((currentValue) => !currentValue)}
              >
                <Library className="size-4" />
                Import from Media Library
              </Button>
            </div>

            {selectedSource ? (
              <div className="flex items-center justify-between gap-3 rounded-xl border border-border/70 bg-background px-4 py-3">
                <div className="flex min-w-0 items-center gap-2">
                  <UploadCloud className="size-4 shrink-0 text-muted-foreground" />
                  <span className="truncate text-sm text-foreground-subtle">
                    {selectedSource.title}
                  </span>
                </div>
                <Button
                  type="button"
                  variant="link"
                  size="sm"
                  className="h-auto px-0 text-xs"
                  onClick={() => {
                    if (selectedSource.id === uploadedSource?.id) {
                      setUploadedSource(null)
                    }

                    setSelectedSourceId(publishSourceOptions[0]?.id ?? "")
                  }}
                >
                  Remove
                </Button>
              </div>
            ) : null}

            {isLibraryPickerOpen ? (
              <div className="rounded-xl border border-border/70 bg-background p-3">
                <div className="mb-3 flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-foreground">
                      Import from Media Library
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Choose one ready source or generated short clip.
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    className="rounded-full"
                    onClick={() => setIsLibraryPickerOpen(false)}
                  >
                    <X className="size-4" />
                    <span className="sr-only">Close source picker</span>
                  </Button>
                </div>

                <div className="grid max-h-72 gap-2 overflow-y-auto pr-1">
                  {sourceOptions.map((source) => {
                    const isSelected = source.id === selectedSourceId

                    return (
                      <SourceOptionRow
                        key={source.id}
                        source={source}
                        selected={isSelected}
                        onSelect={() => {
                          setSelectedSourceId(source.id)
                          setIsLibraryPickerOpen(false)
                        }}
                      />
                    )
                  })}
                </div>
              </div>
            ) : null}
          </section>

          <section className="space-y-3">
            <div className="space-y-1">
              <h3 className="text-sm font-semibold text-foreground">
                2. Platform
              </h3>
              <p className="text-sm text-muted-foreground">
                Select a platform, then choose the account that will publish this post.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {platformOptions.map((platform) => {
                const isSelected = platform === selectedPlatform

                return (
                  <button
                    key={platform}
                    type="button"
                    className={cn(
                      "flex min-h-20 cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-border/70 bg-background px-3 py-3 text-center transition hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/40",
                      isSelected && "border-foreground/30 bg-muted/50"
                    )}
                    onClick={() => selectPlatform(platform)}
                  >
                    <PublishingPlatformIcon platform={platform} size={22} />
                    <span className="text-sm font-semibold text-foreground">
                      {publishPlatformLabels[platform]}
                    </span>
                  </button>
                )
              })}
            </div>

            <div className="space-y-2">
              <span className="text-sm font-medium text-foreground">Account</span>
              <div className="grid gap-2 sm:grid-cols-2">
                {accountOptions.map((account) => {
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
                      <PublishingPlatformIcon platform={account.platform} size={18} />
                      <span className="min-w-0 truncate text-sm font-semibold text-foreground">
                        {account.accountName}
                      </span>
                    </button>
                  )
                })}
              </div>
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
                    className="mx-auto max-w-sm"
                    classNames={{
                      root: "relative w-full",
                      months: "w-full",
                      month: "w-full",
                      month_grid: "w-full",
                    }}
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

        <DialogFooter className="m-0 rounded-none border-t border-border/70 bg-background/95 p-4">
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
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

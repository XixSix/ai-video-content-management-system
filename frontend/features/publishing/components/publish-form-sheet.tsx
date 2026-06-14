"use client"

import type { ChangeEvent } from "react"
import { useMemo, useRef, useState } from "react"
import {
  CalendarClock,
  AudioLines,
  Check,
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import {
  publishAccountOptions,
  publishPlatformLabels,
  publishSourceOptions,
} from "../publishing.data"
import type {
  NewPublishPayload,
  PublishPlatform,
  PublishPlatformContent,
  PublishSourceOption,
} from "../publishing.types"
import {
  buildScheduledIso,
  isFutureScheduledTime,
} from "../publishing.utils"
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

function formatScheduleDate(date: Date | undefined) {
  if (!date) {
    return "Select date"
  }

  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date)
}

function buildDefaultPlatformContent(): PublishPlatformContent {
  return {
    title: "",
    caption: "",
    hashtags: "#aivideo #contentworkflow",
  }
}

function buildDefaultPlatformContentMap(): Record<PublishPlatform, PublishPlatformContent> {
  return {
    YOUTUBE: buildDefaultPlatformContent(),
    TIKTOK: buildDefaultPlatformContent(),
    FACEBOOK: buildDefaultPlatformContent(),
    INSTAGRAM: buildDefaultPlatformContent(),
  }
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
  const [selectedAccountIds, setSelectedAccountIds] = useState<string[]>(
    publishAccountOptions[0] ? [publishAccountOptions[0].id] : []
  )
  const [platformContent, setPlatformContent] = useState<
    Record<PublishPlatform, PublishPlatformContent>
  >(buildDefaultPlatformContentMap)
  const [scheduledDate, setScheduledDate] = useState<Date | undefined>(
    new Date("2026-06-14T09:00:00.000Z")
  )
  const [scheduledTime, setScheduledTime] = useState("09:00")
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
  const selectedAccounts = useMemo(
    () =>
      publishAccountOptions.filter((account) =>
        selectedAccountIds.includes(account.id)
      ),
    [selectedAccountIds]
  )
  const platformOptions = useMemo(
    () =>
      Array.from(
        new Set(publishAccountOptions.map((account) => account.platform))
      ) as PublishPlatform[],
    []
  )
  const selectedPlatforms = useMemo(
    () => new Set(selectedAccounts.map((account) => account.platform)),
    [selectedAccounts]
  )
  const selectedPlatformList = useMemo(
    () => platformOptions.filter((platform) => selectedPlatforms.has(platform)),
    [platformOptions, selectedPlatforms]
  )

  const resetForm = () => {
    setSelectedSourceId(publishSourceOptions[0]?.id ?? "")
    setUploadedSource(null)
    setIsLibraryPickerOpen(false)
    setSelectedAccountIds(publishAccountOptions[0] ? [publishAccountOptions[0].id] : [])
    setPlatformContent(buildDefaultPlatformContentMap())
    setScheduledDate(new Date("2026-06-14T09:00:00.000Z"))
    setScheduledTime("09:00")
    setFormError(null)
  }

  const togglePlatform = (platform: PublishPlatform) => {
    const platformAccountIds = publishAccountOptions
      .filter((account) => account.platform === platform)
      .map((account) => account.id)

    setSelectedAccountIds((currentIds) => {
      const hasPlatformSelected = platformAccountIds.some((id) =>
        currentIds.includes(id)
      )

      if (hasPlatformSelected) {
        return currentIds.filter((id) => !platformAccountIds.includes(id))
      }

      const firstAccountId = platformAccountIds[0]
      return firstAccountId ? [...currentIds, firstAccountId] : currentIds
    })
  }

  const toggleAccount = (accountId: string) => {
    setSelectedAccountIds((currentIds) =>
      currentIds.includes(accountId)
        ? currentIds.filter((id) => id !== accountId)
        : [...currentIds, accountId]
    )
  }

  const updatePlatformContent = (
    platform: PublishPlatform,
    field: keyof PublishPlatformContent,
    value: string
  ) => {
    setPlatformContent((currentContent) => ({
      ...currentContent,
      [platform]: {
        ...currentContent[platform],
        [field]: value,
      },
    }))
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
    if (!selectedSource || selectedAccounts.length < 1) {
      setFormError("Choose a source and at least one platform account.")
      return
    }

    if (status !== "DRAFT" && (!scheduledDate || !scheduledTime)) {
      setFormError("Choose a date and time before scheduling or publishing.")
      return
    }

    const scheduledAt = buildScheduledIso(scheduledDate, scheduledTime)

    if (status !== "DRAFT" && !isFutureScheduledTime(scheduledAt)) {
      setFormError("Choose a future date and time before scheduling.")
      return
    }

    onCreate({
      source: selectedSource,
      targets: selectedAccounts.map((account) => {
        const content = platformContent[account.platform]

        return {
          account,
          title: content.title.trim(),
          caption: content.caption.trim(),
          hashtags: parseHashtags(content.hashtags),
        }
      }),
      scheduledDate,
      scheduledTime,
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
        className="flex max-h-[90dvh] max-w-[min(96vw,64rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-[min(96vw,64rem)]"
      >
        <DialogHeader className="shrink-0 border-b border-border/70 px-6 pb-4 pr-14 pt-6 sm:px-8 sm:pt-7">
          <DialogTitle className="text-[1.7rem] font-semibold tracking-normal">
            New publish task
          </DialogTitle>
          <DialogDescription className="max-w-xl text-[15px] leading-6">
            Pick a source, choose a connected platform, then save a draft,
            schedule it, or start publishing now.
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 space-y-6 overflow-y-auto p-6 sm:px-8">
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
                2. Platform and accounts
              </h3>
              <p className="text-sm text-muted-foreground">
                Choose each platform, then select the connected account or accounts for it.
              </p>
            </div>
            <div className="space-y-2">
              {platformOptions.map((platform) => {
                const isSelected = selectedPlatforms.has(platform)
                const platformAccounts = publishAccountOptions.filter(
                  (account) => account.platform === platform
                )

                return (
                  <div
                    key={platform}
                    className={cn(
                      "grid gap-3 rounded-xl border border-border/70 bg-background p-3 sm:grid-cols-[11rem_minmax(0,1fr)]",
                      isSelected && "border-foreground/30 bg-muted/35"
                    )}
                  >
                    <button
                      type="button"
                      className="flex cursor-pointer items-center gap-3 rounded-lg px-2 py-2 text-left transition hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/40"
                      onClick={() => togglePlatform(platform)}
                    >
                      <span
                        className={cn(
                          "flex size-5 shrink-0 items-center justify-center rounded-md border border-border text-transparent",
                          isSelected && "border-primary bg-primary text-primary-foreground"
                        )}
                      >
                        <Check className="size-3.5" />
                      </span>
                      <PublishingPlatformIcon platform={platform} size={20} />
                      <span className="text-sm font-semibold text-foreground">
                        {publishPlatformLabels[platform]}
                      </span>
                    </button>

                    <div className="grid gap-2 sm:grid-cols-2">
                      {platformAccounts.map((account) => {
                        const isAccountSelected = selectedAccountIds.includes(
                          account.id
                        )

                        return (
                          <button
                            key={account.id}
                            type="button"
                            className={cn(
                              "flex cursor-pointer items-center gap-2 rounded-lg border border-border/70 bg-card px-3 py-2 text-left transition hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/40",
                              isAccountSelected && "border-foreground/30 bg-muted/50"
                            )}
                            onClick={() => toggleAccount(account.id)}
                          >
                            <span
                              className={cn(
                                "flex size-4 shrink-0 items-center justify-center rounded border border-border text-transparent",
                                isAccountSelected &&
                                  "border-primary bg-primary text-primary-foreground"
                              )}
                            >
                              <Check className="size-3" />
                            </span>
                            <span className="min-w-0 truncate text-sm font-medium text-foreground">
                              {account.accountName}
                            </span>
                          </button>
                        )
                      })}
                    </div>
                  </div>
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
                Draft separate copy for each selected platform and choose when it should publish.
              </p>
            </div>

            <div className="space-y-3">
              {selectedPlatformList.length > 0 ? (
                selectedPlatformList.map((platform) => {
                  const content = platformContent[platform]

                  return (
                    <div
                      key={platform}
                      className="space-y-3 rounded-xl border border-border/70 bg-background p-4"
                    >
                      <div className="flex items-center gap-2">
                        <PublishingPlatformIcon platform={platform} size={18} />
                        <span className="text-sm font-semibold text-foreground">
                          {publishPlatformLabels[platform]}
                        </span>
                      </div>

                      <label className="space-y-1.5">
                        <span className="text-sm font-medium text-foreground">
                          Title
                        </span>
                        <Input
                          value={content.title}
                          onChange={(event) =>
                            updatePlatformContent(
                              platform,
                              "title",
                              event.target.value
                            )
                          }
                          placeholder={`Add a ${publishPlatformLabels[platform]} title...`}
                          className="h-10 rounded-xl"
                        />
                      </label>

                      <label className="space-y-1.5">
                        <span className="text-sm font-medium text-foreground">
                          Caption
                        </span>
                        <textarea
                          value={content.caption}
                          onChange={(event) =>
                            updatePlatformContent(
                              platform,
                              "caption",
                              event.target.value
                            )
                          }
                          placeholder={`Write the ${publishPlatformLabels[platform]} caption...`}
                          className="min-h-28 w-full resize-none rounded-xl border border-input bg-background px-3 py-2 text-sm text-foreground shadow-xs outline-none transition placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                        />
                      </label>

                      <label className="space-y-1.5">
                        <span className="inline-flex items-center gap-1 text-sm font-medium text-foreground">
                          <Hash className="size-3.5 text-muted-foreground" />
                          Hashtags
                        </span>
                        <Input
                          value={content.hashtags}
                          onChange={(event) =>
                            updatePlatformContent(
                              platform,
                              "hashtags",
                              event.target.value
                            )
                          }
                          placeholder="#videoworkflow #shorts"
                          className="h-10 rounded-xl"
                        />
                      </label>
                    </div>
                  )
                })
              ) : (
                <div className="rounded-xl border border-dashed border-border/80 bg-background p-4 text-sm text-muted-foreground">
                  Select at least one account above to write platform-specific copy.
                </div>
              )}

              <div className="space-y-2">
                <span className="inline-flex items-center gap-1 text-sm font-medium text-foreground">
                  <CalendarClock className="size-3.5 text-muted-foreground" />
                  Schedule
                </span>
                <div className="grid gap-3 rounded-xl border border-border/70 bg-background p-3 sm:grid-cols-[minmax(0,1fr)_10rem]">
                  <label className="space-y-1.5">
                    <span className="text-sm font-medium text-foreground">
                      Publish date
                    </span>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          type="button"
                          variant="outline"
                          data-empty={!scheduledDate}
                          className="h-10 w-full justify-start rounded-xl text-left font-normal data-[empty=true]:text-muted-foreground"
                        >
                          <CalendarClock className="size-4" />
                          {formatScheduleDate(scheduledDate)}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent
                        align="start"
                        className="z-[60] w-auto p-0"
                      >
                        <Calendar
                          mode="single"
                          selected={scheduledDate}
                          onSelect={setScheduledDate}
                        />
                      </PopoverContent>
                    </Popover>
                  </label>

                  <label className="space-y-1.5">
                    <span className="text-sm font-medium text-foreground">
                      Publish time
                    </span>
                    <Input
                      type="time"
                      value={scheduledTime}
                      onChange={(event) => setScheduledTime(event.target.value)}
                      className="h-10 rounded-xl"
                    />
                  </label>
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

        <DialogFooter className="m-0 shrink-0 rounded-none border-t border-border/70 bg-background/95 px-6 py-4 sm:px-8">
          <div className="grid w-full gap-2 sm:grid-cols-3">
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

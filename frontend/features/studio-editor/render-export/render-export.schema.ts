import { z } from "zod"

const jsonValueSchema: z.ZodType<
  string | number | boolean | null | unknown[] | Record<string, unknown>
> = z.lazy(() =>
  z.union([
    z.string(),
    z.number(),
    z.boolean(),
    z.null(),
    z.array(jsonValueSchema),
    z.record(z.string(), jsonValueSchema),
  ])
)

export const renderExportJobStatusSchema = z.enum([
  "PENDING",
  "QUEUED",
  "RUNNING",
  "TRANSCRIBING",
  "GENERATING_SUBTITLE",
  "BURNING_SUBTITLE",
  "GENERATING_CHAPTERS",
  "GENERATING_SHORT_CLIPS",
  "GENERATING_SUGGESTIONS",
  "GENERATING_MEDIA_PREVIEW",
  "PUBLISHING",
  "COMPLETED",
  "FAILED",
  "CANCELED",
])

export const renderExportJobSchema = z.object({
  id: z.string().uuid(),
  jobId: z.string().uuid().optional(),
  mediaId: z.string().uuid().nullable(),
  jobType: z.literal("EXPORT_RENDER"),
  status: renderExportJobStatusSchema,
  progress: z.number().nullable(),
  errorMessage: z.string().nullable(),
  output: jsonValueSchema.nullable(),
  attemptCount: z.number().int().nonnegative(),
  createdAt: z.string(),
  updatedAt: z.string(),
  startedAt: z.string().nullable(),
  completedAt: z.string().nullable(),
})

export const renderExportJobResponseSchema = z.object({
  job: renderExportJobSchema,
})

export const assetDownloadUrlResponseSchema = z.object({
  url: z.string().url(),
  expiresInSeconds: z.number().int().positive(),
})

export type RenderExportJob = z.infer<typeof renderExportJobSchema>
export type RenderExportJobResponse = z.infer<
  typeof renderExportJobResponseSchema
>
export type AssetDownloadUrlResponse = z.infer<
  typeof assetDownloadUrlResponseSchema
>

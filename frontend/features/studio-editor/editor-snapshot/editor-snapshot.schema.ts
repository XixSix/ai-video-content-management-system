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

const styleSchema = z.record(z.string(), jsonValueSchema)

const layerBaseShape = {
  id: z.string().min(1).max(128),
  visible: z.boolean(),
  xPercent: z.number().min(0).max(100).optional(),
  yPercent: z.number().min(0).max(100).optional(),
  style: styleSchema,
}

const editorLayerSchema = z.discriminatedUnion("kind", [
  z.strictObject({
    ...layerBaseShape,
    kind: z.literal("text"),
    content: z.string().max(10_000),
  }),
  z.strictObject({
    ...layerBaseShape,
    kind: z.literal("image"),
    mediaId: z.string().uuid(),
  }),
  z.strictObject({
    ...layerBaseShape,
    kind: z.literal("captions"),
  }),
])

const editorTimelineSegmentSchema = z
  .strictObject({
    id: z.string().min(1).max(128),
    layerId: z.string().min(1).max(128).optional(),
    mediaId: z.string().uuid().optional(),
    startTime: z.number().nonnegative(),
    durationSeconds: z.number().positive(),
    laneIndex: z.number().int().min(0).max(100).optional(),
  })
  .refine(
    (segment) =>
      Number(segment.layerId !== undefined) +
        Number(segment.mediaId !== undefined) ===
      1,
    "Exactly one segment reference is required"
  )

const editorTimelineTrackSchema = z.strictObject({
  id: z.enum(["TEXT", "OVERLAY_MEDIA", "SOURCE", "AUDIO"]),
  segments: z.array(editorTimelineSegmentSchema).max(1000),
})

export const editorDocumentSchema = z
  .strictObject({
    schemaVersion: z.literal(1),
    settings: z.strictObject({
      aspectRatio: z.enum(["9:16", "1:1", "4:5", "16:9"]),
    }),
    layers: z.array(editorLayerSchema).max(200),
    timelineTracks: z.array(editorTimelineTrackSchema).max(4),
  })
  .superRefine((document, context) => {
    const layerIds = new Set<string>()
    const layerKinds = new Map<
      string,
      (typeof document.layers)[number]["kind"]
    >()
    const trackIds = new Set<string>()
    const segmentIds = new Set<string>()

    document.layers.forEach((layer, index) => {
      if (layerIds.has(layer.id)) {
        context.addIssue({
          code: "custom",
          message: "Layer IDs must be unique",
          path: ["layers", index, "id"],
        })
      }
      layerIds.add(layer.id)
      layerKinds.set(layer.id, layer.kind)
    })

    document.timelineTracks.forEach((track, trackIndex) => {
      if (trackIds.has(track.id)) {
        context.addIssue({
          code: "custom",
          message: "Track IDs must be unique",
          path: ["timelineTracks", trackIndex, "id"],
        })
      }
      trackIds.add(track.id)

      track.segments.forEach((segment, segmentIndex) => {
        const path = ["timelineTracks", trackIndex, "segments", segmentIndex]

        if (segmentIds.has(segment.id)) {
          context.addIssue({
            code: "custom",
            message: "Segment IDs must be unique",
            path: [...path, "id"],
          })
        }
        segmentIds.add(segment.id)

        if (segment.layerId) {
          const layerKind = layerKinds.get(segment.layerId)

          if (!layerKind) {
            context.addIssue({
              code: "custom",
              message: "Segment layer must exist",
              path: [...path, "layerId"],
            })
          } else if (track.id === "TEXT" && layerKind === "image") {
            context.addIssue({
              code: "custom",
              message: "TEXT tracks cannot reference image layers",
              path: [...path, "layerId"],
            })
          }
        }

        if (track.id === "TEXT" && segment.mediaId) {
          context.addIssue({
            code: "custom",
            message: "TEXT tracks must reference layers",
            path: [...path, "mediaId"],
          })
        }

        if (
          (track.id === "SOURCE" || track.id === "AUDIO") &&
          segment.layerId
        ) {
          context.addIssue({
            code: "custom",
            message: `${track.id} tracks must reference media`,
            path: [...path, "layerId"],
          })
        }
      })
    })
  })

export const editorSnapshotSchema = z.strictObject({
  projectId: z.string().uuid(),
  version: z.number().int().positive(),
  document: editorDocumentSchema,
  savedByUserId: z.string().uuid().nullable(),
  savedAt: z.string(),
})

export const editorSnapshotResponseSchema = z.strictObject({
  editorSnapshot: editorSnapshotSchema.nullable(),
})

export type EditorDocument = z.infer<typeof editorDocumentSchema>
export type EditorSnapshot = z.infer<typeof editorSnapshotSchema>
export type EditorSnapshotResponse = z.infer<
  typeof editorSnapshotResponseSchema
>

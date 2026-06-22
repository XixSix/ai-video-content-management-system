import { z } from 'zod'

type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue }

const jsonValueSchema: z.ZodType<JsonValue> = z.lazy(() =>
  z.union([
    z.string(),
    z.number(),
    z.boolean(),
    z.null(),
    z.array(jsonValueSchema),
    z.record(z.string(), jsonValueSchema)
  ])
)

const styleSchema = z
  .record(z.string().trim().min(1).max(100), jsonValueSchema)
  .refine((style) => Object.keys(style).length <= 100, {
    message: 'Style cannot contain more than 100 properties'
  })

const layerBaseShape = {
  id: z.string().trim().min(1).max(128),
  visible: z.boolean().default(true),
  xPercent: z.number().min(0).max(100).optional(),
  yPercent: z.number().min(0).max(100).optional(),
  style: styleSchema.default({})
}

const textLayerSchema = z.strictObject({
  ...layerBaseShape,
  kind: z.literal('text'),
  content: z.string().max(10_000)
})

const imageLayerSchema = z.strictObject({
  ...layerBaseShape,
  kind: z.literal('image'),
  mediaId: z.uuid()
})

const captionsLayerSchema = z.strictObject({
  ...layerBaseShape,
  kind: z.literal('captions')
})

export const editorLayerSchema = z.discriminatedUnion('kind', [textLayerSchema, imageLayerSchema, captionsLayerSchema])

export const editorTimelineSegmentSchema = z
  .strictObject({
    id: z.string().trim().min(1).max(128),
    layerId: z.string().trim().min(1).max(128).optional(),
    mediaId: z.uuid().optional(),
    startTime: z.number().nonnegative(),
    durationSeconds: z.number().positive(),
    laneIndex: z.number().int().min(0).max(100).optional()
  })
  .refine((segment) => Number(segment.layerId !== undefined) + Number(segment.mediaId !== undefined) === 1, {
    message: 'Exactly one of layerId or mediaId is required',
    path: ['layerId']
  })

export const editorTimelineTrackSchema = z.strictObject({
  id: z.enum(['TEXT', 'OVERLAY_MEDIA', 'SOURCE', 'AUDIO']),
  segments: z.array(editorTimelineSegmentSchema).max(1000)
})

export const editorDocumentSchema = z
  .strictObject({
    schemaVersion: z.literal(1),
    settings: z.strictObject({
      aspectRatio: z.enum(['9:16', '1:1', '4:5', '16:9'])
    }),
    layers: z.array(editorLayerSchema).max(200),
    timelineTracks: z.array(editorTimelineTrackSchema).max(4)
  })
  .superRefine((document, context) => {
    const layerIds = new Set<string>()
    const layerKinds = new Map<string, (typeof document.layers)[number]['kind']>()

    document.layers.forEach((layer, index) => {
      if (layerIds.has(layer.id)) {
        context.addIssue({
          code: 'custom',
          message: 'Layer IDs must be unique',
          path: ['layers', index, 'id']
        })
        return
      }

      layerIds.add(layer.id)
      layerKinds.set(layer.id, layer.kind)
    })

    const trackIds = new Set<string>()
    const segmentIds = new Set<string>()

    document.timelineTracks.forEach((track, trackIndex) => {
      if (trackIds.has(track.id)) {
        context.addIssue({
          code: 'custom',
          message: 'Track IDs must be unique',
          path: ['timelineTracks', trackIndex, 'id']
        })
      }
      trackIds.add(track.id)

      track.segments.forEach((segment, segmentIndex) => {
        const segmentPath = ['timelineTracks', trackIndex, 'segments', segmentIndex] as const

        if (segmentIds.has(segment.id)) {
          context.addIssue({
            code: 'custom',
            message: 'Segment IDs must be unique',
            path: [...segmentPath, 'id']
          })
        }
        segmentIds.add(segment.id)

        if (segment.layerId !== undefined) {
          const layerKind = layerKinds.get(segment.layerId)

          if (!layerKind) {
            context.addIssue({
              code: 'custom',
              message: 'Segment layerId must reference an existing layer',
              path: [...segmentPath, 'layerId']
            })
          } else if (track.id === 'TEXT' && layerKind === 'image') {
            context.addIssue({
              code: 'custom',
              message: 'TEXT tracks cannot reference image layers',
              path: [...segmentPath, 'layerId']
            })
          }
        }

        if (track.id === 'TEXT' && segment.mediaId !== undefined) {
          context.addIssue({
            code: 'custom',
            message: 'TEXT tracks must reference a text or captions layer',
            path: [...segmentPath, 'mediaId']
          })
        }

        if ((track.id === 'SOURCE' || track.id === 'AUDIO') && segment.layerId !== undefined) {
          context.addIssue({
            code: 'custom',
            message: `${track.id} tracks must reference media`,
            path: [...segmentPath, 'layerId']
          })
        }
      })
    })
  })

export const editorSnapshotParamsSchema = z.strictObject({
  workspaceId: z.uuid(),
  projectId: z.uuid()
})

export const saveEditorSnapshotSchema = z.strictObject({
  baseVersion: z.number().int().nonnegative(),
  document: editorDocumentSchema
})

export type EditorDocument = z.infer<typeof editorDocumentSchema>
export type EditorSnapshotParams = z.infer<typeof editorSnapshotParamsSchema>
export type SaveEditorSnapshotBody = z.infer<typeof saveEditorSnapshotSchema>

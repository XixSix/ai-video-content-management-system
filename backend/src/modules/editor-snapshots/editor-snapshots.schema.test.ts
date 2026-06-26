import { describe, expect, it } from '@jest/globals'
import { editorDocumentSchema, editorSnapshotParamsSchema, saveEditorSnapshotSchema } from './editor-snapshots.schema'

const mediaId = '00000000-0000-4000-8000-000000000001'

const createDocument = () => ({
  schemaVersion: 1 as const,
  settings: {
    aspectRatio: '9:16' as const,
    mutedTrackIds: ['SOURCE', 'AUDIO'] as const
  },
  layers: [
    {
      id: 'title-layer',
      kind: 'text' as const,
      visible: true,
      xPercent: 50,
      yPercent: 20,
      widthPercent: 46,
      heightPercent: 18,
      content: 'Launch day',
      style: {
        fontFamily: 'anton',
        fontSize: 42
      }
    },
    {
      id: 'logo-layer',
      kind: 'media_overlay' as const,
      visible: true,
      mediaId,
      style: {}
    }
  ],
  timelineTracks: [
    {
      id: 'TEXT' as const,
      segments: [
        {
          id: 'title-segment',
          layerId: 'title-layer',
          startTime: 0,
          durationSeconds: 5,
          xPercent: 52,
          yPercent: 24,
          widthPercent: 48,
          heightPercent: 20,
          laneIndex: 0
        }
      ]
    },
    {
      id: 'OVERLAY_MEDIA' as const,
      segments: [
        {
          id: 'logo-segment',
          layerId: 'logo-layer',
          startTime: 1,
          durationSeconds: 4
        }
      ]
    }
  ]
})

describe('editor snapshot schemas', () => {
  it('requires workspace and project route parameters', () => {
    const workspaceId = '00000000-0000-4000-8000-000000000002'
    const projectId = '00000000-0000-4000-8000-000000000003'

    expect(editorSnapshotParamsSchema.parse({ workspaceId, projectId })).toEqual({ workspaceId, projectId })
    expect(editorSnapshotParamsSchema.safeParse({ projectId }).success).toBe(false)
  })

  it('accepts a strict version 1 composition document', () => {
    expect(
      saveEditorSnapshotSchema.parse({
        baseVersion: 0,
        document: createDocument()
      })
    ).toMatchObject({
      baseVersion: 0,
      document: {
        schemaVersion: 1,
        settings: {
          aspectRatio: '9:16',
          mutedTrackIds: ['SOURCE', 'AUDIO']
        }
      }
    })
  })

  it('rejects unsupported top-level data and UI-only state', () => {
    expect(
      editorDocumentSchema.safeParse({
        ...createDocument(),
        currentTime: 12,
        selectedItemId: 'title-layer',
        historyPast: []
      }).success
    ).toBe(false)
  })

  it('rejects invalid percentages and timing', () => {
    const invalidPosition = createDocument()
    invalidPosition.layers[0] = {
      ...invalidPosition.layers[0],
      widthPercent: 101
    }
    expect(editorDocumentSchema.safeParse(invalidPosition).success).toBe(false)

    const invalidTiming = createDocument()
    invalidTiming.timelineTracks[0].segments[0] = {
      ...invalidTiming.timelineTracks[0].segments[0],
      durationSeconds: 0
    }
    expect(editorDocumentSchema.safeParse(invalidTiming).success).toBe(false)
  })

  it('requires exactly one valid layer or media reference per segment', () => {
    const missingReference = createDocument()
    missingReference.timelineTracks[0].segments[0] = {
      id: 'title-segment',
      startTime: 0,
      durationSeconds: 5,
      laneIndex: 0
    } as (typeof missingReference.timelineTracks)[number]['segments'][number]
    expect(editorDocumentSchema.safeParse(missingReference).success).toBe(false)

    const unknownLayer = createDocument()
    unknownLayer.timelineTracks[0].segments[0] = {
      ...unknownLayer.timelineTracks[0].segments[0],
      layerId: 'missing-layer'
    }
    expect(editorDocumentSchema.safeParse(unknownLayer).success).toBe(false)
  })

  it('rejects duplicate IDs and incompatible track references', () => {
    const duplicateLayer = createDocument()
    duplicateLayer.layers[1] = {
      ...duplicateLayer.layers[1],
      id: 'title-layer'
    }
    expect(editorDocumentSchema.safeParse(duplicateLayer).success).toBe(false)

    const sourceLayerReference = createDocument()
    sourceLayerReference.timelineTracks.push({
      id: 'SOURCE',
      segments: [
        {
          id: 'source-segment',
          layerId: 'title-layer',
          startTime: 0,
          durationSeconds: 5
        }
      ]
    })
    expect(editorDocumentSchema.safeParse(sourceLayerReference).success).toBe(false)
  })
})

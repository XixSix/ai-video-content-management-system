import { describe, expect, it } from "vitest"

import { studioEditorProject } from "../../data/project.mock"
import { cloneProject } from "../../store/studio-editor-state"
import {
  getTimelineSegmentLocalTime,
  isCanvasLayerVisibleAtTime,
  isTimelineSegmentActive,
  resolveCompositionFrame,
} from "./composition"

describe("canvas composition resolution", () => {
  it("uses an inclusive start and exclusive end boundary", () => {
    const segment = {
      id: "segment",
      label: "Segment",
      selectionId: "media",
      summary: "Segment",
      tone: "base" as const,
      widthClassName: "w-[10%]",
      startTime: 5,
      durationSeconds: 3,
    }

    expect(
      isTimelineSegmentActive({
        currentTime: 5,
        media: null,
        projectDurationSeconds: 30,
        segment,
      })
    ).toBe(true)
    expect(
      isTimelineSegmentActive({
        currentTime: 7.999,
        media: null,
        projectDurationSeconds: 30,
        segment,
      })
    ).toBe(true)
    expect(
      isTimelineSegmentActive({
        currentTime: 8,
        media: null,
        projectDurationSeconds: 30,
        segment,
      })
    ).toBe(false)
    expect(
      getTimelineSegmentLocalTime({
        currentTime: 6.5,
        media: null,
        segment,
      })
    ).toBe(1.5)
  })

  it("resolves active source, overlays, audio and timed layers", () => {
    const project = cloneProject(studioEditorProject)
    project.projectMedia.push({
      id: "00000000-0000-4000-8000-000000000010",
      type: "IMAGE",
      name: "Overlay",
      summary: "Overlay image",
      origin: "LIBRARY",
      status: "READY",
      assetUrl: null,
      thumbnailUrl: null,
      format: "PNG",
      metadata: "800x800",
      usageLabel: "Project media",
    })
    project.timelineTracks = project.timelineTracks.map((track) =>
      track.id === "OVERLAY_MEDIA"
        ? {
            ...track,
            segments: [
              {
                id: "overlay-segment",
                label: "Overlay",
                selectionId: "00000000-0000-4000-8000-000000000010",
                summary: "Overlay timing",
                tone: "muted",
                widthClassName: "w-[20%]",
                startTime: 0,
                durationSeconds: 5,
              },
            ],
          }
        : track
    )
    const textLayer = project.layers.find((layer) => layer.kind === "text")!
    const textSegment = project.timelineTracks
      .find((track) => track.id === "TEXT")!
      .segments[0]

    expect(
      isCanvasLayerVisibleAtTime({
        currentTime: (textSegment.startTime ?? 0) - 0.1,
        layer: textLayer,
        project,
      })
    ).toBe(false)
    expect(
      isCanvasLayerVisibleAtTime({
        currentTime: textSegment.startTime ?? 0,
        layer: textLayer,
        project,
      })
    ).toBe(true)

    const frame = resolveCompositionFrame(project, 1)

    expect(frame.source?.trackId).toBe("SOURCE")
    expect(frame.overlays).toHaveLength(1)
    expect(frame.overlays[0].localTime).toBe(1)
    expect(frame.audio).toHaveLength(1)
    expect(frame.visibleLayerIds.has("captions")).toBe(true)
  })

  it("keeps untimed layers visible and returns black-source gaps", () => {
    const project = cloneProject(studioEditorProject)
    project.timelineTracks = project.timelineTracks.map((track) =>
      track.id === "SOURCE" ? { ...track, segments: [] } : track
    )
    const untimedLayer = project.layers.find(
      (layer) => layer.kind === "captions"
    )!
    const frame = resolveCompositionFrame(project, 12)

    expect(frame.source).toBeNull()
    expect(
      isCanvasLayerVisibleAtTime({
        currentTime: 12,
        layer: untimedLayer,
        project,
      })
    ).toBe(true)
  })
})

import { describe, expect, it } from "vitest"

import { studioEditorProject } from "../data/project.mock"
import { cloneProject } from "../store/studio-editor-state"
import {
  buildRenderDocumentFromStudioProject,
  secondsToFrame,
  STUDIO_PREVIEW_FPS,
} from "./render-document-adapter"

describe("buildRenderDocumentFromStudioProject", () => {
  it("maps project duration and source media into a render document", () => {
    const project = cloneProject(studioEditorProject)
    const document = buildRenderDocumentFromStudioProject(project)

    expect(document.durationInFrames).toBeGreaterThan(0)
    expect(document.fps).toBe(STUDIO_PREVIEW_FPS)
    expect(document.width).toBe(1080)
    expect(document.height).toBe(1920)
    expect(document.sourceVideo.src).toBe(project.media.streamUrl)
  })

  it("maps text layer timing from the text timeline track", () => {
    const project = cloneProject(studioEditorProject)
    const textLayer = project.layers.find((layer) => layer.kind === "text")!
    const textSegment = project.timelineTracks
      .find((track) => track.id === "TEXT")!
      .segments.find((segment) => segment.selectionId === textLayer.id)!
    const document = buildRenderDocumentFromStudioProject(project)
    const renderLayer = document.textLayers.find((layer) =>
      layer.id.includes(textLayer.id)
    )

    expect(renderLayer).toMatchObject({
      text: textLayer.content,
      startFrame: secondsToFrame(textSegment.startTime ?? 0),
      durationInFrames: secondsToFrame(textSegment.durationSeconds ?? 0),
      xPercent: textLayer.xPercent,
      yPercent: textLayer.yPercent,
    })
  })

  it("maps transcript words into Remotion caption entries with millisecond timing", () => {
    const project = cloneProject(studioEditorProject)
    const firstWord = project.transcriptWords[0]
    const document = buildRenderDocumentFromStudioProject(project)

    expect(document.captionLayers).toHaveLength(1)
    expect(document.captionLayers[0].captions[0]).toMatchObject({
      text: firstWord.text.trim(),
      startMs: Math.round(firstWord.startTime * 1000),
      endMs: Math.round(firstWord.endTime * 1000),
      timestampMs: Math.round(firstWord.startTime * 1000),
      confidence: firstWord.confidence,
    })
  })

  it("excludes disabled or hidden caption layers", () => {
    const project = cloneProject(studioEditorProject)
    project.layers = project.layers.map((layer) =>
      layer.kind === "captions"
        ? {
            ...layer,
            enabled: false,
          }
        : layer
    )

    const disabledDocument = buildRenderDocumentFromStudioProject(project)
    expect(disabledDocument.captionLayers).toHaveLength(0)

    project.layers = project.layers.map((layer) =>
      layer.kind === "captions"
        ? {
            ...layer,
            enabled: true,
            visible: false,
          }
        : layer
    )

    const hiddenDocument = buildRenderDocumentFromStudioProject(project)
    expect(hiddenDocument.captionLayers).toHaveLength(0)
  })

  it("leaves overlay media and audio outside RenderDocument v1", () => {
    const project = cloneProject(studioEditorProject)
    project.timelineTracks = project.timelineTracks.map((track) =>
      track.id === "OVERLAY_MEDIA" || track.id === "AUDIO"
        ? {
            ...track,
            segments: [
              {
                id: `${track.id.toLowerCase()}-segment`,
                label: track.label,
                selectionId: "media-guide-audio",
                summary: "Out-of-scope phase 2 media",
                tone: "base",
                widthClassName: "w-[25%]",
                startTime: 0,
                durationSeconds: 7,
              },
            ],
          }
        : track
    )

    const document = buildRenderDocumentFromStudioProject(project)

    expect("overlayMediaLayers" in document).toBe(false)
    expect("audioLayers" in document).toBe(false)
    expect(document).toHaveProperty("sourceVideo")
    expect(document).toHaveProperty("textLayers")
    expect(document).toHaveProperty("captionLayers")
  })
})

import { describe, expect, it } from "vitest"
import { renderDocumentSchema } from "@vidpilot/composition/render-document"

import { brandMarkItem, bRollMediaItem, createStudioMediaItem } from "../data/media.mock"
import { studioEditorProject } from "../data/project.mock"
import { cloneProject } from "../store/studio-editor-state"
import {
  buildRenderDocumentFromStudioProject,
  getRenderPreviewMediaIds,
  secondsToFrame,
  STUDIO_PREVIEW_FPS,
} from "./render-document-adapter"

describe("buildRenderDocumentFromStudioProject", () => {
  it("maps project duration and source media into a render document", () => {
    const project = cloneProject(studioEditorProject)
    const document = buildRenderDocumentFromStudioProject(project, {
      mutedTrackIds: ["SOURCE"],
    })

    expect(document.durationInFrames).toBeGreaterThan(0)
    expect(document.fps).toBe(STUDIO_PREVIEW_FPS)
    expect(document.width).toBe(1080)
    expect(document.height).toBe(1920)
    expect(document.sourceVideo.src).toBe(project.media.streamUrl)
    expect(document.sourceVideo.muted).toBe(true)
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
      widthPercent: textLayer.widthPercent,
      heightPercent: textLayer.heightPercent,
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
    expect(document.captionLayers[0]).toMatchObject({
      xPercent: 50,
      yPercent: 82,
      widthPercent: 76,
      heightPercent: 15,
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

  it("parses old render documents without overlay or audio fields", () => {
    const project = cloneProject(studioEditorProject)
    const document = buildRenderDocumentFromStudioProject(project)
    const { overlayMediaLayers, audioLayers, ...oldDocument } = document
    const parsed = renderDocumentSchema.parse(oldDocument)

    expect(overlayMediaLayers).toBeDefined()
    expect(audioLayers).toBeDefined()
    expect(parsed.overlayMediaLayers).toEqual([])
    expect(parsed.audioLayers).toEqual([])
  })

  it("parses old caption render layers without geometry fields", () => {
    const project = cloneProject(studioEditorProject)
    const document = buildRenderDocumentFromStudioProject(project)
    const oldCaptionLayers = document.captionLayers.map((captionLayer) => ({
      id: captionLayer.id,
      startFrame: captionLayer.startFrame,
      durationInFrames: captionLayer.durationInFrames,
      captions: captionLayer.captions,
      style: captionLayer.style,
    }))
    const parsed = renderDocumentSchema.parse({
      ...document,
      captionLayers: oldCaptionLayers,
    })

    expect(parsed.captionLayers[0]).toMatchObject({
      xPercent: 50,
      yPercent: 82,
      widthPercent: 76,
      heightPercent: 15,
    })
  })

  it("emits overlay video and image layers from overlay media segments", () => {
    const project = cloneProject(studioEditorProject)
    const overlayVideo = createStudioMediaItem(bRollMediaItem, {
      id: "overlay-video",
      assetUrl: null,
      type: "VIDEO",
    })
    const overlayImage = createStudioMediaItem(brandMarkItem, {
      id: "overlay-image",
      assetUrl: null,
      type: "IMAGE",
    })
    project.projectMedia.push(overlayVideo, overlayImage)
    project.timelineTracks = project.timelineTracks.map((track) =>
      track.id === "OVERLAY_MEDIA"
        ? {
            ...track,
            segments: [
              {
                id: "overlay-video-segment",
                label: "Overlay video",
                selectionId: overlayVideo.id,
                summary: "Overlay video timing",
                tone: "muted",
                widthClassName: "w-[25%]",
                startTime: 2,
                durationSeconds: 7,
                xPercent: 62,
                yPercent: 38,
                widthPercent: 34,
                heightPercent: 22,
              },
              {
                id: "overlay-image-segment",
                label: "Overlay image",
                selectionId: overlayImage.id,
                summary: "Overlay image timing",
                tone: "base",
                widthClassName: "w-[25%]",
                startTime: 4,
                durationSeconds: 3,
              },
            ],
          }
        : track
    )

    const document = buildRenderDocumentFromStudioProject(project, {
      mediaPreviewUrlById: {
        [overlayVideo.id]: "https://cdn.example.com/overlay-video.mp4",
        [overlayImage.id]: "https://cdn.example.com/overlay-image.png",
      },
    })

    expect(document.overlayMediaLayers).toHaveLength(2)
    expect(document.overlayMediaLayers[0]).toMatchObject({
      id: "overlay-video-segment",
      src: "https://cdn.example.com/overlay-video.mp4",
      mediaType: "VIDEO",
      muted: true,
      startFrame: secondsToFrame(2),
      durationInFrames: secondsToFrame(7),
      xPercent: 62,
      yPercent: 38,
      widthPercent: 34,
      heightPercent: 22,
    })
    expect(document.overlayMediaLayers[1]).toMatchObject({
      id: "overlay-image-segment",
      src: "https://cdn.example.com/overlay-image.png",
      mediaType: "IMAGE",
      startFrame: secondsToFrame(4),
      durationInFrames: secondsToFrame(3),
    })
    expect(renderDocumentSchema.parse(document).overlayMediaLayers).toHaveLength(2)
  })

  it("emits muted audio layers from audio timeline segments", () => {
    const project = cloneProject(studioEditorProject)
    const audioMedia = project.projectMedia.find((media) => media.type === "AUDIO")!
    const document = buildRenderDocumentFromStudioProject(project, {
      mediaPreviewUrlById: {
        [audioMedia.id]: "https://cdn.example.com/audio.mp3",
      },
      mutedTrackIds: ["AUDIO"],
    })

    expect(document.audioLayers).toHaveLength(1)
    expect(document.audioLayers[0]).toMatchObject({
      id: "audio-bed",
      src: "https://cdn.example.com/audio.mp3",
      startFrame: 0,
      durationInFrames: secondsToFrame(8),
      volume: 1,
      muted: true,
    })
    expect(renderDocumentSchema.parse(document).audioLayers).toHaveLength(1)
  })

  it("returns all media ids needed by the preview render document", () => {
    const project = cloneProject(studioEditorProject)
    const overlayVideo = createStudioMediaItem(bRollMediaItem, {
      id: "overlay-video",
      type: "VIDEO",
    })
    project.projectMedia.push(overlayVideo)
    project.timelineTracks = project.timelineTracks.map((track) =>
      track.id === "OVERLAY_MEDIA"
        ? {
            ...track,
            segments: [
              {
                id: "overlay-video-segment",
                label: "Overlay video",
                selectionId: overlayVideo.id,
                summary: "Overlay video timing",
                tone: "muted",
                widthClassName: "w-[25%]",
                startTime: 2,
                durationSeconds: 7,
              },
            ],
          }
        : track
    )

    expect(getRenderPreviewMediaIds(project)).toEqual(
      expect.arrayContaining(["source-media", "media-guide-audio", overlayVideo.id])
    )
  })
})

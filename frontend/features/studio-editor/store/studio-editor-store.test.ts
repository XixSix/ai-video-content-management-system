import { describe, expect, it } from "vitest"

import {
  bRollMediaItem,
  createStudioMediaItem,
  stillFrameItem,
} from "../data/media.mock"
import { studioEditorProject } from "../data/project.mock"
import { cloneProject } from "./studio-editor-state"
import { createStudioEditorStore } from "./studio-editor-store"

describe("Studio editor permissions", () => {
  it("sets a blank project source without replacing other composition tracks", () => {
    const blankProject = cloneProject(studioEditorProject)
    blankProject.media.durationSeconds = 0
    blankProject.media.durationLabel = "0:00"
    blankProject.projectMedia = []
    blankProject.sourceMedia = {
      id: "blank-source",
      name: "No source media",
      durationLabel: "0:00",
      resolutionLabel: "No source media",
      summary: "No source media",
      thumbnailUrl: null,
    }
    blankProject.timelineTracks = blankProject.timelineTracks.map((track) =>
      track.id === "SOURCE" ? { ...track, segments: [] } : track
    )
    const sourceProject = cloneProject(studioEditorProject)
    const textSegmentsBefore =
      blankProject.timelineTracks.find((track) => track.id === "TEXT")
        ?.segments ?? []
    const store = createStudioEditorStore(blankProject, true)

    store.getState().setProjectSource(sourceProject)

    const state = store.getState()
    const sourceTrack = state.project.timelineTracks.find(
      (track) => track.id === "SOURCE"
    )

    expect(state.project.media.id).toBe(sourceProject.media.id)
    expect(state.project.media.durationSeconds).toBe(
      sourceProject.media.durationSeconds
    )
    expect(sourceTrack?.segments).toHaveLength(1)
    expect(sourceTrack?.segments[0]).toMatchObject({
      durationSeconds: sourceProject.media.durationSeconds,
      selectionId: sourceProject.sourceMedia.id,
      startTime: 0,
    })
    expect(
      state.project.timelineTracks.find((track) => track.id === "TEXT")
        ?.segments
    ).toEqual(textSegmentsBefore)
  })

  it("keeps video duration and only defaults image duration on timeline insert", () => {
    const video = createStudioMediaItem(bRollMediaItem)
    const image = createStudioMediaItem(stillFrameItem)
    const videoProject = cloneProject(studioEditorProject)
    const imageProject = cloneProject(studioEditorProject)
    videoProject.projectMedia.push(video)
    imageProject.projectMedia.push(image)

    const videoStore = createStudioEditorStore(videoProject, true)
    videoStore.getState().addProjectMediaToTimeline(video.id)
    const videoSegment =
      videoStore
        .getState()
        .project.timelineTracks.find((track) => track.id === "OVERLAY_MEDIA")
        ?.segments.find((segment) => segment.selectionId === video.id)

    const imageStore = createStudioEditorStore(imageProject, true)
    imageStore.getState().addProjectMediaToTimeline(image.id)
    const imageSegment =
      imageStore
        .getState()
        .project.timelineTracks.find((track) => track.id === "OVERLAY_MEDIA")
        ?.segments.find((segment) => segment.selectionId === image.id)

    expect(videoSegment?.durationSeconds).toBe(bRollMediaItem.duration)
    expect(imageSegment?.durationSeconds).toBe(8)
  })

  it("adds source video repeatedly as overlays without changing the source track", () => {
    const project = cloneProject(studioEditorProject)
    const sourceTrackBefore = project.timelineTracks.find(
      (track) => track.id === "SOURCE"
    )?.segments
    const sourceMedia = project.projectMedia.find(
      (item) => item.origin === "SOURCE"
    )

    expect(sourceMedia).toBeDefined()

    const store = createStudioEditorStore(project, true)
    store.getState().addProjectMediaToTimeline(sourceMedia!.id)
    store.getState().addProjectMediaToTimeline(sourceMedia!.id)

    const state = store.getState()
    const sourceTrack = state.project.timelineTracks.find(
      (track) => track.id === "SOURCE"
    )
    const overlaySegments =
      state.project.timelineTracks
        .find((track) => track.id === "OVERLAY_MEDIA")
        ?.segments.filter(
          (segment) => segment.selectionId === sourceMedia!.id
        ) ?? []

    expect(sourceTrack?.segments).toEqual(sourceTrackBefore)
    expect(overlaySegments).toHaveLength(2)
    expect(new Set(overlaySegments.map((segment) => segment.id)).size).toBe(2)
    expect(overlaySegments.every((segment) => segment.durationSeconds === 28))
      .toBe(true)
  })

  it("mutes overlay media by default and toggles the track mute state", () => {
    const store = createStudioEditorStore(
      cloneProject(studioEditorProject),
      true
    )

    expect(store.getState().mutedTrackIds).toContain("OVERLAY_MEDIA")

    store.getState().toggleTrackMute("OVERLAY_MEDIA")
    expect(store.getState().mutedTrackIds).not.toContain("OVERLAY_MEDIA")

    store.getState().toggleTrackMute("OVERLAY_MEDIA")
    expect(store.getState().mutedTrackIds).toContain("OVERLAY_MEDIA")
  })

  it("keeps playback available while blocking composition edits in view-only mode", () => {
    const store = createStudioEditorStore(cloneProject(studioEditorProject), false)
    const initialAspectRatio = store.getState().project.media.aspectRatio

    store.getState().updateProjectAspectRatio("16:9")
    store.getState().addTextLayerFromPreset("hook-title")
    store.getState().seekToTime(12)

    expect(store.getState().project.media.aspectRatio).toBe(initialAspectRatio)
    expect(store.getState().project.layers).toHaveLength(
      studioEditorProject.layers.length
    )
    expect(store.getState().currentTime).toBe(12)
  })

  it("removes detached media and its timeline references", () => {
    const project = cloneProject(studioEditorProject)
    const removableMedia = project.projectMedia.find(
      (item) => item.origin !== "SOURCE"
    )

    expect(removableMedia).toBeDefined()

    const store = createStudioEditorStore(project, true)
    store.getState().removeProjectMedia(removableMedia!.id)

    expect(
      store.getState().project.projectMedia.some(
        (item) => item.id === removableMedia!.id
      )
    ).toBe(false)
    expect(
      store
        .getState()
        .project.timelineTracks.flatMap((track) => track.segments)
        .some(
          (segment) =>
            segment.selectionId === removableMedia!.id ||
            segment.selectionId === removableMedia!.linkedSelectionId
        )
    ).toBe(false)
  })
})

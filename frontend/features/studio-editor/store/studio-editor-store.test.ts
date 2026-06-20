import { describe, expect, it } from "vitest"

import { studioEditorProject } from "../data/project.mock"
import { cloneProject } from "./studio-editor-state"
import { createStudioEditorStore } from "./studio-editor-store"

describe("Studio editor permissions", () => {
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

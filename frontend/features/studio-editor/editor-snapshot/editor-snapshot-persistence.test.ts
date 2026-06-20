import { describe, expect, it } from "vitest"

import { ApiError } from "@/lib/api/api-error"

import { getEditorSnapshotVersionConflict } from "./editor-snapshot-persistence"

describe("editor snapshot conflict parsing", () => {
  it("reads the optimistic concurrency versions from API details", () => {
    const error = new ApiError(
      "Editor snapshot version changed",
      409,
      "EDITOR_SNAPSHOT_VERSION_CONFLICT",
      {
        currentVersion: 5,
        baseVersion: 4,
      }
    )

    expect(getEditorSnapshotVersionConflict(error)).toEqual({
      currentVersion: 5,
      baseVersion: 4,
    })
  })

  it("does not treat unrelated errors as version conflicts", () => {
    expect(
      getEditorSnapshotVersionConflict(
        new ApiError("Forbidden", 403, "FORBIDDEN")
      )
    ).toBeNull()
  })
})

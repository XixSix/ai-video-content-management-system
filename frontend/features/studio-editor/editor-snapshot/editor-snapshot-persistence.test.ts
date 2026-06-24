import { describe, expect, it, vi } from "vitest"

import { ApiError } from "@/lib/api/api-error"

import {
  canSaveEditorSnapshotNow,
  getEditorSnapshotVersionConflict,
  saveEditorSnapshotNow,
} from "./editor-snapshot-persistence"

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

describe("editor snapshot manual save gate", () => {
  it("allows export save when the editable snapshot is not blocked", () => {
    expect(
      canSaveEditorSnapshotNow({
        canEdit: true,
        conflict: null,
        status: "dirty",
      })
    ).toBe(true)
  })

  it("blocks export save on conflict, error, or view-only status", () => {
    expect(
      canSaveEditorSnapshotNow({
        canEdit: true,
        conflict: { currentVersion: 5, baseVersion: 4 },
        status: "dirty",
      })
    ).toBe(false)
    expect(
      canSaveEditorSnapshotNow({
        canEdit: true,
        conflict: null,
        status: "error",
      })
    ).toBe(false)
    expect(
      canSaveEditorSnapshotNow({
        canEdit: false,
        conflict: null,
        status: "view-only",
      })
    ).toBe(false)
  })

  it("saves a dirty document before resolving", async () => {
    let dirty = true
    const saveLatest = vi.fn(async () => {
      dirty = false
      return true
    })

    await expect(
      saveEditorSnapshotNow({
        canStart: () => true,
        clearTimer: vi.fn(),
        getInFlight: () => null,
        isDirty: () => dirty,
        markTrailingSave: vi.fn(),
        saveLatest,
      })
    ).resolves.toBe(true)

    expect(saveLatest).toHaveBeenCalledTimes(1)
  })

  it("returns false when the current save state is blocked", async () => {
    const saveLatest = vi.fn(async () => true)

    await expect(
      saveEditorSnapshotNow({
        canStart: () => false,
        clearTimer: vi.fn(),
        getInFlight: () => null,
        isDirty: () => true,
        markTrailingSave: vi.fn(),
        saveLatest,
      })
    ).resolves.toBe(false)

    expect(saveLatest).not.toHaveBeenCalled()
  })
})

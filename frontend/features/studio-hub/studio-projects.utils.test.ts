import { describe, expect, it } from "vitest"

import { getEditorHref } from "./studio-projects.utils"

describe("Studio project routes", () => {
  it("builds a workspace-scoped editor deep link", () => {
    expect(getEditorHref("workspace-id", "project-id")).toBe(
      "/workspaces/workspace-id/editor/project-id"
    )
  })
})

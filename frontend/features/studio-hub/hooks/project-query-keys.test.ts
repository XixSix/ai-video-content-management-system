import { describe, expect, it } from "vitest"

import { projectQueryKeys } from "./project-query-keys"

describe("projectQueryKeys", () => {
  it("keeps list filters and project details in separate cache branches", () => {
    expect(projectQueryKeys.list("workspace-a", { page: 1, status: "DRAFT" })).toEqual([
      "projects",
      "workspace-a",
      "list",
      { page: 1, status: "DRAFT" },
    ])
    expect(projectQueryKeys.detail("workspace-a", "project-id")).toEqual([
      "projects",
      "workspace-a",
      "detail",
      "project-id",
    ])
    expect(projectQueryKeys.detail("workspace-b", "project-id")).not.toEqual(
      projectQueryKeys.detail("workspace-a", "project-id")
    )
  })
})

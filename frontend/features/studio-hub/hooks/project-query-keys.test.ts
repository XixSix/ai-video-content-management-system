import { describe, expect, it } from "vitest"

import { projectQueryKeys } from "./project-query-keys"

describe("projectQueryKeys", () => {
  it("keeps list filters and project details in separate cache branches", () => {
    expect(projectQueryKeys.list({ page: 1, status: "DRAFT" })).toEqual([
      "projects",
      "list",
      { page: 1, status: "DRAFT" },
    ])
    expect(projectQueryKeys.detail("project-id")).toEqual([
      "projects",
      "detail",
      "project-id",
    ])
  })
})

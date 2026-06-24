import { describe, expect, it } from "vitest"

import {
  getDefaultCanvasGeometry,
  moveCanvasGeometry,
  resizeCanvasGeometry,
} from "./geometry"

describe("canvas geometry", () => {
  it("returns stable defaults for editor overlay kinds", () => {
    expect(getDefaultCanvasGeometry("text")).toEqual({
      xPercent: 50,
      yPercent: 50,
      widthPercent: 46,
      heightPercent: 18,
    })
    expect(getDefaultCanvasGeometry("captions")).toEqual({
      xPercent: 50,
      yPercent: 82,
      widthPercent: 76,
      heightPercent: 15,
    })
    expect(getDefaultCanvasGeometry("overlay")).toEqual({
      xPercent: 50,
      yPercent: 50,
      widthPercent: 70,
      heightPercent: 40,
    })
  })

  it("moves geometry while keeping the box inside the canvas", () => {
    const nextGeometry = moveCanvasGeometry(getDefaultCanvasGeometry("overlay"), {
      xPercent: 80,
      yPercent: -80,
    })

    expect(nextGeometry).toEqual({
      xPercent: 65,
      yPercent: 20,
      widthPercent: 70,
      heightPercent: 40,
    })
  })

  it("resizes geometry from a handle and clamps minimum size", () => {
    const nextGeometry = resizeCanvasGeometry(
      getDefaultCanvasGeometry("text"),
      "bottom-right",
      {
        xPercent: -43,
        yPercent: -15,
      }
    )

    expect(nextGeometry.widthPercent).toBe(6)
    expect(nextGeometry.heightPercent).toBe(6)
  })
})

"use client"

import {
  DEFAULT_CAPTION_STROKE_WIDTH,
  studioCaptionPresets,
} from "../../data/caption-presets.data"
import { studioTextPresets } from "../../data/text-style.data"
import type { StudioCanvasLayer } from "../../studio.types"
import {
  getSmartTimelineInsertStartTime,
  getTimelineWidthClassName,
  insertSegmentWithPush,
} from "../../timeline/lib/operations"
import { recordEditorHistory } from "./history-actions"
import type {
  CaptionLayerStyleUpdate,
  StudioEditorGet,
  StudioEditorSet,
  TextLayerStyleUpdate,
} from "../studio-editor-store.types"

export function createLayerActions(
  set: StudioEditorSet,
  get: StudioEditorGet
) {
  return {
    addTextLayerFromPreset: (presetId: string) => {
      const preset = studioTextPresets.find((item) => item.id === presetId)

      if (!preset) {
        return
      }

      recordEditorHistory(set, get)

      const layerId = `text-${Date.now()}`
      const defaultTextContent = "Text"
      const segmentDurationSeconds = 5
      const nextLayer: StudioCanvasLayer = {
        id: layerId,
        kind: "text",
        label: defaultTextContent,
        summary: preset.styleSummary,
        animationBy: "text",
        animationDuration: preset.defaultStyle.animationDuration,
        animationName: "none",
        backgroundColor: preset.defaultStyle.backgroundColor,
        backgroundEnabled: false,
        backgroundRadius: 0,
        backgroundStyle: preset.defaultStyle.backgroundStyle,
        boxWidth: preset.defaultStyle.boxWidth,
        className: preset.className,
        content: defaultTextContent,
        fontFamily: preset.defaultStyle.fontFamily,
        fontSize: preset.defaultStyle.fontSize,
        fontStyle: preset.defaultStyle.fontStyle,
        fontWeight: preset.defaultStyle.fontWeight,
        frameClassName: preset.frameClassName,
        presetId: preset.id,
        textAlign: "center",
        textColor: preset.defaultStyle.textColor,
        xPercent: 50,
        yPercent: 50,
      }

      set((state) => ({
        activeTool: "text",
        project: insertSegmentWithPush({
          project: {
            ...state.project,
            layers: [...state.project.layers, nextLayer],
          },
          segment: {
            id: `segment-${layerId}`,
            content: defaultTextContent,
            durationSeconds: segmentDurationSeconds,
            label: defaultTextContent,
            selectionId: layerId,
            startTime: getSmartTimelineInsertStartTime({
              durationSeconds: segmentDurationSeconds,
              preferredStartTime: state.currentTime,
              project: state.project,
              trackId: "TEXT",
            }),
            summary: preset.styleSummary,
            tone: "muted",
            widthClassName: getTimelineWidthClassName(
              segmentDurationSeconds,
              state.project.media.durationSeconds
            ),
          },
          trackId: "TEXT",
        }),
        selectedItemId: layerId,
      }))
    },
    applyCaptionPreset: (presetId: string) => {
      const { project } = get()
      const preset = studioCaptionPresets.find((item) => item.id === presetId)
      const captionLayer = project.layers.find((layer) => layer.kind === "captions")

      if (!preset || !captionLayer) {
        return
      }

      const isUnchanged = Object.entries(preset.style).every(([key, value]) => {
        return captionLayer[key as keyof typeof preset.style] === value
      })

      if (isUnchanged) {
        return
      }

      recordEditorHistory(set, get)

      set((state) => ({
        project: {
          ...state.project,
          layers: state.project.layers.map((layer) =>
            layer.kind === "captions" ? { ...layer, ...preset.style, presetId } : layer
          ),
        },
      }))
    },
    updateCaptionLayerStyle: (style: CaptionLayerStyleUpdate) => {
      const captionLayer = get().project.layers.find((layer) => layer.kind === "captions")

      if (!captionLayer) {
        return
      }

      const normalizedStyle =
        style.strokeEnabled === true &&
        style.strokeWidth === undefined &&
        !captionLayer.strokeWidth
          ? {
              ...style,
              strokeWidth: DEFAULT_CAPTION_STROKE_WIDTH,
            }
          : style

      recordEditorHistory(set, get)

      set((state) => ({
        project: {
          ...state.project,
          layers: state.project.layers.map((layer) =>
            layer.kind === "captions" ? { ...layer, ...normalizedStyle } : layer
          ),
        },
      }))
    },
    updateTextLayerContent: (layerId: string, content: string) => {
      const layer = get().project.layers.find((item) => item.id === layerId)

      if (!layer || layer.kind !== "text" || layer.content === content) {
        return
      }

      recordEditorHistory(set, get)

      set((state) => ({
        project: {
          ...state.project,
          layers: state.project.layers.map((layer) =>
            layer.id === layerId && layer.kind === "text" ? { ...layer, content } : layer
          ),
          timelineTracks: state.project.timelineTracks.map((track) => ({
            ...track,
            segments: track.segments.map((segment) =>
              segment.selectionId === layerId ? { ...segment, content } : segment
            ),
          })),
        },
      }))
    },
    updateCanvasLayerPosition: (
      layerId: string,
      position: {
        xPercent: number
        yPercent: number
      },
      options?: {
        recordHistory?: boolean
      }
    ) => {
      const layer = get().project.layers.find((item) => item.id === layerId)

      if (!layer || (layer.kind !== "text" && layer.kind !== "captions")) {
        return
      }

      if (options?.recordHistory) {
        recordEditorHistory(set, get)
      }

      set((state) => ({
        project: {
          ...state.project,
          layers: state.project.layers.map((layer) =>
            layer.id === layerId && (layer.kind === "text" || layer.kind === "captions")
              ? { ...layer, ...position }
              : layer
          ),
        },
      }))
    },
    updateTextLayerStyle: (layerId: string, style: TextLayerStyleUpdate) => {
      recordEditorHistory(set, get)

      set((state) => ({
        project: {
          ...state.project,
          layers: state.project.layers.map((layer) =>
            layer.id === layerId && layer.kind === "text" ? { ...layer, ...style } : layer
          ),
        },
      }))
    },
  }
}

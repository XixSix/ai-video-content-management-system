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
      const segmentDurationSeconds = 5
      const nextLayer: StudioCanvasLayer = {
        id: layerId,
        kind: "text",
        label: preset.label,
        summary: preset.styleSummary,
        animationBy: preset.defaultStyle.animationBy,
        animationDuration: preset.defaultStyle.animationDuration,
        animationName: preset.defaultStyle.animationName,
        backgroundColor: preset.defaultStyle.backgroundColor,
        backgroundRadius: preset.defaultStyle.backgroundRadius,
        backgroundStyle: preset.defaultStyle.backgroundStyle,
        boxWidth: preset.defaultStyle.boxWidth,
        className: preset.className,
        content: preset.previewText,
        fontFamily: preset.defaultStyle.fontFamily,
        fontSize: preset.defaultStyle.fontSize,
        fontStyle: preset.defaultStyle.fontStyle,
        fontWeight: preset.defaultStyle.fontWeight,
        frameClassName: preset.frameClassName,
        presetId: preset.id,
        textAlign: preset.defaultStyle.textAlign,
        textColor: preset.defaultStyle.textColor,
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
            content: preset.previewText,
            durationSeconds: segmentDurationSeconds,
            label: preset.label,
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

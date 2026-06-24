import type { Caption } from "@remotion/captions";
import { z } from "zod";

const cssValueSchema = z.union([z.string(), z.number()]);

const styleSchema = z.record(z.string(), cssValueSchema);

const captionSchema = z.object({
  text: z.string(),
  startMs: z.number().nonnegative(),
  endMs: z.number().positive(),
  timestampMs: z.number().nullable(),
  confidence: z.number().nullable(),
});

const layerBaseSchema = z.object({
  id: z.string().min(1),
  startFrame: z.number().int().nonnegative(),
  durationInFrames: z.number().int().positive(),
});

const positionedLayerSchema = layerBaseSchema.extend({
  xPercent: z.number().min(0).max(100).default(50),
  yPercent: z.number().min(0).max(100).default(50),
  widthPercent: z.number().min(1).max(100).default(100),
  heightPercent: z.number().min(1).max(100).default(100),
});

const textPositionedLayerSchema = layerBaseSchema.extend({
  xPercent: z.number().min(0).max(100).default(0),
  yPercent: z.number().min(0).max(100).default(0),
  widthPercent: z.number().min(1).max(100).default(100),
  heightPercent: z.number().min(1).max(100).default(100),
});

const captionPositionedLayerSchema = layerBaseSchema.extend({
  xPercent: z.number().min(0).max(100).default(50),
  yPercent: z.number().min(0).max(100).default(82),
  widthPercent: z.number().min(1).max(100).default(76),
  heightPercent: z.number().min(1).max(100).default(15),
});

export const renderDocumentSchema = z.object({
  version: z.literal(1),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  fps: z.number().int().positive(),
  durationInFrames: z.number().int().positive(),
  backgroundColor: z.string().default("#000000"),
  sourceVideo: z.object({
    src: z.string(),
    startFrame: z.number().int().nonnegative(),
    durationInFrames: z.number().int().positive(),
    fit: z.enum(["cover", "contain"]).default("cover"),
    muted: z.boolean().default(false),
  }),
  overlayMediaLayers: z
    .array(
      positionedLayerSchema.extend({
        src: z.string(),
        mediaType: z.enum(["VIDEO", "IMAGE"]),
        fit: z.enum(["cover", "contain"]).default("contain"),
        muted: z.boolean().default(true),
        style: styleSchema.default({}),
      }),
    )
    .default([]),
  audioLayers: z
    .array(
      layerBaseSchema.extend({
        src: z.string(),
        volume: z.number().min(0).default(1),
        muted: z.boolean().default(false),
      }),
    )
    .default([]),
  textLayers: z.array(
    textPositionedLayerSchema.extend({
      text: z.string(),
      style: styleSchema,
    }),
  ),
  captionLayers: z.array(
    captionPositionedLayerSchema.extend({
      captions: z.array(captionSchema),
      style: styleSchema,
    }),
  ),
});

export type RenderDocument = z.infer<typeof renderDocumentSchema>;
export type RenderTextLayer = RenderDocument["textLayers"][number];
export type RenderCaptionLayer = RenderDocument["captionLayers"][number] & {
  captions: Caption[];
};
export type RenderOverlayMediaLayer = RenderDocument["overlayMediaLayers"][number];
export type RenderAudioLayer = RenderDocument["audioLayers"][number];

export const DEFAULT_RENDER_DOCUMENT: RenderDocument = {
  version: 1,
  width: 1920,
  height: 1080,
  fps: 30,
  durationInFrames: 150,
  backgroundColor: "#000000",
  sourceVideo: {
    src: "",
    startFrame: 0,
    durationInFrames: 150,
    fit: "cover",
    muted: false,
  },
  overlayMediaLayers: [],
  audioLayers: [],
  textLayers: [],
  captionLayers: [],
};

import { z } from 'zod'

export const mediaChapterParamsSchema = z.strictObject({
  mediaId: z.uuid()
})

export const generateChaptersSchema = z
  .strictObject({
    minChapterDuration: z.number().min(30).max(600).default(180),
    targetChapterDuration: z.number().min(30).max(1800).default(300),
    maxChapters: z.number().int().min(3).max(20).default(5),
    useLlm: z.boolean().default(true),
    useEmbeddings: z.boolean().default(false)
  })
  .refine((data) => data.targetChapterDuration >= data.minChapterDuration, {
    message: 'targetChapterDuration must be greater than or equal to minChapterDuration',
    path: ['targetChapterDuration']
  })

export type MediaChapterParams = z.infer<typeof mediaChapterParamsSchema>
export type GenerateChaptersBody = z.infer<typeof generateChaptersSchema>

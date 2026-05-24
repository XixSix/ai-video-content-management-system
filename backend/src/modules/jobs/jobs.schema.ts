import { z } from 'zod'

export const jobParamsSchema = z.strictObject({
  jobId: z.uuid()
})

export type JobParams = z.infer<typeof jobParamsSchema>

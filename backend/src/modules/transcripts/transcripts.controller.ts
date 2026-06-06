import type { ParamsBodyRequestHandler, ParamsRequestHandler } from '../../types/express'
import { sendSuccess } from '../../utils/response'
import type {
  BurnTranscriptBody,
  ExportTranscriptBody,
  GenerateTranscriptBody,
  MediaTranscriptParams,
  TranscriptParams
} from './transcripts.schema'
import * as transcriptsService from './transcripts.service'
import type {
  GenerateTranscriptResult,
  TranscriptDetailData,
  TranscriptJobResult,
  TranscriptSegmentData,
  TranscriptSummaryData
} from './transcripts.types'

export const generate: ParamsBodyRequestHandler<MediaTranscriptParams, GenerateTranscriptBody> = async (
  req,
  res,
  next
): Promise<void> => {
  try {
    const result: GenerateTranscriptResult = await transcriptsService.generateTranscript({
      userId: req.user!.id,
      mediaId: req.params.mediaId,
      ...req.body
    })

    sendSuccess<GenerateTranscriptResult>(res, result, 201)
  } catch (error: unknown) {
    next(error)
  }
}

export const listByMedia: ParamsRequestHandler<MediaTranscriptParams> = async (req, res, next): Promise<void> => {
  try {
    const transcripts = await transcriptsService.listMediaTranscripts(req.user!.id, req.params.mediaId)

    sendSuccess<{ transcripts: TranscriptSummaryData[] }>(res, { transcripts })
  } catch (error: unknown) {
    next(error)
  }
}

export const get: ParamsRequestHandler<TranscriptParams> = async (req, res, next): Promise<void> => {
  try {
    const transcript = await transcriptsService.getTranscript(req.user!.id, req.params.transcriptId)

    sendSuccess<{ transcript: TranscriptDetailData }>(res, { transcript })
  } catch (error: unknown) {
    next(error)
  }
}

export const segments: ParamsRequestHandler<TranscriptParams> = async (req, res, next): Promise<void> => {
  try {
    const segments = await transcriptsService.listTranscriptSegments(req.user!.id, req.params.transcriptId)

    sendSuccess<{ segments: TranscriptSegmentData[] }>(res, { segments })
  } catch (error: unknown) {
    next(error)
  }
}

export const exportTranscript: ParamsBodyRequestHandler<TranscriptParams, ExportTranscriptBody> = async (
  req,
  res,
  next
): Promise<void> => {
  try {
    const result = await transcriptsService.exportTranscript({
      userId: req.user!.id,
      transcriptId: req.params.transcriptId,
      ...req.body
    })

    sendSuccess<TranscriptJobResult>(res, result, 201)
  } catch (error: unknown) {
    next(error)
  }
}

export const burnTranscript: ParamsBodyRequestHandler<TranscriptParams, BurnTranscriptBody> = async (
  req,
  res,
  next
): Promise<void> => {
  try {
    const result = await transcriptsService.burnTranscript({
      userId: req.user!.id,
      transcriptId: req.params.transcriptId
    })

    sendSuccess<TranscriptJobResult>(res, result, 201)
  } catch (error: unknown) {
    next(error)
  }
}

import { AppError } from '../../utils/app-error'

export class ShortClipsError extends AppError {
  private constructor(message: string, statusCode: number, code: string) {
    super(message, statusCode, code)
  }

  static noTranscript(message = 'No transcript available for this media'): ShortClipsError {
    return new ShortClipsError(message, 409, 'SHORT_CLIPS_TRANSCRIPT_NOT_FOUND')
  }

  static noTranscriptSegments(message = 'No transcript segments available for this media'): ShortClipsError {
    return new ShortClipsError(message, 409, 'SHORT_CLIPS_TRANSCRIPT_SEGMENTS_NOT_FOUND')
  }

  static candidateNotFound(message = 'Clip candidate not found'): ShortClipsError {
    return new ShortClipsError(message, 404, 'CLIP_CANDIDATE_NOT_FOUND')
  }

  static candidateForbidden(message = 'Clip candidate does not belong to the current user'): ShortClipsError {
    return new ShortClipsError(message, 403, 'FORBIDDEN')
  }

  static queuePublishFailed(message = 'Failed to publish short clip generation job'): ShortClipsError {
    return new ShortClipsError(message, 502, 'SHORT_CLIPS_QUEUE_PUBLISH_FAILED')
  }
}

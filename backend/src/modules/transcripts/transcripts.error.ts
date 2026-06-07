import { AppError } from '../../utils/app-error'
import type { ErrorDetails } from '../../utils/app-error'

export class TranscriptError extends AppError {
  private constructor(message: string, statusCode: number, code: string, details?: ErrorDetails) {
    super(message, statusCode, code, details)
  }

  static notFound(message = 'Transcript not found'): TranscriptError {
    return new TranscriptError(message, 404, 'TRANSCRIPT_NOT_FOUND')
  }

  static queuePublishFailed(message = 'Failed to publish transcript generation job'): TranscriptError {
    return new TranscriptError(message, 502, 'QUEUE_PUBLISH_FAILED')
  }

  static versionConflict(currentVersion: number, baseTranscriptVersion: number): TranscriptError {
    return new TranscriptError('Transcript version changed', 409, 'TRANSCRIPT_EDITOR_VERSION_CONFLICT', {
      currentVersion,
      baseTranscriptVersion
    })
  }
}

import { AppError } from '../../utils/app-error'

export class ChapteringError extends AppError {
  private constructor(message: string, statusCode: number, code: string) {
    super(message, statusCode, code)
  }

  static noTranscript(message = 'No transcript available for this media'): ChapteringError {
    return new ChapteringError(message, 409, 'CHAPTERING_TRANSCRIPT_NOT_FOUND')
  }

  static queuePublishFailed(message = 'Failed to publish chapter generation job'): ChapteringError {
    return new ChapteringError(message, 502, 'CHAPTERING_QUEUE_PUBLISH_FAILED')
  }
}

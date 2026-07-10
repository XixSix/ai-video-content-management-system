import { AppError } from '../../utils/app-error'

export class GenerateChaptersError extends AppError {
  private constructor(message: string, statusCode: number, code: string) {
    super(message, statusCode, code)
  }

  static noTranscript(message = 'No transcript available for this media'): GenerateChaptersError {
    return new GenerateChaptersError(message, 409, 'GENERATE_CHAPTERS_TRANSCRIPT_NOT_FOUND')
  }

  static queuePublishFailed(message = 'Failed to publish chapter generation job'): GenerateChaptersError {
    return new GenerateChaptersError(message, 502, 'GENERATE_CHAPTERS_QUEUE_PUBLISH_FAILED')
  }
}

import { AppError } from '../../utils/app-error'

export class JobsError extends AppError {
  private constructor(message: string, statusCode: number, code: string) {
    super(message, statusCode, code)
  }

  static notFound(message = 'Job not found'): JobsError {
    return new JobsError(message, 404, 'JOB_NOT_FOUND')
  }
}

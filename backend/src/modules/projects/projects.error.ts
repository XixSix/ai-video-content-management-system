import { AppError } from '../../utils/app-error'

export class ProjectsError extends AppError {
  private constructor(message: string, statusCode: number, code: string) {
    super(message, statusCode, code)
  }

  static notFound(message = 'Project not found'): ProjectsError {
    return new ProjectsError(message, 404, 'PROJECT_NOT_FOUND')
  }

  static forbidden(message = 'Project cannot be modified by the current user'): ProjectsError {
    return new ProjectsError(message, 403, 'FORBIDDEN')
  }

  static mediaNotFound(message = 'Project media was not found'): ProjectsError {
    return new ProjectsError(message, 404, 'PROJECT_MEDIA_NOT_FOUND')
  }

  static invalidMedia(message = 'Media cannot be used by this project'): ProjectsError {
    return new ProjectsError(message, 409, 'PROJECT_MEDIA_INVALID')
  }

  static duplicateMedia(message = 'Media is already attached to the project with this role'): ProjectsError {
    return new ProjectsError(message, 409, 'PROJECT_MEDIA_CONFLICT')
  }
}

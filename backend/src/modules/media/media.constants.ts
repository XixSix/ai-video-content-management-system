import { config } from '../../config'

export const MAX_UPLOAD_FILE_SIZE_BYTES: number = config.upload.multipartPartSizeBytes * config.upload.maxMultipartParts

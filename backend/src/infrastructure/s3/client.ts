import { S3Client } from '@aws-sdk/client-s3'
import { config } from '../../config'

const s3ClientConfig = {
  region: config.s3.region,
  endpoint: config.s3.endpoint,
  forcePathStyle: config.s3.forcePathStyle,
  credentials: {
    accessKeyId: config.s3.accessKeyId,
    secretAccessKey: config.s3.secretAccessKey
  }
}

const presignS3ClientConfig = {
  ...s3ClientConfig,
  endpoint: config.s3.publicEndpoint ?? config.s3.endpoint
}

export const s3Client = new S3Client(s3ClientConfig)
export const presignS3Client = new S3Client(presignS3ClientConfig)

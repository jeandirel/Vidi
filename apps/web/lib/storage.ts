import { S3Client } from '@aws-sdk/client-s3';
import { ApiError } from './api';
export function storage() {
  if (!process.env.S3_BUCKET || !process.env.S3_REGION)
    throw new ApiError(503, 'Le stockage média doit être connecté.');
  return {
    bucket: process.env.S3_BUCKET,
    client: new S3Client({
      region: process.env.S3_REGION,
      endpoint: process.env.S3_ENDPOINT,
      forcePathStyle: !!process.env.S3_ENDPOINT,
    }),
  };
}

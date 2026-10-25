import { S3Client } from '@aws-sdk/client-s3';
import { ApiError } from './api';
export function storageConfigured() {
  const endpoint = process.env.S3_ENDPOINT || process.env.AWS_ENDPOINT_URL_S3;
  return !!(
    process.env.S3_BUCKET &&
    (process.env.S3_REGION || process.env.AWS_REGION) &&
    (!endpoint || (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY))
  );
}
export function storage() {
  if (!storageConfigured()) throw new ApiError(503, 'Le stockage média doit être connecté.');
  return {
    bucket: process.env.S3_BUCKET!,
    client: new S3Client({
      region: process.env.S3_REGION || process.env.AWS_REGION,
      endpoint: process.env.S3_ENDPOINT || process.env.AWS_ENDPOINT_URL_S3,
      forcePathStyle: !!(process.env.S3_ENDPOINT || process.env.AWS_ENDPOINT_URL_S3),
      requestChecksumCalculation: 'WHEN_REQUIRED',
    }),
  };
}

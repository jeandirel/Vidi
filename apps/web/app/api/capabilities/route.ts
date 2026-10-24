export async function GET() {
  return Response.json({
    database: !!process.env.DATABASE_URL,
    scripts: !!(process.env.OPENAI_API_KEY && process.env.OPENAI_MODEL),
    video: !!(
      process.env.VIDEO_GATEWAY_URL &&
      process.env.VIDEO_GATEWAY_TOKEN &&
      process.env.VIDEO_OUTPUT_HOSTS &&
      process.env.REDIS_URL
    ),
    storage: !!process.env.S3_BUCKET,
    billing: false,
    trends: false,
    ecommerce: false,
    voiceCloning: false,
  });
}

import { Queue } from 'bullmq';
import { ApiError } from './api';
export function redisOptions() {
  if (!process.env.REDIS_URL)
    throw new ApiError(503, 'Le service de file d’attente n’est pas connecté.');
  const u = new URL(process.env.REDIS_URL);
  return {
    host: u.hostname,
    port: Number(u.port || 6379),
    username: u.username ? decodeURIComponent(u.username) : undefined,
    password: u.password ? decodeURIComponent(u.password) : undefined,
    db: Number(u.pathname.slice(1) || 0),
    tls: u.protocol === 'rediss:' ? {} : undefined,
    maxRetriesPerRequest: 1,
    connectTimeout: 3000,
  };
}
export function renderQueue() {
  return new Queue('vidi-renders', {
    connection: redisOptions(),
    defaultJobOptions: {
      attempts: 3,
      backoff: { type: 'exponential', delay: 10000 },
      removeOnComplete: 1000,
      removeOnFail: 1000,
    },
  });
}

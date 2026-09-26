import { env } from '../config/env';
import logger from '../config/logger';
import http from 'http';
import https from 'https';

let intervalId: NodeJS.Timeout | null = null;

export const startKeepAlive = (): void => {
  const url = env.keepAlive.url;
  if (!url) return;

  const intervalMs = env.keepAlive.intervalMs;

  intervalId = setInterval(() => {
    const lib = url.startsWith('https') ? https : http;
    lib
      .get(url, (res) => {
        logger.debug(`[KeepAlive] ${url} → ${res.statusCode}`);
      })
      .on('error', (err) => {
        logger.warn(`[KeepAlive] Ping failed: ${err.message}`);
      });
  }, intervalMs);

  logger.info(`[KeepAlive] Started — pinging ${url} every ${intervalMs / 1000}s`);
};

export const stopKeepAlive = (): void => {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
    logger.info('[KeepAlive] Stopped');
  }
};

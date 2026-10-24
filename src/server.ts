import http from 'http';
import app from './app';
import { env } from './config/env';
import { connectDatabases, disconnectDatabases } from './config/database';

// Pacific Restroom Cubicle Enterprise API Server (Active & Supabase Linked)
const startServer = async () => {
  let server: http.Server | undefined;

  try {
    const port = Number(process.env.PORT) || env.PORT;

    server = app.listen(port, '0.0.0.0', () => {
      console.log(`🚀 Pacific Restroom Cubicle API listening on http://0.0.0.0:${port}${env.API_PREFIX}`);
    });

    server.keepAliveTimeout = 65000;
    server.headersTimeout = 66000;

    await connectDatabases();

    // Start background transactional mail outbox worker
    try {
      const { MailOutboxWorker } = await import('./modules/mail/mail.worker');
      MailOutboxWorker.getInstance().start();
    } catch (workerErr) {
      console.warn('⚠️ [MailOutboxWorker] Failed to start worker:', workerErr);
    }
  } catch (error) {
    console.error('Failed to start server:', error);
    await disconnectDatabases();
    process.exit(1);
  }

  const shutdown = async (signal: string) => {
    console.log(`${signal} received. Shutting down gracefully...`);

    const forceExit = setTimeout(() => {
      console.error('Graceful shutdown timed out');
      process.exit(1);
    }, 10000);

    server?.close(async () => {
      clearTimeout(forceExit);
      try {
        const { MailOutboxWorker } = await import('./modules/mail/mail.worker');
        await MailOutboxWorker.getInstance().stop(4000);
      } catch {}
      await disconnectDatabases();
      process.exit(0);
    });
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
};

startServer();

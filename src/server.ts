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

    // Initialize automated monthly employee leave accrual check (+1 CL, +1 EL)
    try {
      const { ensureMonthlyLeaveAccrual } = await import('./modules/employee-management/employee-management.service');
      ensureMonthlyLeaveAccrual(undefined, undefined, true).then((res) => {
        if (!res.skipped) {
          console.log(`[LeaveAccrual] Monthly check completed for ${res.month}/${res.year}: CL added: ${res.clAccruedCount}, EL added: ${res.elAccruedCount}`);
        }
      }).catch((err) => {
        console.warn('⚠️ [LeaveAccrual] Startup check warning:', err?.message || err);
      });
      // Setup interval check every 6 hours
      setInterval(() => {
        ensureMonthlyLeaveAccrual().catch((err) => {
          console.warn('⚠️ [LeaveAccrual] Periodic check warning:', err?.message || err);
        });
      }, 6 * 60 * 60 * 1000);
    } catch (leaveErr) {
      console.warn('⚠️ [LeaveAccrual] Failed to initialize leave accrual runner:', leaveErr);
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

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import { env } from './config/env';
import { morganStream } from './config/logger';
import { notFoundHandler, errorHandler } from './middleware/error.middleware';
import { startKeepAlive } from './jobs/keepAlive';

// ─── Module Routes ────────────────────────────────────────────────────────────
import authRoutes from './modules/auth/auth.routes';
import productsRoutes from './modules/products/products.routes';
import configuratorRoutes from './modules/configurator/configurator.routes';
import quotesRoutes from './modules/quotes/quotes.routes';
import leadsRoutes from './modules/leads/leads.routes';
import projectsRoutes from './modules/projects/projects.routes';
import invoicesRoutes from './modules/invoices/invoices.routes';
import cmsRoutes from './modules/cms/cms.routes';
import dashboardRoutes from './modules/dashboard/dashboard.routes';

// ─── Extended Enterprise ERP & CRM Routes ─────────────────────────────────────
import companiesRoutes from './modules/companies/companies.routes';
import crmRoutes from './modules/crm/crm.routes';
import vendorsRoutes from './modules/vendors/vendors.routes';
import poRoutes from './modules/procurement/po.routes';
import piRoutes from './modules/sales/pi.routes';
import productsMasterRoutes from './modules/products-master/products-master.routes';
import financeRoutes from './modules/finance/finance.routes';
import followupsRoutes from './modules/followups/followups.routes';
import qrRoutes from './modules/qr/qr.routes';
import auditRoutes from './modules/audit/audit.routes';
import docsRoutes from './modules/docs/docs.routes';
import { qrController } from './modules/qr/qr.controller';
import quotationsRoutes from './modules/quotations/quotations.routes';
import ordersRoutes from './modules/orders/orders.routes';
import packingListsRoutes from './modules/packing-lists/packing-lists.routes';
import hardwareIssueRoutes, { hardwareCatalogRouter } from './modules/hardware-issue/hardware-issue.routes';
import { packingListsController } from './modules/packing-lists/packing-lists.controller';
import exportRoutes from './modules/export/export.routes';
import rolesRoutes from './modules/roles/roles.routes';
import usersRoutes from './modules/users/users.routes';
import { rolesService } from './modules/roles/roles.service';
import boardInventoryRoutes from './modules/inventory/boardInventory.routes';

// ─── App Setup ────────────────────────────────────────────────────────────────
const app = express();

if (process.env.NODE_ENV === 'production' || process.env.RENDER) {
  app.set('trust proxy', 1);
}

// ─── CORS ─────────────────────────────────────────────────────────────────────
const corsOptions: cors.CorsOptions = {
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    // Allow any localhost port
    if (/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) {
      return callback(null, true);
    }
    // Allow configured origins
    const allowed = env.cors.allowedOrigins.split(',').map((s) => s.trim());
    if (allowed.includes(origin)) return callback(null, true);
    // Permissive fallback
    return callback(null, true);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
  optionsSuccessStatus: 204,
  maxAge: 86400,
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

// ─── Core Middleware ──────────────────────────────────────────────────────────
app.use(compression({ level: 6, threshold: 1024 }));
app.use(
  helmet({
    crossOriginEmbedderPolicy: false,
    contentSecurityPolicy: false, // Allows Swagger UI and embedded previews
  })
);
app.use(
  morgan(env.isDev ? 'dev' : 'combined', {
    stream: morganStream,
    skip: (req) => req.url === '/health' || req.url.endsWith('/health'),
  })
);
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));
app.use(cookieParser());

// ─── Health Checks ────────────────────────────────────────────────────────────
const prefix = env.API_PREFIX;

app.get('/', (_req, res) => {
  res.json({
    success: true,
    name: 'Pacific Restroom Cubicle Enterprise ERP & REST API',
    version: '2.0.0',
    docs: `${prefix}/docs`,
    health: `${prefix}/health`,
    status: 'ONLINE',
  });
});

app.get(['/health', `${prefix}/health`], (_req, res) => {
  res.json({
    success: true,
    message: 'Pacific Restroom Cubicle API is running',
    version: '2.0.0',
    timestamp: new Date().toISOString(),
    environment: env.NODE_ENV,
  });
});

app.get(['/ping', `${prefix}/ping`], (_req, res) => {
  res.status(200).json({ status: 'ok', uptime: process.uptime(), timestamp: Date.now() });
});

// ─── Public Document Verification & Digital Acknowledgment Endpoints ────────
app.get(['/verify/:token', `${prefix}/verify/:token`], qrController.verifyPublicToken);
app.get(['/acknowledge-receipt/:token', `${prefix}/acknowledge-receipt/:token`], packingListsController.getByToken);
app.post(['/acknowledge-receipt/:token', `${prefix}/acknowledge-receipt/:token`], packingListsController.acknowledgeByToken);

// ─── API Routes ───────────────────────────────────────────────────────────────
// Legacy & Existing Modules
app.use(`${prefix}/auth`, authRoutes);
app.use(`${prefix}/products/master`, productsMasterRoutes); // MUST be before /products
app.use(`${prefix}/products`, productsRoutes);
app.use(`${prefix}/configurator`, configuratorRoutes);
app.use(`${prefix}/quotes`, quotesRoutes);
app.use(`${prefix}/leads`, leadsRoutes);
app.use(`${prefix}/projects`, projectsRoutes);
app.use(`${prefix}/invoices`, invoicesRoutes);
app.use(`${prefix}/cms`, cmsRoutes);
app.use(`${prefix}/dashboard`, dashboardRoutes);

// New B2B Enterprise ERP & CRM Modules
app.use(`${prefix}/companies`, companiesRoutes);
app.use(`${prefix}/crm`, crmRoutes);
app.use(`${prefix}/vendors`, vendorsRoutes);
app.use(`${prefix}/procurement/po`, poRoutes);
app.use(`${prefix}/sales/pi`, piRoutes);
app.use(`${prefix}/sales/quotations`, quotationsRoutes);
app.use(`${prefix}/sales/orders`, ordersRoutes);
app.use(`${prefix}/logistics/packing-lists`, packingListsRoutes);
app.use(`${prefix}/warehouse/hardware-catalog`, hardwareCatalogRouter);
app.use(`${prefix}/warehouse/hardware-issues`, hardwareIssueRoutes);
app.use(`${prefix}/inventory/boards`, boardInventoryRoutes);
app.use(`${prefix}/finance`, financeRoutes);
app.use(`${prefix}/followups`, followupsRoutes);
app.use(`${prefix}/qr`, qrRoutes);
app.use(`${prefix}/audit`, auditRoutes);
app.use(`${prefix}/docs`, docsRoutes);
app.use(`${prefix}/export`, exportRoutes);
app.use(`${prefix}/roles`, rolesRoutes);
app.use(`${prefix}/users`, usersRoutes);

// ─── Initialize Roles & Permissions ──────────────────────────────────────────
rolesService.seedDefaultRolesAndPermissions().catch((err) => {
  console.warn('[RBAC] Roles initialization note:', err.message);
});

// ─── Keep-Alive ───────────────────────────────────────────────────────────────
if (env.NODE_ENV !== 'test') {
  startKeepAlive();
}

// ─── Error Handling ───────────────────────────────────────────────────────────
app.use(notFoundHandler);
app.use(errorHandler);

export default app;

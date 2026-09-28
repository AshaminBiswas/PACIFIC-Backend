"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const morgan_1 = __importDefault(require("morgan"));
const compression_1 = __importDefault(require("compression"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const env_1 = require("./config/env");
const logger_1 = require("./config/logger");
const error_middleware_1 = require("./middleware/error.middleware");
const keepAlive_1 = require("./jobs/keepAlive");
// ─── Module Routes ────────────────────────────────────────────────────────────
const auth_routes_1 = __importDefault(require("./modules/auth/auth.routes"));
const products_routes_1 = __importDefault(require("./modules/products/products.routes"));
const configurator_routes_1 = __importDefault(require("./modules/configurator/configurator.routes"));
const quotes_routes_1 = __importDefault(require("./modules/quotes/quotes.routes"));
const leads_routes_1 = __importDefault(require("./modules/leads/leads.routes"));
const projects_routes_1 = __importDefault(require("./modules/projects/projects.routes"));
const invoices_routes_1 = __importDefault(require("./modules/invoices/invoices.routes"));
const cms_routes_1 = __importDefault(require("./modules/cms/cms.routes"));
const dashboard_routes_1 = __importDefault(require("./modules/dashboard/dashboard.routes"));
// ─── Extended Enterprise ERP & CRM Routes ─────────────────────────────────────
const companies_routes_1 = __importDefault(require("./modules/companies/companies.routes"));
const crm_routes_1 = __importDefault(require("./modules/crm/crm.routes"));
const vendors_routes_1 = __importDefault(require("./modules/vendors/vendors.routes"));
const po_routes_1 = __importDefault(require("./modules/procurement/po.routes"));
const pi_routes_1 = __importDefault(require("./modules/sales/pi.routes"));
const products_master_routes_1 = __importDefault(require("./modules/products-master/products-master.routes"));
const finance_routes_1 = __importDefault(require("./modules/finance/finance.routes"));
const followups_routes_1 = __importDefault(require("./modules/followups/followups.routes"));
const qr_routes_1 = __importDefault(require("./modules/qr/qr.routes"));
const audit_routes_1 = __importDefault(require("./modules/audit/audit.routes"));
const docs_routes_1 = __importDefault(require("./modules/docs/docs.routes"));
const qr_controller_1 = require("./modules/qr/qr.controller");
const quotations_routes_1 = __importDefault(require("./modules/quotations/quotations.routes"));
const orders_routes_1 = __importDefault(require("./modules/orders/orders.routes"));
const packing_lists_routes_1 = __importDefault(require("./modules/packing-lists/packing-lists.routes"));
const hardware_issue_routes_1 = __importStar(require("./modules/hardware-issue/hardware-issue.routes"));
const packing_lists_controller_1 = require("./modules/packing-lists/packing-lists.controller");
const export_routes_1 = __importDefault(require("./modules/export/export.routes"));
const roles_routes_1 = __importDefault(require("./modules/roles/roles.routes"));
const users_routes_1 = __importDefault(require("./modules/users/users.routes"));
const roles_service_1 = require("./modules/roles/roles.service");
const boardInventory_routes_1 = __importDefault(require("./modules/inventory/boardInventory.routes"));
// ─── App Setup ────────────────────────────────────────────────────────────────
const app = (0, express_1.default)();
if (process.env.NODE_ENV === 'production' || process.env.RENDER) {
    app.set('trust proxy', 1);
}
// ─── CORS ─────────────────────────────────────────────────────────────────────
const corsOptions = {
    origin: (origin, callback) => {
        if (!origin)
            return callback(null, true);
        // Allow any localhost port
        if (/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) {
            return callback(null, true);
        }
        // Allow configured origins
        const allowed = env_1.env.cors.allowedOrigins.split(',').map((s) => s.trim());
        if (allowed.includes(origin))
            return callback(null, true);
        // Permissive fallback
        return callback(null, true);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
    optionsSuccessStatus: 204,
    maxAge: 86400,
};
app.use((0, cors_1.default)(corsOptions));
app.options('*', (0, cors_1.default)(corsOptions));
// ─── Core Middleware ──────────────────────────────────────────────────────────
app.use((0, compression_1.default)({ level: 6, threshold: 1024 }));
app.use((0, helmet_1.default)({
    crossOriginEmbedderPolicy: false,
    contentSecurityPolicy: false, // Allows Swagger UI and embedded previews
}));
app.use((0, morgan_1.default)(env_1.env.isDev ? 'dev' : 'combined', {
    stream: logger_1.morganStream,
    skip: (req) => req.url === '/health' || req.url.endsWith('/health'),
}));
app.use(express_1.default.json({ limit: '15mb' }));
app.use(express_1.default.urlencoded({ extended: true, limit: '15mb' }));
app.use((0, cookie_parser_1.default)());
// ─── Health Checks ────────────────────────────────────────────────────────────
const prefix = env_1.env.API_PREFIX;
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
        environment: env_1.env.NODE_ENV,
    });
});
app.get(['/ping', `${prefix}/ping`], (_req, res) => {
    res.status(200).json({ status: 'ok', uptime: process.uptime(), timestamp: Date.now() });
});
// ─── Public Document Verification & Digital Acknowledgment Endpoints ────────
app.get(['/verify/:token', `${prefix}/verify/:token`], qr_controller_1.qrController.verifyPublicToken);
app.get(['/acknowledge-receipt/:token', `${prefix}/acknowledge-receipt/:token`], packing_lists_controller_1.packingListsController.getByToken);
app.post(['/acknowledge-receipt/:token', `${prefix}/acknowledge-receipt/:token`], packing_lists_controller_1.packingListsController.acknowledgeByToken);
// ─── API Routes ───────────────────────────────────────────────────────────────
// Legacy & Existing Modules
app.use(`${prefix}/auth`, auth_routes_1.default);
app.use(`${prefix}/products/master`, products_master_routes_1.default); // MUST be before /products
app.use(`${prefix}/products`, products_routes_1.default);
app.use(`${prefix}/configurator`, configurator_routes_1.default);
app.use(`${prefix}/quotes`, quotes_routes_1.default);
app.use(`${prefix}/leads`, leads_routes_1.default);
app.use(`${prefix}/projects`, projects_routes_1.default);
app.use(`${prefix}/invoices`, invoices_routes_1.default);
app.use(`${prefix}/cms`, cms_routes_1.default);
app.use(`${prefix}/dashboard`, dashboard_routes_1.default);
// New B2B Enterprise ERP & CRM Modules
app.use(`${prefix}/companies`, companies_routes_1.default);
app.use(`${prefix}/crm`, crm_routes_1.default);
app.use(`${prefix}/vendors`, vendors_routes_1.default);
app.use(`${prefix}/procurement/po`, po_routes_1.default);
app.use(`${prefix}/sales/pi`, pi_routes_1.default);
app.use(`${prefix}/sales/quotations`, quotations_routes_1.default);
app.use(`${prefix}/sales/orders`, orders_routes_1.default);
app.use(`${prefix}/logistics/packing-lists`, packing_lists_routes_1.default);
app.use(`${prefix}/warehouse/hardware-catalog`, hardware_issue_routes_1.hardwareCatalogRouter);
app.use(`${prefix}/warehouse/hardware-issues`, hardware_issue_routes_1.default);
app.use(`${prefix}/inventory/boards`, boardInventory_routes_1.default);
app.use(`${prefix}/finance`, finance_routes_1.default);
app.use(`${prefix}/followups`, followups_routes_1.default);
app.use(`${prefix}/qr`, qr_routes_1.default);
app.use(`${prefix}/audit`, audit_routes_1.default);
app.use(`${prefix}/docs`, docs_routes_1.default);
app.use(`${prefix}/export`, export_routes_1.default);
app.use(`${prefix}/roles`, roles_routes_1.default);
app.use(`${prefix}/users`, users_routes_1.default);
// ─── Initialize Roles & Permissions ──────────────────────────────────────────
roles_service_1.rolesService.seedDefaultRolesAndPermissions().catch((err) => {
    console.warn('[RBAC] Roles initialization note:', err.message);
});
// ─── Keep-Alive ───────────────────────────────────────────────────────────────
if (env_1.env.NODE_ENV !== 'test') {
    (0, keepAlive_1.startKeepAlive)();
}
// ─── Error Handling ───────────────────────────────────────────────────────────
app.use(error_middleware_1.notFoundHandler);
app.use(error_middleware_1.errorHandler);
exports.default = app;
//# sourceMappingURL=app.js.map
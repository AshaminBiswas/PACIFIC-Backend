"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const app_1 = __importDefault(require("./app"));
const env_1 = require("./config/env");
const database_1 = require("./config/database");
// Pacific Restroom Cubicle Enterprise API Server (Active & Supabase Linked)
const startServer = async () => {
    let server;
    try {
        const port = Number(process.env.PORT) || env_1.env.PORT;
        server = app_1.default.listen(port, '0.0.0.0', () => {
            console.log(`🚀 Pacific Restroom Cubicle API listening on http://0.0.0.0:${port}${env_1.env.API_PREFIX}`);
        });
        server.keepAliveTimeout = 65000;
        server.headersTimeout = 66000;
        await (0, database_1.connectDatabases)();
    }
    catch (error) {
        console.error('Failed to start server:', error);
        await (0, database_1.disconnectDatabases)();
        process.exit(1);
    }
    const shutdown = async (signal) => {
        console.log(`${signal} received. Shutting down gracefully...`);
        const forceExit = setTimeout(() => {
            console.error('Graceful shutdown timed out');
            process.exit(1);
        }, 10000);
        server?.close(async () => {
            clearTimeout(forceExit);
            await (0, database_1.disconnectDatabases)();
            process.exit(0);
        });
    };
    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
};
startServer();
//# sourceMappingURL=server.js.map
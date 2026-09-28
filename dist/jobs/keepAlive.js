"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.stopKeepAlive = exports.startKeepAlive = void 0;
const env_1 = require("../config/env");
const logger_1 = __importDefault(require("../config/logger"));
const http_1 = __importDefault(require("http"));
const https_1 = __importDefault(require("https"));
let intervalId = null;
const startKeepAlive = () => {
    const url = env_1.env.keepAlive.url;
    if (!url)
        return;
    const intervalMs = env_1.env.keepAlive.intervalMs;
    intervalId = setInterval(() => {
        const lib = url.startsWith('https') ? https_1.default : http_1.default;
        lib
            .get(url, (res) => {
            logger_1.default.debug(`[KeepAlive] ${url} → ${res.statusCode}`);
        })
            .on('error', (err) => {
            logger_1.default.warn(`[KeepAlive] Ping failed: ${err.message}`);
        });
    }, intervalMs);
    logger_1.default.info(`[KeepAlive] Started — pinging ${url} every ${intervalMs / 1000}s`);
};
exports.startKeepAlive = startKeepAlive;
const stopKeepAlive = () => {
    if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
        logger_1.default.info('[KeepAlive] Stopped');
    }
};
exports.stopKeepAlive = stopKeepAlive;
//# sourceMappingURL=keepAlive.js.map
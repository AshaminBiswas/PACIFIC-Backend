"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sanitizePayload = exports.getCursorParams = exports.getPaginationParams = exports.buildPagination = exports.sendMessage = exports.sendError = exports.sendCursorPaginated = exports.sendPaginated = exports.sendSuccess = void 0;
// ─── Standard Response Helpers ────────────────────────────────────────────────
const sendSuccess = (res, data, message, statusCode = 200) => {
    return res.status(statusCode).json({
        success: true,
        ...(message && { message }),
        data,
    });
};
exports.sendSuccess = sendSuccess;
const sendPaginated = (res, data, pagination, statusCode = 200) => {
    return res.status(statusCode).json({
        success: true,
        data,
        pagination,
    });
};
exports.sendPaginated = sendPaginated;
const sendCursorPaginated = (res, data, nextCursor, limit, statusCode = 200) => {
    return res.status(statusCode).json({
        success: true,
        data,
        pagination: {
            limit,
            nextCursor,
            hasMore: nextCursor !== null,
        },
    });
};
exports.sendCursorPaginated = sendCursorPaginated;
const sendError = (res, error, statusCode = 400) => {
    const origin = res.req?.headers?.origin;
    if (origin && !res.getHeader('Access-Control-Allow-Origin')) {
        res.setHeader('Access-Control-Allow-Origin', origin);
        res.setHeader('Access-Control-Allow-Credentials', 'true');
    }
    return res.status(statusCode).json({
        success: false,
        error,
    });
};
exports.sendError = sendError;
const sendMessage = (res, message, statusCode = 200) => {
    return res.status(statusCode).json({
        success: true,
        message,
    });
};
exports.sendMessage = sendMessage;
// ─── Pagination Calculators ───────────────────────────────────────────────────
const buildPagination = (page, limit, totalItems) => {
    const totalPages = Math.ceil(totalItems / limit);
    return {
        page,
        limit,
        totalItems,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
    };
};
exports.buildPagination = buildPagination;
const getPaginationParams = (query) => {
    const page = Math.max(1, parseInt(String(query.page ?? '1'), 10));
    const limit = Math.min(100, Math.max(1, parseInt(String(query.limit ?? '20'), 10)));
    const skip = (page - 1) * limit;
    return { page, limit, skip };
};
exports.getPaginationParams = getPaginationParams;
const getCursorParams = (query) => {
    const cursor = query.cursor ? String(query.cursor) : null;
    const limit = Math.min(100, Math.max(1, parseInt(String(query.limit ?? '20'), 10)));
    return { cursor, limit };
};
exports.getCursorParams = getCursorParams;
// ─── JSON Payload Sanitizer ───────────────────────────────────────────────────
const sanitizePayload = (obj) => {
    if (obj === null || obj === undefined)
        return obj;
    if (Array.isArray(obj))
        return obj.map(exports.sanitizePayload);
    if (typeof obj === 'object') {
        const cleaned = {};
        for (const [key, value] of Object.entries(obj)) {
            if (key === 'password' || key === 'passwordHash' || key === 'refreshToken')
                continue;
            if (value !== null && value !== undefined) {
                cleaned[key] = (0, exports.sanitizePayload)(value);
            }
        }
        return cleaned;
    }
    return obj;
};
exports.sanitizePayload = sanitizePayload;
//# sourceMappingURL=response.js.map
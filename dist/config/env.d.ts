export declare const env: {
    NODE_ENV: string;
    PORT: number;
    API_PREFIX: string;
    INSTANCE_ID: string;
    isDev: boolean;
    isProd: boolean;
    database: {
        url: string;
        directUrl: string;
    };
    jwt: {
        secret: string;
        refreshSecret: string;
        expiresIn: string;
        refreshExpiresIn: string;
    };
    cors: {
        origin: string;
        allowedOrigins: string;
    };
    frontend: {
        url: string;
        adminUrl: string;
    };
    smtp: {
        host: string;
        port: number;
        user: string;
        pass: string;
        from: string;
    };
    keepAlive: {
        url: string;
        intervalMs: number;
    };
    supabase: {
        url: string;
        publishableKey: string;
        secretKey: string;
        jwksUrl: string;
    };
    resend: {
        apiKey: string;
        from: string;
    };
};
//# sourceMappingURL=env.d.ts.map
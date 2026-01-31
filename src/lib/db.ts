import { Pool } from 'pg';

declare global {
    // Prevent multiple pools in dev (Next.js hot reload)
    var _pgPool: Pool | undefined;
}

export const pool =
    global._pgPool ??
    new Pool({
        host: process.env.DB_HOST,
        port: Number(process.env.DB_PORT || 5432),
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        ssl: process.env.DB_SSL === 'true'
            ? { rejectUnauthorized: false }
            : false,
        max: 10,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 5000,
    });

if (process.env.NODE_ENV !== 'production') {
    global._pgPool = pool;
}

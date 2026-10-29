import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

export class QueryCancellationError extends Error {
    public readonly isConfirmedServerCancellation: boolean;
    public readonly threadId: number;
    public readonly killError?: any;

    constructor(
        message: string,
        isConfirmedServerCancellation: boolean,
        threadId: number,
        killError?: any
    ) {
        super(message);
        this.name = 'QueryCancellationError';
        this.isConfirmedServerCancellation = isConfirmedServerCancellation;
        this.threadId = threadId;
        this.killError = killError;
        Object.setPrototypeOf(this, QueryCancellationError.prototype);
    }
}

const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306', 10),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'dbms_studio',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : undefined,
});

export const query = async (sql: string, params?: any[]) => {
    try {
        const [results] = await pool.execute(sql, params);
        return results;
    } catch (error) {
        console.error('Database query error:', error);
        throw error;
    }
};

/**
 * Executes a query on a dedicated leased connection with truthful server-side statement cancellation.
 * If execution exceeds timeoutMs, attempts `KILL QUERY <threadId>` against the database engine.
 * Truthfully distinguishes confirmed server cancellation from unconfirmed client termination.
 * 
 * Note: Real server-side cancellation requires that the connecting user owns the thread or possesses
 * MySQL CONNECTION_ADMIN or SYSTEM_USER privileges. On accounts without kill privileges, cancellation
 * cannot be confirmed on the server; the client connection is destroyed to release client-side resources.
 */
export const executeCancellableQuery = async (
    sql: string,
    timeoutMs: number = 5000,
    customKiller?: (threadId: number) => Promise<void>
): Promise<any> => {
    const conn = await pool.getConnection();
    const threadId = conn.threadId;
    let timerId: NodeJS.Timeout | null = null;
    let timedOut = false;

    try {
        const queryPromise = conn.query(sql);
        // Catch background rejection if connection is terminated on timeout
        queryPromise.catch(() => {});

        const timeoutPromise = new Promise((_, reject) => {
            timerId = setTimeout(async () => {
                timedOut = true;
                let killConfirmed = false;
                let killError: any = null;

                try {
                    if (customKiller) {
                        await customKiller(threadId);
                    } else {
                        await pool.query(`KILL QUERY ${threadId}`);
                    }
                    killConfirmed = true;
                } catch (err: any) {
                    killError = err;
                }

                // Destroy socket connection to prevent connection reuse after timeout
                conn.destroy();

                if (killConfirmed) {
                    reject(new QueryCancellationError(
                        `Query execution timed out (${timeoutMs}ms limit). Server-side statement cancellation confirmed via KILL QUERY.`,
                        true,
                        threadId
                    ));
                } else {
                    reject(new QueryCancellationError(
                        `Query execution timed out (${timeoutMs}ms limit). Server-side cancellation unconfirmed (KILL QUERY failed: ${killError?.message || 'unknown error'}). Connection destroyed.`,
                        false,
                        threadId,
                        killError
                    ));
                }
            }, timeoutMs);
        });

        const [results] = (await Promise.race([queryPromise, timeoutPromise])) as any;
        return results;
    } finally {
        if (timerId) clearTimeout(timerId);
        if (!timedOut) {
            conn.release();
        }
    }
};

export default pool;

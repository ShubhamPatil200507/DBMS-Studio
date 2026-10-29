import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

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
 * Executes a query on a dedicated leased connection with genuine server-side statement cancellation.
 * If execution exceeds timeoutMs, sends `KILL QUERY <threadId>` to the database server
 * and destroys the socket to guarantee resource release.
 */
export const executeCancellableQuery = async (sql: string, timeoutMs: number = 5000): Promise<any> => {
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
                try {
                    // Send real KILL QUERY to MySQL server to interrupt running query
                    await pool.query(`KILL QUERY ${threadId}`);
                } catch (killErr) {
                    // Ignore if thread already terminated
                }
                conn.destroy();
                reject(new Error(`Query execution timed out and was cancelled on database server (${timeoutMs}ms limit).`));
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

import mysql from 'mysql2/promise';
declare const pool: mysql.Pool;
export declare const query: (sql: string, params?: any[]) => Promise<mysql.QueryResult>;
export default pool;
//# sourceMappingURL=connection.d.ts.map
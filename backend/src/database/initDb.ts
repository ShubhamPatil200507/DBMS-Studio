import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

const initDb = async () => {
    try {
        const port = parseInt(process.env.DB_PORT || '3306', 10);
        const ssl = process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : undefined;

        console.log(`Connecting to database at ${process.env.DB_HOST || 'localhost'}:${port}...`);
        const connection = await mysql.createConnection({
            host: process.env.DB_HOST || 'localhost',
            port,
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || '',
            database: process.env.DB_NAME || 'dbms_studio',
            multipleStatements: true,
            ssl
        });

        const schemaPath = path.join(__dirname, '../../../database/schema.sql');
        const schema = fs.readFileSync(schemaPath, 'utf8');

        console.log('Executing schema...');
        await connection.query(schema);
        console.log('Database initialized successfully.');
        
        await connection.end();
    } catch (error) {
        console.error('Error initializing database:', error);
        process.exit(1);
    }
};

initDb();

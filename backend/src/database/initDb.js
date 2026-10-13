"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const promise_1 = __importDefault(require("mysql2/promise"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const initDb = async () => {
    try {
        const port = parseInt(process.env.DB_PORT || '3306', 10);
        const ssl = process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : undefined;
        console.log(`Connecting to database at ${process.env.DB_HOST || 'localhost'}:${port}...`);
        const connection = await promise_1.default.createConnection({
            host: process.env.DB_HOST || 'localhost',
            port,
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || '',
            database: process.env.DB_NAME || 'dbms_studio',
            multipleStatements: true,
            ssl
        });
        const schemaPath = path_1.default.join(__dirname, '../../../database/schema.sql');
        const schema = fs_1.default.readFileSync(schemaPath, 'utf8');
        console.log('Executing schema...');
        await connection.query(schema);
        console.log('Database initialized successfully.');
        await connection.end();
    }
    catch (error) {
        console.error('Error initializing database:', error);
        process.exit(1);
    }
};
initDb();
//# sourceMappingURL=initDb.js.map
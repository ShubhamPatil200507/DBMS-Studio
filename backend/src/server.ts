import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { setupRoutes } from './routes';

dotenv.config();

const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// API Routes
setupRoutes(app);

app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', message: 'Intelligent DBMS Studio API is running' });
});

// Serve frontend static build in production if available
const candidateStaticPaths = [
    path.resolve(__dirname, '../../frontend/dist'),
    path.resolve(process.cwd(), 'frontend/dist'),
    path.resolve(process.cwd(), '../frontend/dist'),
    path.resolve(__dirname, '../public'),
    path.resolve(__dirname, '../../public')
];

const staticDir = candidateStaticPaths.find(p => fs.existsSync(p));

if (staticDir) {
    console.log(`Serving static frontend build from: ${staticDir}`);
    app.use(express.static(staticDir));
    app.use((req, res, next) => {
        if (req.method === 'GET' && !req.path.startsWith('/api')) {
            return res.sendFile(path.join(staticDir, 'index.html'));
        }
        next();
    });
}

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});

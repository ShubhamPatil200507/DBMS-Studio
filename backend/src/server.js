"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const routes_1 = require("./routes");
dotenv_1.default.config();
const app = (0, express_1.default)();
const port = process.env.PORT || 5000;
app.use((0, cors_1.default)());
app.use(express_1.default.json());
// API Routes
(0, routes_1.setupRoutes)(app);
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', message: 'Intelligent DBMS Studio API is running' });
});
// Serve frontend static build in production if available
const candidateStaticPaths = [
    path_1.default.resolve(__dirname, '../../frontend/dist'),
    path_1.default.resolve(process.cwd(), 'frontend/dist'),
    path_1.default.resolve(process.cwd(), '../frontend/dist'),
    path_1.default.resolve(__dirname, '../public'),
    path_1.default.resolve(__dirname, '../../public')
];
const staticDir = candidateStaticPaths.find(p => fs_1.default.existsSync(p));
if (staticDir) {
    console.log(`Serving static frontend build from: ${staticDir}`);
    app.use(express_1.default.static(staticDir));
    app.use((req, res, next) => {
        if (req.method === 'GET' && !req.path.startsWith('/api')) {
            return res.sendFile(path_1.default.join(staticDir, 'index.html'));
        }
        next();
    });
}
app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});
//# sourceMappingURL=server.js.map
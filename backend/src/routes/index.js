"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.setupRoutes = void 0;
const express_1 = require("express");
const designRoutes_1 = __importDefault(require("./designRoutes"));
const schemaRoutes_1 = __importDefault(require("./schemaRoutes"));
const sqlRoutes_1 = __importDefault(require("./sqlRoutes"));
const performanceRoutes_1 = __importDefault(require("./performanceRoutes"));
const projectRoutes_1 = __importDefault(require("./projectRoutes"));
const fdRoutes_1 = __importDefault(require("./fdRoutes"));
const dashboardRoutes_1 = __importDefault(require("./dashboardRoutes"));
const securityRoutes_1 = __importDefault(require("./securityRoutes"));
const agentRoutes_1 = __importDefault(require("./agentRoutes"));
const setupRoutes = (app) => {
    app.use('/api/dashboard', dashboardRoutes_1.default);
    app.use('/api/design', designRoutes_1.default);
    app.use('/api/schema', schemaRoutes_1.default);
    app.use('/api/sql', sqlRoutes_1.default);
    app.use('/api/performance', performanceRoutes_1.default);
    app.use('/api/projects', projectRoutes_1.default);
    app.use('/api/fd', fdRoutes_1.default);
    app.use('/api/security', securityRoutes_1.default);
    app.use('/api/agent', agentRoutes_1.default);
};
exports.setupRoutes = setupRoutes;
//# sourceMappingURL=index.js.map
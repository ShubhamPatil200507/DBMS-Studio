"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDashboardStats = void 0;
const express_1 = require("express");
const connection_1 = require("../database/connection");
const getDashboardStats = async (req, res) => {
    try {
        const [projectCount] = await (0, connection_1.query)('SELECT COUNT(*) as count FROM projects');
        const [schemaCount] = await (0, connection_1.query)('SELECT COUNT(*) as count FROM database_schemas');
        const [queryCount] = await (0, connection_1.query)('SELECT COUNT(*) as count FROM sql_queries');
        const recentProjects = await (0, connection_1.query)('SELECT id, project_name, updated_at FROM projects ORDER BY updated_at DESC LIMIT 5');
        const recentQueries = await (0, connection_1.query)('SELECT id, generated_sql, created_at FROM sql_queries ORDER BY created_at DESC LIMIT 5');
        res.json({
            stats: {
                totalProjects: projectCount?.count || 0,
                totalSchemas: schemaCount?.count || 0,
                totalQueries: queryCount?.count || 0,
            },
            recentProjects,
            recentQueries
        });
    }
    catch (e) {
        console.error('Dashboard Stats Error:', e);
        res.status(500).json({ error: 'Failed to fetch dashboard stats' });
    }
};
exports.getDashboardStats = getDashboardStats;
//# sourceMappingURL=dashboardController.js.map
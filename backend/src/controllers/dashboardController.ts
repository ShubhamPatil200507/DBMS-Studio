import { Request, Response } from 'express';
import { query } from '../database/connection';

export const getDashboardStats = async (req: Request, res: Response): Promise<void> => {
    try {
        const [projectCount]: any = await query('SELECT COUNT(*) as count FROM projects');
        const [schemaCount]: any = await query('SELECT COUNT(*) as count FROM database_schemas');
        const [queryCount]: any = await query('SELECT COUNT(*) as count FROM sql_queries');
        
        const recentProjects: any = await query('SELECT id, project_name, updated_at FROM projects ORDER BY updated_at DESC LIMIT 5');
        const recentQueries: any = await query('SELECT id, generated_sql, created_at FROM sql_queries ORDER BY created_at DESC LIMIT 5');

        res.json({
            stats: {
                totalProjects: projectCount?.count || 0,
                totalSchemas: schemaCount?.count || 0,
                totalQueries: queryCount?.count || 0,
            },
            recentProjects,
            recentQueries
        });
    } catch (e: any) {
        console.error('Dashboard Stats Error:', e);
        res.status(500).json({ error: 'Failed to fetch dashboard stats' });
    }
};

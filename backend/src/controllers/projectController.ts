import { Request, Response } from 'express';
import { query } from '../database/connection';

// Assuming user ID 1 for now (mock user)
const USER_ID = 1;

export const logActivity = async (projectId: number, activityType: string, description: string) => {
    try {
        await query('INSERT INTO project_activity (project_id, activity_type, description) VALUES (?, ?, ?)', [projectId, activityType, description]);
    } catch (e) {
        console.error('Failed to log activity', e);
    }
};

export const getProjects = async (req: Request, res: Response): Promise<void> => {
    try {
        const projects = await query('SELECT * FROM projects WHERE user_id = ? ORDER BY updated_at DESC', [USER_ID]);
        res.json(projects);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch projects' });
    }
};

export const getProjectById = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const [project]: any = await query('SELECT * FROM projects WHERE id = ? AND user_id = ?', [id, USER_ID]);
        
        if (!project) {
            res.status(404).json({ error: 'Project not found' });
            return;
        }

        // Fetch associated data
        const schemas = await query('SELECT * FROM database_schemas WHERE project_id = ? ORDER BY created_at DESC LIMIT 1', [id]);
        const schema_versions = await query('SELECT * FROM schema_versions WHERE project_id = ? ORDER BY version_number DESC', [id]);
        const queries = await query('SELECT * FROM sql_queries WHERE project_id = ? ORDER BY created_at DESC', [id]);
        const analysis = await query('SELECT * FROM schema_analysis WHERE project_id = ? ORDER BY created_at DESC LIMIT 1', [id]);
        const performance = await query('SELECT * FROM performance_reports WHERE project_id = ? ORDER BY created_at DESC', [id]);
        const activity = await query('SELECT * FROM project_activity WHERE project_id = ? ORDER BY created_at DESC LIMIT 50', [id]);

        res.json({
            ...project,
            latest_schema: (schemas as any[])[0] || null,
            schema_versions,
            queries,
            latest_analysis: (analysis as any[])[0] || null,
            performance_reports: performance,
            activity
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch project details' });
    }
};

export const createProject = async (req: Request, res: Response): Promise<void> => {
    try {
        const { project_name, description, original_requirement, database_platform } = req.body;
        const platform = database_platform || 'MySQL';
        
        const result: any = await query(
            'INSERT INTO projects (user_id, project_name, description, original_requirement, database_platform) VALUES (?, ?, ?, ?, ?)',
            [USER_ID, project_name, description || '', original_requirement || '', platform]
        );
        
        await logActivity(result.insertId, 'PROJECT_CREATED', `Project created with ${platform} platform.`);
        
        res.status(201).json({ id: result.insertId, project_name, description, database_platform: platform });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to create project' });
    }
};

export const updateProject = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const { project_name, description } = req.body;
        await query(
            'UPDATE projects SET project_name = ?, description = ? WHERE id = ? AND user_id = ?',
            [project_name, description, id, USER_ID]
        );
        res.json({ success: true });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to update project' });
    }
};

export const deleteProject = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        await query('DELETE FROM projects WHERE id = ? AND user_id = ?', [id, USER_ID]);
        res.json({ success: true });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to delete project' });
    }
};

// Functions to save specific module data

export const saveSchema = async (req: Request, res: Response): Promise<void> => {
     try {
         const { id } = req.params;
         const { schema_json, mysql_schema } = req.body;
         
         // Insert into database_schemas (latest view)
         await query(
             'INSERT INTO database_schemas (project_id, schema_json, mysql_schema) VALUES (?, ?, ?)',
             [id, JSON.stringify(schema_json), mysql_schema]
         );
         
         // Get current version count to increment
         const [countResult]: any = await query('SELECT COUNT(*) as count FROM schema_versions WHERE project_id = ?', [id]);
         const newVersion = (countResult?.count || 0) + 1;
         
         // Insert into schema_versions
         await query(
             'INSERT INTO schema_versions (project_id, version_number, version_description, schema_json, mysql_schema) VALUES (?, ?, ?, ?, ?)',
             [id, newVersion, `Schema updated to v${newVersion}`, JSON.stringify(schema_json), mysql_schema]
         );
         
         // Log activity
         await logActivity(Number(id), 'SCHEMA_UPDATED', `Schema version ${newVersion} created.`);
         
         // Update project modified time
         await query('UPDATE projects SET updated_at = CURRENT_TIMESTAMP WHERE id = ?', [id]);
         
         res.json({ success: true, version: newVersion });
     } catch(e) {
         console.error('Save schema error', e);
         res.status(500).json({error: 'Failed to save schema'});
     }
}

export const saveQuery = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const { natural_language_request, generated_sql, explanation, execution_time, execution_status } = req.body;
        
        await query(
            'INSERT INTO sql_queries (project_id, natural_language_request, generated_sql, explanation, execution_time, execution_status) VALUES (?, ?, ?, ?, ?, ?)',
            [id, natural_language_request, generated_sql, explanation, execution_time, execution_status]
        );
        
        await logActivity(Number(id), 'QUERY_SAVED', `Saved SQL query to project history.`);
        
        // Update project modified time
        await query('UPDATE projects SET updated_at = CURRENT_TIMESTAMP WHERE id = ?', [id]);
        
        res.json({ success: true });
    } catch(e) {
        console.error('Save query error', e);
        res.status(500).json({error: 'Failed to save query'});
    }
}

"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.saveQuery = exports.saveSchema = exports.deleteProject = exports.updateProject = exports.createProject = exports.getProjectById = exports.getProjects = exports.logActivity = void 0;
const express_1 = require("express");
const connection_1 = require("../database/connection");
// Assuming user ID 1 for now (mock user)
const USER_ID = 1;
const logActivity = async (projectId, activityType, description) => {
    try {
        await (0, connection_1.query)('INSERT INTO project_activity (project_id, activity_type, description) VALUES (?, ?, ?)', [projectId, activityType, description]);
    }
    catch (e) {
        console.error('Failed to log activity', e);
    }
};
exports.logActivity = logActivity;
const getProjects = async (req, res) => {
    try {
        const projects = await (0, connection_1.query)('SELECT * FROM projects WHERE user_id = ? ORDER BY updated_at DESC', [USER_ID]);
        res.json(projects);
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch projects' });
    }
};
exports.getProjects = getProjects;
const getProjectById = async (req, res) => {
    try {
        const { id } = req.params;
        const [project] = await (0, connection_1.query)('SELECT * FROM projects WHERE id = ? AND user_id = ?', [id, USER_ID]);
        if (!project) {
            res.status(404).json({ error: 'Project not found' });
            return;
        }
        // Fetch associated data
        const schemas = await (0, connection_1.query)('SELECT * FROM database_schemas WHERE project_id = ? ORDER BY created_at DESC LIMIT 1', [id]);
        const schema_versions = await (0, connection_1.query)('SELECT * FROM schema_versions WHERE project_id = ? ORDER BY version_number DESC', [id]);
        const queries = await (0, connection_1.query)('SELECT * FROM sql_queries WHERE project_id = ? ORDER BY created_at DESC', [id]);
        const analysis = await (0, connection_1.query)('SELECT * FROM schema_analysis WHERE project_id = ? ORDER BY created_at DESC LIMIT 1', [id]);
        const performance = await (0, connection_1.query)('SELECT * FROM performance_reports WHERE project_id = ? ORDER BY created_at DESC', [id]);
        const activity = await (0, connection_1.query)('SELECT * FROM project_activity WHERE project_id = ? ORDER BY created_at DESC LIMIT 50', [id]);
        res.json({
            ...project,
            latest_schema: schemas[0] || null,
            schema_versions,
            queries,
            latest_analysis: analysis[0] || null,
            performance_reports: performance,
            activity
        });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch project details' });
    }
};
exports.getProjectById = getProjectById;
const createProject = async (req, res) => {
    try {
        const { project_name, description, original_requirement, database_platform } = req.body;
        const platform = database_platform || 'MySQL';
        const result = await (0, connection_1.query)('INSERT INTO projects (user_id, project_name, description, original_requirement, database_platform) VALUES (?, ?, ?, ?, ?)', [USER_ID, project_name, description || '', original_requirement || '', platform]);
        await (0, exports.logActivity)(result.insertId, 'PROJECT_CREATED', `Project created with ${platform} platform.`);
        res.status(201).json({ id: result.insertId, project_name, description, database_platform: platform });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to create project' });
    }
};
exports.createProject = createProject;
const updateProject = async (req, res) => {
    try {
        const { id } = req.params;
        const { project_name, description } = req.body;
        await (0, connection_1.query)('UPDATE projects SET project_name = ?, description = ? WHERE id = ? AND user_id = ?', [project_name, description, id, USER_ID]);
        res.json({ success: true });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to update project' });
    }
};
exports.updateProject = updateProject;
const deleteProject = async (req, res) => {
    try {
        const { id } = req.params;
        await (0, connection_1.query)('DELETE FROM projects WHERE id = ? AND user_id = ?', [id, USER_ID]);
        res.json({ success: true });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to delete project' });
    }
};
exports.deleteProject = deleteProject;
// Functions to save specific module data
const saveSchema = async (req, res) => {
    try {
        const { id } = req.params;
        const { schema_json, mysql_schema } = req.body;
        // Insert into database_schemas (latest view)
        await (0, connection_1.query)('INSERT INTO database_schemas (project_id, schema_json, mysql_schema) VALUES (?, ?, ?)', [id, JSON.stringify(schema_json), mysql_schema]);
        // Get current version count to increment
        const [countResult] = await (0, connection_1.query)('SELECT COUNT(*) as count FROM schema_versions WHERE project_id = ?', [id]);
        const newVersion = (countResult?.count || 0) + 1;
        // Insert into schema_versions
        await (0, connection_1.query)('INSERT INTO schema_versions (project_id, version_number, version_description, schema_json, mysql_schema) VALUES (?, ?, ?, ?, ?)', [id, newVersion, `Schema updated to v${newVersion}`, JSON.stringify(schema_json), mysql_schema]);
        // Log activity
        await (0, exports.logActivity)(Number(id), 'SCHEMA_UPDATED', `Schema version ${newVersion} created.`);
        // Update project modified time
        await (0, connection_1.query)('UPDATE projects SET updated_at = CURRENT_TIMESTAMP WHERE id = ?', [id]);
        res.json({ success: true, version: newVersion });
    }
    catch (e) {
        console.error('Save schema error', e);
        res.status(500).json({ error: 'Failed to save schema' });
    }
};
exports.saveSchema = saveSchema;
const saveQuery = async (req, res) => {
    try {
        const { id } = req.params;
        const { natural_language_request, generated_sql, explanation, execution_time, execution_status } = req.body;
        await (0, connection_1.query)('INSERT INTO sql_queries (project_id, natural_language_request, generated_sql, explanation, execution_time, execution_status) VALUES (?, ?, ?, ?, ?, ?)', [id, natural_language_request, generated_sql, explanation, execution_time, execution_status]);
        await (0, exports.logActivity)(Number(id), 'QUERY_SAVED', `Saved SQL query to project history.`);
        // Update project modified time
        await (0, connection_1.query)('UPDATE projects SET updated_at = CURRENT_TIMESTAMP WHERE id = ?', [id]);
        res.json({ success: true });
    }
    catch (e) {
        console.error('Save query error', e);
        res.status(500).json({ error: 'Failed to save query' });
    }
};
exports.saveQuery = saveQuery;
//# sourceMappingURL=projectController.js.map
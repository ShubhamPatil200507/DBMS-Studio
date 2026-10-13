USE dbms_studio;

-- Add platform to projects
ALTER TABLE projects ADD COLUMN database_platform VARCHAR(50) DEFAULT 'MySQL';

-- Create schema versions
CREATE TABLE IF NOT EXISTS schema_versions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    project_id INT,
    version_number INT NOT NULL,
    version_description TEXT,
    schema_json JSON,
    mysql_schema TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

-- Create activity log
CREATE TABLE IF NOT EXISTS project_activity (
    id INT AUTO_INCREMENT PRIMARY KEY,
    project_id INT,
    activity_type VARCHAR(100),
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

-- Add tracking to other tables
ALTER TABLE sql_queries ADD COLUMN execution_time VARCHAR(50);
ALTER TABLE sql_queries ADD COLUMN execution_status VARCHAR(50);

-- Make sure updated_at exists on projects
-- It already exists according to schema.sql

CREATE DATABASE IF NOT EXISTS dbms_studio;
USE dbms_studio;

CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS projects (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    project_name VARCHAR(255) NOT NULL,
    description TEXT,
    original_requirement TEXT,
    database_platform VARCHAR(50) DEFAULT 'MySQL',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS database_schemas (
    id INT AUTO_INCREMENT PRIMARY KEY,
    project_id INT,
    schema_json JSON,
    mysql_schema TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

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

CREATE TABLE IF NOT EXISTS project_activity (
    id INT AUTO_INCREMENT PRIMARY KEY,
    project_id INT,
    activity_type VARCHAR(100),
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS sql_queries (
    id INT AUTO_INCREMENT PRIMARY KEY,
    project_id INT,
    natural_language_request TEXT,
    generated_sql TEXT,
    explanation TEXT,
    execution_time VARCHAR(50),
    execution_status VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS schema_analysis (
    id INT AUTO_INCREMENT PRIMARY KEY,
    project_id INT,
    analysis_result JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS performance_reports (
    id INT AUTO_INCREMENT PRIMARY KEY,
    project_id INT,
    original_query TEXT,
    explain_result JSON,
    detected_issues JSON,
    recommendations JSON,
    optimized_query TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

INSERT IGNORE INTO users (id, name, email, password_hash) VALUES (1, 'Admin User', 'admin@example.com', 'mock_hash_for_now');

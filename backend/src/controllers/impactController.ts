import { Request, Response } from 'express';
import { query } from '../database/connection';
import { parseSchemaContext } from '../nlp/nluParser';

export interface ImpactDependency {
    type: 'FOREIGN_KEY' | 'SAVED_QUERY' | 'VIEW' | 'ACTIVITY_LOG';
    identifier: string;
    description: string;
    risk: 'BREAKING' | 'WARNING' | 'LOW';
}

export interface SchemaImpactReport {
    targetTable: string;
    proposedAction: string;
    affectedDependencies: ImpactDependency[];
    riskScore: 'HIGH' | 'MEDIUM' | 'LOW';
    suggestedMigrationSql: string;
    suggestedRollbackSql: string;
    warnings: string[];
}

export const predictSchemaImpact = async (req: Request, res: Response): Promise<void> => {
    try {
        const { projectId, tableName, action, columnChange } = req.body;
        // action e.g., 'DROP_TABLE' | 'DROP_COLUMN' | 'MODIFY_COLUMN' | 'ADD_COLUMN'

        const table = (tableName || '').toLowerCase();
        const dependencies: ImpactDependency[] = [];
        const warnings: string[] = [];

        // 1. Check foreign key dependencies in DB
        const fkQuery = `
            SELECT TABLE_NAME, COLUMN_NAME, CONSTRAINT_NAME, REFERENCED_TABLE_NAME, REFERENCED_COLUMN_NAME
            FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
            WHERE REFERENCED_TABLE_NAME = ? AND TABLE_SCHEMA = DATABASE()
        `;
        const fkRows: any = await query(fkQuery, [table]);

        if (Array.isArray(fkRows) && fkRows.length > 0) {
            for (const fk of fkRows) {
                dependencies.push({
                    type: 'FOREIGN_KEY',
                    identifier: `${fk.TABLE_NAME}.${fk.COLUMN_NAME}`,
                    description: `Child table '${fk.TABLE_NAME}' references '${table}.${fk.REFERENCED_COLUMN_NAME}' via constraint '${fk.CONSTRAINT_NAME}'.`,
                    risk: 'BREAKING'
                });
                warnings.push(`Dropping or modifying '${table}' will violate foreign key constraint '${fk.CONSTRAINT_NAME}' in '${fk.TABLE_NAME}'.`);
            }
        }

        // 2. Check saved SQL queries in project that reference this table
        if (projectId) {
            const queries: any = await query('SELECT id, generated_sql FROM sql_queries WHERE project_id = ?', [projectId]);
            if (Array.isArray(queries)) {
                for (const q of queries) {
                    if (q.generated_sql && q.generated_sql.toLowerCase().includes(table)) {
                        dependencies.push({
                            type: 'SAVED_QUERY',
                            identifier: `Query #${q.id}`,
                            description: `Saved SQL query #${q.id} references table '${table}'.`,
                            risk: action.startsWith('DROP') ? 'BREAKING' : 'WARNING'
                        });
                    }
                }
            }
        }

        // Generate migration and rollback statements
        let migrationSql = `-- Review before executing migration on ${table}\n`;
        let rollbackSql = `-- Rollback script for ${table}\n`;

        if (action === 'DROP_TABLE') {
            migrationSql += `DROP TABLE IF EXISTS \`${table}\`;`;
            rollbackSql += `-- Note: Rollback requires restoring schema definition and table backup.`;
        } else if (action === 'ADD_COLUMN' && columnChange) {
            migrationSql += `ALTER TABLE \`${table}\` ADD COLUMN \`${columnChange.name}\` ${columnChange.type || 'VARCHAR(255)'};`;
            rollbackSql += `ALTER TABLE \`${table}\` DROP COLUMN \`${columnChange.name}\`;`;
        } else if (action === 'DROP_COLUMN' && columnChange) {
            migrationSql += `ALTER TABLE \`${table}\` DROP COLUMN \`${columnChange.name}\`;`;
            rollbackSql += `ALTER TABLE \`${table}\` ADD COLUMN \`${columnChange.name}\` ${columnChange.type || 'VARCHAR(255)'};`;
        } else {
            migrationSql += `ALTER TABLE \`${table}\` /* Specify operation */;`;
            rollbackSql += `-- Rollback operation`;
        }

        const riskScore = dependencies.some(d => d.risk === 'BREAKING') ? 'HIGH' : dependencies.length > 0 ? 'MEDIUM' : 'LOW';

        res.json({
            targetTable: table,
            proposedAction: action,
            affectedDependencies: dependencies,
            riskScore,
            suggestedMigrationSql: migrationSql,
            suggestedRollbackSql: rollbackSql,
            warnings
        });
    } catch (e: any) {
        console.error('Impact Prediction Error:', e);
        res.status(500).json({ error: 'Failed to predict schema change impact' });
    }
};

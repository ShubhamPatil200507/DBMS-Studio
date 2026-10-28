import { Parser } from 'node-sql-parser';

export interface ClauseExplanation {
    clause: string;
    details: string[];
    technicalContext?: string;
    performanceOrSafetyNote?: string;
}

export interface DetailedSqlAnalysis {
    overallSummary: string;
    ast: any;
    clauses: ClauseExplanation[];
    tablesAccessed: string[];
    columnsReferenced: string[];
    joins: string[];
    hasAggregate: boolean;
    hasSubquery: boolean;
    isDestructive: boolean;
    concerns: string[];
    syntaxValid: boolean;
    parseError?: string;
}

const parser = new Parser();

export function parseAndExplainSql(sql: string, databaseDialect: string = 'MySQL'): DetailedSqlAnalysis {
    const concerns: string[] = [];
    const clauses: ClauseExplanation[] = [];
    let ast: any = null;

    const trimmed = (sql || '').trim();
    const upper = trimmed.toUpperCase();

    // Check destructive query flags
    const isDestructive = /^(DROP|TRUNCATE|DELETE|ALTER|UPDATE)\b/i.test(trimmed);
    if (isDestructive) {
        if (/^(DELETE|UPDATE)\b/i.test(trimmed) && !/WHERE\b/i.test(trimmed)) {
            concerns.push('CRITICAL: Modifying statement without WHERE clause will affect ALL rows in the table.');
        } else {
            concerns.push('NOTICE: Data-altering or schema-altering statement.');
        }
    }

    let syntaxValid = true;
    let parseError: string | undefined = undefined;

    if (!trimmed) {
        syntaxValid = false;
        parseError = 'SQL query is empty.';
        concerns.push(parseError);
    } else {
        try {
            ast = parser.astify(trimmed, { database: databaseDialect === 'PostgreSQL' ? 'PostgreSQL' : 'MySQL' });
            if (!ast) {
                syntaxValid = false;
                parseError = 'Parser produced empty AST for input.';
                concerns.push(parseError);
            }
        } catch (e: any) {
            syntaxValid = false;
            parseError = e.message || 'Syntax error while generating SQL AST';
            concerns.push(`AST Parser Notice: ${parseError}`);
        }
    }

    const astObj = Array.isArray(ast) ? ast[0] : ast;
    const tablesAccessed: string[] = [];
    const columnsReferenced: string[] = [];
    const joins: string[] = [];
    let hasAggregate = false;
    let hasSubquery = false;

    if (astObj && typeof astObj === 'object') {
        // 1. SELECT Clause
        if (astObj.columns) {
            const selectDetails: string[] = [];
            if (Array.isArray(astObj.columns)) {
                for (const col of astObj.columns) {
                    if (col.expr?.type === 'aggr_func') {
                        hasAggregate = true;
                        selectDetails.push(`Aggregation: ${col.expr.name}(${col.expr.args?.expr?.column || '*'}) AS ${col.as || 'unnamed'}`);
                    } else if (col.expr?.column) {
                        const colName = col.expr.table ? `${col.expr.table}.${col.expr.column}` : col.expr.column;
                        columnsReferenced.push(colName);
                        selectDetails.push(`Projection: ${colName}${col.as ? ` AS ${col.as}` : ''}`);
                    } else if (col.expr?.type === 'star') {
                        selectDetails.push(`Wildcard projection: * (Retrieves all columns)`);
                        concerns.push('PERFORMANCE: SELECT * retrieves all columns across matching records; explicit column projection is recommended for high-throughput queries.');
                    } else {
                        selectDetails.push(`Expression: ${col.as || 'calculated field'}`);
                    }
                }
            }
            clauses.push({
                clause: 'SELECT (Projection)',
                details: selectDetails,
                technicalContext: 'Specifies the attributes and aggregate metrics returned to the client.'
            });
        }

        // 2. FROM & JOIN Clauses
        if (astObj.from) {
            const fromDetails: string[] = [];
            if (Array.isArray(astObj.from)) {
                for (const item of astObj.from) {
                    if (item.table) {
                        tablesAccessed.push(item.table);
                        const alias = item.as ? ` (aliased as ${item.as})` : '';
                        if (item.join) {
                            joins.push(`${item.join} on ${item.table}`);
                            fromDetails.push(`${item.join || 'JOIN'} ${item.table}${alias}`);
                        } else {
                            fromDetails.push(`Primary table: ${item.table}${alias}`);
                        }
                    } else if (item.expr) {
                        hasSubquery = true;
                        fromDetails.push(`Derived table / Subquery in FROM clause`);
                    }
                }
            }
            clauses.push({
                clause: 'FROM / JOIN (Data Sources)',
                details: fromDetails,
                technicalContext: 'Defines the base tables and relational join predicates that compose the dataset.'
            });
        }

        // 3. WHERE Clause
        if (astObj.where) {
            clauses.push({
                clause: 'WHERE (Filtering Predicate)',
                details: ['Evaluates conditional predicates row-by-row before grouping and aggregation.'],
                technicalContext: 'Restricts the working dataset to rows satisfying specified relational predicates.'
            });
        }

        // 4. GROUP BY Clause
        if (astObj.groupby) {
            hasAggregate = true;
            clauses.push({
                clause: 'GROUP BY (Aggregation Grouping)',
                details: ['Collapses rows that share identical values in specified grouping columns.'],
                technicalContext: 'Partitions table records into distinct summary buckets.'
            });
        }

        // 5. HAVING Clause
        if (astObj.having) {
            clauses.push({
                clause: 'HAVING (Post-Aggregation Filter)',
                details: ['Filters aggregated buckets based on aggregate function outputs.'],
                technicalContext: 'Applied strictly after GROUP BY calculation.'
            });
        }

        // 6. ORDER BY & LIMIT
        if (astObj.orderby) {
            clauses.push({
                clause: 'ORDER BY (Sort Order)',
                details: ['Orders final resultSet tuples.'],
                performanceOrSafetyNote: 'Sorting large unindexed datasets may incur temporary tables or in-memory filesort operations.'
            });
        }

        if (astObj.limit) {
            clauses.push({
                clause: 'LIMIT (Pagination & Windowing)',
                details: [`Caps returned rows to a maximum of ${astObj.limit.value?.[0]?.value || 'specified boundary'}.`],
                technicalContext: 'Guarantees bounded response payload sizing.'
            });
        }
    } else {
        // Fallback clause explanation if AST is simple
        clauses.push({
            clause: 'Standard Query Execution',
            details: [`Executes SQL statement: ${trimmed.slice(0, 80)}...`]
        });
    }

    const summaryParts: string[] = [];
    if (!syntaxValid) {
        summaryParts.push(`SQL Syntax Error: ${parseError || 'Invalid SQL syntax'}`);
    } else if (upper.startsWith('SELECT')) {
        summaryParts.push(`Retrieves records from ${tablesAccessed.length > 0 ? tablesAccessed.join(', ') : 'the database'}`);
        if (hasAggregate) summaryParts.push('computing aggregated metrics');
        if (joins.length > 0) summaryParts.push(`joining related entities`);
    } else if (upper.startsWith('INSERT')) {
        summaryParts.push('Inserts new records into the target relation.');
    } else if (upper.startsWith('UPDATE')) {
        summaryParts.push('Modifies existing records in the database.');
    } else if (upper.startsWith('DELETE')) {
        summaryParts.push('Removes records from the database.');
    } else {
        summaryParts.push('Executes standard SQL command.');
    }

    return {
        overallSummary: summaryParts.join(', ') + '.',
        ast,
        clauses,
        tablesAccessed,
        columnsReferenced,
        joins,
        hasAggregate,
        hasSubquery,
        isDestructive,
        concerns,
        syntaxValid,
        parseError
    };
}

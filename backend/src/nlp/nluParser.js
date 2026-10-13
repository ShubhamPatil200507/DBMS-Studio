"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseSchemaContext = parseSchemaContext;
exports.classifyIntent = classifyIntent;
exports.buildQueryIR = buildQueryIR;
const natural_1 = __importDefault(require("natural"));
const queryIR_1 = require("./queryIR");
const tokenizer = new natural_1.default.WordTokenizer();
const stemmer = natural_1.default.PorterStemmer;
function parseSchemaContext(schemaDdl) {
    const tableMap = new Map();
    if (!schemaDdl)
        return tableMap;
    // Regex to extract CREATE TABLE statements
    const createTableRegex = /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(?:`?(\w+)`?\.`?(\w+)`?|`?(\w+)`?)\s*\(([\s\S]*?)\);/gi;
    let match;
    while ((match = createTableRegex.exec(schemaDdl)) !== null) {
        const tableName = (match[3] || match[2] || match[1]).toLowerCase();
        const body = match[4];
        const lines = body.split('\n').map(l => l.trim()).filter(Boolean);
        const columns = [];
        const foreignKeys = [];
        for (const line of lines) {
            // Check FOREIGN KEY
            const fkMatch = /FOREIGN\s+KEY\s*\(`?(\w+)`?\)\s*REFERENCES\s*`?(\w+)`?\s*\(`?(\w+)`?\)/i.exec(line);
            if (fkMatch) {
                foreignKeys.push({
                    column: fkMatch[1].toLowerCase(),
                    targetTable: fkMatch[2].toLowerCase(),
                    targetColumn: fkMatch[3].toLowerCase()
                });
                continue;
            }
            // Skip table level keys/constraints
            if (/^(PRIMARY\s+KEY|KEY|INDEX|UNIQUE\s+KEY|CONSTRAINT)\b/i.test(line)) {
                continue;
            }
            // Column definition: name type [constraints...]
            const colMatch = /^`?(\w+)`?\s+([\w()]+)/.exec(line);
            if (colMatch) {
                const colName = colMatch[1].toLowerCase();
                const colType = colMatch[2].toUpperCase();
                const isPk = /PRIMARY\s+KEY/i.test(line);
                columns.push({ name: colName, type: colType, isPk });
            }
        }
        tableMap.set(tableName, { tableName, columns, foreignKeys });
    }
    return tableMap;
}
function classifyIntent(tokens) {
    const lowerTokens = tokens.map(t => t.toLowerCase());
    if (lowerTokens.some(t => ['count', 'sum', 'avg', 'average', 'maximum', 'max', 'minimum', 'min', 'total'].includes(t))) {
        return 'AGGREGATE';
    }
    if (lowerTokens.some(t => ['insert', 'add', 'create', 'new'].includes(t))) {
        return 'INSERT';
    }
    if (lowerTokens.some(t => ['update', 'modify', 'change', 'set'].includes(t))) {
        return 'UPDATE';
    }
    if (lowerTokens.some(t => ['delete', 'remove', 'drop', 'purge'].includes(t))) {
        return 'DELETE';
    }
    return 'SELECT';
}
function buildQueryIR(naturalQuery, schemaMap) {
    const tokens = tokenizer.tokenize(naturalQuery) || [];
    const lowerTokens = tokens.map(t => t.toLowerCase());
    const lowerQuery = naturalQuery.toLowerCase();
    const intent = classifyIntent(tokens);
    const targetTables = [];
    const ambiguities = [];
    // Identify tables mentioned
    for (const [tableName] of schemaMap.entries()) {
        const stemmedTable = stemmer.stem(tableName);
        const singularTable = tableName.endsWith('s') ? tableName.slice(0, -1) : tableName;
        if (lowerTokens.includes(tableName) || lowerTokens.includes(singularTable) || lowerTokens.some(tok => stemmer.stem(tok) === stemmedTable)) {
            targetTables.push(tableName);
        }
    }
    // Default target table if none found but tables exist
    if (targetTables.length === 0 && schemaMap.size > 0) {
        // Search if any column matches directly
        for (const [tName, tInfo] of schemaMap.entries()) {
            for (const col of tInfo.columns) {
                if (lowerTokens.includes(col.name)) {
                    if (!targetTables.includes(tName))
                        targetTables.push(tName);
                }
            }
        }
    }
    // Check ambiguities: unknown entity
    if (schemaMap.size > 0 && targetTables.length === 0) {
        ambiguities.push(`Could not deterministically identify target tables from request: "${naturalQuery}".`);
    }
    // Extract Limit
    let limit;
    const limitMatch = /(?:top|limit|first)\s+(\d+)/i.exec(naturalQuery);
    if (limitMatch) {
        limit = parseInt(limitMatch[1], 10);
    }
    // Extract Order By
    const orderBy = [];
    if (/order by|sort(?:ed)? by|highest|top|most|cheapest|lowest|latest|newest|oldest/i.test(naturalQuery)) {
        const isDesc = /highest|top|most|latest|newest|desc/i.test(naturalQuery);
        // Find column
        let matchedCol = '';
        if (targetTables.length > 0) {
            const table = schemaMap.get(targetTables[0]);
            if (table) {
                for (const col of table.columns) {
                    if (lowerTokens.includes(col.name)) {
                        matchedCol = col.name;
                        break;
                    }
                }
                if (!matchedCol) {
                    // heuristics
                    if (/price|amount|spent|cost/i.test(naturalQuery)) {
                        matchedCol = table.columns.find(c => /price|amount|total|cost|spent/i.test(c.name))?.name || '';
                    }
                    else if (/latest|newest|recent|date|time/i.test(naturalQuery)) {
                        matchedCol = table.columns.find(c => /created|date|time|timestamp/i.test(c.name))?.name || '';
                    }
                }
            }
        }
        if (matchedCol) {
            orderBy.push({ column: matchedCol, direction: isDesc ? 'DESC' : 'ASC' });
        }
    }
    // Metrics / Selected Columns
    const selectedMetrics = [];
    if (/count/i.test(naturalQuery)) {
        selectedMetrics.push({ expression: 'COUNT(*)', alias: 'total_count', func: 'COUNT' });
    }
    else if (/average|avg/i.test(naturalQuery)) {
        selectedMetrics.push({ expression: 'AVG(*)', alias: 'avg_val', func: 'AVG' });
    }
    else if (/sum|total/i.test(naturalQuery)) {
        selectedMetrics.push({ expression: 'SUM(*)', alias: 'total_sum', func: 'SUM' });
    }
    // Infer Joins between targetTables
    const joins = [];
    if (targetTables.length > 1) {
        for (let i = 0; i < targetTables.length; i++) {
            for (let j = i + 1; j < targetTables.length; j++) {
                const t1 = schemaMap.get(targetTables[i]);
                const t2 = schemaMap.get(targetTables[j]);
                if (t1 && t2) {
                    // Check FK from t1 to t2
                    const fk1 = t1.foreignKeys?.find(k => k.targetTable === t2.tableName);
                    if (fk1) {
                        joins.push({
                            leftTable: t1.tableName,
                            rightTable: t2.tableName,
                            on: `${t1.tableName}.${fk1.column} = ${t2.tableName}.${fk1.targetColumn}`,
                            type: 'INNER JOIN'
                        });
                    }
                    else {
                        // Check FK from t2 to t1
                        const fk2 = t2.foreignKeys?.find(k => k.targetTable === t1.tableName);
                        if (fk2) {
                            joins.push({
                                leftTable: t1.tableName,
                                rightTable: t2.tableName,
                                on: `${t2.tableName}.${fk2.column} = ${t1.tableName}.${fk2.targetColumn}`,
                                type: 'INNER JOIN'
                            });
                        }
                    }
                }
            }
        }
    }
    return {
        intent,
        targetTables,
        selectedMetrics,
        filters: [],
        groupBy: [],
        having: [],
        orderBy,
        limit,
        joins,
        ambiguities,
        confidence: ambiguities.length === 0 ? 0.9 : 0.4,
        rawText: naturalQuery
    };
}
//# sourceMappingURL=nluParser.js.map
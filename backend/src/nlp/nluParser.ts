import natural from 'natural';
import { QueryIR, SchemaTableInfo } from './queryIR';

const tokenizer = new natural.WordTokenizer();
const stemmer = natural.PorterStemmer;

function escapeRegExp(string: string): string {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function parseSchemaContext(schemaDdl?: string): Map<string, SchemaTableInfo> {
    const tableMap = new Map<string, SchemaTableInfo>();
    if (!schemaDdl) return tableMap;

    // Regex to extract CREATE TABLE statements
    const createTableRegex = /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(?:`?(\w+)`?\.`?(\w+)`?|`?(\w+)`?)\s*\(([\s\S]*?)\);/gi;
    let match: RegExpExecArray | null;

    while ((match = createTableRegex.exec(schemaDdl)) !== null) {
        const tableName = (match[3] || match[2] || match[1]).toLowerCase();
        const body = match[4];
        const lines = body.split('\n').map(l => l.trim()).filter(Boolean);

        const columns: SchemaTableInfo['columns'] = [];
        const foreignKeys: SchemaTableInfo['foreignKeys'] = [];

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

export function classifyIntent(tokens: string[]): QueryIR['intent'] {
    const lowerTokens = tokens.map(t => t.toLowerCase());
    if (lowerTokens.some(t => ['count', 'sum', 'avg', 'average', 'maximum', 'max', 'minimum', 'min', 'total', 'revenue'].includes(t))) {
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

export function buildQueryIR(naturalQuery: string, schemaMap: Map<string, SchemaTableInfo>): QueryIR {
    const tokens = tokenizer.tokenize(naturalQuery) || [];
    const lowerTokens = tokens.map(t => t.toLowerCase());
    const lowerQuery = naturalQuery.toLowerCase();

    const intent = classifyIntent(tokens);
    const targetTables: string[] = [];
    const ambiguities: string[] = [];

    // 1. Mask grammatical sorting phrases ("ordered by" / "order by") so they do not falsely trigger table "orders"
    let cleanQuery = lowerQuery.replace(/\border(?:ed)?\s+by\b/gi, ' __SORT_CLAUSE__ ');

    // 2. Sort tables by length descending so composite tables ("order_items") are checked before sub-parts ("orders")
    const tableNames = Array.from(schemaMap.keys()).sort((a, b) => b.length - a.length);

    for (const tableName of tableNames) {
        const spaceVariant = tableName.replace(/_/g, ' ');
        const singularVariant = spaceVariant.endsWith('s') ? spaceVariant.slice(0, -1) : spaceVariant;
        const rawSingular = tableName.endsWith('s') ? tableName.slice(0, -1) : tableName;

        const phraseRegex = new RegExp(`\\b(?:${escapeRegExp(spaceVariant)}|${escapeRegExp(singularVariant)}|${escapeRegExp(tableName)}|${escapeRegExp(rawSingular)})\\b`, 'i');

        if (phraseRegex.test(cleanQuery)) {
            if (!targetTables.includes(tableName)) {
                targetTables.push(tableName);
            }
            // Mask out the matched table phrase so sub-tokens (e.g. "order" inside "order items") do not re-match
            cleanQuery = cleanQuery.replace(phraseRegex, ` __MATCHED_${tableName.toUpperCase()}__ `);
        }
    }

    // 3. Check single-word table stem matches on remaining unmasked tokens
    const remainingTokens = cleanQuery.split(/[^a-zA-Z0-9_]+/).filter(Boolean);
    for (const tableName of tableNames) {
        if (targetTables.includes(tableName)) continue;

        const stemmedTable = stemmer.stem(tableName);
        const singularTable = tableName.endsWith('s') ? tableName.slice(0, -1) : tableName;

        if (
            remainingTokens.includes(tableName) ||
            remainingTokens.includes(singularTable) ||
            remainingTokens.some(tok => stemmer.stem(tok) === stemmedTable)
        ) {
            targetTables.push(tableName);
        }
    }

    // 4. Domain entity / business synonyms (e.g. "purchase" -> orders, "items" -> order_items)
    if (schemaMap.has('orders') && !targetTables.includes('orders')) {
        if (/\b(?:purchases?|purchased|bought|transactions?)\b/i.test(cleanQuery)) {
            targetTables.push('orders');
        }
    }
    if (schemaMap.has('order_items') && !targetTables.includes('order_items')) {
        if (/\b(?:items?|line_items?)\b/i.test(cleanQuery)) {
            targetTables.push('order_items');
        }
    }
    if (schemaMap.has('users') && !targetTables.includes('users')) {
        if (/\b(?:customers?|clients?|members?)\b/i.test(cleanQuery)) {
            targetTables.push('users');
        }
    }
    if (schemaMap.has('reviews') && !targetTables.includes('reviews')) {
        if (/\b(?:ratings?|feedbacks?|comments?)\b/i.test(cleanQuery)) {
            targetTables.push('reviews');
        }
    }

    // 5. Column-based entity inference if tables are still missing or ambiguous
    for (const [tName, tInfo] of schemaMap.entries()) {
        if (targetTables.includes(tName)) continue;
        for (const col of tInfo.columns) {
            if (col.name === 'id') continue; // skip generic primary key id
            const colWords = col.name.replace(/_/g, ' ');
            if (remainingTokens.includes(col.name) || lowerQuery.includes(colWords)) {
                targetTables.push(tName);
                break;
            }
        }
    }

    // Check ambiguities: unknown entity
    if (schemaMap.size > 0 && targetTables.length === 0) {
        ambiguities.push(`Could not deterministically identify target tables from request: "${naturalQuery}".`);
    }

    // Extract Limit
    let limit: number | undefined;
    const limitMatch = /(?:top|limit|first)\s+(\d+)/i.exec(naturalQuery);
    if (limitMatch) {
        limit = parseInt(limitMatch[1], 10);
    }

    // Extract Order By
    const orderBy: QueryIR['orderBy'] = [];
    if (/order by|sort(?:ed)? by|highest|top|most|cheapest|lowest|latest|newest|oldest/i.test(naturalQuery)) {
        const isDesc = /highest|top|most|latest|newest|desc/i.test(naturalQuery);
        let matchedCol = '';
        if (targetTables.length > 0) {
            for (const tName of targetTables) {
                const table = schemaMap.get(tName);
                if (!table) continue;
                for (const col of table.columns) {
                    if (lowerTokens.includes(col.name)) {
                        matchedCol = col.name;
                        break;
                    }
                }
                if (matchedCol) break;
                // Heuristics
                if (/price|amount|spent|cost/i.test(naturalQuery)) {
                    matchedCol = table.columns.find(c => /price|amount|total|cost|spent/i.test(c.name))?.name || '';
                } else if (/latest|newest|recent|date|time/i.test(naturalQuery)) {
                    matchedCol = table.columns.find(c => /created|date|time|timestamp/i.test(c.name))?.name || '';
                }
                if (matchedCol) break;
            }
        }
        if (matchedCol) {
            orderBy.push({ column: matchedCol, direction: isDesc ? 'DESC' : 'ASC' });
        }
    }

    // Metrics / Selected Columns
    const selectedMetrics: QueryIR['selectedMetrics'] = [];
    if (/count/i.test(naturalQuery)) {
        selectedMetrics.push({ expression: 'COUNT(*)', alias: 'total_count', func: 'COUNT' });
    } else if (/average|avg/i.test(naturalQuery)) {
        selectedMetrics.push({ expression: 'AVG(*)', alias: 'avg_val', func: 'AVG' });
    } else if (/sum|total|revenue/i.test(naturalQuery)) {
        selectedMetrics.push({ expression: 'SUM(*)', alias: 'total_sum', func: 'SUM' });
    }

    // Infer Joins between targetTables
    const joins: QueryIR['joins'] = [];
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
                    } else {
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

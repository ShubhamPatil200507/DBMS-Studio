import { Parser } from 'node-sql-parser';

export interface SqlPolicyValidationResult {
    isAllowed: boolean;
    reason?: string;
    statementType?: string;
    hasCte?: boolean;
    isSyntaxError?: boolean;
}

const parser = new Parser();

export const ALLOWED_READ_ONLY_STATEMENT_TYPES = new Set(['select', 'show', 'desc', 'explain']);
export const PROHIBITED_FUNCTIONS = new Set(['SLEEP', 'BENCHMARK', 'LOAD_FILE', 'GET_LOCK', 'RELEASE_LOCK']);

/**
 * Traverses an AST node recursively to identify prohibited database functions.
 */
function findProhibitedFunctions(node: any, found: string[] = []): string[] {
    if (!node || typeof node !== 'object') return found;

    if (node.type === 'function' && node.name) {
        let fnName = '';
        if (Array.isArray(node.name?.name) && node.name.name[0]?.value) {
            fnName = String(node.name.name[0].value).toUpperCase();
        } else if (typeof node.name?.value === 'string') {
            fnName = node.name.value.toUpperCase();
        } else if (typeof node.name === 'string') {
            fnName = node.name.toUpperCase();
        }

        if (PROHIBITED_FUNCTIONS.has(fnName) && !found.includes(fnName)) {
            found.push(fnName);
        }
    }

    for (const key of Object.keys(node)) {
        if (typeof node[key] === 'object' && node[key] !== null) {
            findProhibitedFunctions(node[key], found);
        }
    }

    return found;
}

/**
 * Enforces structural read-only policy using AST analysis combined with defense-in-depth checks.
 * Reconciles full CTE (WITH ... SELECT) support while strictly blocking data-modifying CTEs,
 * non-read-only statements, multiple statements, file exports, and dangerous functions.
 */
export function validateSqlExecutionPolicy(sql: string): SqlPolicyValidationResult {
    if (!sql || typeof sql !== 'string' || !sql.trim()) {
        return { isAllowed: false, reason: 'SQL query is required and must be a non-empty string.', isSyntaxError: true };
    }

    const trimmed = sql.trim();

    if (trimmed.length > 5000) {
        return { isAllowed: false, reason: 'Payload Too Large: SQL statement exceeds the 5,000 character limit.' };
    }

    // 1. Multiple semicolon delimiter checks
    const statements = trimmed
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0);

    if (statements.length > 1) {
        return {
            isAllowed: false,
            reason: 'Security Exception: Multiple semicolon-separated SQL statements are disallowed in the execution sandbox.'
        };
    }

    // 2. AST parsing for structural validation
    let ast: any;
    try {
        ast = parser.astify(trimmed, { database: 'MySQL' });
    } catch (parseErr: any) {
        return {
            isAllowed: false,
            reason: `Syntax error: ${parseErr.message || 'Invalid SQL syntax'}`,
            isSyntaxError: true
        };
    }

    if (!ast) {
        return { isAllowed: false, reason: 'Syntax error: Parser produced empty AST for input statement.', isSyntaxError: true };
    }

    // AST-level multiple statement verification
    if (Array.isArray(ast) && ast.length > 1) {
        return {
            isAllowed: false,
            reason: 'Security Exception: Multiple semicolon-separated SQL statements are disallowed in the execution sandbox.'
        };
    }

    const singleAst = Array.isArray(ast) ? ast[0] : ast;
    const stmtType = (singleAst.type || '').toLowerCase();

    // 3. Strict structural statement allowlist
    if (!ALLOWED_READ_ONLY_STATEMENT_TYPES.has(stmtType)) {
        return {
            isAllowed: false,
            reason: `Security Exception: Disallowed statement type '${stmtType}'. Only read-only queries (SELECT, WITH ... SELECT, SHOW, DESCRIBE, EXPLAIN) are permitted.`
        };
    }

    // 4. Common Table Expression (CTE) structural inspection
    const hasCte = Boolean(singleAst.with || singleAst._with);
    if (hasCte) {
        const cteCollection = singleAst.with || singleAst._with;
        const ctes = Array.isArray(cteCollection) ? cteCollection : [cteCollection];
        for (const cte of ctes) {
            if (cte.stmt && cte.stmt.type && !ALLOWED_READ_ONLY_STATEMENT_TYPES.has(cte.stmt.type.toLowerCase())) {
                return {
                    isAllowed: false,
                    reason: `Security Exception: Disallowed CTE statement type '${cte.stmt.type}'. All CTE queries must be read-only.`
                };
            }
        }
    }

    // 5. File export blocking (INTO OUTFILE / INTO DUMPFILE)
    if (singleAst.into && (singleAst.into.keyword || singleAst.into.type === 'into')) {
        const kw = singleAst.into.keyword ? `INTO ${singleAst.into.keyword}` : 'INTO OUTFILE/DUMPFILE';
        return {
            isAllowed: false,
            reason: `Security Exception: Prohibited file export clause detected: ${kw}.`
        };
    }

    // 6. Recursive AST function inspection (SLEEP, BENCHMARK, LOAD_FILE, locks)
    const prohibitedFunctions = findProhibitedFunctions(singleAst);
    if (prohibitedFunctions.length > 0) {
        return {
            isAllowed: false,
            reason: `Security Exception: Prohibited SQL execution function detected in sandbox: ${prohibitedFunctions.join(', ')}.`
        };
    }

    // 7. Defense-in-depth lexical verification
    if (/\b(INTO\s+OUTFILE|INTO\s+DUMPFILE|LOAD_FILE|BENCHMARK|SLEEP)\b/i.test(trimmed)) {
        return {
            isAllowed: false,
            reason: 'Security Exception: Prohibited SQL function or file export keyword detected in sandbox.'
        };
    }

    return {
        isAllowed: true,
        statementType: stmtType,
        hasCte
    };
}

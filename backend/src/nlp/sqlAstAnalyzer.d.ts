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
}
export declare function parseAndExplainSql(sql: string, databaseDialect?: string): DetailedSqlAnalysis;
//# sourceMappingURL=sqlAstAnalyzer.d.ts.map
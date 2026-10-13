export interface SchemaTableInfo {
    tableName: string;
    columns: {
        name: string;
        type?: string;
        isPk?: boolean;
        isFk?: boolean;
    }[];
    foreignKeys?: {
        column: string;
        targetTable: string;
        targetColumn: string;
    }[];
}
export interface QueryIR {
    intent: 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE' | 'AGGREGATE' | 'UNKNOWN';
    targetTables: string[];
    selectedMetrics: {
        expression: string;
        alias?: string;
        func?: string;
    }[];
    filters: {
        column: string;
        operator: string;
        value: any;
        table?: string;
    }[];
    groupBy: string[];
    having: {
        expression: string;
        operator: string;
        value: any;
    }[];
    orderBy: {
        column: string;
        direction: 'ASC' | 'DESC';
    }[];
    limit?: number;
    joins: {
        leftTable: string;
        rightTable: string;
        on: string;
        type: string;
    }[];
    ambiguities: string[];
    confidence: number;
    rawText: string;
    parsedAst?: any;
}
//# sourceMappingURL=queryIR.d.ts.map
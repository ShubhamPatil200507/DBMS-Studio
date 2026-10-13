import { QueryIR, SchemaTableInfo } from './queryIR';
export declare function parseSchemaContext(schemaDdl?: string): Map<string, SchemaTableInfo>;
export declare function classifyIntent(tokens: string[]): QueryIR['intent'];
export declare function buildQueryIR(naturalQuery: string, schemaMap: Map<string, SchemaTableInfo>): QueryIR;
//# sourceMappingURL=nluParser.d.ts.map
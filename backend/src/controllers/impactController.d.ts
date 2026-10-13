import { Request, Response } from 'express';
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
export declare const predictSchemaImpact: (req: Request, res: Response) => Promise<void>;
//# sourceMappingURL=impactController.d.ts.map
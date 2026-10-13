import { Request, Response } from 'express';
export interface AgentStepTrace {
    step: string;
    action: string;
    toolCalled?: string;
    input?: any;
    output?: any;
    status: 'SUCCESS' | 'WARNING' | 'FAILED';
    timestamp: string;
}
export interface AgentWorkflowResult {
    workflowName: string;
    success: boolean;
    traces: AgentStepTrace[];
    finalReport: any;
}
export declare const runAgentOptimizer: (req: Request, res: Response) => Promise<void>;
//# sourceMappingURL=agentWorkflow.d.ts.map
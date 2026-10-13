import { Request, Response } from 'express';
export declare const logActivity: (projectId: number, activityType: string, description: string) => Promise<void>;
export declare const getProjects: (req: Request, res: Response) => Promise<void>;
export declare const getProjectById: (req: Request, res: Response) => Promise<void>;
export declare const createProject: (req: Request, res: Response) => Promise<void>;
export declare const updateProject: (req: Request, res: Response) => Promise<void>;
export declare const deleteProject: (req: Request, res: Response) => Promise<void>;
export declare const saveSchema: (req: Request, res: Response) => Promise<void>;
export declare const saveQuery: (req: Request, res: Response) => Promise<void>;
//# sourceMappingURL=projectController.d.ts.map
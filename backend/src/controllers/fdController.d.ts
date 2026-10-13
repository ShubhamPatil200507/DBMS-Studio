import { Request, Response } from 'express';
interface FD {
    left: string[];
    right: string[];
}
export declare const calculateClosure: (attributes: Set<string>, fds: FD[], target: Set<string>) => {
    closure: Set<string>;
    steps: string[];
};
export declare const findCandidateKeys: (attributes: string[], fds: FD[]) => {
    candidateKeys: string[][];
    primeAttributes: string[];
    nonPrimeAttributes: string[];
};
export declare const analyzeNormalization: (attributes: string[], fds: FD[]) => {
    candidateKeys: string[][];
    primeAttributes: string[];
    nonPrimeAttributes: string[];
    highestForm: string;
    analysis: {
        fd: string;
        violation: string;
        reason: string;
    }[];
};
export declare const handleClosure: (req: Request, res: Response) => void;
export declare const handleCandidateKeys: (req: Request, res: Response) => void;
export declare const handleNormalization: (req: Request, res: Response) => void;
export {};
//# sourceMappingURL=fdController.d.ts.map
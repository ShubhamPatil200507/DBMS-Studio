import { Request, Response } from 'express';

interface FD {
    left: string[];
    right: string[];
}

// Utility: Check if set A is a subset of set B
const isSubset = (subset: Set<string>, superset: Set<string>) => {
    for (let elem of subset) {
        if (!superset.has(elem)) return false;
    }
    return true;
};

// Utility: Check if two sets are equal
const areSetsEqual = (a: Set<string>, b: Set<string>) => {
    return a.size === b.size && isSubset(a, b);
};

// 1. Attribute Closure Calculator
export const calculateClosure = (attributes: Set<string>, fds: FD[], target: Set<string>): { closure: Set<string>, steps: string[] } => {
    let closure = new Set(target);
    let steps: string[] = [`Initial closure = {${Array.from(closure).join(', ')}}`];
    let changed = true;

    while (changed) {
        changed = false;
        for (let fd of fds) {
            const leftSet = new Set(fd.left);
            const rightSet = new Set(fd.right);
            if (isSubset(leftSet, closure) && !isSubset(rightSet, closure)) {
                fd.right.forEach(attr => closure.add(attr));
                steps.push(`Using ${fd.left.join('')} \u2192 ${fd.right.join('')}, added {${fd.right.filter(x => !closure.has(x)).join(', ')}... wait}. Closure is now {${Array.from(closure).join(', ')}}`);
                changed = true;
            }
        }
    }
    return { closure, steps };
};

// Helper: Get all subsets of an array
const getSubsets = (array: string[]): string[][] => {
    return array.reduce(
        (subsets, value) => subsets.concat(subsets.map(set => [value, ...set])),
        [[]] as string[][]
    );
};

// 2. Candidate Key Finder
export const findCandidateKeys = (attributes: string[], fds: FD[]): { candidateKeys: string[][], primeAttributes: string[], nonPrimeAttributes: string[] } => {
    const attrSet = new Set(attributes);
    
    // Determine essential attributes (never on the right side)
    const rightSideAttrs = new Set(fds.flatMap(fd => fd.right));
    const leftSideAttrs = new Set(fds.flatMap(fd => fd.left));
    
    let essential = attributes.filter(a => !rightSideAttrs.has(a));
    let others = attributes.filter(a => rightSideAttrs.has(a) && leftSideAttrs.has(a)); // Middle attributes
    
    // If essential attributes determine everything, it's the only candidate key
    const essentialClosure = calculateClosure(attrSet, fds, new Set(essential)).closure;
    if (areSetsEqual(essentialClosure, attrSet)) {
        return categorizeAttributes(attributes, [essential]);
    }

    // Otherwise, generate combinations of 'others' with 'essential'
    const combinations = getSubsets(others).sort((a, b) => a.length - b.length); // Smallest first
    let candidateKeys: string[][] = [];

    for (let combo of combinations) {
        const potentialKey = [...essential, ...combo];
        const closure = calculateClosure(attrSet, fds, new Set(potentialKey)).closure;
        
        if (areSetsEqual(closure, attrSet)) {
            // Check if it's minimal (no subset is already a candidate key)
            const isMinimal = !candidateKeys.some(ck => isSubset(new Set(ck), new Set(potentialKey)));
            if (isMinimal) {
                candidateKeys.push(potentialKey);
            }
        }
    }

    return categorizeAttributes(attributes, candidateKeys);
};

const categorizeAttributes = (attributes: string[], candidateKeys: string[][]) => {
    const primeSet = new Set(candidateKeys.flat());
    const primeAttributes = Array.from(primeSet);
    const nonPrimeAttributes = attributes.filter(a => !primeSet.has(a));
    return { candidateKeys, primeAttributes, nonPrimeAttributes };
};

// 3. Normalization Analysis
export const analyzeNormalization = (attributes: string[], fds: FD[]) => {
    const { candidateKeys, primeAttributes, nonPrimeAttributes } = findCandidateKeys(attributes, fds);
    const attrSet = new Set(attributes);
    const primeSet = new Set(primeAttributes);
    
    let is2NF = true;
    let is3NF = true;
    let isBCNF = true;
    
    let analysis = [];

    for (let fd of fds) {
        const leftSet = new Set(fd.left);
        const rightSet = new Set(fd.right);
        
        // Trivial FD check: Y is subset of X
        if (isSubset(rightSet, leftSet)) continue;

        // Check if X is a superkey
        const leftClosure = calculateClosure(attrSet, fds, leftSet).closure;
        const isSuperKey = areSetsEqual(leftClosure, attrSet);

        if (!isSuperKey) {
            isBCNF = false; // BCNF violation
            
            // Check 3NF: Is Y a prime attribute? (for every attribute in Y)
            let yIsPrime = true;
            for (let attr of fd.right) {
                if (!primeSet.has(attr)) {
                    yIsPrime = false;
                    break;
                }
            }
            
            if (!yIsPrime) {
                is3NF = false; // 3NF violation
                
                // Check 2NF: Partial dependency check
                // A partial dependency exists if a non-prime attribute depends on a PROPER SUBSET of a candidate key
                let isProperSubsetOfAnyCK = false;
                for (let ck of candidateKeys) {
                    const ckSet = new Set(ck);
                    if (isSubset(leftSet, ckSet) && !areSetsEqual(leftSet, ckSet)) {
                        isProperSubsetOfAnyCK = true;
                        break;
                    }
                }
                
                if (isProperSubsetOfAnyCK) {
                    is2NF = false; // 2NF violation
                    analysis.push({
                        fd: `${fd.left.join('')} \u2192 ${fd.right.join('')}`,
                        violation: '2NF',
                        reason: `Partial Dependency: '${fd.left.join('')}' is a proper subset of a candidate key, determining non-prime attribute(s) '${fd.right.filter(x => !primeSet.has(x)).join(', ')}'`
                    });
                } else {
                     analysis.push({
                        fd: `${fd.left.join('')} \u2192 ${fd.right.join('')}`,
                        violation: '3NF',
                        reason: `Transitive Dependency: '${fd.left.join('')}' is not a superkey, and '${fd.right.join('')}' is not completely prime.`
                    });
                }
            } else {
                 analysis.push({
                    fd: `${fd.left.join('')} \u2192 ${fd.right.join('')}`,
                    violation: 'BCNF',
                    reason: `BCNF Violation: '${fd.left.join('')}' is not a superkey, but determines prime attribute(s).`
                });
            }
        }
    }

    let highestForm = isBCNF ? 'BCNF' : (is3NF ? '3NF' : (is2NF ? '2NF' : '1NF'));

    return { candidateKeys, primeAttributes, nonPrimeAttributes, highestForm, analysis };
};

// Express Endpoints
export const handleClosure = (req: Request, res: Response) => {
    const { attributes, fds, target } = req.body;
    const result = calculateClosure(new Set(attributes), fds, new Set(target));
    res.json({ closure: Array.from(result.closure), steps: result.steps });
};

export const handleCandidateKeys = (req: Request, res: Response) => {
    const { attributes, fds } = req.body;
    const result = findCandidateKeys(attributes, fds);
    res.json(result);
};

export const handleNormalization = (req: Request, res: Response) => {
    const { attributes, fds } = req.body;
    const result = analyzeNormalization(attributes, fds);
    res.json(result);
};

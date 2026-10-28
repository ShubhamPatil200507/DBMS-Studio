import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { calculateClosure, findCandidateKeys, analyzeNormalization, FD } from '../../src/controllers/fdController';

describe('Functional Dependencies & Relational Normalization Unit Tests', () => {
    it('computes attribute closure and provides correctly formatted step explanations', () => {
        const attributes = new Set(['A', 'B', 'C', 'D']);
        const fds: FD[] = [
            { left: ['A'], right: ['B'] },
            { left: ['B'], right: ['C'] }
        ];
        const target = new Set(['A']);

        const result = calculateClosure(attributes, fds, target);

        assert.deepEqual(Array.from(result.closure).sort(), ['A', 'B', 'C']);
        assert.ok(result.steps.length >= 3);
        // Verify no placeholder or bugged strings exist in steps
        for (const step of result.steps) {
            assert.ok(!step.includes('... wait'), `Step explanation must not contain '... wait': ${step}`);
            assert.ok(!step.includes('added {}'), `Step explanation must not report empty additions: ${step}`);
        }
    });

    it('correctly discovers candidate keys for single and multiple key schemas', () => {
        // Schema R(A, B, C, D) with FDs A -> B, B -> C, C -> D
        const attrs1 = ['A', 'B', 'C', 'D'];
        const fds1: FD[] = [
            { left: ['A'], right: ['B'] },
            { left: ['B'], right: ['C'] },
            { left: ['C'], right: ['D'] }
        ];

        const res1 = findCandidateKeys(attrs1, fds1);
        assert.equal(res1.candidateKeys.length, 1);
        assert.deepEqual(res1.candidateKeys[0], ['A']);
        assert.deepEqual(res1.primeAttributes, ['A']);
        assert.deepEqual(res1.nonPrimeAttributes.sort(), ['B', 'C', 'D']);

        // Schema with multiple candidate keys: R(A, B, C), FDs: A -> B, B -> C, C -> A
        const attrs2 = ['A', 'B', 'C'];
        const fds2: FD[] = [
            { left: ['A'], right: ['B'] },
            { left: ['B'], right: ['C'] },
            { left: ['C'], right: ['A'] }
        ];
        const res2 = findCandidateKeys(attrs2, fds2);
        assert.equal(res2.candidateKeys.length, 3);
        assert.deepEqual(res2.primeAttributes.sort(), ['A', 'B', 'C']);
        assert.equal(res2.nonPrimeAttributes.length, 0);
    });

    it('identifies 2NF partial dependency violations', () => {
        // R(StudentID, CourseID, Grade, CourseName)
        // Candidate key: {StudentID, CourseID}
        // CourseID -> CourseName (CourseName is non-prime and depends on proper subset of candidate key)
        const attributes = ['StudentID', 'CourseID', 'Grade', 'CourseName'];
        const fds: FD[] = [
            { left: ['StudentID', 'CourseID'], right: ['Grade'] },
            { left: ['CourseID'], right: ['CourseName'] }
        ];

        const res = analyzeNormalization(attributes, fds);
        assert.equal(res.highestForm, '1NF');
        assert.ok(res.analysis.some(a => a.violation === '2NF'));
    });

    it('identifies 3NF transitive dependency violations', () => {
        // R(EmpID, DeptID, DeptName)
        // Candidate key: {EmpID}
        // EmpID -> DeptID, DeptID -> DeptName
        const attributes = ['EmpID', 'DeptID', 'DeptName'];
        const fds: FD[] = [
            { left: ['EmpID'], right: ['DeptID'] },
            { left: ['DeptID'], right: ['DeptName'] }
        ];

        const res = analyzeNormalization(attributes, fds);
        assert.equal(res.highestForm, '2NF');
        assert.ok(res.analysis.some(a => a.violation === '3NF'));
    });

    it('identifies BCNF violations where determinant is not a superkey but determines prime attribute', () => {
        // Classic BCNF relation: R(Student, Course, Instructor)
        // FDs: {Student, Course} -> Instructor, Instructor -> Course
        // Candidate keys: {Student, Course}, {Student, Instructor}
        // Prime attributes: Student, Course, Instructor
        // Instructor -> Course violates BCNF (Instructor is not superkey, though Course is prime)
        const attributes = ['Student', 'Course', 'Instructor'];
        const fds: FD[] = [
            { left: ['Student', 'Course'], right: ['Instructor'] },
            { left: ['Instructor'], right: ['Course'] }
        ];

        const res = analyzeNormalization(attributes, fds);
        assert.equal(res.highestForm, '3NF');
        assert.ok(res.analysis.some(a => a.violation === 'BCNF'));
    });

    it('correctly certifies a relation that satisfies BCNF', () => {
        // R(UserID, Email, CreatedAt)
        // UserID -> Email, CreatedAt
        const attributes = ['UserID', 'Email', 'CreatedAt'];
        const fds: FD[] = [
            { left: ['UserID'], right: ['Email', 'CreatedAt'] }
        ];

        const res = analyzeNormalization(attributes, fds);
        assert.equal(res.highestForm, 'BCNF');
        assert.equal(res.analysis.length, 0);
    });
});

import { findCandidateKeys, analyzeNormalization, FD } from '../src/controllers/fdController';

export interface NormalizationTestCase {
    id: string;
    description: string;
    attributes: string[];
    fds: FD[];
    expectedCandidateKeys: string[][];
    expectedHighestNormalForm: '1NF' | '2NF' | '3NF' | 'BCNF';
    literatureReference: string;
}

export const NORMALIZATION_BENCHMARK_CORPUS: NormalizationTestCase[] = [
    // 1. Classic 1NF: Partial Dependencies present
    {
        id: 'NORM-01',
        description: 'Student Grade & Course Name (Partial dependency on CourseID)',
        attributes: ['StudentID', 'CourseID', 'Grade', 'CourseName'],
        fds: [
            { left: ['StudentID', 'CourseID'], right: ['Grade'] },
            { left: ['CourseID'], right: ['CourseName'] }
        ],
        expectedCandidateKeys: [['StudentID', 'CourseID']],
        expectedHighestNormalForm: '1NF',
        literatureReference: 'Elmasri & Navathe (Database Systems)'
    },
    {
        id: 'NORM-02',
        description: 'Employee Project Hours & Project Location',
        attributes: ['EmpID', 'ProjID', 'Hours', 'ProjLocation'],
        fds: [
            { left: ['EmpID', 'ProjID'], right: ['Hours'] },
            { left: ['ProjID'], right: ['ProjLocation'] }
        ],
        expectedCandidateKeys: [['EmpID', 'ProjID']],
        expectedHighestNormalForm: '1NF',
        literatureReference: 'Silberschatz, Korth, Sudarshan'
    },
    {
        id: 'NORM-03',
        description: 'Supplier Parts Shipment with Supplier City',
        attributes: ['SupplierID', 'PartID', 'Qty', 'City'],
        fds: [
            { left: ['SupplierID', 'PartID'], right: ['Qty'] },
            { left: ['SupplierID'], right: ['City'] }
        ],
        expectedCandidateKeys: [['SupplierID', 'PartID']],
        expectedHighestNormalForm: '1NF',
        literatureReference: 'C.J. Date (Relational Database Guide)'
    },
    {
        id: 'NORM-04',
        description: 'Orders with Product Category and Customer Phone',
        attributes: ['OrderID', 'ProductID', 'Quantity', 'Category', 'CustPhone'],
        fds: [
            { left: ['OrderID', 'ProductID'], right: ['Quantity'] },
            { left: ['ProductID'], right: ['Category'] },
            { left: ['OrderID'], right: ['CustPhone'] }
        ],
        expectedCandidateKeys: [['OrderID', 'ProductID']],
        expectedHighestNormalForm: '1NF',
        literatureReference: 'Ramakrishnan & Gehrke'
    },

    // 2. Classic 2NF: No partial dependencies, but transitive dependencies present
    {
        id: 'NORM-05',
        description: 'Employee Department and Department Manager (Transitive DeptID -> DeptManager)',
        attributes: ['EmpID', 'EmpName', 'DeptID', 'DeptManager'],
        fds: [
            { left: ['EmpID'], right: ['EmpName', 'DeptID'] },
            { left: ['DeptID'], right: ['DeptManager'] }
        ],
        expectedCandidateKeys: [['EmpID']],
        expectedHighestNormalForm: '2NF',
        literatureReference: 'Elmasri & Navathe'
    },
    {
        id: 'NORM-06',
        description: 'Student Major and Department Building',
        attributes: ['StudentID', 'Major', 'DeptBuilding'],
        fds: [
            { left: ['StudentID'], right: ['Major'] },
            { left: ['Major'], right: ['DeptBuilding'] }
        ],
        expectedCandidateKeys: [['StudentID']],
        expectedHighestNormalForm: '2NF',
        literatureReference: 'Silberschatz, Korth, Sudarshan'
    },
    {
        id: 'NORM-07',
        description: 'Order Shipping Zone and Shipping Rate',
        attributes: ['OrderID', 'ZipCode', 'ShippingRate'],
        fds: [
            { left: ['OrderID'], right: ['ZipCode'] },
            { left: ['ZipCode'], right: ['ShippingRate'] }
        ],
        expectedCandidateKeys: [['OrderID']],
        expectedHighestNormalForm: '2NF',
        literatureReference: 'Standard E-Commerce Relational Model'
    },
    {
        id: 'NORM-08',
        description: 'Vehicle Registration and State Tax Rate',
        attributes: ['VIN', 'OwnerID', 'State', 'TaxRate'],
        fds: [
            { left: ['VIN'], right: ['OwnerID', 'State'] },
            { left: ['State'], right: ['TaxRate'] }
        ],
        expectedCandidateKeys: [['VIN']],
        expectedHighestNormalForm: '2NF',
        literatureReference: 'Government DMV Benchmark'
    },

    // 3. Classic 3NF: No transitive dependency to non-prime, but violates BCNF (determinant is not superkey, but right is prime)
    {
        id: 'NORM-09',
        description: 'Student Course Instructor (Instructor -> Course, but Instructor is not superkey)',
        attributes: ['Student', 'Course', 'Instructor'],
        fds: [
            { left: ['Student', 'Course'], right: ['Instructor'] },
            { left: ['Instructor'], right: ['Course'] }
        ],
        expectedCandidateKeys: [['Student', 'Course'], ['Student', 'Instructor']],
        expectedHighestNormalForm: '3NF',
        literatureReference: 'Silberschatz, Korth (Classic BCNF counterexample)'
    },
    {
        id: 'NORM-10',
        description: 'Postal Code City Street Address with multiple overlapping candidate keys',
        attributes: ['City', 'Street', 'PostalCode'],
        fds: [
            { left: ['City', 'Street'], right: ['PostalCode'] },
            { left: ['PostalCode'], right: ['City'] }
        ],
        expectedCandidateKeys: [['City', 'Street'], ['PostalCode', 'Street']],
        expectedHighestNormalForm: '3NF',
        literatureReference: 'Elmasri & Navathe'
    },
    {
        id: 'NORM-11',
        description: 'Doctor Patient Treatment Clinic (Doctor -> Clinic, Clinic is prime)',
        attributes: ['Patient', 'Doctor', 'Clinic'],
        fds: [
            { left: ['Patient', 'Doctor'], right: ['Clinic'] },
            { left: ['Clinic'], right: ['Doctor'] }
        ],
        expectedCandidateKeys: [['Patient', 'Doctor'], ['Patient', 'Clinic']],
        expectedHighestNormalForm: '3NF',
        literatureReference: 'Medical Scheduling Database Benchmark'
    },

    // 4. Fully Normalized BCNF: All determinants are superkeys
    {
        id: 'NORM-12',
        description: 'User Account Profile (UserID is superkey for all attributes)',
        attributes: ['UserID', 'Email', 'PasswordHash', 'CreatedAt'],
        fds: [
            { left: ['UserID'], right: ['Email', 'PasswordHash', 'CreatedAt'] }
        ],
        expectedCandidateKeys: [['UserID']],
        expectedHighestNormalForm: 'BCNF',
        literatureReference: 'Standard Auth Relational Table'
    },
    {
        id: 'NORM-13',
        description: 'Product Catalog Item with multiple unique candidate keys (ID and SKU)',
        attributes: ['ProductID', 'SKU', 'Title', 'Price'],
        fds: [
            { left: ['ProductID'], right: ['SKU', 'Title', 'Price'] },
            { left: ['SKU'], right: ['ProductID', 'Title', 'Price'] }
        ],
        expectedCandidateKeys: [['ProductID'], ['SKU']],
        expectedHighestNormalForm: 'BCNF',
        literatureReference: 'E-commerce Catalog Model'
    },
    {
        id: 'NORM-14',
        description: 'Binary Relationship Table with Composite Key',
        attributes: ['StudentRef', 'ClubRef'],
        fds: [],
        expectedCandidateKeys: [['StudentRef', 'ClubRef']],
        expectedHighestNormalForm: 'BCNF',
        literatureReference: 'All-key Relation BCNF Axiom'
    },
    {
        id: 'NORM-15',
        description: 'Customer Account with Single Key and Independent Attributes',
        attributes: ['AccountNum', 'Balance', 'OpenDate'],
        fds: [
            { left: ['AccountNum'], right: ['Balance', 'OpenDate'] }
        ],
        expectedCandidateKeys: [['AccountNum']],
        expectedHighestNormalForm: 'BCNF',
        literatureReference: 'Banking System Schema'
    }
];

function normalizeKeyArray(keys: string[][]): string[] {
    return keys.map(k => [...k].sort().join(',')).sort();
}

export function runNormalizationBenchmark() {
    let candidateKeyMatches = 0;
    let normalFormMatches = 0;
    const latencies: number[] = [];
    const results: any[] = [];

    for (const testCase of NORMALIZATION_BENCHMARK_CORPUS) {
        const start = performance.now();
        const normResult = analyzeNormalization(testCase.attributes, testCase.fds);
        const end = performance.now();
        const latency = end - start;
        latencies.push(latency);

        const computedKeys = normalizeKeyArray(normResult.candidateKeys);
        const expectedKeys = normalizeKeyArray(testCase.expectedCandidateKeys);
        const ckMatch = JSON.stringify(computedKeys) === JSON.stringify(expectedKeys);
        const nfMatch = normResult.highestForm === testCase.expectedHighestNormalForm;

        if (ckMatch) candidateKeyMatches++;
        if (nfMatch) normalFormMatches++;

        results.push({
            id: testCase.id,
            description: testCase.description,
            expectedKeys: expectedKeys.join(' | '),
            computedKeys: computedKeys.join(' | '),
            candidateKeyMatch: ckMatch,
            expectedForm: testCase.expectedHighestNormalForm,
            computedForm: normResult.highestForm,
            normalFormMatch: nfMatch,
            latencyMs: Number(latency.toFixed(4))
        });
    }

    latencies.sort((a, b) => a - b);
    const medianLatencyMs = latencies[Math.floor(latencies.length / 2)];
    const meanLatencyMs = latencies.reduce((a, b) => a + b, 0) / latencies.length;
    const total = NORMALIZATION_BENCHMARK_CORPUS.length;

    const summary = {
        totalSchemasTested: total,
        candidateKeyExactMatches: candidateKeyMatches,
        candidateKeyAccuracy: Number(((candidateKeyMatches / total) * 100).toFixed(2)),
        normalFormExactMatches: normalFormMatches,
        normalFormAccuracy: Number(((normalFormMatches / total) * 100).toFixed(2)),
        meanLatencyMs: Number(meanLatencyMs.toFixed(4)),
        medianLatencyMs: Number(medianLatencyMs.toFixed(4))
    };

    return { summary, results };
}

if (require.main === module) {
    const { summary, results } = runNormalizationBenchmark();
    console.log('=== RELATIONAL NORMALIZATION BENCHMARK SUMMARY ===');
    console.table(summary);
}

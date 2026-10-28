import fs from 'fs';
import path from 'path';
import os from 'os';
import { runSecurityBenchmark } from './benchmark_security';
import { runNormalizationBenchmark } from './benchmark_normalization';
import { runNL2SQLBenchmark } from './benchmark_nl2sql';
import { runQueryOptimizationBenchmark } from './benchmark_query_optimization';

function toCsv(rows: any[]): string {
    if (!Array.isArray(rows) || rows.length === 0) return '';
    const headers = Object.keys(rows[0]);
    const escapeCsv = (val: any) => {
        if (val === null || val === undefined) return '';
        const str = String(val);
        if (str.includes(',') || str.includes('"') || str.includes('\n')) {
            return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
    };
    const lines = [headers.join(',')];
    for (const r of rows) {
        lines.push(headers.map(h => escapeCsv(r[h])).join(','));
    }
    return lines.join('\n');
}

export async function executeAllBenchmarks() {
    console.log('Starting Intelligent DBMS Studio Empirical Research Benchmarks...\n');

    const envMetadata = {
        timestamp: new Date().toISOString(),
        nodeVersion: process.version,
        platform: os.platform(),
        release: os.release(),
        architecture: os.arch(),
        cpuModel: os.cpus()[0]?.model || 'Unknown CPU',
        cpuCores: os.cpus().length,
        totalMemoryMB: Math.round(os.totalmem() / (1024 * 1024)),
        freeMemoryMB: Math.round(os.freemem() / (1024 * 1024))
    };

    console.log('=== SYSTEM ENVIRONMENT METADATA ===');
    console.table(envMetadata);

    // 1. Security Benchmark
    console.log('\n[1/4] Running Security Detection Benchmark (50 samples)...');
    const secBenchmark = runSecurityBenchmark();
    console.table(secBenchmark.summary);

    // 2. Normalization Benchmark
    console.log('\n[2/4] Running Relational Normalization & Key Discovery Benchmark (15 ground-truth schemas)...');
    const normBenchmark = runNormalizationBenchmark();
    console.table(normBenchmark.summary);

    // 3. NL2SQL Benchmark (Preserved 20 + Unseen 20 = 40 total queries)
    console.log('\n[3/4] Running NL-to-SQL Intent & Schema Resolution Benchmark (40 queries across preserved and unseen sets)...');
    const nl2sqlBenchmark = runNL2SQLBenchmark();
    console.log('--- Preserved Original Set (20 queries) ---');
    console.table(nl2sqlBenchmark.preservedCorpus.summary);
    console.log('--- Unseen Evaluation Set (20 queries) ---');
    console.table(nl2sqlBenchmark.unseenCorpus.summary);
    console.log('--- Combined NL2SQL Summary ---');
    console.table(nl2sqlBenchmark.summary);

    // 4. Query Optimization Benchmark (AST Analysis + Live MySQL Rewrite Equivalence)
    console.log('\n[4/4] Running Query Optimization & Live MySQL Execution Benchmark...');
    const optBenchmark = await runQueryOptimizationBenchmark(5);
    console.log('--- AST Structural Analysis (Local Parser) ---');
    console.table(optBenchmark.astBenchmark.summary);
    console.log('--- Empirical Live Database Rewrite & Equivalence (MySQL Engine) ---');
    if (optBenchmark.liveDbBenchmark.summary.status === 'COMPLETED_EMPIRICAL_LIVE_DB') {
        console.table(optBenchmark.liveDbBenchmark.summary);
        console.table(optBenchmark.liveDbBenchmark.results);
    } else {
        console.log(`Live DB Benchmark Status: ${optBenchmark.liveDbBenchmark.summary.status}`);
    }

    // Write artifacts to backend/benchmark_results/
    const resultsDir = path.resolve(__dirname, '../benchmark_results');
    if (!fs.existsSync(resultsDir)) {
        fs.mkdirSync(resultsDir, { recursive: true });
    }

    const fullReport = {
        metadata: envMetadata,
        benchmarks: {
            security: secBenchmark,
            normalization: normBenchmark,
            nl2sql: nl2sqlBenchmark,
            queryOptimization: optBenchmark
        }
    };

    // Save JSON report
    const jsonPath = path.join(resultsDir, 'benchmark_report.json');
    fs.writeFileSync(jsonPath, JSON.stringify(fullReport, null, 2), 'utf8');

    // Save individual CSV files
    fs.writeFileSync(path.join(resultsDir, 'security_benchmark.csv'), toCsv(secBenchmark.results), 'utf8');
    fs.writeFileSync(path.join(resultsDir, 'normalization_benchmark.csv'), toCsv(normBenchmark.results), 'utf8');
    fs.writeFileSync(path.join(resultsDir, 'nl2sql_benchmark.csv'), toCsv(nl2sqlBenchmark.detailedResults), 'utf8');
    fs.writeFileSync(path.join(resultsDir, 'query_optimization_benchmark.csv'), toCsv(optBenchmark.results), 'utf8');
    if (optBenchmark.liveDbBenchmark.results?.length > 0) {
        fs.writeFileSync(path.join(resultsDir, 'query_optimization_live_db.csv'), toCsv(optBenchmark.liveDbBenchmark.results), 'utf8');
    }

    console.log(`\nAll benchmarks successfully executed and artifacts saved to: ${resultsDir}`);
    return fullReport;
}

if (require.main === module) {
    executeAllBenchmarks().catch(err => {
        console.error('Benchmark execution error:', err);
        process.exit(1);
    });
}

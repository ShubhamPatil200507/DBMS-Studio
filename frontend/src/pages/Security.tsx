import React, { useState } from 'react';
import axios from 'axios';
import { ShieldAlert, ShieldCheck, Search, Code2, AlertTriangle, FolderSearch, Database, RefreshCw, Key, Lock, GitBranch } from 'lucide-react';
import { API_BASE_URL } from '../api/config';

const Security: React.FC = () => {
    const [code, setCode] = useState("const query = 'SELECT * FROM users WHERE username = \\'' + req.body.username + '\\' AND password = \\'' + req.body.password + '\\'';");
    const [analysis, setAnalysis] = useState<any>(null);
    const [scanningRepo, setScanningRepo] = useState(false);
    const [repoReport, setRepoReport] = useState<any>(null);
    const [githubUrl, setGithubUrl] = useState('');
    const [auditingDb, setAuditingDb] = useState(false);
    const [dbReport, setDbReport] = useState<any>(null);
    const [activeView, setActiveView] = useState<'SNIPPET' | 'REPO' | 'DB_AUDIT'>('SNIPPET');
    const [scanError, setScanError] = useState('');
    const [dbError, setDbError] = useState('');

    // Custom Database Connection Inputs
    const [dbHost, setDbHost] = useState('localhost');
    const [dbPort, setDbPort] = useState('3306');
    const [dbUser, setDbUser] = useState('root');
    const [dbPass, setDbPass] = useState('');
    const [dbName, setDbName] = useState('dbms_studio');

    const analyzeSnippet = async () => {
        try {
            const res = await axios.post(`${API_BASE_URL}/api/security/scan-snippet`, { code });
            setAnalysis(res.data);
        } catch (e: any) {
            console.error('Snippet scan failed', e);
        }
    };

    const runRepoScan = async (targetUrl?: string) => {
        setScanningRepo(true);
        setScanError('');
        try {
            const endpoint = targetUrl 
                ? `${API_BASE_URL}/api/security/source-scan?githubUrl=${encodeURIComponent(targetUrl)}`
                : `${API_BASE_URL}/api/security/source-scan`;
            const res = await axios.get(endpoint);
            setRepoReport(res.data);
            setActiveView('REPO');
        } catch (e: any) {
            setScanError(e.response?.data?.error || 'Failed to scan repository. Please verify the GitHub URL.');
        } finally {
            setScanningRepo(false);
        }
    };

    const runDbAudit = async (customCreds?: any) => {
        setAuditingDb(true);
        setDbError('');
        try {
            const payload = customCreds || {
                host: dbHost,
                port: Number(dbPort) || 3306,
                user: dbUser,
                password: dbPass,
                database: dbName
            };
            const res = await axios.post(`${API_BASE_URL}/api/security/database-audit`, payload);
            setDbReport(res.data);
            setActiveView('DB_AUDIT');
        } catch (e: any) {
            setDbError(e.response?.data?.error || 'Failed to audit database. Check host, credentials, and network reachability.');
        } finally {
            setAuditingDb(false);
        }
    };

    return (
        <div className="p-6 h-full flex flex-col space-y-6 overflow-y-auto">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Security & Vulnerability Center</h1>
                    <p className="text-gray-500 dark:text-gray-400">Real AST taint-analysis, GitHub & local source-code auditing, and database permission hardening.</p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={runDbAudit}
                        disabled={auditingDb}
                        className="bg-purple-600 hover:bg-purple-700 text-white px-3.5 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 transition disabled:opacity-50"
                    >
                        {auditingDb ? <RefreshCw className="animate-spin" size={16} /> : <Database size={16} />}
                        <span>Audit Database Privileges</span>
                    </button>
                </div>
            </div>

            {/* Navigation Tabs */}
            <div className="flex border-b border-gray-200 dark:border-gray-800 space-x-6 text-sm font-semibold">
                <button
                    onClick={() => setActiveView('SNIPPET')}
                    className={`pb-3 ${activeView === 'SNIPPET' ? 'border-b-2 border-indigo-600 text-indigo-600 dark:text-indigo-400' : 'text-gray-500 hover:text-gray-700'}`}
                >
                    Interactive Snippet Scanner
                </button>
                <button
                    onClick={() => setActiveView('REPO')}
                    className={`pb-3 ${activeView === 'REPO' ? 'border-b-2 border-indigo-600 text-indigo-600 dark:text-indigo-400' : 'text-gray-500 hover:text-gray-700'}`}
                >
                    Repository & GitHub SAST Audit {repoReport && `(${repoReport.findingsCount})`}
                </button>
                <button
                    onClick={() => setActiveView('DB_AUDIT')}
                    className={`pb-3 ${activeView === 'DB_AUDIT' ? 'border-b-2 border-indigo-600 text-indigo-600 dark:text-indigo-400' : 'text-gray-500 hover:text-gray-700'}`}
                >
                    Database Hardening & Permissions
                </button>
            </div>

            {/* VIEW 1: INTERACTIVE SNIPPET SCANNER */}
            {activeView === 'SNIPPET' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 flex-1">
                    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6 shadow-sm">
                        <h3 className="font-semibold text-lg text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                            <Code2 className="text-indigo-500" /> Backend Code Snippet
                        </h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Paste backend database query code to test against SQL injection taint-analysis and CWE detection rules.</p>
                        
                        <textarea 
                            className="w-full h-56 bg-gray-50 dark:bg-gray-950 border border-gray-300 dark:border-gray-700 rounded-lg p-4 font-mono text-sm text-gray-900 dark:text-white focus:outline-none focus:border-indigo-500 transition-colors resize-none mb-4"
                            value={code}
                            onChange={(e) => setCode(e.target.value)}
                        />
                        
                        <button 
                            onClick={analyzeSnippet}
                            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-3 rounded-lg font-bold flex items-center justify-center transition"
                        >
                            <Search size={18} className="mr-2" /> Run Taint & Vulnerability Scan
                        </button>
                    </div>

                    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6 shadow-sm overflow-y-auto">
                        <h3 className="font-semibold text-lg text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                            <ShieldAlert className="text-red-500" /> Vulnerability Report
                        </h3>
                        
                        {!analysis ? (
                            <div className="text-gray-400 text-center py-20">
                                Click 'Run Taint & Vulnerability Scan' to inspect the code.
                            </div>
                        ) : analysis.safe ? (
                            <div className="bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-800 p-6 rounded-xl flex flex-col items-center text-center">
                                <ShieldCheck size={48} className="text-green-500 mb-4" />
                                <h4 className="text-lg font-bold text-green-700 dark:text-green-400 mb-2">Code Appears Safe</h4>
                                <p className="text-sm text-green-600 dark:text-green-500">No SQL injection sinks or unsafe taint patterns detected.</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {analysis.findings.map((f: any, i: number) => (
                                    <div key={i} className="border-l-4 border-red-500 bg-red-50 dark:bg-red-900/10 p-4 rounded-r-xl space-y-2">
                                        <div className="flex justify-between items-start">
                                            <h4 className="font-bold text-red-800 dark:text-red-300 flex items-center gap-2">
                                                <AlertTriangle size={16} /> {f.ruleId}: {f.message}
                                            </h4>
                                            <span className="text-xs font-bold bg-red-200 dark:bg-red-800 text-red-900 dark:text-red-100 px-2 py-0.5 rounded">
                                                {f.severity}
                                            </span>
                                        </div>
                                        <div className="text-xs font-mono bg-white/60 dark:bg-black/40 p-2 rounded text-red-900 dark:text-red-200 overflow-x-auto">
                                            {f.codeSnippet}
                                        </div>
                                        <div className="text-xs text-gray-600 dark:text-gray-300">
                                            <span className="font-bold">Source:</span> {f.source} &rarr; <span className="font-bold">Sink:</span> {f.sink}
                                        </div>
                                        <div className="bg-white/50 dark:bg-black/20 p-2.5 rounded border border-red-200/50 dark:border-red-800/50">
                                            <strong className="text-xs text-red-900 dark:text-red-200 block mb-0.5">Remediation:</strong>
                                            <p className="text-xs font-mono text-green-700 dark:text-green-400">{f.recommendation}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* VIEW 2: REPOSITORY & GITHUB SAST AUDIT */}
            {activeView === 'REPO' && (
                <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6 shadow-sm space-y-6">
                    <div>
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                            <FolderSearch className="text-indigo-500" /> Static Application Security Testing (SAST) Scanner
                        </h3>
                        <p className="text-sm text-gray-500">Scan any public GitHub repository or your local workspace for SQL injection vulnerabilities and secrets.</p>
                    </div>

                    {/* GitHub URL Input Bar */}
                    <div className="bg-gray-50 dark:bg-gray-950 p-4 rounded-xl border border-gray-200 dark:border-gray-800 space-y-3">
                        <label className="text-xs font-bold uppercase tracking-wider text-gray-500 flex items-center gap-1.5">
                            <GitBranch size={14} /> GitHub Repository URL
                        </label>
                        <div className="flex flex-col sm:flex-row gap-2">
                            <input
                                type="url"
                                placeholder="https://github.com/owner/repository"
                                className="flex-1 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white font-mono"
                                value={githubUrl}
                                onChange={(e) => setGithubUrl(e.target.value)}
                            />
                            <button
                                onClick={() => runRepoScan(githubUrl)}
                                disabled={scanningRepo || !githubUrl.trim()}
                                className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-lg font-semibold text-sm transition disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {scanningRepo ? <RefreshCw className="animate-spin" size={16} /> : <Search size={16} />}
                                <span>Scan GitHub Repo</span>
                            </button>
                        </div>
                        {scanError && <p className="text-red-500 text-xs font-medium">{scanError}</p>}
                    </div>

                    {repoReport ? (
                        <div className="space-y-4">
                            <div className="flex justify-between items-center bg-gray-50 dark:bg-gray-950 p-4 rounded-xl border border-gray-200 dark:border-gray-800">
                                <div>
                                    <span className="text-xs text-gray-500 block">Scanned Target</span>
                                    <span className="font-mono font-bold text-sm text-gray-900 dark:text-white">{repoReport.repoSource}</span>
                                </div>
                                <div className="text-right">
                                    <span className="text-xs text-gray-500 block">Total Files & Findings</span>
                                    <span className="text-sm font-bold text-gray-900 dark:text-white">
                                        {repoReport.totalFilesScanned} files &bull; {repoReport.findingsCount} issue(s)
                                    </span>
                                </div>
                            </div>

                            {repoReport.findings.length > 0 ? (
                                <div className="space-y-3">
                                    {repoReport.findings.map((f: any, i: number) => (
                                        <div key={i} className="border border-gray-200 dark:border-gray-800 rounded-lg p-4 bg-gray-50 dark:bg-gray-950 space-y-2">
                                            <div className="flex justify-between items-center">
                                                <div className="font-mono text-xs font-bold text-indigo-600 dark:text-indigo-400">
                                                    {f.file}:{f.line}
                                                </div>
                                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${f.severity === 'CRITICAL' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>
                                                    {f.severity}
                                                </span>
                                            </div>
                                            <p className="text-sm font-semibold text-gray-900 dark:text-white">{f.message}</p>
                                            <pre className="text-xs font-mono bg-white dark:bg-gray-900 p-2.5 rounded border border-gray-200 dark:border-gray-800 text-red-600 dark:text-red-400 overflow-x-auto">
                                                {f.codeSnippet}
                                            </pre>
                                            <div className="text-xs text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-900/10 p-2 rounded">
                                                &bull; <strong className="text-green-800 dark:text-green-300">Remediation:</strong> {f.recommendation}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="p-8 text-center bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-800 rounded-xl">
                                    <ShieldCheck size={40} className="text-green-500 mx-auto mb-2" />
                                    <h4 className="font-bold text-green-800 dark:text-green-300">Clean Repository</h4>
                                    <p className="text-xs text-green-600 dark:text-green-400">No SQL injection vulnerabilities or hardcoded secrets found in scanned files.</p>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="text-center py-12 text-gray-500">
                            Enter a GitHub repository URL above or click 'Scan Studio Repo' to run the scanner.
                        </div>
                    )}
                </div>
            )}

            {/* VIEW 3: DATABASE PERMISSION AUDIT */}
            {activeView === 'DB_AUDIT' && (
                <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6 shadow-sm space-y-6">
                    <div className="flex justify-between items-center border-b border-gray-200 dark:border-gray-800 pb-4">
                        <div>
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                <Database className="text-purple-500" /> Database Engine & Permission Auditor
                            </h3>
                            <p className="text-sm text-gray-500">Connect to any target database (local or remote) to audit CURRENT_USER(), granted privileges, TLS/SSL, and least-privilege compliance.</p>
                        </div>
                    </div>

                    {/* Dynamic Database Connection Input Bar */}
                    <div className="bg-gray-50 dark:bg-gray-950 p-4 rounded-xl border border-gray-200 dark:border-gray-800 space-y-3">
                        <label className="text-xs font-bold uppercase tracking-wider text-gray-500 flex items-center gap-1.5">
                            <Key size={14} /> Target Database Connection Parameters
                        </label>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
                            <div>
                                <label className="text-[11px] text-gray-500 font-medium block mb-1">Host / Endpoint</label>
                                <input
                                    type="text"
                                    placeholder="localhost or db.example.com"
                                    className="w-full bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-xs font-mono text-gray-900 dark:text-white"
                                    value={dbHost}
                                    onChange={(e) => setDbHost(e.target.value)}
                                />
                            </div>
                            <div>
                                <label className="text-[11px] text-gray-500 font-medium block mb-1">Port</label>
                                <input
                                    type="text"
                                    placeholder="3306"
                                    className="w-full bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-xs font-mono text-gray-900 dark:text-white"
                                    value={dbPort}
                                    onChange={(e) => setDbPort(e.target.value)}
                                />
                            </div>
                            <div>
                                <label className="text-[11px] text-gray-500 font-medium block mb-1">Database User</label>
                                <input
                                    type="text"
                                    placeholder="root or app_user"
                                    className="w-full bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-xs font-mono text-gray-900 dark:text-white"
                                    value={dbUser}
                                    onChange={(e) => setDbUser(e.target.value)}
                                />
                            </div>
                            <div>
                                <label className="text-[11px] text-gray-500 font-medium block mb-1">Password</label>
                                <input
                                    type="password"
                                    placeholder="••••••••"
                                    className="w-full bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-xs font-mono text-gray-900 dark:text-white"
                                    value={dbPass}
                                    onChange={(e) => setDbPass(e.target.value)}
                                />
                            </div>
                            <div>
                                <label className="text-[11px] text-gray-500 font-medium block mb-1">Database Name</label>
                                <input
                                    type="text"
                                    placeholder="dbms_studio"
                                    className="w-full bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-xs font-mono text-gray-900 dark:text-white"
                                    value={dbName}
                                    onChange={(e) => setDbName(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="flex justify-end gap-2 pt-1">
                            <button
                                onClick={() => runDbAudit()}
                                disabled={auditingDb}
                                className="bg-purple-600 hover:bg-purple-700 text-white px-5 py-2 rounded-lg font-semibold text-xs transition disabled:opacity-50 flex items-center gap-2"
                            >
                                {auditingDb ? <RefreshCw className="animate-spin" size={14} /> : <Database size={14} />}
                                <span>Audit Target Database</span>
                            </button>
                        </div>
                        {dbError && <p className="text-red-500 text-xs font-medium">{dbError}</p>}
                    </div>

                    {dbReport ? (
                        <div className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                <div className="p-4 bg-gray-50 dark:bg-gray-950 rounded-lg border border-gray-200 dark:border-gray-800">
                                    <span className="text-xs text-gray-500 block">Database User</span>
                                    <span className="font-bold text-sm text-gray-900 dark:text-white font-mono">{dbReport.currentUser}</span>
                                </div>
                                <div className="p-4 bg-gray-50 dark:bg-gray-950 rounded-lg border border-gray-200 dark:border-gray-800">
                                    <span className="text-xs text-gray-500 block">Server Version</span>
                                    <span className="font-bold text-sm text-gray-900 dark:text-white font-mono">{dbReport.version}</span>
                                </div>
                                <div className="p-4 bg-gray-50 dark:bg-gray-950 rounded-lg border border-gray-200 dark:border-gray-800">
                                    <span className="text-xs text-gray-500 block">Host Endpoint</span>
                                    <span className="font-bold text-sm text-gray-900 dark:text-white font-mono">{dbReport.connectionHost}</span>
                                </div>
                                <div className="p-4 bg-gray-50 dark:bg-gray-950 rounded-lg border border-gray-200 dark:border-gray-800">
                                    <span className="text-xs text-gray-500 block">TLS/SSL Transport</span>
                                    <span className={`font-bold text-sm ${dbReport.sslActive ? 'text-green-600' : 'text-red-500'}`}>
                                        {dbReport.sslActive ? 'ACTIVE (Encrypted)' : 'DISABLED (Plaintext)'}
                                    </span>
                                </div>
                            </div>

                            {/* Grants Table */}
                            <div>
                                <h4 className="font-bold text-sm text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                                    <Key size={16} className="text-yellow-500" /> Active Granted Privileges
                                </h4>
                                <div className="space-y-2">
                                    {dbReport.privileges.map((p: any, i: number) => (
                                        <div key={i} className="p-3 bg-gray-50 dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-lg flex justify-between items-center">
                                            <div>
                                                <code className="text-xs font-mono font-semibold text-gray-800 dark:text-gray-200">{p.grant}</code>
                                                <p className="text-xs text-gray-500 mt-0.5">{p.reason}</p>
                                            </div>
                                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${p.riskLevel === 'CRITICAL' ? 'bg-red-100 text-red-700' : p.riskLevel === 'WARNING' ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'}`}>
                                                {p.riskLevel}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Hardening Recommendations */}
                            {dbReport.hardeningRecommendations?.length > 0 && (
                                <div className="p-4 bg-purple-50 dark:bg-purple-900/10 border border-purple-200 dark:border-purple-800/30 rounded-xl space-y-2">
                                    <h4 className="font-bold text-purple-900 dark:text-purple-300 text-sm flex items-center gap-2">
                                        <Lock size={16} /> Hardening & Least-Privilege Recommendations
                                    </h4>
                                    <ul className="list-disc list-inside space-y-1 text-xs text-purple-800 dark:text-purple-200">
                                        {dbReport.hardeningRecommendations.map((r: string, i: number) => (
                                            <li key={i}>{r}</li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="text-center py-12 text-gray-500">
                            Click 'Audit Database Privileges' to inspect engine permissions.
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default Security;

import React, { useState } from 'react';
import axios from 'axios';
import Editor from '@monaco-editor/react';
import { Activity, AlertTriangle, Zap, CheckCircle, RefreshCw } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { API_BASE_URL } from '../api/config';

const Performance: React.FC = () => {
    const [sql, setSql] = useState('');
    const [schema, setSchema] = useState('');
    const [loading, setLoading] = useState(false);
    const [runningAgent, setRunningAgent] = useState(false);
    const [agentTraces, setAgentTraces] = useState<any[]>([]);
    const [report, setReport] = useState<any>(null);
    const [error, setError] = useState('');
    const { theme } = useTheme();

    const handleAnalyze = async () => {
        if (!sql.trim()) {
            setError('Please provide a MySQL query to analyze');
            return;
        }

        setError('');
        setLoading(true);
        setAgentTraces([]);
        try {
            const response = await axios.post(`${API_BASE_URL}/api/performance/analyze`, { sql, schema });
            setReport(response.data);
        } catch (err: any) {
            setError(err.response?.data?.error || 'Failed to analyze query performance');
        } finally {
            setLoading(false);
        }
    };

    const handleRunAgent = async () => {
        if (!sql.trim()) {
            setError('Please provide a MySQL query for the agent workflow');
            return;
        }

        setError('');
        setRunningAgent(true);
        setReport(null);
        try {
            const response = await axios.post(`${API_BASE_URL}/api/agent/optimize`, { sql, schema });
            if (response.data.success) {
                setReport(response.data.finalReport);
                setAgentTraces(response.data.traces);
            }
        } catch (err: any) {
            setError(err.response?.data?.error || 'Failed to run agent optimizer');
        } finally {
            setRunningAgent(false);
        }
    };

    const getScoreColor = (score: number) => {
        if (score >= 80) return 'text-green-500';
        if (score >= 50) return 'text-yellow-500';
        return 'text-red-500';
    };

    return (
        <div className="p-6 h-full flex flex-col space-y-6 overflow-y-auto">
            <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Query Performance Analyzer</h1>
                <p className="text-gray-500 dark:text-gray-400">Analyze MySQL queries, view EXPLAIN execution plans, and get optimization recommendations.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Inputs */}
                <div className="space-y-4">
                    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl flex flex-col shadow-sm overflow-hidden h-[300px] transition-colors">
                        <div className="p-3 border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-950 flex justify-between items-center transition-colors">
                            <h3 className="font-semibold text-gray-900 dark:text-white">Query to Analyze</h3>
                            <button onClick={() => setSql('SELECT * FROM students WHERE department_id = 10;')} className="text-blue-500 dark:text-blue-400 text-sm hover:text-blue-600 dark:hover:text-blue-300">Example</button>
                        </div>
                        <Editor
                            height="100%"
                            defaultLanguage="sql"
                            theme={theme === 'dark' ? 'vs-dark' : 'vs-light'}
                            value={sql}
                            onChange={(val) => setSql(val || '')}
                            options={{ minimap: { enabled: false }, fontSize: 14 }}
                        />
                    </div>

                    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl flex flex-col shadow-sm overflow-hidden h-[200px] transition-colors">
                        <div className="p-3 border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-950 transition-colors">
                            <h3 className="font-semibold text-gray-900 dark:text-white">Schema Context (Optional)</h3>
                        </div>
                        <Editor
                            height="100%"
                            defaultLanguage="sql"
                            theme={theme === 'dark' ? 'vs-dark' : 'vs-light'}
                            value={schema}
                            onChange={(val) => setSchema(val || '')}
                            options={{ minimap: { enabled: false }, fontSize: 13, lineNumbers: 'off' }}
                        />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3">
                        <button 
                            onClick={handleAnalyze}
                            disabled={loading || runningAgent}
                            className="bg-yellow-600 hover:bg-yellow-700 text-white py-3 rounded-xl font-bold flex justify-center items-center space-x-2 transition disabled:opacity-50 text-sm"
                        >
                            {loading ? <RefreshCw className="animate-spin" size={18} /> : <Activity size={18} />}
                            <span>Analyze Plan</span>
                        </button>
                        <button 
                            onClick={handleRunAgent}
                            disabled={loading || runningAgent}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded-xl font-bold flex justify-center items-center space-x-2 transition disabled:opacity-50 text-sm"
                        >
                            {runningAgent ? <RefreshCw className="animate-spin" size={18} /> : <Zap size={18} />}
                            <span>Run Agentic Optimizer</span>
                        </button>
                    </div>
                    {error && <p className="text-red-500 text-sm text-center">{error}</p>}
                </div>

                {/* Report */}
                <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl shadow-sm overflow-hidden flex flex-col min-h-[500px] transition-colors">
                    <div className="p-4 border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-950 flex justify-between items-center transition-colors">
                        <h3 className="font-semibold text-gray-900 dark:text-white">Performance Report</h3>
                    </div>
                    <div className="p-6 flex-1 overflow-y-auto space-y-6">
                        {!report && !loading && (
                            <div className="text-gray-400 dark:text-gray-500 text-center py-20 flex flex-col items-center">
                                <Zap size={48} className="mb-4 text-gray-300 dark:text-gray-700" />
                                <p>Enter a query and run the analyzer to see performance insights.</p>
                            </div>
                        )}

                        {loading && (
                            <div className="text-center py-20 text-gray-500 dark:text-gray-400">
                                Generating performance report...
                            </div>
                        )}

                        {report && (
                            <>
                                <div className="flex items-center justify-between bg-gray-50 dark:bg-gray-950 p-6 rounded-xl border border-gray-200 dark:border-gray-800 transition-colors">
                                    <div>
                                        <h4 className="text-gray-500 dark:text-gray-400 font-medium mb-1">Performance Score</h4>
                                        <p className="text-sm text-gray-400 dark:text-gray-500">Based on heuristics & EXPLAIN</p>
                                    </div>
                                    <div className={`text-5xl font-extrabold ${getScoreColor(report.score)}`}>
                                        {report.score}<span className="text-2xl text-gray-300 dark:text-gray-500">/100</span>
                                    </div>
                                </div>

                                {agentTraces && agentTraces.length > 0 && (
                                    <div className="bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-900/50 p-4 rounded-xl space-y-2">
                                        <h4 className="font-bold text-xs uppercase text-indigo-700 dark:text-indigo-400 tracking-wider flex items-center gap-1.5">
                                            <Zap size={14} /> Agent Tool Execution Trace ({agentTraces.length} verified steps)
                                        </h4>
                                        <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                                            {agentTraces.map((t: any, idx: number) => (
                                                <div key={idx} className="p-2.5 bg-white dark:bg-gray-900 border border-indigo-100 dark:border-indigo-900/30 rounded text-xs space-y-0.5">
                                                    <div className="flex justify-between items-center font-semibold text-gray-900 dark:text-white">
                                                        <span>{t.step}</span>
                                                        <span className={`text-[10px] px-1.5 py-0.2 rounded font-bold ${t.status === 'SUCCESS' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                                                            {t.toolCalled || 'Workflow Engine'}
                                                        </span>
                                                    </div>
                                                    <div className="text-gray-600 dark:text-gray-400">{t.action}</div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                <div>
                                    <h4 className="font-bold text-gray-900 dark:text-white mb-2">Query Summary</h4>
                                    <p className="text-gray-700 dark:text-gray-300 text-sm bg-gray-50 dark:bg-gray-800/50 p-4 rounded-lg">{report.summary}</p>
                                </div>

                                {report.real_explain && report.real_explain.length > 0 && (
                                    <div>
                                        <h4 className="font-bold text-gray-900 dark:text-white mb-2 text-sm uppercase tracking-wider">MySQL EXPLAIN Output</h4>
                                        <div className="overflow-x-auto bg-gray-50 dark:bg-gray-950 rounded-lg border border-gray-200 dark:border-gray-800 transition-colors">
                                            <table className="w-full text-left text-sm text-gray-700 dark:text-gray-300 whitespace-nowrap">
                                                <thead className="text-xs uppercase bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400">
                                                    <tr>
                                                        <th className="px-4 py-2 border-b border-gray-200 dark:border-gray-700">id</th>
                                                        <th className="px-4 py-2 border-b border-gray-200 dark:border-gray-700">select_type</th>
                                                        <th className="px-4 py-2 border-b border-gray-200 dark:border-gray-700">table</th>
                                                        <th className="px-4 py-2 border-b border-gray-200 dark:border-gray-700">type</th>
                                                        <th className="px-4 py-2 border-b border-gray-200 dark:border-gray-700">possible_keys</th>
                                                        <th className="px-4 py-2 border-b border-gray-200 dark:border-gray-700">key</th>
                                                        <th className="px-4 py-2 border-b border-gray-200 dark:border-gray-700">rows</th>
                                                        <th className="px-4 py-2 border-b border-gray-200 dark:border-gray-700">Extra</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {report.real_explain.map((row: any, idx: number) => (
                                                        <tr key={idx} className="border-b border-gray-200 dark:border-gray-800 last:border-0 hover:bg-gray-100 dark:hover:bg-gray-800/50">
                                                            <td className="px-4 py-2">{row.id}</td>
                                                            <td className="px-4 py-2">{row.select_type}</td>
                                                            <td className="px-4 py-2">{row.table}</td>
                                                            <td className="px-4 py-2 font-mono text-yellow-600 dark:text-yellow-400">{row.type}</td>
                                                            <td className="px-4 py-2">{row.possible_keys}</td>
                                                            <td className="px-4 py-2 text-green-600 dark:text-green-400">{row.key}</td>
                                                            <td className="px-4 py-2">{row.rows}</td>
                                                            <td className="px-4 py-2 text-xs">{row.Extra}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                )}

                                {report.detected_issues && report.detected_issues.length > 0 && (
                                    <div>
                                        <h4 className="font-bold text-gray-900 dark:text-white mb-2 flex items-center space-x-2">
                                            <AlertTriangle size={18} className="text-yellow-500" />
                                            <span>Detected Issues</span>
                                        </h4>
                                        <ul className="list-disc list-inside space-y-1 text-sm text-gray-700 dark:text-gray-300">
                                            {report.detected_issues.map((issue: string, i: number) => (
                                                <li key={i}>{issue}</li>
                                            ))}
                                        </ul>
                                    </div>
                                )}

                                {report.recommendations && report.recommendations.length > 0 && (
                                    <div className="space-y-3">
                                        <h4 className="font-bold text-gray-900 dark:text-white mb-2 flex items-center space-x-2">
                                            <CheckCircle size={18} className="text-green-500" />
                                            <span>Optimization Recommendations</span>
                                        </h4>
                                        {report.recommendations.map((rec: any, i: number) => (
                                            <div key={i} className="bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-900/30 p-4 rounded-lg">
                                                <p className="text-gray-900 dark:text-gray-200 font-semibold mb-1 text-sm">{rec.issue}</p>
                                                <p className="text-gray-600 dark:text-gray-400 text-xs mb-3">{rec.reason}</p>
                                                {rec.sql && (
                                                    <pre className="bg-white dark:bg-gray-950 p-2 rounded border border-gray-200 dark:border-gray-800 text-green-600 dark:text-green-400 text-xs overflow-x-auto font-mono">
                                                        {rec.sql}
                                                    </pre>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {report.optimized_query && (
                                     <div>
                                        <h4 className="font-bold text-gray-900 dark:text-white mb-2">Optimized Query Version</h4>
                                        <pre className="bg-gray-50 dark:bg-gray-950 p-3 rounded-lg border border-gray-200 dark:border-gray-800 text-blue-600 dark:text-blue-400 text-sm overflow-x-auto font-mono">
                                            {report.optimized_query}
                                        </pre>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Performance;

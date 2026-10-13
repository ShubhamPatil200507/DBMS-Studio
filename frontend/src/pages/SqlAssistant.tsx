import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Play, FileText, CheckCircle, RefreshCw, Zap, Table as TableIcon } from 'lucide-react';
import Editor from '@monaco-editor/react';
import { useParams } from 'react-router-dom';
import 'reactflow/dist/style.css'; // Just for context theme if needed
import { useTheme } from '../context/ThemeContext';
import { API_BASE_URL } from '../api/config';

const SqlAssistant: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const [requirement, setRequirement] = useState('');
    const [schemaContext, setSchemaContext] = useState('');
    const [loading, setLoading] = useState(false);
    const [executing, setExecuting] = useState(false);
    const [sqlData, setSqlData] = useState<any>(null);
    const [executionResult, setExecutionResult] = useState<any>(null);
    const [error, setError] = useState('');
    const { theme } = useTheme();

    useEffect(() => {
        if (id) {
            axios.get(`${API_BASE_URL}/api/projects/${id}`).then(res => {
                if(res.data.latest_schema) {
                    setSchemaContext(res.data.latest_schema.mysql_schema);
                }
            }).catch(e => console.error(e));
        }
    }, [id]);

    const handleGenerate = async () => {
        if (!requirement.trim()) {
            setError('Please describe the query you want to generate');
            return;
        }
        setError('');
        setLoading(true);
        setExecutionResult(null);
        try {
            const response = await axios.post(`${API_BASE_URL}/api/sql/generate`, { request: requirement, schema: schemaContext });
            setSqlData(response.data);
        } catch (err: any) {
            setError(err.response?.data?.error || 'Failed to generate SQL');
        } finally {
            setLoading(false);
        }
    };

    const handleExecute = async () => {
        if (!sqlData?.sql) return;
        setError('');
        setExecuting(true);
        try {
            const response = await axios.post(`${API_BASE_URL}/api/sql/execute`, { sql: sqlData.sql });
            setExecutionResult(response.data);

            if (id) {
                // Save query execution to history
                await axios.post(`${API_BASE_URL}/api/projects/${id}/queries`, {
                    natural_language_request: requirement,
                    generated_sql: sqlData.sql,
                    explanation: sqlData.explanation,
                    execution_time: response.data.executionTime,
                    execution_status: 'SUCCESS'
                }).catch(e => console.error('Failed to log query', e));
            }
        } catch (err: any) {
            setError(err.response?.data?.error || 'Failed to execute SQL query');
            setExecutionResult(null);
            
            if (id && sqlData?.sql) {
                 await axios.post(`${API_BASE_URL}/api/projects/${id}/queries`, {
                    natural_language_request: requirement,
                    generated_sql: sqlData.sql,
                    explanation: sqlData.explanation,
                    execution_time: '0',
                    execution_status: 'FAILED'
                }).catch(e => console.error('Failed to log query', e));
            }
        } finally {
            setExecuting(false);
        }
    };

    return (
        <div className="p-6 h-full flex flex-col space-y-6 overflow-y-auto">
            <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">AI SQL Assistant</h1>
                <p className="text-gray-500 dark:text-gray-400">Generate, explain, and execute complex MySQL queries using natural language.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 flex-1 min-h-[500px]">
                {/* Inputs */}
                <div className="space-y-4 flex flex-col">
                    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4 flex flex-col shadow-sm transition-colors">
                        <label className="font-semibold text-gray-900 dark:text-white mb-2 text-sm">Natural Language Request</label>
                        <textarea
                            className="w-full bg-gray-50 dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-lg p-3 text-gray-900 dark:text-white focus:outline-none focus:border-indigo-500 resize-none h-24 mb-4 transition-colors text-sm"
                            placeholder="E.g., Find the top 5 customers who have spent the most money in the last 30 days..."
                            value={requirement}
                            onChange={(e) => setRequirement(e.target.value)}
                        />
                        <div className="flex justify-between items-center">
                            <button onClick={() => setRequirement('SHOW TABLES;')} className="text-indigo-500 hover:text-indigo-600 dark:text-indigo-400 text-sm font-medium transition">Use Example</button>
                            <button 
                                onClick={handleGenerate}
                                disabled={loading}
                                className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-medium flex items-center space-x-2 transition disabled:opacity-50"
                            >
                                {loading ? <RefreshCw className="animate-spin" size={16} /> : <Zap size={16} />}
                                <span>{loading ? 'Generating...' : 'Generate SQL'}</span>
                            </button>
                        </div>
                        {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
                    </div>

                    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl flex flex-col shadow-sm flex-1 min-h-[200px] overflow-hidden transition-colors">
                         <div className="p-3 border-b border-gray-200 dark:border-gray-800 flex justify-between items-center bg-gray-50 dark:bg-gray-950 transition-colors">
                            <h3 className="font-semibold text-gray-900 dark:text-white text-sm">Schema Context (Optional)</h3>
                            <span className="text-xs text-gray-500">Paste CREATE TABLE statements here for better accuracy</span>
                        </div>
                        <Editor
                            height="100%"
                            defaultLanguage="sql"
                            theme={theme === 'dark' ? 'vs-dark' : 'vs-light'}
                            value={schemaContext}
                            onChange={(val) => setSchemaContext(val || '')}
                            options={{ minimap: { enabled: false }, fontSize: 13, lineNumbers: 'off' }}
                        />
                    </div>
                </div>

                {/* Output */}
                <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl flex flex-col shadow-sm overflow-hidden transition-colors">
                    <div className="p-3 border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-950 flex justify-between items-center transition-colors">
                        <h3 className="font-semibold text-gray-900 dark:text-white text-sm">Generated Query & Results</h3>
                        {sqlData?.sql && (
                            <button 
                                onClick={handleExecute}
                                disabled={executing}
                                className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded font-medium flex items-center space-x-2 transition disabled:opacity-50 text-xs"
                            >
                                {executing ? <RefreshCw className="animate-spin" size={14} /> : <Play size={14} />}
                                <span>{executing ? 'Running...' : 'Run Query'}</span>
                            </button>
                        )}
                    </div>
                    
                    <div className="flex-1 flex flex-col">
                        {!sqlData && !loading && (
                            <div className="flex-1 flex flex-col items-center justify-center text-gray-400 p-8 text-center">
                                <FileText size={48} className="mb-4 opacity-50" />
                                <p>Describe your query on the left to see the generated SQL and explanation here.</p>
                            </div>
                        )}

                        {loading && (
                            <div className="flex-1 flex flex-col items-center justify-center text-indigo-500 p-8">
                                <Zap className="animate-bounce w-12 h-12 mb-4" />
                                <p className="animate-pulse font-medium">Writing optimal SQL query...</p>
                            </div>
                        )}

                        {sqlData && !loading && (
                            <>
                                <div className="h-48 border-b border-gray-200 dark:border-gray-800">
                                    <Editor
                                        height="100%"
                                        defaultLanguage="sql"
                                        theme={theme === 'dark' ? 'vs-dark' : 'vs-light'}
                                        value={sqlData.sql}
                                        onChange={(val) => setSqlData({...sqlData, sql: val})}
                                        options={{ minimap: { enabled: false }, fontSize: 14 }}
                                    />
                                </div>
                                
                                <div className="flex-1 overflow-y-auto p-4 bg-gray-50 dark:bg-gray-950 transition-colors">
                                    {executionResult ? (
                                        <div className="space-y-3">
                                            <div className="flex items-center justify-between">
                                                <h4 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                                                    <TableIcon size={16} className="text-green-500" /> Query Results
                                                </h4>
                                                <div className="text-xs text-gray-500 font-mono flex gap-3">
                                                    <span>Rows: {executionResult.rowCount}</span>
                                                    <span>Time: {executionResult.executionTime}ms</span>
                                                </div>
                                            </div>
                                            
                                            {executionResult.results.length === 0 ? (
                                                <div className="p-4 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg text-center text-gray-500 text-sm">
                                                    0 rows returned.
                                                </div>
                                            ) : (
                                                <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg overflow-x-auto shadow-sm">
                                                    <table className="w-full text-left text-sm whitespace-nowrap">
                                                        <thead className="bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300">
                                                            <tr>
                                                                {Object.keys(executionResult.results[0]).map(key => (
                                                                    <th key={key} className="px-3 py-2 font-semibold border-b border-gray-200 dark:border-gray-700">{key}</th>
                                                                ))}
                                                            </tr>
                                                        </thead>
                                                        <tbody className="divide-y divide-gray-200 dark:divide-gray-800 text-gray-800 dark:text-gray-200">
                                                            {executionResult.results.slice(0, 100).map((row: any, i: number) => (
                                                                <tr key={i} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                                                                    {Object.values(row).map((val: any, j: number) => (
                                                                        <td key={j} className="px-3 py-2">{val !== null ? String(val) : <span className="text-gray-400 italic">NULL</span>}</td>
                                                                    ))}
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                    {executionResult.results.length > 100 && (
                                                        <div className="p-2 text-center text-xs text-gray-500 border-t border-gray-200 dark:border-gray-800">
                                                            Showing first 100 rows.
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                            
                                            <button 
                                                onClick={() => setExecutionResult(null)}
                                                className="text-indigo-600 dark:text-indigo-400 text-sm font-medium hover:underline mt-2 inline-block"
                                            >
                                                &larr; Back to Explanation
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="space-y-4">
                                            <div className="flex items-center justify-between">
                                                <h4 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                                                    <CheckCircle size={16} className="text-indigo-500" /> Explanation & AST Analysis
                                                </h4>
                                                {sqlData.generatedVia && (
                                                    <span className={`text-[11px] font-bold px-2 py-0.5 rounded ${
                                                        sqlData.generatedVia === 'DETERMINISTIC_NLP' 
                                                            ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' 
                                                            : 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400'
                                                    }`}>
                                                        {sqlData.generatedVia === 'DETERMINISTIC_NLP' ? 'Deterministic Semantic Compiler' : 'AI Reasoning'}
                                                    </span>
                                                )}
                                            </div>

                                            <div className="bg-white dark:bg-gray-900 p-3 rounded-lg border border-gray-200 dark:border-gray-800 text-sm text-gray-700 dark:text-gray-300">
                                                <p>{sqlData.explanation}</p>
                                            </div>

                                            {/* AST Clause-by-Clause Breakdown */}
                                            {sqlData.astAnalysis?.clauses && sqlData.astAnalysis.clauses.length > 0 && (
                                                <div className="space-y-2">
                                                    <h5 className="text-xs font-bold uppercase text-gray-500 tracking-wider">Clause-by-Clause Inspection</h5>
                                                    <div className="space-y-2">
                                                        {sqlData.astAnalysis.clauses.map((c: any, i: number) => (
                                                            <div key={i} className="p-3 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg text-xs space-y-1">
                                                                <div className="font-bold text-indigo-600 dark:text-indigo-400">{c.clause}</div>
                                                                {c.details?.map((d: string, j: number) => (
                                                                    <div key={j} className="text-gray-700 dark:text-gray-300 pl-2 border-l border-gray-300 dark:border-gray-700">{d}</div>
                                                                ))}
                                                                {c.technicalContext && <div className="text-gray-400 italic text-[11px]">{c.technicalContext}</div>}
                                                                {c.performanceOrSafetyNote && <div className="text-yellow-600 dark:text-yellow-400 text-[11px]">{c.performanceOrSafetyNote}</div>}
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}

                                            {/* AST Concerns & Safety */}
                                            {sqlData.astAnalysis?.concerns && sqlData.astAnalysis.concerns.length > 0 && (
                                                <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg text-xs space-y-1">
                                                    <div className="font-bold text-yellow-800 dark:text-yellow-300">Safety & Performance Warnings</div>
                                                    {sqlData.astAnalysis.concerns.map((w: string, i: number) => (
                                                        <div key={i} className="text-yellow-700 dark:text-yellow-400">• {w}</div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SqlAssistant;

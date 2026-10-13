import React, { useState } from 'react';
import axios from 'axios';
import { Play, CheckCircle, AlertTriangle, XCircle, RefreshCw, Database } from 'lucide-react';
import Editor from '@monaco-editor/react';
import { useTheme } from '../context/ThemeContext';
import { API_BASE_URL } from '../api/config';

const Schema: React.FC = () => {
    const [schema, setSchema] = useState('');
    const [platform, setPlatform] = useState('MySQL');
    const [loading, setLoading] = useState(false);
    const [analysis, setAnalysis] = useState<any>(null);
    const [error, setError] = useState('');
    const { theme } = useTheme();

    const handleAnalyze = async () => {
        if (!schema.trim()) {
            setError('Please provide a schema to analyze');
            return;
        }

        setError('');
        setLoading(true);
        try {
            const response = await axios.post(`${API_BASE_URL}/api/schema/analyze`, { schema, platform });
            setAnalysis(response.data);
        } catch (err: any) {
            setError(err.response?.data?.error || 'Failed to analyze schema');
        } finally {
            setLoading(false);
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'PASS': return <CheckCircle className="text-green-500" size={24} />;
            case 'WARNING': return <AlertTriangle className="text-yellow-500" size={24} />;
            case 'ISSUE': return <XCircle className="text-red-500" size={24} />;
            default: return null;
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'PASS': return 'border-green-200 dark:border-green-900 bg-green-50 dark:bg-green-900/10';
            case 'WARNING': return 'border-yellow-200 dark:border-yellow-900 bg-yellow-50 dark:bg-yellow-900/10';
            case 'ISSUE': return 'border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-900/10';
            default: return 'border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50';
        }
    };

    return (
        <div className="p-6 h-full flex flex-col space-y-6 overflow-y-auto">
            <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Intelligent Schema Analyzer</h1>
                <p className="text-gray-500 dark:text-gray-400">Paste your database creation code to analyze normalization, design principles, and best practices.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 flex-1 min-h-[500px]">
                {/* Left Side: Input */}
                <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl flex flex-col shadow-sm overflow-hidden transition-colors">
                    <div className="p-4 border-b border-gray-200 dark:border-gray-800 flex justify-between items-center bg-gray-50 dark:bg-gray-950 transition-colors">
                        <div className="flex items-center space-x-4 w-full">
                            <h3 className="font-semibold text-gray-900 dark:text-white whitespace-nowrap">Schema Code</h3>
                            <div className="flex-1 flex justify-end items-center gap-3">
                                <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Platform:</label>
                                <select 
                                    value={platform}
                                    onChange={(e) => setPlatform(e.target.value)}
                                    className="bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white text-sm rounded-lg p-1.5 focus:outline-none focus:border-purple-500 transition-colors"
                                >
                                    <option value="MySQL">MySQL</option>
                                    <option value="PostgreSQL">PostgreSQL</option>
                                    <option value="SQL Server">SQL Server</option>
                                    <option value="Oracle">Oracle</option>
                                    <option value="MongoDB">MongoDB</option>
                                </select>
                            </div>
                        </div>
                    </div>
                    <div className="flex-1 relative">
                        <Editor
                            height="100%"
                            defaultLanguage={platform === 'MongoDB' ? 'javascript' : 'sql'}
                            theme={theme === 'dark' ? 'vs-dark' : 'vs-light'}
                            value={schema}
                            onChange={(val) => setSchema(val || '')}
                            options={{ minimap: { enabled: false }, fontSize: 14 }}
                        />
                    </div>
                    <div className="p-4 border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 flex justify-between items-center transition-colors">
                        <button 
                            onClick={() => setSchema('CREATE TABLE Orders (order_id INT, customer_name VARCHAR(100), customer_address VARCHAR(200), item_name VARCHAR(100), price DECIMAL);')} 
                            className="text-purple-600 hover:text-purple-700 dark:text-purple-400 dark:hover:text-purple-300 text-sm font-medium transition"
                        >
                            Load Bad Example
                        </button>
                        <div className="flex items-center gap-4">
                            {error && <span className="text-red-500 text-sm">{error}</span>}
                            <button 
                                onClick={handleAnalyze}
                                disabled={loading}
                                className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-2 rounded-lg font-medium flex items-center space-x-2 transition disabled:opacity-50"
                            >
                                {loading ? <RefreshCw className="animate-spin" size={18} /> : <Play size={18} />}
                                <span>{loading ? 'Analyzing...' : 'Analyze Schema'}</span>
                            </button>
                        </div>
                    </div>
                </div>

                {/* Right Side: Output */}
                <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl shadow-sm overflow-hidden flex flex-col transition-colors relative">
                    <div className="p-4 border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-950 transition-colors">
                        <h3 className="font-semibold text-gray-900 dark:text-white">Analysis Report</h3>
                    </div>
                    <div className="flex-1 p-6 overflow-y-auto space-y-6">
                        {loading && (
                            <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm z-10">
                                <Database className="animate-bounce w-12 h-12 mb-4 text-purple-600 dark:text-purple-400" />
                                <div className="text-lg font-medium text-purple-600 dark:text-purple-400 animate-pulse">Scanning Schema Architecture...</div>
                                <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">Checking normal forms and best practices</p>
                            </div>
                        )}

                        {!analysis && !loading && (
                            <div className="text-gray-400 dark:text-gray-500 text-center py-20 flex flex-col items-center">
                                <AlertTriangle size={48} className="mb-4 text-gray-300 dark:text-gray-700" />
                                <p>Enter your schema definition and run the analyzer to see normalization insights.</p>
                            </div>
                        )}

                        {analysis && !loading && (
                            <>
                                <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-900/50 p-4 rounded-xl transition-colors">
                                    <h4 className="font-semibold text-purple-900 dark:text-purple-300 mb-2">Overall Summary</h4>
                                    <p className="text-gray-700 dark:text-gray-300 text-sm leading-relaxed">{analysis.summary}</p>
                                </div>

                                <div className="space-y-4">
                                    <h4 className="font-bold text-gray-900 dark:text-white text-lg">Design Evaluation</h4>
                                    {analysis.normalization.map((norm: any, index: number) => (
                                        <div key={index} className={`border p-5 rounded-xl transition-colors ${getStatusColor(norm.status)}`}>
                                            <div className="flex items-start justify-between mb-3">
                                                <div>
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <h5 className="font-bold text-gray-900 dark:text-white text-lg">{norm.form}</h5>
                                                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                                                            norm.status === 'PASS' ? 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-400' :
                                                            norm.status === 'WARNING' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/50 dark:text-yellow-400' :
                                                            'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-400'
                                                        }`}>
                                                            {norm.status}
                                                        </span>
                                                    </div>
                                                    <p className="text-sm text-gray-700 dark:text-gray-300">{norm.explanation}</p>
                                                </div>
                                                {getStatusIcon(norm.status)}
                                            </div>
                                            
                                            {norm.problem && (
                                                <div className="mt-3 text-sm">
                                                    <strong className="text-gray-900 dark:text-white">Problem:</strong> 
                                                    <p className="text-red-600 dark:text-red-400 mt-1">{norm.problem}</p>
                                                </div>
                                            )}
                                            
                                            {norm.recommendation && (
                                                <div className="mt-3 text-sm bg-white/50 dark:bg-black/20 p-3 rounded-lg border border-gray-200/50 dark:border-gray-700/50">
                                                    <strong className="text-gray-900 dark:text-white">Recommendation:</strong> 
                                                    <p className="text-green-600 dark:text-green-400 mt-1">{norm.recommendation}</p>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Schema;

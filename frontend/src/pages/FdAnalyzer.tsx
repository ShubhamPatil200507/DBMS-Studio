import React, { useState } from 'react';
import axios from 'axios';
import { Calculator, Key, Search, ShieldCheck, AlertCircle } from 'lucide-react';
import { API_BASE_URL } from '../api/config';

interface FD { left: string[]; right: string[] }

const FdAnalyzer: React.FC = () => {
    const [attributesInput, setAttributesInput] = useState('A,B,C,D,E');
    const [fdInput, setFdInput] = useState('A->B,C\nCD->E\nB->D\nE->A');
    const [closureTargetInput, setClosureTargetInput] = useState('A');
    
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    
    const [closureResult, setClosureResult] = useState<{closure: string[], steps: string[]} | null>(null);
    const [keysResult, setKeysResult] = useState<{candidateKeys: string[][], primeAttributes: string[], nonPrimeAttributes: string[]} | null>(null);
    const [normResult, setNormResult] = useState<{highestForm: string, analysis: any[]} | null>(null);

    const parseInput = () => {
        try {
            const attributes = attributesInput.split(',').map(a => a.trim()).filter(a => a);
            const fds: FD[] = fdInput.split('\n').filter(line => line.includes('->')).map(line => {
                const [leftStr, rightStr] = line.split('->');
                return {
                    left: leftStr.split(',').map(a => a.trim()).filter(a => a),
                    right: rightStr.split(',').map(a => a.trim()).filter(a => a)
                };
            });
            return { attributes, fds };
        } catch (e) {
            throw new Error('Invalid input format');
        }
    };

    const handleClosure = async () => {
        try {
            setError(''); setLoading(true);
            const { attributes, fds } = parseInput();
            const target = closureTargetInput.split(',').map(a => a.trim()).filter(a => a);
            const res = await axios.post(`${API_BASE_URL}/api/fd/closure`, { attributes, fds, target });
            setClosureResult(res.data);
            setKeysResult(null); setNormResult(null);
        } catch (e: any) {
            setError(e.message || 'Error calculating closure');
        } finally { setLoading(false); }
    };

    const handleKeys = async () => {
        try {
            setError(''); setLoading(true);
            const { attributes, fds } = parseInput();
            const res = await axios.post(`${API_BASE_URL}/api/fd/candidate-keys`, { attributes, fds });
            setKeysResult(res.data);
            setClosureResult(null); setNormResult(null);
        } catch (e: any) {
            setError(e.message || 'Error finding keys');
        } finally { setLoading(false); }
    };

    const handleNormalization = async () => {
        try {
            setError(''); setLoading(true);
            const { attributes, fds } = parseInput();
            const res = await axios.post(`${API_BASE_URL}/api/fd/analyze`, { attributes, fds });
            setNormResult(res.data);
            setKeysResult(res.data); // It returns keys too
            setClosureResult(null);
        } catch (e: any) {
            setError(e.message || 'Error analyzing normalization');
        } finally { setLoading(false); }
    };

    return (
        <div className="p-6 h-full flex flex-col space-y-6 overflow-y-auto">
            <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Normalization Studio</h1>
                <p className="text-gray-500 dark:text-gray-400">Algorithmic functional dependency analyzer, attribute closure calculator, and 1NF-BCNF evaluator.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 min-h-[500px]">
                {/* Inputs */}
                <div className="lg:col-span-1 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6 shadow-sm transition-colors flex flex-col space-y-4">
                    <h3 className="font-semibold text-lg text-gray-900 dark:text-white mb-2">Relation Definition</h3>
                    
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Attributes (comma separated)</label>
                        <input 
                            className="w-full bg-gray-50 dark:bg-gray-950 border border-gray-300 dark:border-gray-700 rounded-lg p-2.5 text-gray-900 dark:text-white focus:outline-none focus:border-indigo-500 transition-colors font-mono text-sm"
                            value={attributesInput}
                            onChange={(e) => setAttributesInput(e.target.value)}
                            placeholder="A, B, C, D"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Functional Dependencies</label>
                        <p className="text-xs text-gray-500 mb-2">Format: Left -&gt; Right (one per line). Use commas for composite attributes.</p>
                        <textarea 
                            className="w-full h-32 bg-gray-50 dark:bg-gray-950 border border-gray-300 dark:border-gray-700 rounded-lg p-2.5 text-gray-900 dark:text-white focus:outline-none focus:border-indigo-500 transition-colors font-mono text-sm resize-none"
                            value={fdInput}
                            onChange={(e) => setFdInput(e.target.value)}
                            placeholder="A -> B,C&#10;B,C -> D"
                        />
                    </div>

                    <div className="pt-4 border-t border-gray-200 dark:border-gray-800 grid grid-cols-1 gap-3">
                         <div className="flex gap-2">
                             <input 
                                className="flex-1 bg-gray-50 dark:bg-gray-950 border border-gray-300 dark:border-gray-700 rounded-lg p-2 text-gray-900 dark:text-white focus:outline-none focus:border-indigo-500 font-mono text-sm"
                                value={closureTargetInput}
                                onChange={(e) => setClosureTargetInput(e.target.value)}
                                placeholder="Target (e.g. A,B)"
                            />
                            <button onClick={handleClosure} disabled={loading} className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-medium flex items-center justify-center transition flex-1">
                                <Calculator size={16} className="mr-2"/> Closure (X+)
                            </button>
                        </div>
                        <button onClick={handleKeys} disabled={loading} className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium flex items-center justify-center transition">
                            <Key size={16} className="mr-2"/> Find Candidate Keys
                        </button>
                        <button onClick={handleNormalization} disabled={loading} className="w-full bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg font-medium flex items-center justify-center transition">
                            <ShieldCheck size={16} className="mr-2"/> Analyze Normalization
                        </button>
                    </div>
                    {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
                </div>

                {/* Output display */}
                <div className="lg:col-span-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl flex flex-col shadow-sm transition-colors overflow-hidden">
                     <div className="p-4 border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-950 transition-colors">
                        <h3 className="font-semibold text-gray-900 dark:text-white">Analysis Results</h3>
                    </div>
                    <div className="p-6 flex-1 overflow-y-auto space-y-6">
                        {!closureResult && !keysResult && !normResult && !loading && (
                            <div className="text-gray-400 text-center py-20">
                                <Search size={48} className="mx-auto mb-4 opacity-50" />
                                <p>Select an analysis tool to view algorithmic outputs.</p>
                            </div>
                        )}

                        {loading && (
                            <div className="animate-pulse space-y-4">
                                <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded w-1/4"></div>
                                <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded w-1/2"></div>
                                <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded w-3/4"></div>
                            </div>
                        )}

                        {closureResult && (
                            <div>
                                <h4 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center"><Calculator className="mr-2 text-indigo-500"/> Attribute Closure</h4>
                                <div className="bg-indigo-50 dark:bg-indigo-900/10 border border-indigo-200 dark:border-indigo-800 rounded-lg p-4 mb-4">
                                    <span className="font-mono font-bold text-indigo-700 dark:text-indigo-400 text-xl">
                                        &#123;{closureTargetInput}&#125;⁺ = &#123;{closureResult.closure.join(', ')}&#125;
                                    </span>
                                </div>
                                <h5 className="font-semibold text-gray-700 dark:text-gray-300 mb-2">Step-by-step Calculation:</h5>
                                <ul className="list-disc list-inside space-y-2 text-sm font-mono text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-950 p-4 rounded-lg border border-gray-200 dark:border-gray-800">
                                    {closureResult.steps.map((step, i) => (
                                        <li key={i}>{step}</li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        {keysResult && (
                            <div>
                                <h4 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center"><Key className="mr-2 text-blue-500"/> Keys Analysis</h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                                    <div className="bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800 p-4 rounded-lg">
                                        <h5 className="font-semibold text-blue-900 dark:text-blue-300 mb-2">Candidate Keys</h5>
                                        <div className="flex flex-wrap gap-2">
                                            {keysResult.candidateKeys.map((ck, i) => (
                                                <span key={i} className="px-3 py-1 bg-blue-100 dark:bg-blue-800 text-blue-800 dark:text-blue-100 rounded-md font-mono font-bold text-sm">
                                                    &#123;{ck.join(', ')}&#125;
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="space-y-4">
                                        <div className="border border-gray-200 dark:border-gray-800 p-3 rounded-lg">
                                            <h5 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Prime Attributes</h5>
                                            <p className="font-mono text-sm text-gray-600 dark:text-gray-400 mt-1">{keysResult.primeAttributes.join(', ') || 'None'}</p>
                                        </div>
                                        <div className="border border-gray-200 dark:border-gray-800 p-3 rounded-lg">
                                            <h5 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Non-Prime Attributes</h5>
                                            <p className="font-mono text-sm text-gray-600 dark:text-gray-400 mt-1">{keysResult.nonPrimeAttributes.join(', ') || 'None'}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {normResult && (
                            <div>
                                <h4 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center"><ShieldCheck className="mr-2 text-purple-500"/> Normalization Evaluation</h4>
                                <div className="flex items-center gap-4 mb-6 p-4 rounded-lg bg-gray-50 dark:bg-gray-950 border border-gray-200 dark:border-gray-800">
                                    <span className="text-gray-600 dark:text-gray-400 font-medium">Highest Normal Form Satisfied:</span>
                                    <span className={`text-2xl font-bold px-4 py-1 rounded-lg ${
                                        normResult.highestForm === 'BCNF' ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-400' :
                                        normResult.highestForm === '3NF' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-400' :
                                        'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-400'
                                    }`}>
                                        {normResult.highestForm}
                                    </span>
                                </div>

                                {normResult.analysis && normResult.analysis.length > 0 ? (
                                    <div className="space-y-4">
                                        <h5 className="font-semibold text-gray-900 dark:text-white">Detected Violations</h5>
                                        {normResult.analysis.map((item, i) => (
                                            <div key={i} className="border-l-4 border-red-500 bg-red-50 dark:bg-red-900/10 p-4 rounded-r-lg">
                                                <div className="flex items-center justify-between mb-2">
                                                    <span className="font-mono font-bold text-red-700 dark:text-red-400">{item.fd}</span>
                                                    <span className="bg-red-100 dark:bg-red-800 text-red-800 dark:text-red-100 text-xs font-bold px-2 py-1 rounded">Violates {item.violation}</span>
                                                </div>
                                                <p className="text-sm text-red-600 dark:text-red-300"><AlertCircle className="inline w-4 h-4 mr-1"/>{item.reason}</p>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-400 p-4 rounded-lg flex items-center">
                                        <ShieldCheck className="mr-2" /> No violations detected. Relation is in BCNF.
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default FdAnalyzer;

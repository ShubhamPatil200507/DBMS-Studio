import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import { Folder, ArrowLeft, GitCommit, FileCode2, BookOpen, Clock, Settings, FileDown } from 'lucide-react';
import Editor from '@monaco-editor/react';
import { useTheme } from '../context/ThemeContext';
import { API_BASE_URL } from '../api/config';

const ProjectDetails: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const [project, setProject] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [activeTab, setActiveTab] = useState('schema');
    const [impactTable, setImpactTable] = useState('');
    const [impactAction, setImpactAction] = useState('DROP_TABLE');
    const [impactReport, setImpactReport] = useState<any>(null);
    const [runningImpact, setRunningImpact] = useState(false);
    const { theme } = useTheme();

    const handleRunImpact = async () => {
        if (!impactTable.trim()) return;
        setRunningImpact(true);
        try {
            const res = await axios.post(`${API_BASE_URL}/api/agent/impact`, {
                projectId: id,
                tableName: impactTable,
                action: impactAction
            });
            setImpactReport(res.data);
        } catch (e: any) {
            console.error('Impact prediction failed', e);
        } finally {
            setRunningImpact(false);
        }
    };

    useEffect(() => {
        const fetchProject = async () => {
            try {
                const res = await axios.get(`${API_BASE_URL}/api/projects/${id}`);
                setProject(res.data);
            } catch (err) {
                setError('Failed to load project details.');
            } finally {
                setLoading(false);
            }
        };
        fetchProject();
    }, [id]);

    if (loading) {
        return (
            <div className="p-6 h-full flex flex-col space-y-6">
                <div className="animate-pulse space-y-4">
                    <div className="h-8 bg-gray-200 dark:bg-gray-800 rounded w-1/4"></div>
                    <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded w-1/3"></div>
                    <div className="h-64 bg-gray-200 dark:bg-gray-800 rounded w-full mt-8"></div>
                </div>
            </div>
        );
    }

    if (error || !project) {
        return <div className="p-6 text-red-500">{error || 'Project not found'}</div>;
    }

    return (
        <div className="p-6 h-full flex flex-col space-y-6 overflow-hidden max-w-7xl mx-auto w-full">
            <div className="flex items-center gap-4 mb-2">
                <Link to="/" className="p-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg text-gray-500 hover:text-gray-900 dark:hover:text-white transition" title="Back to Dashboard">
                    <ArrowLeft size={20} />
                </Link>
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
                        <Folder className="text-blue-500" /> {project.project_name}
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">{project.description || 'Workspace for this database project.'}</p>
                </div>
            </div>

            <div className="flex gap-2 border-b border-gray-200 dark:border-gray-800">
                {[
                    { id: 'schema', name: 'Schema & Versions', icon: GitCommit },
                    { id: 'impact', name: 'Change Impact Predictor', icon: Settings },
                    { id: 'migrations', name: 'Migrations', icon: FileCode2 },
                    { id: 'docs', name: 'Documentation', icon: BookOpen },
                    { id: 'queries', name: 'Saved Queries', icon: Clock }
                ].map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`px-4 py-3 font-medium text-sm flex items-center gap-2 border-b-2 transition-colors ${
                            activeTab === tab.id 
                            ? 'border-blue-500 text-blue-600 dark:text-blue-400' 
                            : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                        }`}
                    >
                        <tab.icon size={16} /> {tab.name}
                    </button>
                ))}
            </div>

            <div className="flex-1 overflow-y-auto">
                {activeTab === 'schema' && (
                    <div className="flex flex-col lg:flex-row gap-6 h-full">
                        <div className="flex-1 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl h-full flex flex-col overflow-hidden">
                            <div className="p-4 border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-950 flex justify-between items-center">
                                <div className="flex items-center gap-3">
                                    <span className="font-semibold text-gray-900 dark:text-white">Current Schema Definition</span>
                                    <span className="px-2 py-0.5 bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-400 text-xs font-bold rounded">
                                        v{project.schema_versions?.length || 1}.0 (Latest)
                                    </span>
                                </div>
                            </div>
                            <div className="flex-1">
                                <Editor
                                    height="100%"
                                    defaultLanguage="sql"
                                    theme={theme === 'dark' ? 'vs-dark' : 'vs-light'}
                                    value={project.latest_schema?.mysql_schema || '-- No schema saved for this project yet.\n-- Go to AI Database Designer and click "Save to Project".'}
                                    options={{ minimap: { enabled: false }, fontSize: 14, readOnly: true }}
                                />
                            </div>
                        </div>

                        <div className="w-full lg:w-80 space-y-6">
                            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4 shadow-sm">
                                <h3 className="font-semibold text-gray-900 dark:text-white mb-3 border-b border-gray-200 dark:border-gray-800 pb-2">Workspace Actions</h3>
                                <div className="space-y-2">
                                    <Link to={`/project/${project.id}/designer`} className="block w-full text-center px-4 py-2 bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/40 transition text-sm font-medium">Open Schema Designer</Link>
                                    <Link to={`/project/${project.id}/sql`} className="block w-full text-center px-4 py-2 bg-purple-50 text-purple-700 dark:bg-purple-900/20 dark:text-purple-400 rounded-lg hover:bg-purple-100 dark:hover:bg-purple-900/40 transition text-sm font-medium">Open SQL Assistant</Link>
                                    <Link to={`/project/${project.id}/performance`} className="block w-full text-center px-4 py-2 bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400 rounded-lg hover:bg-green-100 dark:hover:bg-green-900/40 transition text-sm font-medium">Performance Analyzer</Link>
                                </div>
                            </div>

                            {project.activity && project.activity.length > 0 && (
                                <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4 shadow-sm">
                                    <h3 className="font-semibold text-gray-900 dark:text-white mb-3 border-b border-gray-200 dark:border-gray-800 pb-2 flex items-center gap-2"><Clock size={16}/> Activity Timeline</h3>
                                    <div className="space-y-3">
                                        {project.activity.slice(0, 5).map((act: any) => (
                                            <div key={act.id} className="text-sm">
                                                <div className="font-medium text-gray-900 dark:text-white">{act.activity_type.replace('_', ' ')}</div>
                                                <div className="text-xs text-gray-500">{act.description}</div>
                                                <div className="text-[10px] text-gray-400 mt-0.5">{new Date(act.created_at).toLocaleString()}</div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {activeTab === 'impact' && (
                    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6 shadow-sm space-y-6">
                        <div>
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                <Settings className="text-indigo-500" /> Schema Change Impact Predictor
                            </h3>
                            <p className="text-sm text-gray-500">Analyze the downstream impact of dropping/modifying tables, tracing foreign keys, queries, and constraints.</p>
                        </div>

                        <div className="flex flex-col sm:flex-row gap-3">
                            <input
                                type="text"
                                placeholder="Target Table Name (e.g. users, orders)"
                                className="flex-1 bg-gray-50 dark:bg-gray-950 border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white"
                                value={impactTable}
                                onChange={(e) => setImpactTable(e.target.value)}
                            />
                            <select
                                className="bg-gray-50 dark:bg-gray-950 border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white"
                                value={impactAction}
                                onChange={(e) => setImpactAction(e.target.value)}
                            >
                                <option value="DROP_TABLE">DROP TABLE</option>
                                <option value="MODIFY_COLUMN">MODIFY COLUMN</option>
                                <option value="DROP_COLUMN">DROP COLUMN</option>
                            </select>
                            <button
                                onClick={handleRunImpact}
                                disabled={runningImpact || !impactTable.trim()}
                                className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2 rounded-lg font-medium text-sm transition disabled:opacity-50"
                            >
                                {runningImpact ? 'Analyzing Impact...' : 'Predict Impact'}
                            </button>
                        </div>

                        {impactReport && (
                            <div className="space-y-4 border-t border-gray-200 dark:border-gray-800 pt-4">
                                <div className="flex justify-between items-center bg-gray-50 dark:bg-gray-950 p-4 rounded-lg">
                                    <div>
                                        <span className="text-xs text-gray-500 block">Assessed Target</span>
                                        <span className="font-mono font-bold text-sm text-gray-900 dark:text-white">{impactReport.targetTable} ({impactReport.proposedAction})</span>
                                    </div>
                                    <div className="text-right">
                                        <span className="text-xs text-gray-500 block">Overall Risk</span>
                                        <span className={`font-bold text-sm px-2 py-0.5 rounded ${
                                            impactReport.riskScore === 'HIGH' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
                                        }`}>
                                            {impactReport.riskScore} BREAKING RISK
                                        </span>
                                    </div>
                                </div>

                                {impactReport.warnings.length > 0 && (
                                    <div className="p-3 bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-900/30 rounded-lg space-y-1">
                                        <h4 className="font-bold text-xs text-red-800 dark:text-red-300">Downstream Breakage Warnings</h4>
                                        {impactReport.warnings.map((w: string, i: number) => (
                                            <div key={i} className="text-xs text-red-700 dark:text-red-400">&bull; {w}</div>
                                        ))}
                                    </div>
                                )}

                                <div>
                                    <h4 className="font-bold text-xs uppercase text-gray-500 mb-2">Affected Downstream Dependencies ({impactReport.affectedDependencies.length})</h4>
                                    <div className="space-y-2">
                                        {impactReport.affectedDependencies.map((dep: any, idx: number) => (
                                            <div key={idx} className="p-3 bg-gray-50 dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-lg flex justify-between items-center text-xs">
                                                <div>
                                                    <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">{dep.identifier}</span>
                                                    <p className="text-gray-600 dark:text-gray-400 mt-0.5">{dep.description}</p>
                                                </div>
                                                <span className="font-bold px-2 py-0.5 rounded bg-red-100 text-red-700 text-[10px]">{dep.risk}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <h5 className="font-bold text-xs text-gray-700 dark:text-gray-300 mb-1">Generated Migration SQL</h5>
                                        <pre className="p-3 bg-gray-50 dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-lg text-xs font-mono text-blue-600 dark:text-blue-400 overflow-x-auto">
                                            {impactReport.suggestedMigrationSql}
                                        </pre>
                                    </div>
                                    <div>
                                        <h5 className="font-bold text-xs text-gray-700 dark:text-gray-300 mb-1">Generated Rollback SQL</h5>
                                        <pre className="p-3 bg-gray-50 dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-lg text-xs font-mono text-purple-600 dark:text-purple-400 overflow-x-auto">
                                            {impactReport.suggestedRollbackSql}
                                        </pre>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'migrations' && (
                    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-8 text-center text-gray-500 flex flex-col items-center justify-center h-full">
                        <FileCode2 size={48} className="mb-4 text-indigo-400 opacity-50" />
                        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Migration Generator</h3>
                        <p className="max-w-md mx-auto mb-6">Compare two schema versions and automatically generate ALTER TABLE migration scripts.</p>
                        <button className="px-6 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition">
                            Generate New Migration
                        </button>
                        <p className="text-xs text-gray-400 mt-4">(Feature unlocked once multiple schema versions are saved)</p>
                    </div>
                )}

                {activeTab === 'docs' && (
                    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-8 text-center text-gray-500 flex flex-col items-center justify-center h-full">
                        <BookOpen size={48} className="mb-4 text-purple-400 opacity-50" />
                        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Database Documentation</h3>
                        <p className="max-w-md mx-auto mb-6">Auto-generate comprehensive Markdown or PDF documentation of your tables, indexes, and relationships.</p>
                        <button className="px-6 py-2 bg-purple-600 text-white flex items-center gap-2 rounded-lg font-medium hover:bg-purple-700 transition">
                            <FileDown size={18} /> Export Documentation
                        </button>
                    </div>
                )}

                {activeTab === 'queries' && (
                    <div className="space-y-4">
                        {project.queries && project.queries.length > 0 ? (
                            project.queries.map((q: any) => (
                                <div key={q.id} className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-4 rounded-xl shadow-sm">
                                    <div className="flex justify-between items-center mb-2">
                                        <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Natural Language Request:</span>
                                        {q.execution_status === 'SUCCESS' ? (
                                            <span className="text-xs font-bold text-green-600 bg-green-100 px-2 py-0.5 rounded">SUCCESS</span>
                                        ) : q.execution_status === 'FAILED' ? (
                                            <span className="text-xs font-bold text-red-600 bg-red-100 px-2 py-0.5 rounded">FAILED</span>
                                        ) : null}
                                    </div>
                                    <p className="text-gray-600 dark:text-gray-400 text-sm mb-4">{q.natural_language_request}</p>
                                    <pre className="font-mono text-sm text-blue-600 dark:text-blue-400 bg-gray-50 dark:bg-gray-950 p-3 rounded-lg overflow-x-auto">
                                        {q.generated_sql}
                                    </pre>
                                </div>
                            ))
                        ) : (
                            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-8 text-center text-gray-500">
                                No saved queries in this project.
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default ProjectDetails;

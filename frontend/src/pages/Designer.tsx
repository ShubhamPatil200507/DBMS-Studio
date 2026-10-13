import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Play, Copy, RefreshCw, LayoutTemplate, Database, Save, Check } from 'lucide-react';
import Editor from '@monaco-editor/react';
import ReactFlow, { Background, Controls, type Node, type Edge } from 'reactflow';
import { useParams } from 'react-router-dom';
import 'reactflow/dist/style.css';
import { useTheme } from '../context/ThemeContext';
import { API_BASE_URL } from '../api/config';

const Designer: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const [requirement, setRequirement] = useState('');
    const [platform, setPlatform] = useState('MySQL');
    const [loading, setLoading] = useState(false);
    const [designData, setDesignData] = useState<any>(null);
    const [error, setError] = useState('');
    const [projects, setProjects] = useState<any[]>([]);
    const [selectedProject, setSelectedProject] = useState(id || '');
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const { theme } = useTheme();

    useEffect(() => {
        const fetchProjects = async () => {
            try {
                const res = await axios.get(`${API_BASE_URL}/api/projects`);
                setProjects(res.data);
                if (!id && res.data.length > 0) setSelectedProject(res.data[0].id);
            } catch (e) {
                console.error("Failed to load projects");
            }
        };
        fetchProjects();
        
        // If loaded within a project context, load its current schema
        if (id) {
            axios.get(`${API_BASE_URL}/api/projects/${id}`).then(res => {
                if(res.data.latest_schema) {
                    setDesignData(res.data.latest_schema.schema_json);
                    setPlatform(res.data.database_platform);
                }
            }).catch(e => console.error(e));
        }
    }, [id]);

    const handleGenerate = async () => {
        if (!requirement.trim()) {
            setError('Please describe your database requirements');
            return;
        }

        setError('');
        setLoading(true);
        setSaved(false);
        try {
            const response = await axios.post(`${API_BASE_URL}/api/design`, { requirement, platform });
            setDesignData(response.data);
        } catch (err: any) {
            setError(err.response?.data?.error || 'Failed to generate database design');
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        if (!selectedProject || !designData) return;
        setSaving(true);
        try {
            await axios.post(`${API_BASE_URL}/api/projects/${selectedProject}/schema`, {
                schema_json: designData,
                mysql_schema: designData.schema_code
            });
            setSaved(true);
            setTimeout(() => setSaved(false), 3000);
        } catch(e) {
            setError('Failed to save to project.');
        } finally {
            setSaving(false);
        }
    };

    // Convert API entities/relationships to ReactFlow nodes/edges
    const getFlowData = () => {
        if (!designData) return { nodes: [], edges: [] };

        const nodes: Node[] = designData.entities.map((entity: any, index: number) => {
            // Simple grid layout math
            const xOffset = (index % 3) * 350 + 50;
            const yOffset = Math.floor(index / 3) * 300 + 50;
            
            return {
                id: entity.name,
                position: { x: xOffset, y: yOffset },
                style: { 
                    background: theme === 'dark' ? '#1f2937' : '#ffffff', 
                    color: theme === 'dark' ? 'white' : '#111827', 
                    border: `1px solid ${theme === 'dark' ? '#374151' : '#e5e7eb'}`, 
                    borderRadius: '8px', 
                    padding: '0px', 
                    minWidth: '220px',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                },
                data: { 
                    label: (
                        <div className="flex flex-col h-full w-full">
                            <div className={`font-bold p-2 text-center border-b ${theme === 'dark' ? 'border-gray-700 bg-gray-800 text-blue-400' : 'border-gray-200 bg-gray-50 text-blue-600'} rounded-t-lg`}>
                                {entity.name}
                            </div>
                            <div className="p-2 text-left text-sm space-y-1">
                                {entity.attributes.map((attr: any, i: number) => (
                                    <div key={i} className="flex justify-between border-b border-dashed border-gray-300 dark:border-gray-600 last:border-0 pb-1">
                                        <span className={attr.primaryKey ? 'font-bold text-yellow-600 dark:text-yellow-400' : ''}>
                                            {attr.primaryKey ? '🔑 ' : ''}{attr.name}
                                        </span>
                                        <span className="text-gray-500 dark:text-gray-400 text-xs ml-4">{attr.type}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )
                }
            };
        });

        const edges: Edge[] = designData.relationships.map((rel: any, index: number) => ({
            id: `e${rel.source}-${rel.target}-${index}`,
            source: rel.source,
            target: rel.target,
            label: rel.type,
            animated: true,
            style: { stroke: '#3b82f6', strokeWidth: 2 },
            labelStyle: { fill: '#3b82f6', fontWeight: 'bold' }
        }));

        return { nodes, edges };
    };

    const { nodes, edges } = getFlowData();

    return (
        <div className="p-6 h-full flex flex-col space-y-4">
            <div className="flex justify-between items-end">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">AI Database Designer</h1>
                    <p className="text-gray-500 dark:text-gray-400">Describe your requirements and AI will generate the schema and ER diagram.</p>
                </div>
                {designData && projects.length > 0 && (
                    <div className="flex items-center gap-3 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-2 rounded-lg">
                        <select 
                            value={selectedProject}
                            onChange={(e) => setSelectedProject(e.target.value)}
                            className="bg-gray-50 dark:bg-gray-950 border border-gray-200 dark:border-gray-700 text-sm rounded-lg p-2 focus:outline-none"
                        >
                            {projects.map(p => <option key={p.id} value={p.id}>{p.project_name}</option>)}
                        </select>
                        <button 
                            onClick={handleSave}
                            disabled={saving || saved}
                            className={`px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition ${
                                saved ? 'bg-green-100 text-green-700' : 'bg-blue-600 hover:bg-blue-700 text-white'
                            }`}
                        >
                            {saved ? <Check size={16}/> : (saving ? <RefreshCw className="animate-spin" size={16} /> : <Save size={16}/>)}
                            {saved ? 'Saved!' : 'Save to Project'}
                        </button>
                    </div>
                )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 min-h-[500px]">
                {/* Left Panel: Inputs & SQL */}
                <div className="lg:col-span-1 space-y-4 flex flex-col">
                    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4 flex flex-col shadow-sm transition-colors">
                        <div className="flex items-center justify-between mb-2">
                            <label className="font-semibold text-gray-900 dark:text-white text-sm">Target Platform</label>
                            <select 
                                value={platform}
                                onChange={(e) => setPlatform(e.target.value)}
                                className="bg-gray-50 dark:bg-gray-950 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white text-sm rounded-lg p-1.5 focus:outline-none focus:border-blue-500 transition-colors"
                            >
                                <option value="MySQL">MySQL</option>
                                <option value="PostgreSQL">PostgreSQL</option>
                                <option value="SQL Server">SQL Server</option>
                                <option value="Oracle">Oracle</option>
                                <option value="MongoDB">MongoDB</option>
                            </select>
                        </div>
                        <textarea
                            className="w-full bg-gray-50 dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-lg p-3 text-gray-900 dark:text-white focus:outline-none focus:border-blue-500 resize-none h-32 mb-4 transition-colors text-sm"
                            placeholder="E.g., An e-commerce system with users, products, categories, orders, and order_items..."
                            value={requirement}
                            onChange={(e) => setRequirement(e.target.value)}
                        />
                        <div className="flex justify-between items-center">
                            <button onClick={() => setRequirement('A library management system with books, authors, members, and borrowing records.')} className="text-blue-500 hover:text-blue-600 dark:hover:text-blue-400 text-sm font-medium">Use Example</button>
                            <button 
                                onClick={handleGenerate}
                                disabled={loading}
                                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium flex items-center space-x-2 transition disabled:opacity-50"
                            >
                                {loading ? <RefreshCw className="animate-spin" size={16} /> : <Play size={16} />}
                                <span>{loading ? 'Generating...' : 'Generate Design'}</span>
                            </button>
                        </div>
                        {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
                    </div>

                    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl flex flex-col shadow-sm flex-1 min-h-[200px] overflow-hidden transition-colors">
                         <div className="p-3 border-b border-gray-200 dark:border-gray-800 flex justify-between items-center bg-gray-50 dark:bg-gray-950 transition-colors">
                            <h3 className="font-semibold text-gray-900 dark:text-white text-sm">Generated Schema Code</h3>
                            <button 
                                onClick={() => designData?.schema_code && navigator.clipboard.writeText(designData.schema_code)}
                                className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition"
                                title="Copy Code"
                            >
                                <Copy size={16} />
                            </button>
                        </div>
                        {loading ? (
                             <div className="p-4 space-y-2 animate-pulse flex-1 bg-white dark:bg-gray-900">
                                <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded w-3/4"></div>
                                <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded w-1/2"></div>
                                <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded w-5/6"></div>
                            </div>
                        ) : (
                            <Editor
                                height="100%"
                                defaultLanguage={platform === 'MongoDB' ? 'javascript' : 'sql'}
                                theme={theme === 'dark' ? 'vs-dark' : 'vs-light'}
                                value={designData?.schema_code || '-- Schema code will appear here'}
                                options={{ minimap: { enabled: false }, fontSize: 13 }}
                            />
                        )}
                    </div>
                </div>

                {/* Right Panel: ER Diagram & Explanation */}
                <div className="lg:col-span-2 space-y-4 flex flex-col">
                    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl flex-1 flex flex-col shadow-sm min-h-[400px] overflow-hidden transition-colors relative">
                        <div className="p-3 border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-950 flex justify-between items-center transition-colors">
                            <h3 className="font-semibold text-gray-900 dark:text-white text-sm flex items-center gap-2"><LayoutTemplate size={16}/> ER Diagram</h3>
                            <div className="text-xs text-gray-500 dark:text-gray-400">Drag nodes to rearrange</div>
                        </div>
                        <div className="flex-1 w-full h-full relative bg-gray-50 dark:bg-[#0f172a] transition-colors">
                            {loading ? (
                                <div className="absolute inset-0 flex items-center justify-center bg-white/50 dark:bg-gray-900/50 backdrop-blur-sm z-10">
                                    <div className="flex flex-col items-center text-blue-600 dark:text-blue-400">
                                        <Database className="animate-bounce w-12 h-12 mb-2" />
                                        <p className="font-medium animate-pulse">Designing {platform} Database Architecture...</p>
                                    </div>
                                </div>
                            ) : null}
                            <ReactFlow 
                                nodes={nodes} 
                                edges={edges} 
                                fitView 
                                proOptions={{ hideAttribution: true }}
                            >
                                <Background color={theme === 'dark' ? '#334155' : '#cbd5e1'} gap={16} />
                                <Controls className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white" />
                            </ReactFlow>
                        </div>
                    </div>
                    
                    {designData?.explanation && !loading && (
                        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4 transition-colors">
                            <h4 className="font-semibold text-blue-900 dark:text-blue-400 mb-1">Architecture Explanation</h4>
                            <p className="text-sm text-blue-800 dark:text-blue-300">{designData.explanation}</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Designer;

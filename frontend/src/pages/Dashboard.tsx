import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Database, Folder, FileTerminal, Search, Play, ShieldCheck } from 'lucide-react';
import { Link } from 'react-router-dom';
import { API_BASE_URL } from '../api/config';

const Dashboard: React.FC = () => {
    const [stats, setStats] = useState<any>({ totalProjects: 0, totalSchemas: 0, totalQueries: 0 });
    const [recentProjects, setRecentProjects] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchDashboard = async () => {
            try {
                const res = await axios.get(`${API_BASE_URL}/api/dashboard/stats`);
                setStats(res.data.stats);
                setRecentProjects(res.data.recentProjects);
            } catch (e) {
                console.error("Dashboard error");
            } finally {
                setLoading(false);
            }
        };
        fetchDashboard();
    }, []);

    const statCards = [
        { title: 'Total Projects', value: stats.totalProjects, icon: Folder, color: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-900/20' },
        { title: 'Saved Schemas', value: stats.totalSchemas, icon: Database, color: 'text-purple-500', bg: 'bg-purple-50 dark:bg-purple-900/20' },
        { title: 'Generated Queries', value: stats.totalQueries, icon: FileTerminal, color: 'text-indigo-500', bg: 'bg-indigo-50 dark:bg-indigo-900/20' },
        { title: 'Normalization Forms', value: '1NF – BCNF', icon: Search, color: 'text-orange-500', bg: 'bg-orange-50 dark:bg-orange-900/20' },
    ];

    if (loading) {
        return <div className="p-6 h-full flex flex-col space-y-6"><div className="animate-pulse flex gap-4"><div className="w-1/4 h-32 bg-gray-200 dark:bg-gray-800 rounded-xl"></div><div className="w-1/4 h-32 bg-gray-200 dark:bg-gray-800 rounded-xl"></div></div></div>;
    }

    return (
        <div className="p-6 max-w-7xl mx-auto h-full flex flex-col space-y-8 overflow-y-auto w-full">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Welcome to DBMS Studio</h1>
                    <p className="text-gray-500 dark:text-gray-400">Your intelligent database engineering workspace.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {statCards.map((card, index) => (
                    <div key={index} className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-6 rounded-xl shadow-sm flex items-center space-x-4 transition-colors hover:shadow-md">
                        <div className={`p-4 rounded-xl ${card.bg} ${card.color} transition-colors`}>
                            <card.icon size={28} />
                        </div>
                        <div>
                            <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">{card.title}</p>
                            <h3 className={`${typeof card.value === 'string' && card.value.length > 3 ? 'text-lg font-bold' : 'text-2xl font-bold'} text-gray-900 dark:text-white mt-1`}>
                                {card.value}
                            </h3>
                        </div>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Recent Projects */}
                <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6 shadow-sm transition-colors">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                            <Folder className="text-blue-500" size={20} /> Recent Workspaces
                        </h3>
                    </div>
                    {recentProjects.length > 0 ? (
                        <div className="space-y-4">
                            {recentProjects.map(p => (
                                <Link to={`/project/${p.id}`} key={p.id} className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 border border-transparent hover:border-gray-200 dark:hover:border-gray-700 transition">
                                    <div className="flex items-center gap-3">
                                        <div className="bg-blue-50 dark:bg-blue-900/20 p-2 rounded text-blue-600 dark:text-blue-400">
                                            <Folder size={16} />
                                        </div>
                                        <span className="font-semibold text-gray-900 dark:text-white">{p.project_name}</span>
                                    </div>
                                    <span className="text-xs text-gray-500">{new Date(p.updated_at).toLocaleDateString()}</span>
                                </Link>
                            ))}
                        </div>
                    ) : (
                        <p className="text-gray-500 text-sm text-center py-4">No projects yet.</p>
                    )}
                </div>

                {/* Quick Actions */}
                <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6 shadow-sm transition-colors">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2 mb-6">
                        <Zap className="text-indigo-500" size={20} /> Quick Actions
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Link to="/designer" className="p-4 border border-gray-200 dark:border-gray-800 rounded-lg hover:border-indigo-500 dark:hover:border-indigo-500 transition group flex flex-col items-center text-center">
                            <Database className="text-indigo-500 mb-2 group-hover:scale-110 transition-transform" size={28} />
                            <span className="font-semibold text-gray-900 dark:text-white">Design DB Schema</span>
                            <span className="text-xs text-gray-500 mt-1">Generate using AI</span>
                        </Link>
                        <Link to="/security" className="p-4 border border-gray-200 dark:border-gray-800 rounded-lg hover:border-blue-500 dark:hover:border-blue-500 transition group flex flex-col items-center text-center">
                            <ShieldCheck className="text-blue-500 mb-2 group-hover:scale-110 transition-transform" size={28} />
                            <span className="font-semibold text-gray-900 dark:text-white">Security Center</span>
                            <span className="text-xs text-gray-500 mt-1">SAST & DB Privilege Audit</span>
                        </Link>
                        <Link to="/sql" className="p-4 border border-gray-200 dark:border-gray-800 rounded-lg hover:border-purple-500 dark:hover:border-purple-500 transition group flex flex-col items-center text-center">
                            <Play className="text-purple-500 mb-2 group-hover:scale-110 transition-transform" size={28} />
                            <span className="font-semibold text-gray-900 dark:text-white">Run Query</span>
                            <span className="text-xs text-gray-500 mt-1">AI Assist & Execute</span>
                        </Link>
                        <Link to="/fd" className="p-4 border border-gray-200 dark:border-gray-800 rounded-lg hover:border-orange-500 dark:hover:border-orange-500 transition group flex flex-col items-center text-center">
                            <Calculator className="text-orange-500 mb-2 group-hover:scale-110 transition-transform" size={28} />
                            <span className="font-semibold text-gray-900 dark:text-white">Normalization</span>
                            <span className="text-xs text-gray-500 mt-1">1NF to BCNF tools</span>
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
};
// Quick dummy import for icon
import { Zap, Calculator } from 'lucide-react';
export default Dashboard;

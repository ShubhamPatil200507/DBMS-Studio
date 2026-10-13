import React from 'react';
import { useTheme } from '../context/ThemeContext';

const Settings: React.FC = () => {
    const { theme, toggleTheme } = useTheme();

    return (
        <div className="p-6">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Settings</h1>
            <p className="text-gray-500 dark:text-gray-400">Configure application preferences.</p>
            <div className="mt-8 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-8 max-w-2xl transition-colors">
                 <div className="space-y-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Gemini API Key</label>
                        <input 
                            type="password" 
                            className="w-full bg-gray-50 dark:bg-gray-950 border border-gray-300 dark:border-gray-700 rounded-lg p-3 text-gray-900 dark:text-white focus:outline-none focus:border-blue-500 transition-colors" 
                            placeholder="••••••••••••••••"
                            disabled
                        />
                        <p className="text-xs text-gray-500 mt-2">Configured in backend .env file for this deployment.</p>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Theme</label>
                        <select 
                            className="w-full bg-gray-50 dark:bg-gray-950 border border-gray-300 dark:border-gray-700 rounded-lg p-3 text-gray-900 dark:text-white focus:outline-none focus:border-blue-500 transition-colors cursor-pointer" 
                            value={theme}
                            onChange={toggleTheme}
                        >
                            <option value="light">Light Mode</option>
                            <option value="dark">Dark Mode</option>
                        </select>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Settings;

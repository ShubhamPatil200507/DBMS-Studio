import React from 'react';
import { Search, Sun, Moon } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

const Topbar: React.FC = () => {
  const { theme, toggleTheme } = useTheme();

  return (
    <header className="h-16 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between px-6 transition-colors">
      <div className="flex items-center text-gray-400 focus-within:text-blue-500">
        <Search className="w-5 h-5 absolute ml-3 pointer-events-none" />
        <input
          type="text"
          placeholder="Search..."
          className="pl-10 pr-4 py-2 bg-gray-100 dark:bg-gray-950 border-none rounded-lg text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 w-64 transition-colors"
        />
      </div>
      
      <div className="flex items-center gap-4">
        <button onClick={toggleTheme} className="text-gray-400 hover:text-gray-600 dark:hover:text-white transition p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800">
          {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
        </button>
      </div>
    </header>
  );
};

export default Topbar;

import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Database, Network, FileTerminal, Activity, Calculator, ShieldCheck } from 'lucide-react';

const navItems = [
  { name: 'Dashboard', path: '/', icon: LayoutDashboard },
  { name: 'AI Database Designer', path: '/designer', icon: Database },
  { name: 'Schema Analyzer', path: '/schema', icon: Network },
  { name: 'AI SQL Assistant', path: '/sql', icon: FileTerminal },
  { name: 'Normalization Studio', path: '/fd', icon: Calculator },
  { name: 'Security Analyzer', path: '/security', icon: ShieldCheck },
  { name: 'Performance Analyzer', path: '/performance', icon: Activity }
];

const Sidebar: React.FC = () => {
  return (
    <div className="w-64 bg-white dark:bg-gray-900 text-gray-900 dark:text-white flex flex-col h-full border-r border-gray-200 dark:border-gray-800 transition-colors">
      <div className="p-4 flex items-center justify-center border-b border-gray-200 dark:border-gray-800">
        <h2 className="text-xl font-bold text-blue-600 dark:text-blue-400">DBMS Studio</h2>
      </div>
      <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                  isActive ? 'bg-blue-50 dark:bg-blue-600/20 text-blue-600 dark:text-blue-400 font-semibold' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white'
                }`
              }
            >
              <Icon className="w-5 h-5" />
              <span className="font-medium">{item.name}</span>
            </NavLink>
          );
        })}
      </nav>
    </div>
  );
};

export default Sidebar;

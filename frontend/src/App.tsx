import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Topbar from './components/Topbar';
import Dashboard from './pages/Dashboard';
import Designer from './pages/Designer';
import Schema from './pages/Schema';
import SqlAssistant from './pages/SqlAssistant';
import Security from './pages/Security';
import Performance from './pages/Performance';
import FdAnalyzer from './pages/FdAnalyzer';
import ProjectDetails from './pages/ProjectDetails';
import { ThemeProvider } from './context/ThemeContext';

const App: React.FC = () => {
  return (
    <ThemeProvider>
      <Router>
        <div className="flex h-screen bg-white dark:bg-gray-950 text-gray-900 dark:text-white font-sans overflow-hidden transition-colors">
          <Sidebar />
          <div className="flex flex-col flex-1 overflow-hidden bg-gray-50 dark:bg-transparent">
            <Topbar />
            <main className="flex-1 overflow-y-auto">
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/designer" element={<Designer />} />
                <Route path="/schema" element={<Schema />} />
                <Route path="/sql" element={<SqlAssistant />} />
                <Route path="/fd" element={<FdAnalyzer />} />
                <Route path="/security" element={<Security />} />
                <Route path="/performance" element={<Performance />} />
                <Route path="/project/:id" element={<ProjectDetails />} />
                <Route path="/project/:id/designer" element={<Designer />} />
                <Route path="/project/:id/schema" element={<Schema />} />
                <Route path="/project/:id/sql" element={<SqlAssistant />} />
                <Route path="/project/:id/performance" element={<Performance />} />
              </Routes>
            </main>
          </div>
        </div>
      </Router>
    </ThemeProvider>
  );
};

export default App;

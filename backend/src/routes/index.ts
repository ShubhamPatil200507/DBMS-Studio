import { Express } from 'express';
import designRoutes from './designRoutes';
import schemaRoutes from './schemaRoutes';
import sqlRoutes from './sqlRoutes';
import performanceRoutes from './performanceRoutes';
import projectRoutes from './projectRoutes';
import fdRoutes from './fdRoutes';
import dashboardRoutes from './dashboardRoutes';
import securityRoutes from './securityRoutes';
import agentRoutes from './agentRoutes';

export const setupRoutes = (app: Express) => {
    app.use('/api/dashboard', dashboardRoutes);
    app.use('/api/design', designRoutes);
    app.use('/api/schema', schemaRoutes);
    app.use('/api/sql', sqlRoutes);
    app.use('/api/performance', performanceRoutes);
    app.use('/api/projects', projectRoutes);
    app.use('/api/fd', fdRoutes);
    app.use('/api/security', securityRoutes);
    app.use('/api/agent', agentRoutes);
};

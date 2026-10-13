"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const agentWorkflow_1 = require("../agent/agentWorkflow");
const impactController_1 = require("../controllers/impactController");
const router = (0, express_1.Router)();
router.post('/optimize', agentWorkflow_1.runAgentOptimizer);
router.post('/impact', impactController_1.predictSchemaImpact);
exports.default = router;
//# sourceMappingURL=agentRoutes.js.map
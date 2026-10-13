"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const performanceController_1 = require("../controllers/performanceController");
const router = (0, express_1.Router)();
router.post('/analyze', performanceController_1.analyzePerformance);
exports.default = router;
//# sourceMappingURL=performanceRoutes.js.map
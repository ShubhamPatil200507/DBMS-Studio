"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const securityController_1 = require("../controllers/securityController");
const router = (0, express_1.Router)();
router.get('/source-scan', securityController_1.scanSourceCode);
router.post('/scan-snippet', securityController_1.scanSnippet);
router.get('/database-audit', securityController_1.auditDatabase);
router.post('/database-audit', securityController_1.auditDatabase);
exports.default = router;
//# sourceMappingURL=securityRoutes.js.map
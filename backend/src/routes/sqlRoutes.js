"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const sqlController_1 = require("../controllers/sqlController");
const router = (0, express_1.Router)();
router.post('/generate', sqlController_1.generateSql);
router.post('/explain', sqlController_1.explainSql);
router.post('/validate', sqlController_1.validateSql);
router.post('/execute', sqlController_1.executeSql);
exports.default = router;
//# sourceMappingURL=sqlRoutes.js.map
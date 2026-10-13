"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const schemaController_1 = require("../controllers/schemaController");
const router = (0, express_1.Router)();
router.post('/analyze', schemaController_1.analyzeSchema);
exports.default = router;
//# sourceMappingURL=schemaRoutes.js.map
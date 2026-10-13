"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const fdController_1 = require("../controllers/fdController");
const router = (0, express_1.Router)();
router.post('/closure', fdController_1.handleClosure);
router.post('/candidate-keys', fdController_1.handleCandidateKeys);
router.post('/analyze', fdController_1.handleNormalization);
exports.default = router;
//# sourceMappingURL=fdRoutes.js.map
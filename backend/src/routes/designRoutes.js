"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const designController_1 = require("../controllers/designController");
const router = (0, express_1.Router)();
router.post('/', designController_1.generateDesign);
exports.default = router;
//# sourceMappingURL=designRoutes.js.map
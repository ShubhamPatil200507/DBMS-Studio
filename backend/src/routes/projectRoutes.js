"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const projectController_1 = require("../controllers/projectController");
const router = (0, express_1.Router)();
router.get('/', projectController_1.getProjects);
router.get('/:id', projectController_1.getProjectById);
router.post('/', projectController_1.createProject);
router.put('/:id', projectController_1.updateProject);
router.delete('/:id', projectController_1.deleteProject);
router.post('/:id/schema', projectController_1.saveSchema);
router.post('/:id/queries', projectController_1.saveQuery);
exports.default = router;
//# sourceMappingURL=projectRoutes.js.map
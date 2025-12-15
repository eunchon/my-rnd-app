"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const router = (0, express_1.Router)();
// Placeholder admin routes (extend as needed)
router.get('/health', (_req, res) => {
    res.json({ ok: true });
});
exports.default = router;

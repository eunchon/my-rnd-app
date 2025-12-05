"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const morgan_1 = __importDefault(require("morgan"));
const requests_1 = __importDefault(require("./views/requests"));
const auth_1 = __importDefault(require("./views/auth"));
const app = (0, express_1.default)();
app.use((0, cors_1.default)());
app.use(express_1.default.json());
app.use((0, morgan_1.default)('dev'));
app.get('/health', (_req, res) => {
    res.json({ ok: true });
});
// API routes
app.use('/auth', auth_1.default);
app.use('/requests', requests_1.default);
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Backend listening on http://localhost:${PORT}`);
});

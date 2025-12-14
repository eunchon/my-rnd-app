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
const admin_1 = __importDefault(require("./views/admin"));
const app = (0, express_1.default)();
// CORS: allow frontends (Render backend + Vercel frontend)
const allowedOrigins = [
    'https://my-rnd-app.vercel.app',
    'https://my-rnd-app.onrender.com',
    '*', // fallback for non-browser or local tools
];
const corsOptions = {
    origin: (origin, callback) => {
        if (!origin)
            return callback(null, '*'); // non-browser (curl, server-side)
        if (allowedOrigins.includes('*') || allowedOrigins.includes(origin))
            return callback(null, origin);
        return callback(null, false);
    },
    credentials: false,
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
};
app.use((0, cors_1.default)(corsOptions));
app.options('*', (0, cors_1.default)(corsOptions));
// Explicit CORS headers for all responses (in case upstream proxy strips default middleware)
app.use((req, res, next) => {
    const origin = req.headers.origin;
    if (origin && (allowedOrigins.includes(origin) || allowedOrigins.includes('*'))) {
        res.setHeader('Access-Control-Allow-Origin', origin);
    }
    else {
        res.setHeader('Access-Control-Allow-Origin', '*');
    }
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PATCH,PUT,DELETE,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    next();
});
app.use(express_1.default.json());
app.use((0, morgan_1.default)('dev'));
app.get('/health', (_req, res) => {
    res.json({ ok: true });
});
// API routes
app.use('/auth', auth_1.default);
app.use('/admin', admin_1.default);
app.use('/requests', requests_1.default);
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
    console.log(`Backend listening on http://localhost:${PORT}`);
});

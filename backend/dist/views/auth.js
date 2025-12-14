"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authMiddleware = authMiddleware;
exports.requireRole = requireRole;
const express_1 = require("express");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const zod_1 = require("zod");
const db_1 = require("../db");
const router = (0, express_1.Router)();
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';
const ROLE_VALUES = ['SALES', 'RD', 'EXEC', 'ADMIN', 'VIEWER'];
const loginSchema = zod_1.z.object({
    email: zod_1.z.string().email(),
    password: zod_1.z.string().min(1),
});
const signupSchema = zod_1.z.object({
    name: zod_1.z.string().min(2),
    email: zod_1.z.string().email(),
    password: zod_1.z.string().min(6),
    dept: zod_1.z.string().min(2),
    organization: zod_1.z.preprocess((val) => (typeof val === 'string' && val.trim().length === 0 ? undefined : val), zod_1.z.string().min(2).optional()),
    role: zod_1.z.enum(ROLE_VALUES),
});
function toPublicUser(user) {
    return {
        user_id: user.id,
        name: user.name,
        role: user.role,
        organization: user.organization ?? user.dept,
        dept: user.dept,
        email: user.email,
    };
}
function signToken(user) {
    return jsonwebtoken_1.default.sign({
        user_id: user.id,
        role: user.role,
        name: user.name,
        organization: user.organization ?? user.dept,
        dept: user.dept,
        email: user.email,
    }, JWT_SECRET, { expiresIn: '8h' });
}
router.post('/signup', async (req, res) => {
    const parsed = signupSchema.safeParse(req.body);
    if (!parsed.success)
        return res.status(400).json({ error: parsed.error.flatten() });
    const data = parsed.data;
    const email = data.email.trim().toLowerCase();
    const name = data.name.trim();
    const dept = data.dept.trim();
    const organization = data.organization?.toString().trim();
    const existing = await db_1.prisma.user.findUnique({ where: { email } });
    if (existing)
        return res.status(409).json({ error: 'Email already registered' });
    const passwordHash = await bcryptjs_1.default.hash(data.password, 10);
    const user = await db_1.prisma.user.create({
        data: {
            name,
            email,
            dept,
            organization: organization || dept,
            role: data.role,
            passwordHash,
        },
    });
    const token = signToken(user);
    res.status(201).json({ token, user: toPublicUser(user) });
});
router.post('/login', async (req, res) => {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success)
        return res.status(400).json({ error: parsed.error.flatten() });
    const email = parsed.data.email.trim().toLowerCase();
    const password = parsed.data.password;
    const user = await db_1.prisma.user.findUnique({ where: { email } });
    if (!user)
        return res.status(401).json({ error: 'Invalid credentials' });
    const ok = await bcryptjs_1.default.compare(password, user.passwordHash);
    if (!ok)
        return res.status(401).json({ error: 'Invalid credentials' });
    const token = signToken(user);
    res.json({ token, user: toPublicUser(user) });
});
// Forgot password: issue a short-lived reset token (demo: return token directly)
router.post('/forgot-password', async (req, res) => {
    const email = (req.body?.email || '').toString().trim().toLowerCase();
    if (!email)
        return res.status(400).json({ error: 'Email required' });
    const user = await db_1.prisma.user.findUnique({ where: { email } });
    if (!user)
        return res.status(404).json({ error: 'User not found' });
    const resetToken = jsonwebtoken_1.default.sign({ user_id: user.id, email: user.email, type: 'reset' }, JWT_SECRET, { expiresIn: '30m' });
    // In production: send email with reset link. For now, return token to client.
    res.json({ ok: true, resetToken, expiresInMinutes: 30 });
});
// Reset password using reset token
router.post('/reset-password', async (req, res) => {
    const { token, newPassword } = req.body || {};
    if (!token || typeof token !== 'string')
        return res.status(400).json({ error: 'Token required' });
    if (!newPassword || typeof newPassword !== 'string' || newPassword.length < 6) {
        return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }
    try {
        const payload = jsonwebtoken_1.default.verify(token, JWT_SECRET);
        if (payload?.type !== 'reset' || !payload?.user_id)
            throw new Error('Invalid token');
        const user = await db_1.prisma.user.findUnique({ where: { id: payload.user_id } });
        if (!user || user.email.toLowerCase() !== payload.email?.toLowerCase())
            throw new Error('Invalid token');
        const passwordHash = await bcryptjs_1.default.hash(newPassword, 10);
        const updated = await db_1.prisma.user.update({ where: { id: user.id }, data: { passwordHash } });
        const newAuthToken = signToken(updated);
        res.json({ ok: true, token: newAuthToken, user: toPublicUser(updated) });
    }
    catch (e) {
        return res.status(400).json({ error: 'Invalid or expired token' });
    }
});
// User search (kept for potential future use)
router.get('/users', authMiddleware, async (req, res) => {
    const q = (req.query.q || '').toString().trim();
    if (!q || q.length < 2)
        return res.json([]);
    const users = await db_1.prisma.user.findMany({
        where: {
            OR: [
                { email: { contains: q.toLowerCase() } },
                { name: { contains: q } },
            ],
        },
        take: 10,
        select: { id: true, name: true, email: true, dept: true, role: true, organization: true },
    });
    res.json(users);
});
function authMiddleware(req, res, next) {
    const auth = req.headers.authorization;
    if (!auth || !auth.startsWith('Bearer '))
        return res.status(401).json({ error: 'Missing token' });
    const token = auth.slice(7);
    try {
        const payload = jsonwebtoken_1.default.verify(token, JWT_SECRET);
        req.user = payload;
        next();
    }
    catch {
        return res.status(401).json({ error: 'Invalid token' });
    }
}
function requireRole(roles) {
    const normalized = roles.map((role) => role.toUpperCase());
    return (req, res, next) => {
        const userRole = (req.user?.role ?? '').toUpperCase();
        if (!req.user || !normalized.includes(userRole)) {
            return res.status(403).json({ error: 'Forbidden' });
        }
        next();
    };
}
exports.default = router;

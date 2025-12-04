import { Router } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { prisma } from '../db';
const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';
const ROLE_VALUES = ['SALES', 'RD', 'EXEC', 'ADMIN', 'VIEWER'];
const loginSchema = z.object({
    email: z.string().email(),
    password: z.string().min(1),
});
const signupSchema = z.object({
    name: z.string().min(2),
    email: z.string().email(),
    password: z.string().min(6),
    dept: z.string().min(2),
    organization: z.preprocess((val) => (typeof val === 'string' && val.trim().length === 0 ? undefined : val), z.string().min(2).optional()),
    role: z.enum(ROLE_VALUES),
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
    return jwt.sign({
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
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing)
        return res.status(409).json({ error: 'Email already registered' });
    const passwordHash = await bcrypt.hash(data.password, 10);
    const user = await prisma.user.create({
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
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user)
        return res.status(401).json({ error: 'Invalid credentials' });
    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok)
        return res.status(401).json({ error: 'Invalid credentials' });
    const token = signToken(user);
    res.json({ token, user: toPublicUser(user) });
});
export function authMiddleware(req, res, next) {
    const auth = req.headers.authorization;
    if (!auth || !auth.startsWith('Bearer '))
        return res.status(401).json({ error: 'Missing token' });
    const token = auth.slice(7);
    try {
        const payload = jwt.verify(token, JWT_SECRET);
        req.user = payload;
        next();
    }
    catch {
        return res.status(401).json({ error: 'Invalid token' });
    }
}
export function requireRole(roles) {
    const normalized = roles.map((role) => role.toUpperCase());
    return (req, res, next) => {
        const userRole = (req.user?.role ?? '').toUpperCase();
        if (!req.user || !normalized.includes(userRole)) {
            return res.status(403).json({ error: 'Forbidden' });
        }
        next();
    };
}
export default router;

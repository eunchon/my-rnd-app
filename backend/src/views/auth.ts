import { Router } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { prisma } from '../db';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';
const ROLE_VALUES = ['SALES', 'RD', 'EXEC', 'ADMIN', 'VIEWER'] as const;

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const signupSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
  dept: z.string().min(2),
  organization: z.preprocess(
    (val) => (typeof val === 'string' && val.trim().length === 0 ? undefined : val),
    z.string().min(2).optional()
  ),
  role: z.enum(ROLE_VALUES),
});

function toPublicUser(user: { id: string; name: string; role: string; organization: string | null; dept: string; email: string }) {
  return {
    user_id: user.id,
    name: user.name,
    role: user.role,
    organization: user.organization ?? user.dept,
    dept: user.dept,
    email: user.email,
  };
}

function signToken(user: { id: string; name: string; role: string; organization: string | null; dept: string; email: string }) {
  return jwt.sign(
    {
      user_id: user.id,
      role: user.role,
      name: user.name,
      organization: user.organization ?? user.dept,
      dept: user.dept,
      email: user.email,
    },
    JWT_SECRET,
    { expiresIn: '8h' }
  );
}

router.post('/signup', async (req, res) => {
  const parsed = signupSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const data = parsed.data;
  const email = data.email.trim().toLowerCase();
  const name = data.name.trim();
  const dept = data.dept.trim();
  const organization = data.organization?.toString().trim();
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return res.status(409).json({ error: 'Email already registered' });
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
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const email = parsed.data.email.trim().toLowerCase();
  const password = parsed.data.password;
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return res.status(401).json({ error: 'Invalid credentials' });
  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return res.status(401).json({ error: 'Invalid credentials' });
  const token = signToken(user);
  res.json({ token, user: toPublicUser(user) });
});

// Forgot password: issue a short-lived reset token (demo: return token directly)
router.post('/forgot-password', async (req, res) => {
  const email = (req.body?.email || '').toString().trim().toLowerCase();
  if (!email) return res.status(400).json({ error: 'Email required' });
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return res.status(404).json({ error: 'User not found' });
  const resetToken = jwt.sign(
    { user_id: user.id, email: user.email, type: 'reset' },
    JWT_SECRET,
    { expiresIn: '30m' }
  );
  // In production: send email with reset link. For now, return token to client.
  res.json({ ok: true, resetToken, expiresInMinutes: 30 });
});

// Reset password using reset token
router.post('/reset-password', async (req, res) => {
  const { token, newPassword } = req.body || {};
  if (!token || typeof token !== 'string') return res.status(400).json({ error: 'Token required' });
  if (!newPassword || typeof newPassword !== 'string' || newPassword.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters' });
  }
  try {
    const payload = jwt.verify(token, JWT_SECRET) as any;
    if (payload?.type !== 'reset' || !payload?.user_id) throw new Error('Invalid token');
    const user = await prisma.user.findUnique({ where: { id: payload.user_id } });
    if (!user || user.email.toLowerCase() !== payload.email?.toLowerCase()) throw new Error('Invalid token');
    const passwordHash = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({ where: { id: user.id }, data: { passwordHash } });
    const newAuthToken = signToken({ ...user, passwordHash });
    res.json({ ok: true, token: newAuthToken, user: toPublicUser({ ...user, passwordHash }) });
  } catch (e) {
    return res.status(400).json({ error: 'Invalid or expired token' });
  }
});

// User search (kept for potential future use)
router.get('/users', authMiddleware, async (req, res) => {
  const q = (req.query.q || '').toString().trim();
  if (!q || q.length < 2) return res.json([]);
  const users = await prisma.user.findMany({
    where: {
      OR: [
        { email: { contains: q, mode: 'insensitive' } },
        { name: { contains: q, mode: 'insensitive' } },
      ],
    },
    take: 10,
    select: { id: true, name: true, email: true, dept: true, role: true, organization: true },
  });
  res.json(users);
});

export function authMiddleware(req: any, res: any, next: any) {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) return res.status(401).json({ error: 'Missing token' });
  const token = auth.slice(7);
  try {
    const payload = jwt.verify(token, JWT_SECRET) as any;
    req.user = payload;
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

export function requireRole(roles: string[]) {
  const normalized = roles.map((role) => role.toUpperCase());
  return (req: any, res: any, next: any) => {
    const userRole = (req.user?.role ?? '').toUpperCase();
    if (!req.user || !normalized.includes(userRole)) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    next();
  };
}

export default router;

import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import requestsRouter from './views/requests';
import authRouter from './views/auth';
import adminRouter from './views/admin';
import type { Request, Response } from 'express';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import cookieParser from 'cookie-parser';
import crypto from 'crypto';

const app = express();
// CORS: allow only known frontends (prod + local dev)
const allowedOrigins = [
  'https://my-rnd-app.vercel.app',
  'https://my-rnd-app.onrender.com',
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
];
const corsOptions: cors.CorsOptions = {
  origin: (origin, callback) => {
    if (!origin) return callback(null, true); // non-browser (curl, server-side)
    if (allowedOrigins.includes(origin)) return callback(null, origin);
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token'],
};
app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

app.use(
  helmet({
    contentSecurityPolicy: false, // disable CSP to avoid breaking inline styles/scripts; set via CDN if needed
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);

const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
});
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(apiLimiter);
app.use('/auth', authLimiter);

app.use(cookieParser());
app.use(express.json());
app.use(morgan('dev'));

const CSRF_COOKIE = 'XSRF-TOKEN';
const isProd = process.env.NODE_ENV === 'production';
function ensureCsrfToken(req: Request, res: Response, next: any) {
  const cookies = (req as any).cookies || {};
  let token = cookies[CSRF_COOKIE];
  if (!token) token = crypto.randomBytes(16).toString('hex');
  // Always refresh cookie to ensure client has latest token with correct flags
  res.cookie(CSRF_COOKIE, token, {
    httpOnly: false, // double-submit cookie pattern
    sameSite: 'none', // allow cross-site frontend/API usage
    secure: isProd,
    path: '/',
  });
  res.setHeader('X-CSRF-Token', token);
  next();
}
function verifyCsrf(req: Request, res: Response, next: any) {
  const safeMethods = ['GET', 'HEAD', 'OPTIONS'];
  const csrfExemptPaths = ['/auth/login', '/auth/signup', '/auth/forgot-password', '/auth/reset-password', '/health'];
  if (safeMethods.includes(req.method) || csrfExemptPaths.includes(req.path)) return next();
  const headerToken = (req.headers['x-csrf-token'] || req.headers['x-xsrf-token']) as string | undefined;
  const cookieToken = (req as any).cookies?.[CSRF_COOKIE];
  if (cookieToken && headerToken && headerToken === cookieToken) return next();
  return res.status(403).json({ error: 'Invalid CSRF token' });
}
app.use(ensureCsrfToken);
app.use(verifyCsrf);

app.get('/health', (_req: Request, res: Response) => {
  res.json({ ok: true });
});

// API routes
app.use('/auth', authRouter);
app.use('/admin', adminRouter);
app.use('/requests', requestsRouter);

// Fallback error handler to avoid leaking stack traces
app.use((err: any, _req: Request, res: Response, _next: any) => {
  console.error(err);
  const status = Number.isInteger(err?.status) ? err.status : 500;
  res.status(status).json({ error: 'Internal error' });
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`Backend listening on http://localhost:${PORT}`);
});

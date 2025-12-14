import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import requestsRouter from './views/requests';
import authRouter from './views/auth';
import adminRouter from './views/admin';
import type { Request, Response } from 'express';

const app = express();
// CORS: allow frontends (Render backend + Vercel frontend)
const allowedOrigins = [
  'https://my-rnd-app.vercel.app',
  'https://my-rnd-app.onrender.com',
  '*', // fallback for non-browser or local tools
];
const corsOptions: cors.CorsOptions = {
  origin: (origin, callback) => {
    if (!origin) return callback(null, '*'); // non-browser (curl, server-side)
    if (allowedOrigins.includes('*') || allowedOrigins.includes(origin)) return callback(null, origin);
    return callback(null, false);
  },
  credentials: false,
  methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};
app.use(cors(corsOptions));
app.options('*', cors(corsOptions));
// Explicit CORS headers for all responses (in case upstream proxy strips default middleware)
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin && (allowedOrigins.includes(origin) || allowedOrigins.includes('*'))) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  } else {
    res.setHeader('Access-Control-Allow-Origin', '*');
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PATCH,PUT,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  next();
});

app.use(express.json());
app.use(morgan('dev'));

app.get('/health', (_req: Request, res: Response) => {
  res.json({ ok: true });
});

// API routes
app.use('/auth', authRouter);
app.use('/admin', adminRouter);
app.use('/requests', requestsRouter);

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`Backend listening on http://localhost:${PORT}`);
});

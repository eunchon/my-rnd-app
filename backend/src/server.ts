import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import requestsRouter from './views/requests';
import authRouter from './views/auth';
import adminRouter from './views/admin';
import type { Request, Response } from 'express';

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
// Explicit CORS headers for all responses (in case upstream proxy strips default middleware)
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin && allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  } else {
    res.setHeader('Access-Control-Allow-Origin', 'null');
  }
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PATCH,PUT,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-CSRF-Token');
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

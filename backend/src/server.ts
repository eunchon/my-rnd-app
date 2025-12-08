import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import requestsRouter from './views/requests';
import authRouter from './views/auth';

const app = express();
// CORS: allow configured origins, fallback to allow all (Render/Vercel preflight issues)
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:5173',
  'http://localhost:4173',
  'https://my-rnd-8dkjoi2tf-eunchons-projects.vercel.app',
  process.env.CORS_ORIGIN || '',
].filter(Boolean);

const corsOptions: cors.CorsOptions = {
  origin: (origin, cb) => {
    if (!origin) return cb(null, true); // mobile apps / curl
    if (allowedOrigins.includes(origin)) return cb(null, true);
    // fallback allow all to avoid blocked preflight; tighten later if needed
    return cb(null, true);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));
app.use(express.json());
app.use(morgan('dev'));

app.get('/health', (_req, res) => {
  res.json({ ok: true });
});

// API routes
app.use('/auth', authRouter);
app.use('/requests', requestsRouter);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Backend listening on http://localhost:${PORT}`);
});

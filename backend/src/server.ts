import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import requestsRouter from './views/requests';
import authRouter from './views/auth';
import type { Request, Response } from 'express';

const app = express();
// CORS: allow all origins (front is deployed on Vercel with dynamic domains)
const corsOptions: cors.CorsOptions = {
  origin: '*',
  credentials: false,
  methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));
app.use(express.json());
app.use(morgan('dev'));

app.get('/health', (_req: Request, res: Response) => {
  res.json({ ok: true });
});

// API routes
app.use('/auth', authRouter);
app.use('/requests', requestsRouter);

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`Backend listening on http://localhost:${PORT}`);
});

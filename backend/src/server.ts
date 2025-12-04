import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import requestsRouter from './views/requests';
import authRouter from './views/auth';

const app = express();
app.use(cors());
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

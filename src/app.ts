import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import path from 'path';
import routes from './routes';
import { errorHandler } from './middlewares/errorHandler';
import { ENV } from './config/env';

export const app = express();

app.use(
  helmet({
    crossOriginResourcePolicy: false
  })
);

app.use(
  cors({
    origin: [ENV.FRONTEND_URL, 'http://localhost:5173', 'http://localhost:3000'],
  })
);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Serve static uploaded product images
app.use('/uploads', express.static(path.resolve(process.cwd(), 'uploads')));

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'alphatech_backend', timestamp: new Date().toISOString() });
});

app.use('/api', routes);

app.use((req, res) => {
  res.status(404).json({ success: false, error: `Route Not Found - ${req.method} ${req.originalUrl}` });
});

app.use(errorHandler);

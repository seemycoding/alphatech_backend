import dotenv from 'dotenv';
dotenv.config();

import { app } from './app';
import { ENV } from './config/env';
import { connectDB } from './config/db';

const PORT = ENV.PORT || 5000;

async function bootstrap() {
  await connectDB();

  app.listen(PORT, () => {
    console.log(`🚀 AlphaaTechh Backend Server running at http://localhost:${PORT}`);
    console.log(`📡 CORS Origin allowed for: ${ENV.FRONTEND_URL}`);
  });
}

bootstrap().catch((err) => {
  console.error('❌ Failed to start server:', err);
});

import express from 'express';
import helmet from 'helmet';
import path from 'path';
import authRoutes from './auth/routes';
import blogRoutes from './blog/routes';
import systemsRoutes from './systems/routes';
import { pageGuard } from './auth/middleware';

export function createApp(): express.Application {
  const app = express();

  // Trust proxy (Caddy in front)
  app.set('trust proxy', 1);

  // Security headers — disable CSP so admin inline scripts work
  app.use(helmet({ contentSecurityPolicy: false }));

  // Body parsers
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // 1. API routers
  app.use('/backend/api', authRoutes);
  app.use('/backend/api', blogRoutes);
  app.use('/backend/api', systemsRoutes);

  // 2. Page auth gate for admin pages (dashboard, posts/*)
  app.get(/^\/backend\/(dashboard|posts)(\/.*)?$/, pageGuard);

  // 3. Ensure /backend and /backend/ both serve the login page
  //    (handled by express.static with index:'index.html' below)

  // 4. Static admin frontend
  const frontendDist = path.join(__dirname, '..', 'frontend', 'dist');
  app.use('/backend', express.static(frontendDist, {
    extensions: ['html'],
    index: 'index.html',
  }));

  return app;
}

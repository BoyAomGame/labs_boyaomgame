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

  const frontendDist = path.join(__dirname, '..', 'frontend', 'dist');

  // 3. Posts list page. build.format:'file' emits it as posts.html, but the sibling
  //    posts/new + posts/edit pages create a dist/posts/ directory that shadows it in
  //    serve-static (it 301s /backend/posts -> /backend/posts/ then 404s on the missing
  //    posts/index.html). Serve the file directly before the static middleware.
  app.get(['/backend/posts', '/backend/posts/'], (_req, res) => {
    res.sendFile(path.join(frontendDist, 'posts.html'));
  });

  // 4. Ensure /backend and /backend/ both serve the login page
  //    (handled by express.static with index:'index.html' below)

  // 5. Static admin frontend
  app.use('/backend', express.static(frontendDist, {
    extensions: ['html'],
    index: 'index.html',
  }));

  return app;
}

import type { Request, Response, NextFunction } from 'express';
import { isAuthed } from './session';

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  if (!isAuthed(req)) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  next();
}

export function pageGuard(req: Request, res: Response, next: NextFunction): void {
  if (!isAuthed(req)) {
    res.redirect('/backend/');
    return;
  }
  next();
}

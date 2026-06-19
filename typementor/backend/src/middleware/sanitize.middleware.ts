import { Request, Response, NextFunction } from 'express';

// Strip dangerous XSS patterns from string values
function sanitizeString(value: string): string {
  return value
    .replace(/<script[\s\S]*?>([\s\S]*?)<\/script>/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '')
    .replace(/<[^>]*>/g, '')
    .trim();
}

function sanitizeObject(obj: any): any {
  if (typeof obj === 'string') return sanitizeString(obj);
  if (Array.isArray(obj)) return obj.map(sanitizeObject);
  if (obj && typeof obj === 'object') {
    const clean: any = {};
    for (const key of Object.keys(obj)) {
      clean[key] = sanitizeObject(obj[key]);
    }
    return clean;
  }
  return obj;
}

export const sanitizeBody = (req: Request, _res: Response, next: NextFunction): void => {
  if (req.body && typeof req.body === 'object') {
    req.body = sanitizeObject(req.body);
  }
  next();
};

// Block obvious SQL injection patterns in body strings
export const blockSqlInjection = (req: Request, res: Response, next: NextFunction): void => {
  const sqlPattern = /(\bUNION\b|\bSELECT\b|\bDROP\b|\bINSERT\b|\bDELETE\b|\bUPDATE\b|\bEXEC\b|--|\/\*)/i;
  const body = JSON.stringify(req.body || {});
  if (sqlPattern.test(body)) {
    res.status(400).json({ error: 'Invalid input detected.' });
    return;
  }
  next();
};

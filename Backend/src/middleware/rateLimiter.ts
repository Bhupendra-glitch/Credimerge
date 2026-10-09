import { Request, Response, NextFunction } from 'express';

interface RateLimitOptions {
  windowMs: number;
  maxRequests: number;
  message?: string;
}

export function createRateLimiter(options: RateLimitOptions) {
  const requests = new Map<string, { count: number; resetTime: number }>();

  return (req: Request, res: Response, next: NextFunction) => {
    const key = (req.ip || req.socket.remoteAddress || 'unknown') + ':' + req.baseUrl + req.path;
    const now = Date.now();
    const entry = requests.get(key);

    if (!entry || now > entry.resetTime) {
      requests.set(key, { count: 1, resetTime: now + options.windowMs });
      return next();
    }

    if (entry.count >= options.maxRequests) {
      const retryAfter = Math.ceil((entry.resetTime - now) / 1000);
      res.setHeader('Retry-After', retryAfter);
      return res.status(429).json({
        error: options.message || 'Too many requests. Please try again shortly.',
        retryAfter,
      });
    }

    entry.count += 1;
    next();
  };
}

export const standardRateLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  maxRequests: 180,
  message: 'API rate limit exceeded. Please wait a moment before trying again.',
});

export const strictRateLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  maxRequests: 30,
  message: 'Rate limit exceeded for this operation. Please try again after 60 seconds.',
});

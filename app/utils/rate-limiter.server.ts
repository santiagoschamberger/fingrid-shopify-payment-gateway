import { RateLimiterMemory } from 'rate-limiter-flexible';

const rateLimiters = {
  payment: new RateLimiterMemory({
    keyPrefix: 'fingrid_payment',
    points: 5, // Number of requests
    duration: 60, // Per 60 seconds
  }),
  
  api: new RateLimiterMemory({
    keyPrefix: 'fingrid_api',
    points: 100,
    duration: 60,
  }),
  
  webhook: new RateLimiterMemory({
    keyPrefix: 'fingrid_webhook',
    points: 1000,
    duration: 60,
  }),

  linkToken: new RateLimiterMemory({
    keyPrefix: 'fingrid_link_token',
    points: 10, // Max 10 link token requests per minute per IP
    duration: 60,
  }),

  tokenExchange: new RateLimiterMemory({
    keyPrefix: 'fingrid_token_exchange',
    points: 20, // Max 20 token exchanges per minute per IP
    duration: 60,
  })
};

export async function checkRateLimit(
  type: keyof typeof rateLimiters,
  identifier: string
): Promise<void> {
  try {
    await rateLimiters[type].consume(identifier);
  } catch (rejRes) {
    const secs = Math.round(rejRes.msBeforeNext / 1000) || 1;
    throw new Error(`Rate limit exceeded. Try again in ${secs} seconds`);
  }
}

export function getRateLimitInfo(
  type: keyof typeof rateLimiters,
  identifier: string
): Promise<{
  remainingPoints: number;
  msBeforeNext: number;
  totalHits: number;
}> {
  return rateLimiters[type].get(identifier);
}
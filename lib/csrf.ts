import { randomBytes } from 'crypto';
import { serialize, parse } from 'cookie';

// Token expiration time (1 hour in milliseconds)
const TOKEN_EXPIRATION = 60 * 60 * 1000;

// Token key name
const CSRF_TOKEN_KEY = 'csrf_token';

/**
 * Generate a new CSRF token
 * @returns {{ token: string, expires: number }} The token and its expiration time
 */
export function generateToken(): { token: string; expires: number } {
  const token = randomBytes(32).toString('hex');
  const expires = Date.now() + TOKEN_EXPIRATION;
  return { token, expires };
}

/**
 * Create a cookie string for the CSRF token
 * @param token The CSRF token
 * @param expires The expiration timestamp
 * @returns {string} The cookie string
 */
export function createCsrfCookie(token: string, expires: number): string {
  return serialize(CSRF_TOKEN_KEY, `${token}|${expires}`, {
    httpOnly: true,
    path: '/',
    maxAge: TOKEN_EXPIRATION / 1000, // Convert to seconds for cookie max-age
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
  });
}

/**
 * Parse a CSRF token from a cookie
 * @param cookies The cookies string or object
 * @returns {string|null} The CSRF token or null if not found
 */
export function parseCsrfCookie(cookies: string | { [key: string]: string }): string | null {
  if (!cookies) return null;
  
  let cookieValue: string | undefined;
  
  if (typeof cookies === 'string') {
    const parsedCookies = parse(cookies);
    cookieValue = parsedCookies[CSRF_TOKEN_KEY];
  } else {
    cookieValue = cookies[CSRF_TOKEN_KEY];
  }
  
  if (!cookieValue) return null;
  
  const [token, expiresStr] = cookieValue.split('|');
  const expires = parseInt(expiresStr, 10);
  
  if (isNaN(expires) || Date.now() > expires) {
    // Token has expired
    return null;
  }
  
  return token;
}

/**
 * Validate a CSRF token against the token from cookies
 * @param requestToken The token from the request
 * @param cookies The cookies containing the real token
 * @returns {boolean} Whether the token is valid
 */
export function validateToken(requestToken: string, cookies: string | { [key: string]: string }): boolean {
  const cookieToken = parseCsrfCookie(cookies);
  if (!cookieToken || !requestToken) return false;
  
  // Use constant-time comparison to prevent timing attacks
  return timingSafeEqual(cookieToken, requestToken);
}

/**
 * Perform a constant-time comparison of two strings
 * This helps prevent timing attacks
 * @param a First string
 * @param b Second string
 * @returns {boolean} Whether the strings are equal
 */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  
  return result === 0;
} 
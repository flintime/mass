import { cookies } from 'next/headers';
import { NextRequest } from 'next/server';
import jwt, { JwtPayload } from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || '';

if (!JWT_SECRET) {
  throw new Error('JWT_SECRET is not defined in environment variables');
}

export interface TokenPayload extends JwtPayload {
  userId: string;
  email: string;
  role: 'user' | 'business';
}

export function generateToken(payload: Omit<TokenPayload, 'iat' | 'exp'>): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

interface AuthResult {
  success: boolean;
  userId?: string;
  businessId?: string;
  email?: string;
  type?: 'user' | 'business';
  error?: string;
}

const verifyAuthToken = async (req: NextRequest): Promise<AuthResult> => {
  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return {
        success: false,
        error: 'No token provided'
      };
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET) as TokenPayload;

    return {
      success: true,
      userId: decoded.userId,
      businessId: decoded.businessId,
      email: decoded.email,
      type: decoded.role
    };
  } catch (error) {
    console.error('Token verification error:', error);
    return {
      success: false,
      error: 'Invalid token'
    };
  }
};

export default verifyAuthToken;

export function getToken(req?: NextRequest): string | null {
  // First try to get token from cookies
  const cookieStore = cookies();
  const token = cookieStore.get('token')?.value;
  
  if (token) {
    return token;
  }

  // If no token in cookies and request exists, try Authorization header
  if (req) {
    const authHeader = req.headers.get('authorization');
    if (authHeader?.startsWith('Bearer ')) {
      return authHeader.substring(7);
    }
  }

  return null;
}

export function setToken(token: string): void {
  const cookieStore = cookies();
  cookieStore.set('token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 // 7 days
  });
}

export function removeToken(): void {
  const cookieStore = cookies();
  cookieStore.delete('token');
}

export async function getUserFromToken(req?: NextRequest): Promise<TokenPayload | null> {
  const token = getToken(req);
  if (!token) {
    return null;
  }

  try {
    if (!req) {
      return null;
    }
    const authResult = await verifyAuthToken(req);
    if (!authResult.success) {
      return null;
    }
    return {
      userId: authResult.userId!,
      email: authResult.email!,
      role: authResult.type as 'user' | 'business'
    } as TokenPayload;
  } catch {
    return null;
  }
} 
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

export interface AuthResult {
  success: boolean;
  userId?: string;
  businessId?: string;
  email?: string;
  type?: 'user' | 'business';
  error?: string;
}

export default async function verifyAuthToken(req: NextRequest): Promise<AuthResult> {
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
} 
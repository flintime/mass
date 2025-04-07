import { NextRequest } from 'next/server';
import { verify } from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

export async function verifyBusinessAuth(req: NextRequest): Promise<string | null> {
  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return null;
    }

    const token = authHeader.split(' ')[1];
    const decoded = verify(token, JWT_SECRET) as { businessId: string };

    if (!decoded.businessId) {
      return null;
    }

    return decoded.businessId;
  } catch (error) {
    console.error('Auth verification error:', error);
    return null;
  }
} 
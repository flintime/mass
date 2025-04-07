import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Ensure JWT_SECRET is available
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is not set');
}

export interface AuthRequest extends Request {
  user?: {
    id: string;
    name?: string;
    email?: string;
  };
  business?: { id: string };
}

export const authenticateUser = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      console.error('No token provided in Authorization header');
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];
    console.log('Received token:', token.substring(0, 20) + '...');
    console.log('Using JWT_SECRET:', JWT_SECRET.substring(0, 10) + '...');

    try {
      const decoded = jwt.verify(token, JWT_SECRET) as {
        userId: string;
        name?: string;
        email?: string;
        type?: string;
      };
      
      console.log('Decoded token:', decoded);
      
      // Check if this is a user token
      if (decoded.type && decoded.type !== 'user') {
        console.error('Invalid token type:', decoded.type);
        return res.status(401).json({ error: 'Invalid token type' });
      }

      if (!decoded.userId) {
        console.error('No userId in decoded token');
        return res.status(401).json({ error: 'Invalid token - no userId' });
      }

      req.user = {
        id: decoded.userId,
        name: decoded.name,
        email: decoded.email
      };

      console.log('Authenticated user:', req.user);
      next();
    } catch (verifyError) {
      console.error('Token verification error:', verifyError);
      return res.status(401).json({ error: 'Invalid token signature' });
    }
  } catch (error) {
    console.error('Authentication error:', error);
    res.status(401).json({ error: 'Authentication failed' });
  }
};

export const authenticateBusiness = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { 
        businessId: string;
        type?: string;
      };
      
      // Check if this is a business token
      if (decoded.type && decoded.type !== 'business') {
        return res.status(401).json({ error: 'Invalid token type' });
      }

      if (!decoded.businessId) {
        return res.status(401).json({ error: 'Invalid token - no businessId' });
      }

      req.business = { id: decoded.businessId };
      next();
    } catch (verifyError) {
      console.error('Token verification error:', verifyError);
      return res.status(401).json({ error: 'Invalid token signature' });
    }
  } catch (error) {
    console.error('Authentication error:', error);
    res.status(401).json({ error: 'Authentication failed' });
  }
}; 
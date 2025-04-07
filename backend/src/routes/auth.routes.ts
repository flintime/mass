import express, { Request, Response } from 'express';
import { authenticateUser, AuthRequest } from '../middleware/auth.middleware';
import User from '../models/user.model';
import Booking from '../models/booking.model';
import jwt from 'jsonwebtoken';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = 'uploads/profile-pictures';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPEG, PNG and GIF are allowed.'));
    }
  }
});

// Login route
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = jwt.sign({ userId: user._id }, JWT_SECRET, { expiresIn: '30d' });

    // Return complete user data
    res.json({
      authToken: token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        created_at: user.created_at
      }
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Signup route
router.post('/signup', async (req: Request, res: Response) => {
  try {
    const { name, email, password, mobile } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    // Create new user
    const user = new User({ name, email, password, mobile });
    await user.save();

    const token = jwt.sign({ userId: user._id }, JWT_SECRET, { expiresIn: '30d' });

    res.status(201).json({
      authToken: token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        mobile: user.mobile,
        created_at: user.created_at
      }
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get current user route
router.get('/me', authenticateUser, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const user = await User.findById(req.user.id).select('-password');
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Return complete user data
    res.json({
      id: user._id,
      name: user.name,
      email: user.email,
      mobile: user.mobile,
      location: user.location,
      profilePicture: user.profilePicture,
      notificationPreferences: user.notificationPreferences,
      created_at: user.created_at
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Reset password request route
router.post('/reset-password', async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const token = jwt.sign({ email }, JWT_SECRET, { expiresIn: '1h' });
    const resetLink = `${process.env.NEXT_PUBLIC_APP_URL}/reset-password?token=${token}`;

    // TODO: Send email with reset link
    console.log('Reset link:', resetLink);

    res.json({ message: 'Password reset instructions sent to your email' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Reset password confirmation route
router.post('/reset-password-confirm', async (req: Request, res: Response) => {
  try {
    const { token, password } = req.body;

    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { email: string };
      const user = await User.findOne({ email: decoded.email });

      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      user.password = password;
      await user.save();

      res.json({ message: 'Password updated successfully' });
    } catch (error) {
      res.status(400).json({ error: 'Invalid or expired token' });
    }
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Update profile route
router.put('/profile', authenticateUser, async (req: AuthRequest, res: Response) => {
  try {
    const { name, location, mobile } = req.body;
    const userId = req.user?.id;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (name) user.name = name;
    if (location) user.location = location;
    if (mobile) user.mobile = mobile;

    await user.save();

    res.json({
      id: user._id,
      name: user.name,
      email: user.email,
      mobile: user.mobile,
      location: user.location,
      profilePicture: user.profilePicture,
      created_at: user.created_at
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Upload profile picture route
router.post('/profile/picture', authenticateUser, upload.single('picture'), async (req: AuthRequest, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const user = await User.findById(req.user?.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Delete old profile picture if it exists
    if (user.profilePicture) {
      const oldPath = path.join(__dirname, '../../', user.profilePicture);
      if (fs.existsSync(oldPath)) {
        fs.unlinkSync(oldPath);
      }
    }

    // Update user's profile picture path
    user.profilePicture = req.file.path;
    await user.save();

    res.json({
      profilePicture: user.profilePicture
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get user's bookings
router.get('/bookings', authenticateUser, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { status } = req.query;

    let query: any = { userId };
    if (status && ['completed', 'upcoming', 'cancelled'].includes(status as string)) {
      query.status = status;
    }

    const bookings = await Booking.find(query).sort({ date: -1 });

    // Format bookings for response
    const formattedBookings = bookings.map(booking => ({
      id: booking._id,
      serviceName: booking.serviceName,
      providerName: booking.providerName,
      date: booking.date.toLocaleDateString(),
      time: booking.time,
      status: booking.status,
      price: booking.price,
      address: booking.address
    }));

    res.json(formattedBookings);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get booking statistics
router.get('/bookings/stats', authenticateUser, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;

    const [totalBookings, upcomingBookings] = await Promise.all([
      Booking.countDocuments({ userId }),
      Booking.countDocuments({ userId, status: 'upcoming' })
    ]);

    res.json({
      totalBookings,
      upcomingBookings
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Change password route
router.post('/change-password', authenticateUser, async (req: AuthRequest, res: Response) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user?.id;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Verify current password
    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }

    // Update password
    user.password = newPassword;
    await user.save();

    res.json({ message: 'Password updated successfully' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Update notification settings route
router.put('/notifications', authenticateUser, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { emailNotifications, smsNotifications, marketingEmails } = req.body;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    user.notificationPreferences = {
      emailNotifications: emailNotifications ?? user.notificationPreferences.emailNotifications,
      smsNotifications: smsNotifications ?? user.notificationPreferences.smsNotifications,
      marketingEmails: marketingEmails ?? user.notificationPreferences.marketingEmails
    };

    await user.save();

    res.json({
      notificationPreferences: user.notificationPreferences
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router; 
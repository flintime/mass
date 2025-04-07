import express, { Request, Response } from 'express';
import { authenticateBusiness, AuthRequest } from '../middleware/auth.middleware';
import Business from '../models/business.model';
import Booking from '../models/booking.model';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { sendResetPasswordEmail } from '../utils/email';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Signin route
router.post('/signin', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    console.log('Signin attempt for email:', email);
    
    const business = await Business.findOne({ email });
    console.log('Business found:', business ? 'Yes' : 'No');

    if (!business) {
      console.log('Business not found for email:', email);
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const isMatch = await business.comparePassword(password);
    console.log('Password match:', isMatch ? 'Yes' : 'No');
    
    if (!isMatch) {
      console.log('Password does not match');
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = jwt.sign({ businessId: business._id }, JWT_SECRET, { expiresIn: '7d' });
    console.log('Token generated successfully');

    res.json({ token });
  } catch (error: any) {
    console.error('Signin error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Signup route
router.post('/signup', async (req: Request, res: Response) => {
  try {
    const businessData = req.body;
    console.log('Signup attempt for email:', businessData.email);
    console.log('Password length:', businessData.password.length);

    // Check if business already exists
    const existingBusiness = await Business.findOne({ email: businessData.email });
    if (existingBusiness) {
      console.log('Business already exists with email:', businessData.email);
      return res.status(400).json({ error: 'Email already registered' });
    }

    // Create new business
    const business = new Business(businessData);
    await business.save();
    console.log('New business created successfully');

    const token = jwt.sign({ businessId: business._id }, JWT_SECRET, { expiresIn: '7d' });
    console.log('Token generated for new business');

    res.status(201).json({ token });
  } catch (error: any) {
    console.error('Signup error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get current business profile route
router.get('/me', authenticateBusiness, async (req: AuthRequest, res: Response) => {
  try {
    const business = await Business.findById(req.business?.id).select('-password');
    if (!business) {
      return res.status(404).json({ error: 'Business not found' });
    }
    res.json(business);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Update business profile route
router.put('/me', authenticateBusiness, async (req: AuthRequest, res: Response) => {
  try {
    const updates = req.body;
    delete updates.password; // Don't allow password updates through this route

    const business = await Business.findByIdAndUpdate(
      req.business?.id,
      { $set: updates },
      { new: true, runValidators: true }
    ).select('-password');

    if (!business) {
      return res.status(404).json({ error: 'Business not found' });
    }

    res.json(business);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get business appointments
router.get('/appointments', authenticateBusiness, async (req: AuthRequest, res: Response) => {
  try {
    const businessId = req.business?.id;
    const { status, date } = req.query;

    let query: any = { businessId };
    
    // Filter by status if provided
    if (status && ['pending', 'confirmed', 'completed', 'cancelled'].includes(status as string)) {
      query.status = status;
    }

    // Filter by date if provided
    if (date) {
      const startDate = new Date(date as string);
      startDate.setHours(0, 0, 0, 0);
      const endDate = new Date(startDate);
      endDate.setHours(23, 59, 59, 999);
      query.date = { $gte: startDate, $lte: endDate };
    }

    const appointments = await Booking.find(query)
      .sort({ date: -1, time: -1 });

    // Format appointments for response
    const formattedAppointments = appointments.map(appointment => ({
      id: appointment._id,
      customerName: appointment.customerName,
      customerEmail: appointment.customerEmail,
      customerPhone: appointment.customerPhone,
      serviceName: appointment.serviceName,
      date: appointment.date,
      time: appointment.time,
      status: appointment.status,
      price: appointment.price,
      address: appointment.address,
      created_at: appointment.created_at
    }));

    res.json(formattedAppointments);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get appointment statistics
router.get('/appointments/stats', authenticateBusiness, async (req: AuthRequest, res: Response) => {
  try {
    const businessId = req.business?.id;

    const [
      totalAppointments,
      pendingAppointments,
      confirmedAppointments,
      completedAppointments,
      cancelledAppointments,
      todayAppointments
    ] = await Promise.all([
      Booking.countDocuments({ businessId }),
      Booking.countDocuments({ businessId, status: 'pending' }),
      Booking.countDocuments({ businessId, status: 'confirmed' }),
      Booking.countDocuments({ businessId, status: 'completed' }),
      Booking.countDocuments({ businessId, status: 'cancelled' }),
      Booking.countDocuments({
        businessId,
        date: {
          $gte: new Date(new Date().setHours(0, 0, 0, 0)),
          $lte: new Date(new Date().setHours(23, 59, 59, 999))
        }
      })
    ]);

    // Calculate total revenue
    const completedBookings = await Booking.find({ 
      businessId, 
      status: 'completed'
    });
    const totalRevenue = completedBookings.reduce((sum, booking) => sum + booking.price, 0);

    res.json({
      totalAppointments,
      pendingAppointments,
      confirmedAppointments,
      completedAppointments,
      cancelledAppointments,
      todayAppointments,
      totalRevenue
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Update appointment status
router.put('/appointments/:id/status', authenticateBusiness, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const businessId = req.business?.id;

    if (!['pending', 'confirmed', 'completed', 'cancelled'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const appointment = await Booking.findOne({ _id: id, businessId });
    if (!appointment) {
      return res.status(404).json({ error: 'Appointment not found' });
    }

    appointment.status = status;
    await appointment.save();

    res.json({ message: 'Appointment status updated successfully', status });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Create appointment
router.post('/appointments', authenticateBusiness, async (req: AuthRequest, res: Response) => {
  try {
    const businessId = req.business?.id;
    const {
      customerName,
      customerEmail,
      customerPhone,
      serviceName,
      date,
      time,
      price,
      address
    } = req.body;

    // Create new booking
    const booking = new Booking({
      businessId,
      customerName,
      customerEmail,
      customerPhone,
      serviceName,
      date,
      time,
      status: 'pending',
      price,
      address,
      created_at: new Date()
    });

    await booking.save();

    // Format response
    const appointment = {
      id: booking._id,
      customerName: booking.customerName,
      customerEmail: booking.customerEmail,
      customerPhone: booking.customerPhone,
      serviceName: booking.serviceName,
      date: booking.date,
      time: booking.time,
      status: booking.status,
      price: booking.price,
      address: booking.address,
      created_at: booking.created_at
    };

    res.status(201).json(appointment);
  } catch (error: any) {
    console.error('Failed to create appointment:', error);
    res.status(500).json({ error: error.message });
  }
});

// Forgot password route
router.post('/forgot-password', async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    console.log('Forgot password request for email:', email);

    const business = await Business.findOne({ email: email.toLowerCase() });
    if (!business) {
      console.log('Business not found for email:', email);
      // Return success even if email doesn't exist for security
      return res.json({ message: 'If an account exists, you will receive a password reset email.' });
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const hash = crypto.createHash('sha256').update(resetToken).digest('hex');

    // Save reset token and expiry
    business.resetPasswordToken = hash;
    business.resetPasswordExpires = new Date(Date.now() + 3600000); // 1 hour
    await business.save();

    console.log('Reset token generated for business:', business._id);

    // Send reset email
    await sendResetPasswordEmail(email, resetToken);
    console.log('Reset password email sent to:', email);

    res.json({ message: 'If an account exists, you will receive a password reset email.' });
  } catch (error: any) {
    console.error('Forgot password error:', error);
    res.status(500).json({ error: 'Failed to process forgot password request' });
  }
});

// Reset password route
router.post('/reset-password', async (req: Request, res: Response) => {
  try {
    const { token, newPassword } = req.body;
    console.log('Reset password request received');

    const hash = crypto.createHash('sha256').update(token).digest('hex');

    const business = await Business.findOne({
      resetPasswordToken: hash,
      resetPasswordExpires: { $gt: Date.now() }
    });

    if (!business) {
      console.log('Invalid or expired reset token');
      return res.status(400).json({ error: 'Invalid or expired reset token' });
    }

    // Update password
    business.password = newPassword;
    business.resetPasswordToken = undefined;
    business.resetPasswordExpires = undefined;
    await business.save();

    console.log('Password reset successful for business:', business._id);

    res.json({ message: 'Password has been reset successfully' });
  } catch (error: any) {
    console.error('Reset password error:', error);
    res.status(500).json({ error: 'Failed to reset password' });
  }
});

export default router; 
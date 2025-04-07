import express from 'express';
import { authenticateBusiness } from '../middleware/auth.middleware';
import Business, { IBusiness, IPreferences } from '../models/business.model';
import bcrypt from 'bcryptjs';

const router = express.Router();

// GET /api/business/settings - Get business settings
router.get('/', authenticateBusiness, async (req: any, res) => {
  try {
    const business = await Business.findById(req.business.id) as IBusiness;
    if (!business) {
      return res.status(404).json({ message: 'Business not found' });
    }

    // Return preferences with defaults if not set
    const preferences = business.preferences || {
      emailNotifications: true,
      appointmentReminders: true,
      marketingEmails: false,
      autoConfirm: false,
      displayInSearch: true
    };

    res.json({ preferences });
  } catch (error) {
    console.error('Error fetching settings:', error);
    res.status(500).json({ message: 'Error fetching settings' });
  }
});

// PUT /api/business/settings - Update business settings
router.put('/', authenticateBusiness, async (req: any, res) => {
  try {
    console.log('Updating settings with body:', req.body);
    
    const business = await Business.findById(req.business.id) as IBusiness;
    if (!business) {
      return res.status(404).json({ message: 'Business not found' });
    }

    const { preferences, currentPassword, newPassword } = req.body;

    // If updating password
    if (currentPassword && newPassword) {
      const isValidPassword = await business.comparePassword(currentPassword);
      if (!isValidPassword) {
        return res.status(400).json({ message: 'Current password is incorrect' });
      }
      business.password = newPassword;
    }

    // If updating preferences
    if (preferences) {
      console.log('Current preferences:', business.preferences);
      console.log('New preferences:', preferences);
      
      // Initialize preferences if they don't exist
      if (!business.preferences) {
        business.preferences = {
          emailNotifications: true,
          appointmentReminders: true,
          marketingEmails: false,
          autoConfirm: false,
          displayInSearch: true
        };
      }

      // Type-safe way to update preferences
      const typedPreferences = preferences as Partial<IPreferences>;
      Object.keys(typedPreferences).forEach(key => {
        const prefKey = key as keyof IPreferences;
        if (business.preferences && typeof typedPreferences[prefKey] === 'boolean') {
          business.preferences[prefKey] = typedPreferences[prefKey] as boolean;
        }
      });
      
      console.log('Updated preferences:', business.preferences);
    }

    await business.save();
    res.json({ message: 'Settings updated successfully', preferences: business.preferences });
  } catch (error) {
    console.error('Error updating settings:', error);
    res.status(500).json({ message: 'Error updating settings' });
  }
});

// DELETE /api/business/settings - Delete business account
router.delete('/', authenticateBusiness, async (req: any, res) => {
  try {
    const business = await Business.findById(req.business.id);
    if (!business) {
      return res.status(404).json({ message: 'Business not found' });
    }

    await Business.findByIdAndDelete(req.business.id);
    res.json({ message: 'Account deleted successfully' });
  } catch (error) {
    console.error('Error deleting account:', error);
    res.status(500).json({ message: 'Error deleting account' });
  }
});

export default router; 
import mongoose, { Model } from 'mongoose';
import bcrypt from 'bcryptjs';

interface ValidationProps {
  value: any;
  path: string;
}

export interface INotificationPreferences {
  emailNotifications: boolean;
  smsNotifications: boolean;
  marketingEmails: boolean;
}

export interface IAIPreferences {
  aiEnabled: boolean;
}

export interface IUser extends mongoose.Document {
  name: string;
  email: string;
  phoneNumber: string;
  password: string;
  mobile?: string;
  address?: string;
  location?: string;
  aiEnabled: boolean;
  notificationPreferences?: {
    emailNotifications?: boolean;
    smsNotifications?: boolean;
    marketingEmails?: boolean;
  };
  role?: string;
  created_at: Date;
  resetPasswordToken?: string;
  resetPasswordExpires?: Date;
  __v?: number;
}

export interface IUserModel extends Model<IUser> {
  getUserPreferences(userId: string | number): Promise<{ notificationPreferences: INotificationPreferences; aiEnabled: boolean } | null>;
  updateAIPreference(userId: string | number, aiEnabled: boolean): Promise<IUser | null>;
  updateProfileFromBooking(userId: string | number, name: string | null, phoneNumber: string | null): Promise<IUser | null>;
}

const userSchema = new mongoose.Schema<IUser>({
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  phoneNumber: {
    type: String,
    trim: true,
    validate: {
      validator: function(v: string) {
        // Validate phone number format (10 digits, optionally with country code)
        return /^\+?1?\d{10}$/.test(v.replace(/\D/g, ''));
      },
      message: (props: ValidationProps) => `${props.value} is not a valid phone number! Please use a 10-digit number.`
    }
  },
  password: {
    type: String,
    required: true
  },
  mobile: {
    type: String
  },
  address: {
    type: String
  },
  location: {
    type: String
  },
  aiEnabled: { type: Boolean, default: true },
  notificationPreferences: {
    type: {
      emailNotifications: { type: Boolean, default: true },
      smsNotifications: { type: Boolean, default: true },
      marketingEmails: { type: Boolean, default: false }
    },
    default: {
      emailNotifications: true,
      smsNotifications: true,
      marketingEmails: false
    }
  },
  role: {
    type: String,
    enum: ['USER', 'ADMIN'],
    default: 'USER'
  },
  created_at: {
    type: Date,
    default: Date.now
  },
  resetPasswordToken: String,
  resetPasswordExpires: Date,
  __v: Number
});

// Update timestamps before saving
userSchema.pre('save', async function(next) {
  if (this.isModified('password')) {
    this.password = await bcrypt.hash(this.password, 10);
  }
  next();
});

// Method to format phone number
userSchema.methods.formatPhoneNumber = function() {
  const cleaned = (this.phoneNumber || this.mobile || '').replace(/\D/g, '');
  return cleaned.replace(/(\d{3})(\d{3})(\d{4})/, '($1) $2-$3');
};

// Static method to update user profile
userSchema.statics.updateProfileFromBooking = async function(
  userId: string | number,
  name: string | null,
  phoneNumber: string | null
): Promise<IUser | null> {
  const updates: { name?: string; phoneNumber?: string } = {};
  
  if (name) updates.name = name;
  if (phoneNumber) {
    const cleanedPhone = phoneNumber.replace(/\D/g, '');
    if (/^\d{10}$/.test(cleanedPhone)) {
      updates.phoneNumber = cleanedPhone;
    }
  }
  
  if (Object.keys(updates).length > 0) {
    return await this.findByIdAndUpdate(
      userId,
      { $set: updates },
      { new: true, runValidators: true }
    );
  }
  return null;
};

// Static method to get user preferences
userSchema.statics.getUserPreferences = async function(userId: string | number): Promise<{ notificationPreferences: INotificationPreferences; aiEnabled: boolean } | null> {
  try {
    console.log('Getting preferences for user:', userId);
    const user = await this.findById(userId.toString());
    console.log('Found user:', user);
    
    if (!user) {
      console.log('User not found');
      return null;
    }

    return {
      notificationPreferences: user.notificationPreferences || {
        emailNotifications: true,
        smsNotifications: true,
        marketingEmails: false
      },
      aiEnabled: user.aiEnabled ?? true
    };
  } catch (error) {
    console.error('Error getting user preferences:', error);
    return null;
  }
};

// Static method to update AI preference
userSchema.statics.updateAIPreference = async function(userId: string | number, aiEnabled: boolean): Promise<IUser | null> {
  try {
    console.log('Updating AI preference for user:', { userId, aiEnabled });
    
    // Use updateOne with $set operator
    const result = await this.findOneAndUpdate(
      { _id: userId.toString() },
      { $set: { aiEnabled } },
      { new: true, runValidators: true }
    );
    
    console.log('Update result:', result);
    return result;
  } catch (error) {
    console.error('Error updating AI preference:', error);
    return null;
  }
};

// Create or get the model
const User = (mongoose.models.User as IUserModel) || mongoose.model<IUser, IUserModel>('User', userSchema);

export default User; 
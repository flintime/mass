import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

export interface IUser extends mongoose.Document {
  name: string;
  email: string;
  password: string;
  mobile?: string;
  location?: string;
  profilePicture?: string;
  notificationPreferences: {
    emailNotifications: boolean;
    smsNotifications: boolean;
    marketingEmails: boolean;
  };
  consentRecords: {
    termsAndConditions: { accepted: boolean; timestamp: Date; };
    aiAcknowledgment: { accepted: boolean; timestamp: Date; };
  };
  created_at: Date;
  comparePassword(candidatePassword: string): Promise<boolean>;
}

const userSchema = new mongoose.Schema({
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
  password: {
    type: String,
    required: true
  },
  mobile: {
    type: String,
    trim: true,
    validate: {
      validator: function(v: string) {
        return /^\+?[1-9]\d{9,14}$/.test(v);
      },
      message: props => `${props.value} is not a valid mobile number!`
    }
  },
  location: {
    type: String,
    trim: true
  },
  profilePicture: {
    type: String,
    trim: true
  },
  notificationPreferences: {
    type: {
      emailNotifications: {
        type: Boolean,
        default: true
      },
      smsNotifications: {
        type: Boolean,
        default: true
      },
      marketingEmails: {
        type: Boolean,
        default: false
      }
    },
    default: {
      emailNotifications: true,
      smsNotifications: true,
      marketingEmails: false
    }
  },
  consentRecords: {
    type: {
      termsAndConditions: {
        accepted: {
          type: Boolean,
          required: true
        },
        timestamp: {
          type: Date,
          default: Date.now
        }
      },
      aiAcknowledgment: {
        accepted: {
          type: Boolean,
          required: true
        },
        timestamp: {
          type: Date,
          default: Date.now
        }
      }
    },
    default: {
      termsAndConditions: {
        accepted: false,
        timestamp: null
      },
      aiAcknowledgment: {
        accepted: false,
        timestamp: null
      }
    }
  },
  created_at: {
    type: Date,
    default: Date.now
  }
});

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();

  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error: any) {
    next(error);
  }
});

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword: string): Promise<boolean> {
  try {
    return await bcrypt.compare(candidatePassword, this.password);
  } catch (error) {
    throw error;
  }
};

export const User = mongoose.model<IUser>('User', userSchema);
export default User; 
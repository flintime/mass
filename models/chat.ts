import mongoose from 'mongoose';
import { ChatStatus, SenderType } from '@/lib/types';

const messageSchema = new mongoose.Schema({
  content: {
    type: String,
    required: true,
    trim: true
  },
  senderId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'User'
  },
  senderType: {
    type: String,
    enum: Object.values(SenderType),
    required: true
  },
  chatRoomId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    index: true
  },
  read: {
    type: Boolean,
    default: false
  },
  isAI: {
    type: Boolean,
    default: false
  },
  image: {
    url: { type: String, required: true },
    type: { type: String, required: true },
    size: { type: Number, required: true }
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  _id: true,
  strict: true,
  timestamps: true,
  toJSON: { 
    transform: function(doc, ret) {
      // Safely transform IDs
      if (ret._id) ret._id = ret._id.toString();
      if (ret.senderId) ret.senderId = ret.senderId.toString();
      if (ret.chatRoomId) ret.chatRoomId = ret.chatRoomId.toString();

      // Safely transform image
      if (ret.image && typeof ret.image === 'object') {
        ret.image = {
          url: ret.image.url || '',
          type: ret.image.type || '',
          size: ret.image.size || 0
        };
      } else {
        ret.image = null;
      }

      // Ensure dates are in ISO format
      if (ret.createdAt) ret.createdAt = ret.createdAt.toISOString();
      if (ret.updatedAt) ret.updatedAt = ret.updatedAt.toISOString();

      return ret;
    }
  }
});

// Define a suggestedTimeSchema
const suggestedTimeSchema = new mongoose.Schema({
  date: { 
    type: String, 
    required: true 
  },
  time: { 
    type: String, 
    required: true 
  },
  suggestedAt: { 
    type: Date, 
    default: Date.now,
    get: function(date) {
      // Ensure suggestedAt is returned as an ISO string for consistency
      if (date instanceof Date) {
        return date.toISOString();
      }
      return new Date().toISOString();
    }
  }
}, { 
  _id: false,
  toJSON: { getters: true } // This ensures the getter is applied when converting to JSON
});

// Pre-save hook
suggestedTimeSchema.pre('save', function(next) {
  console.log('Pre-save hook for suggestedTime executing, data:', this);
  // Ensure suggestedAt is a valid Date object
  if (this.suggestedAt && typeof this.suggestedAt === 'string') {
    this.suggestedAt = new Date(this.suggestedAt);
  }
  next();
});

const appointmentSchema = new mongoose.Schema({
  appointment_id: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    auto: false
  },
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'User'
  },
  business_id: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'Business'
  },
  date: {
    type: String,
    required: false
  },
  preferred_date: {
    type: String,
    required: true
  },
  time: {
    type: String,
    required: false
  },
  preferred_time: {
    type: String,
    required: true
  },
  service: {
    type: String,
    required: true
  },
  customerName: {
    type: String,
    required: true
  },
  customerEmail: {
    type: String,
    required: true
  },
  customerPhone: {
    type: String,
    required: true
  },
  notes: {
    type: String,
    required: false,
    default: ''
  },
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'canceled', 'reschedule_requested', 'completed'],
    default: 'pending'
  },
  suggestedTime: {
    type: {
      date: {
        type: String,
        required: true
      },
      time: {
        type: String,
        required: true
      },
      suggestedAt: {
        type: Date,
        default: Date.now
      }
    },
    required: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  _id: true,
  timestamps: true,
  toJSON: {
    transform: function(doc, ret) {
      // Safely transform IDs
      if (ret.appointment_id) ret.appointment_id = ret.appointment_id.toString();
      if (ret.user_id) ret.user_id = ret.user_id.toString();
      if (ret.business_id) ret.business_id = ret.business_id.toString();
      if (ret._id) ret._id = ret._id.toString();
      
      // Transform dates
      if (ret.preferred_date) ret.preferred_date = ret.preferred_date.toISOString();
      if (ret.createdAt) ret.createdAt = ret.createdAt.toISOString();
      if (ret.updatedAt) ret.updatedAt = ret.updatedAt.toISOString();
      
      // Ensure suggestedTime is properly formatted
      if (ret.suggestedTime) {
        if (ret.suggestedTime.suggestedAt) {
          ret.suggestedTime.suggestedAt = ret.suggestedTime.suggestedAt.toISOString();
        }
      }
      
      return ret;
    }
  }
});

const chatRoomSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    index: true,
    ref: 'User'
  },
  businessId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    index: true,
    ref: 'Business'
  },
  status: {
    type: String,
    enum: Object.values(ChatStatus),
    default: ChatStatus.ACTIVE,
    required: true
  },
  messages: [messageSchema],
  appointments: [appointmentSchema],
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  toJSON: { 
    transform: function(doc, ret) {
      // Safely transform the main document IDs
      if (ret._id) ret._id = ret._id.toString();
      if (ret.userId) ret.userId = ret.userId.toString();
      if (ret.businessId) ret.businessId = ret.businessId.toString();

      // Ensure messages array exists
      ret.messages = ret.messages || [];
      
      // Ensure appointments array exists
      ret.appointments = ret.appointments || [];

      return ret;
    }
  }
});

// Add indexes for better query performance
chatRoomSchema.index({ userId: 1, businessId: 1, status: 1 });

// Update timestamps on save
chatRoomSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  if (this.messages && this.messages.length > 0) {
    this.messages = this.messages.map(msg => {
      if (!msg._id) {
        msg._id = new mongoose.Types.ObjectId();
      }
      if (!msg.createdAt) {
        msg.createdAt = new Date();
      }
      msg.updatedAt = new Date();
      return msg;
    });
  }
  if (this.appointments && this.appointments.length > 0) {
    this.appointments = this.appointments.map(apt => {
      apt.updatedAt = new Date();
      return apt;
    });
  }
  next();
});

// Add methods to handle message operations
chatRoomSchema.methods.addMessage = function(messageData) {
  const message = {
    _id: new mongoose.Types.ObjectId(),
    ...messageData,
    createdAt: new Date(),
    updatedAt: new Date()
  };
  this.messages.push(message);
  this.updatedAt = new Date();
  return message;
};

// Create models if they don't exist
export const ChatRoom = mongoose.models.ChatRoom || mongoose.model('ChatRoom', chatRoomSchema); 
import mongoose, { Schema, Document, Types } from 'mongoose';

export enum SenderType {
  USER = 'USER',
  BUSINESS = 'BUSINESS'
}

export interface IMessageImage {
  url: string;
  type: string;
  size: number;
}

export interface IMessage {
  _id: Types.ObjectId;
  content: string;
  senderId: string;
  senderType: SenderType;
  chatRoomId: string;
  read: boolean;
  createdAt: Date;
  updatedAt: Date;
  isAI?: boolean;
  image?: IMessageImage | null;
}

export interface IAppointment {
  appointment_id: Types.ObjectId;
  user_id: Types.ObjectId;
  business_id: Types.ObjectId;
  date?: string;
  preferred_date: string;
  time?: string;
  preferred_time: string;
  service: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  notes?: string;
  status: 'pending' | 'confirmed' | 'canceled' | 'reschedule_requested' | 'completed';
  suggestedTime?: {
    date: string;
    time: string;
    suggestedAt: Date;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface IChatRoom extends Document {
  businessId: Types.ObjectId;
  userId: string;
  messages: IMessage[];
  appointments: IAppointment[];
  lastActivity: Date;
  createdAt: Date;
  updatedAt: Date;
}

const messageSchema = new Schema<IMessage>({
  _id: {
    type: Schema.Types.ObjectId,
    required: true,
    auto: true
  },
  content: {
    type: String,
    required: true,
    trim: true
  },
  senderId: {
    type: String,
    required: true
  },
  senderType: {
    type: String,
    enum: Object.values(SenderType),
    required: true
  },
  chatRoomId: {
    type: String,
    required: true
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
    type: new Schema({
      url: { type: String },
      type: { type: String },
      size: { type: Number }
    }, { _id: false }),
    required: false,
    default: undefined
  }
}, {
  timestamps: true,
  strict: true
});

const chatRoomSchema = new Schema<IChatRoom>({
  businessId: {
    type: Schema.Types.ObjectId,
    ref: 'Business',
    required: true
  },
  userId: {
    type: String,
    required: true
  },
  messages: [messageSchema],
  appointments: [
    new Schema<IAppointment>({
      appointment_id: {
        type: Schema.Types.ObjectId,
        ref: 'Appointment',
        required: true
      },
      user_id: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
      },
      business_id: {
        type: Schema.Types.ObjectId,
        ref: 'Business',
        required: true
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
        required: true
      },
      suggestedTime: {
        type: new Schema({
          date: { type: String },
          time: { type: String },
          suggestedAt: { type: Date }
        }, { _id: false }),
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
    })
  ],
  lastActivity: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true,
  strict: true
});

// Create indexes for better query performance
chatRoomSchema.index({ businessId: 1, userId: 1 }, { unique: true });
chatRoomSchema.index({ lastActivity: -1 });
messageSchema.index({ chatRoomId: 1, createdAt: -1 });

// Add middleware to handle message updates
chatRoomSchema.pre('save', function(next) {
  if (this.isModified('messages')) {
    const now = new Date();
    this.lastActivity = now;
    this.messages.forEach(msg => {
      if (!msg.createdAt) {
        msg.createdAt = now;
      }
      msg.updatedAt = now;
    });
  }
  next();
});

// Add methods to handle message operations
chatRoomSchema.methods.addMessage = function(messageData: Partial<IMessage>) {
  const message = {
    _id: new Types.ObjectId(),
    ...messageData,
    createdAt: new Date(),
    updatedAt: new Date()
  };
  this.messages.push(message);
  return message;
};

// Export the model
export const ChatRoom = mongoose.models.ChatRoom || mongoose.model<IChatRoom>('ChatRoom', chatRoomSchema); 
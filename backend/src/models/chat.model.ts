import mongoose, { Schema, Document } from 'mongoose';
import { SenderType } from '../types';

export interface IMessage {
  _id: mongoose.Types.ObjectId;
  content: string;
  senderId: string;
  senderType: SenderType;
  chatRoomId: string;
  read: boolean;
  readBy?: string[];  // Array of user/business IDs who've read the message
  readTimestamp?: Date; // When the message was first read
  createdAt: Date;
  updatedAt: Date;
  isAI?: boolean;
  image?: {
    url: string;
    type: string;
    size: number;
  };
}

export interface IChatRoom extends Document {
  businessId: mongoose.Types.ObjectId;
  userId: string;
  messages: IMessage[];
  lastActivity: Date;
  createdAt: Date;
  updatedAt: Date;
}

const messageSchema = new Schema<IMessage>({
  content: {
    type: String,
    required: function(this: IMessage) {
      // Content is required only if there's no image
      return !this.image?.url;
    },
    trim: true
  },
  senderId: {
    type: Schema.Types.Mixed,
    required: true
  },
  senderType: {
    type: String,
    enum: Object.values(SenderType),
    required: true
  },
  chatRoomId: {
    type: Schema.Types.Mixed,
    required: true
  },
  read: {
    type: Boolean,
    default: false
  },
  readBy: {
    type: [String],
    default: []
  },
  readTimestamp: {
    type: Date,
    default: null
  },
  isAI: {
    type: Boolean,
    default: false
  },
  image: {
    url: { type: String },
    type: { type: String },
    size: { type: Number }
  }
}, {
  timestamps: true,
  _id: true
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
  lastActivity: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Indexes for better query performance
chatRoomSchema.index({ businessId: 1, userId: 1 }, { unique: true });
chatRoomSchema.index({ lastActivity: -1 });

export default mongoose.model<IChatRoom>('ChatRoom', chatRoomSchema); 
export interface IMessage {
  _id: mongoose.Types.ObjectId;
  content: string;
  senderId: mongoose.Types.ObjectId | string;
  senderType: SenderType;
  chatRoomId: mongoose.Types.ObjectId | string;
  read: boolean;
  readBy?: string[];  // Array of user/business IDs who've read the message
  readTimestamp?: Date; // When the message was first read
  status?: {
    sent: boolean;
    delivered: boolean;
  };
  createdAt: Date;
  updatedAt: Date;
  image?: {
    url: string;
    type: string;
    size: number;
  };
} 
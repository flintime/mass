export enum ChatStatus {
  ACTIVE = 'ACTIVE',
  ARCHIVED = 'ARCHIVED',
  CLOSED = 'CLOSED'
}

export enum SenderType {
  USER = 'USER',
  BUSINESS = 'BUSINESS'
}

export interface ChatMessage {
  _id: string;
  content: string;
  senderId: string;
  senderType: SenderType;
  chatRoomId: string;
  read: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ChatRoom {
  _id: string;
  businessId: string;
  userId: string;
  user: {
    name: string;
    email: string;
  };
  messages: ChatMessage[];
  createdAt: string;
  updatedAt: string;
}

export interface ChatList {
  [key: string]: {
    messages: ChatMessage[];
    user: {
      name: string;
      email: string;
    };
  };
} 
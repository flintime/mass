export enum ChatStatus {
  ACTIVE = 'ACTIVE',
  ARCHIVED = 'ARCHIVED',
  CLOSED = 'CLOSED'
}

export enum SenderType {
  USER = 'USER',
  BUSINESS = 'BUSINESS'
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

export interface ChatMessage {
  _id: string;
  content: string;
  senderId: string;
  senderType: SenderType;
  chatRoomId: string;
  read: boolean;
  createdAt: string;
  updatedAt: string;
  isAI?: boolean;
  image?: {
    url: string;
    type: string;
    size: number;
  };
}

export interface User {
  _id: string;
  name: string;
  email: string;
  created_at: number;
}

export interface Business {
  _id: string;
  name: string;
  email: string;
  created_at: number;
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
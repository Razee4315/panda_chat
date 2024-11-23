export interface User {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string | null;
  status?: 'online' | 'offline';
  lastSeen?: number;
  friends?: Record<string, boolean>;
}

export interface FriendRequest {
  id: string;
  from: string;
  to: string;
  status: 'pending' | 'accepted' | 'rejected';
  timestamp: number;
  otherUser?: User;
}

export interface ChatRoom {
  id: string;
  type: 'private' | 'group';
  name?: string;
  lastMessage?: string;
  lastMessageTime?: number;
  participants: string[];
  createdAt: number;
  updatedAt: number;
}

export interface Message {
  id: string;
  roomId: string;
  senderId: string;
  content: string;
  timestamp: number;
  type: 'text' | 'image' | 'file';
  status: 'sent' | 'delivered' | 'read';
}

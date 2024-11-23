export interface User {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  status: 'online' | 'offline';
  lastSeen: number;
  friends: string[];
  pendingFriends: string[];
}

export interface Message {
  id?: string;
  text: string;
  uid: string;
  timestamp: number;
  senderName?: string;
  type: 'text' | 'emoji';
}

export interface ChatRoom {
  id: string;
  type: 'direct' | 'group';
  participants: string[];
  name?: string;
  lastMessage?: Message;
  createdAt: number;
  groupAdmin?: string;
}
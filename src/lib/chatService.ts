import { db } from './firebase';
import { ref, push, set, get, query, orderByChild, onValue, update } from 'firebase/database';
import { Message, ChatRoom } from '@/types';

export const chatService = {
  async createChatRoom(type: 'private' | 'group', participants: string[], name?: string, groupAdmin?: string): Promise<string> {
    try {
      // Check if private chat already exists between these participants
      if (type === 'private' && participants.length === 2) {
        const existingRoom = await this.findExistingPrivateRoom(participants[0], participants[1]);
        if (existingRoom) {
          return existingRoom.id;
        }
      }

      const roomRef = push(ref(db, 'chatRooms'));
      const participantsObj = participants.reduce((acc, uid) => ({ ...acc, [uid]: true }), {});
      
      const room = {
        type,
        participants: participantsObj,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        name,
        groupAdmin: type === 'group' ? groupAdmin : null,
        lastMessage: null
      };
      
      await set(roomRef, room);
      return roomRef.key as string;
    } catch (error) {
      console.error('Error creating chat room:', error);
      throw error;
    }
  },

  async findExistingPrivateRoom(user1Id: string, user2Id: string): Promise<ChatRoom | null> {
    const roomsRef = ref(db, 'chatRooms');
    const snapshot = await get(roomsRef);
    let existingRoom: ChatRoom | null = null;

    snapshot.forEach((child) => {
      const room = child.val();
      if (
        room.type === 'private' &&
        room.participants[user1Id] &&
        room.participants[user2Id]
      ) {
        existingRoom = {
          ...room,
          id: child.key,
          participants: Object.keys(room.participants).filter(id => room.participants[id])
        };
        return true; // Break the forEach loop
      }
    });

    return existingRoom;
  },

  async sendMessage(roomId: string, message: Omit<Message, 'id'>) {
    const messageRef = push(ref(db, `chatRooms/${roomId}/messages`));
    const timestamp = Date.now();
    
    const updates: { [key: string]: any } = {
      [`chatRooms/${roomId}/messages/${messageRef.key}`]: {
        ...message,
        timestamp
      },
      [`chatRooms/${roomId}/lastMessage`]: {
        ...message,
        id: messageRef.key,
        timestamp
      }
    };
    
    await update(ref(db), updates);
    return messageRef.key;
  },

  onRoomMessages(roomId: string, callback: (messages: Message[]) => void) {
    const messagesRef = query(
      ref(db, `chatRooms/${roomId}/messages`),
      orderByChild('timestamp')
    );
    return onValue(messagesRef, (snapshot) => {
      const messages: Message[] = [];
      snapshot.forEach((child) => {
        messages.push({ ...child.val(), id: child.key });
      });
      callback(messages);
    });
  },

  onRoomsUpdate(userId: string, callback: (rooms: ChatRoom[]) => void) {
    const roomsRef = ref(db, 'chatRooms');
    return onValue(roomsRef, (snapshot) => {
      const rooms: ChatRoom[] = [];
      snapshot.forEach((child) => {
        const room = child.val();
        if (room.participants[userId]) {
          rooms.push({
            ...room,
            id: child.key,
            participants: Object.keys(room.participants).filter(id => room.participants[id])
          });
        }
      });
      callback(rooms.sort((a, b) => {
        const aTime = a.lastMessage?.timestamp || a.createdAt;
        const bTime = b.lastMessage?.timestamp || b.createdAt;
        return bTime - aTime;
      }));
    });
  },

  async getUserChatRooms(userId: string): Promise<ChatRoom[]> {
    const roomsRef = ref(db, 'chatRooms');
    const snapshot = await get(roomsRef);
    const rooms: ChatRoom[] = [];
    
    snapshot.forEach((child) => {
      const room = child.val();
      if (room.participants[userId]) {
        rooms.push({
          ...room,
          id: child.key,
          participants: Object.keys(room.participants).filter(id => room.participants[id])
        });
      }
    });
    
    return rooms.sort((a, b) => {
      const aTime = a.lastMessage?.timestamp || a.createdAt;
      const bTime = b.lastMessage?.timestamp || b.createdAt;
      return bTime - aTime;
    });
  },

  onRoomUpdated(roomId: string, callback: (room: ChatRoom | null) => void) {
    const roomRef = ref(db, `chatRooms/${roomId}`);
    return onValue(roomRef, (snapshot) => {
      if (!snapshot.exists()) {
        callback(null);
        return;
      }
      const room = snapshot.val();
      callback({
        ...room,
        id: snapshot.key,
        participants: Object.keys(room.participants).filter(id => room.participants[id])
      });
    });
  },

  async addUsersToGroup(roomId: string, userIds: string[]) {
    const updates = userIds.reduce((acc, uid) => {
      acc[`chatRooms/${roomId}/participants/${uid}`] = true;
      return acc;
    }, {} as Record<string, any>);
    
    await update(ref(db), updates);
  },

  async removeUserFromGroup(roomId: string, userId: string) {
    await update(ref(db), {
      [`chatRooms/${roomId}/participants/${userId}`]: false
    });
  },

  async updateGroupName(roomId: string, name: string) {
    await update(ref(db), {
      [`chatRooms/${roomId}/name`]: name
    });
  },

  async deleteMessage(roomId: string, messageId: string) {
    try {
      // Get the message to be deleted
      const messageRef = ref(db, `chatRooms/${roomId}/messages/${messageId}`);
      const messageSnapshot = await get(messageRef);
      const message = messageSnapshot.val();

      if (!message) {
        throw new Error('Message not found');
      }

      // Get the room's last message
      const roomRef = ref(db, `chatRooms/${roomId}`);
      const roomSnapshot = await get(roomRef);
      const room = roomSnapshot.val();

      const updates: { [key: string]: any } = {
        [`chatRooms/${roomId}/messages/${messageId}`]: null,
      };

      // If this was the last message, update the room's lastMessage
      if (room.lastMessage && room.lastMessage.id === messageId) {
        // Find the previous message
        const messagesRef = query(
          ref(db, `chatRooms/${roomId}/messages`),
          orderByChild('timestamp')
        );
        const messagesSnapshot = await get(messagesRef);
        let previousMessage = null;
        let lastMessageTimestamp = 0;

        messagesSnapshot.forEach((child) => {
          const msg = child.val();
          if (child.key !== messageId && msg.timestamp > lastMessageTimestamp) {
            previousMessage = { ...msg, id: child.key };
            lastMessageTimestamp = msg.timestamp;
          }
        });

        updates[`chatRooms/${roomId}/lastMessage`] = previousMessage;
      }

      await update(ref(db), updates);
    } catch (error) {
      console.error('Error deleting message:', error);
      throw error;
    }
  },

  async markMessageAsRead(roomId: string, messageId: string, userId: string) {
    await update(ref(db), {
      [`chatRooms/${roomId}/messages/${messageId}/readBy/${userId}`]: Date.now()
    });
  },

  async getRoomById(roomId: string): Promise<ChatRoom | null> {
    const roomRef = ref(db, `chatRooms/${roomId}`);
    const snapshot = await get(roomRef);
    
    if (!snapshot.exists()) {
      return null;
    }

    const room = snapshot.val();
    return {
      ...room,
      id: snapshot.key,
      participants: Object.keys(room.participants).filter(id => room.participants[id])
    };
  },
};

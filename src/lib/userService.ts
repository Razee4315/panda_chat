import { db } from './firebase';
import { ref, set, get, update, onValue, query, orderByChild, push, equalTo, serverTimestamp } from 'firebase/database';
import { User, FriendRequest } from '@/types';

export interface User {
  uid: string;
  email: string;
  firstName: string;
  lastName: string;
  displayName: string;
  dateOfBirth: string;
  photoURL: string | null;
  status: 'online' | 'offline';
  lastSeen: number;
}

export const userService = {
  async createUser(uid: string, email: string, firstName: string, lastName: string, dateOfBirth: string) {
    const userRef = ref(db, `users/${uid}`);
    await set(userRef, {
      email,
      firstName,
      lastName,
      displayName: `${firstName} ${lastName}`,
      dateOfBirth,
      status: 'online',
      lastSeen: Date.now(),
      friends: {},
      photoURL: null
    });
  },

  async updateUserStatus(uid: string, status: 'online' | 'offline') {
    const updates: { [key: string]: any } = {
      [`users/${uid}/status`]: status,
      [`users/${uid}/lastSeen`]: Date.now()
    };
    await update(ref(db), updates);
  },

  async sendFriendRequest(fromUid: string, toUid: string): Promise<void> {
    try {
      // Check if request already exists
      const existingRequest = await this.checkExistingRequest(fromUid, toUid);
      if (existingRequest) {
        throw new Error('Friend request already exists');
      }

      // Get user data
      const [fromUser, toUser] = await Promise.all([
        this.getUserById(fromUid),
        this.getUserById(toUid)
      ]);

      if (!fromUser || !toUser) {
        throw new Error('User not found');
      }

      // Create friend request
      const requestsRef = ref(db, 'friendRequests');
      const newRequestRef = push(requestsRef);
      
      await set(newRequestRef, {
        from: fromUid,
        to: toUid,
        status: 'pending',
        timestamp: serverTimestamp(),
        fromUser: {
          uid: fromUid,
          email: fromUser.email,
          firstName: fromUser.firstName,
          lastName: fromUser.lastName,
          displayName: fromUser.displayName || `${fromUser.firstName} ${fromUser.lastName}`
        },
        toUser: {
          uid: toUid,
          email: toUser.email,
          firstName: toUser.firstName,
          lastName: toUser.lastName,
          displayName: toUser.displayName || `${toUser.firstName} ${toUser.lastName}`
        }
      });

      // Create notification for recipient
      const notificationRef = ref(db, `notifications/${toUid}/${newRequestRef.key}`);
      await set(notificationRef, {
        type: 'friendRequest',
        from: fromUid,
        timestamp: serverTimestamp(),
        read: false,
        requestId: newRequestRef.key
      });
    } catch (error) {
      console.error('Error sending friend request:', error);
      throw error;
    }
  },

  async handleFriendRequest(requestId: string, action: 'accept' | 'reject'): Promise<void> {
    try {
      const requestRef = ref(db, `friendRequests/${requestId}`);
      const snapshot = await get(requestRef);
      
      if (!snapshot.exists()) {
        throw new Error('Friend request not found');
      }

      const request = snapshot.val();
      
      if (action === 'accept') {
        // Get both users' data
        const [fromUser, toUser] = await Promise.all([
          this.getUserById(request.from),
          this.getUserById(request.to)
        ]);

        if (!fromUser || !toUser) {
          throw new Error('User not found');
        }

        // Update request status
        await update(requestRef, { status: 'accepted' });

        // Add users as friends with their data
        const updates: { [key: string]: any } = {
          // Add sender to recipient's friends list
          [`users/${request.to}/friends/${request.from}`]: {
            uid: fromUser.uid,
            email: fromUser.email,
            firstName: fromUser.firstName,
            lastName: fromUser.lastName,
            displayName: fromUser.displayName,
            status: fromUser.status,
            lastSeen: fromUser.lastSeen,
            photoURL: fromUser.photoURL || null
          },
          // Add recipient to sender's friends list
          [`users/${request.from}/friends/${request.to}`]: {
            uid: toUser.uid,
            email: toUser.email,
            firstName: toUser.firstName,
            lastName: toUser.lastName,
            displayName: toUser.displayName,
            status: toUser.status,
            lastSeen: toUser.lastSeen,
            photoURL: toUser.photoURL || null
          }
        };

        await update(ref(db), updates);

        // Create notification for sender
        const notificationRef = ref(db, `notifications/${request.from}/${requestId}`);
        await set(notificationRef, {
          type: 'friendAccepted',
          from: request.to,
          timestamp: serverTimestamp(),
          read: false
        });
      } else {
        // Update request status
        await update(requestRef, { status: 'rejected' });
      }
    } catch (error) {
      console.error('Error handling friend request:', error);
      throw error;
    }
  },

  async checkExistingRequest(fromUid: string, toUid: string): Promise<boolean> {
    const requestsRef = ref(db, 'friendRequests');
    const queryRef = query(
      requestsRef,
      orderByChild('status'),
      equalTo('pending')
    );

    const snapshot = await get(queryRef);
    if (!snapshot.exists()) return false;

    let exists = false;
    snapshot.forEach((child) => {
      const request = child.val();
      if (
        (request.from === fromUid && request.to === toUid) ||
        (request.from === toUid && request.to === fromUid)
      ) {
        exists = true;
        return true; // Break the loop
      }
    });

    return exists;
  },

  async getPendingFriendRequests(uid: string): Promise<FriendRequest[]> {
    try {
      const requestsRef = ref(db, 'friendRequests');
      const snapshot = await get(requestsRef);
      
      if (!snapshot.exists()) {
        return [];
      }

      const requests: FriendRequest[] = [];
      snapshot.forEach((child) => {
        const request = child.val();
        if (request.status === 'pending' && request.to === uid) {
          requests.push({
            id: child.key!,
            ...request
          });
        }
      });

      return requests;
    } catch (error) {
      console.error('Error getting friend requests:', error);
      throw error;
    }
  },

  async getSentFriendRequests(uid: string): Promise<FriendRequest[]> {
    try {
      const requestsRef = ref(db, 'friendRequests');
      const snapshot = await get(requestsRef);

      if (!snapshot.exists()) {
        return [];
      }

      const requests: FriendRequest[] = [];
      snapshot.forEach((child) => {
        const request = child.val();
        if (request.status === 'pending' && request.from === uid) {
          requests.push({
            id: child.key!,
            ...request
          });
        }
      });

      return requests;
    } catch (error) {
      console.error('Error getting sent friend requests:', error);
      throw error;
    }
  },

  async removeFriend(uid1: string, uid2: string) {
    const updates: { [key: string]: any } = {
      [`users/${uid1}/friends/${uid2}`]: null,
      [`users/${uid2}/friends/${uid1}`]: null
    };
    await update(ref(db), updates);
  },

  async getUserFriends(uid: string): Promise<User[]> {
    try {
      const userRef = ref(db, `users/${uid}/friends`);
      const snapshot = await get(userRef);
      const friends: User[] = [];
      
      if (snapshot.exists()) {
        const friendsData = snapshot.val();
        // Convert friend data to array of User objects
        for (const [friendId, friendData] of Object.entries(friendsData)) {
          if (friendData) { // Only include valid friend entries
            friends.push({
              ...(friendData as User),
              uid: friendId
            });
          }
        }
      }
      
      return friends;
    } catch (error) {
      console.error('Error getting user friends:', error);
      throw error;
    }
  },

  async updateProfile(uid: string, data: Partial<User>) {
    const userRef = ref(db, `users/${uid}`);
    await update(userRef, data);
  },

  async getUserById(uid: string): Promise<User | null> {
    const userRef = ref(db, `users/${uid}`);
    const snapshot = await get(userRef);
    if (!snapshot.exists()) return null;
    const userData = snapshot.val();
    return {
      ...userData,
      uid
    };
  },

  onUsersStatus(userIds: string[], callback: (users: Record<string, User>) => void) {
    const usersRef = ref(db, 'users');
    
    return onValue(usersRef, (snapshot) => {
      const users: Record<string, User> = {};
      
      userIds.forEach((uid) => {
        const userData = snapshot.child(uid).val();
        if (userData) {
          users[uid] = {
            ...userData,
            uid
          };
        }
      });
      
      callback(users);
    });
  },

  async searchUsers(query: string): Promise<User[]> {
    try {
      console.log('Searching users with query:', query);
      const usersRef = ref(db, 'users');
      const snapshot = await get(usersRef);
      
      if (!snapshot.exists()) {
        console.log('No users found in database');
        return [];
      }

      const users: User[] = [];
      snapshot.forEach((child) => {
        const userData = child.val();
        // Make sure we have all required user data
        if (userData && userData.email && userData.firstName && userData.lastName) {
          users.push({
            uid: child.key!,
            email: userData.email,
            firstName: userData.firstName,
            lastName: userData.lastName,
            displayName: `${userData.firstName} ${userData.lastName}`,
            dateOfBirth: userData.dateOfBirth,
            photoURL: userData.photoURL || null,
            status: userData.status || 'offline',
            lastSeen: userData.lastSeen || Date.now()
          });
        }
      });

      console.log('Total users found:', users.length);

      if (!query.trim()) {
        return users;
      }

      const queryLower = query.toLowerCase();
      const filteredUsers = users.filter(user => 
        user.email.toLowerCase().includes(queryLower) ||
        user.firstName.toLowerCase().includes(queryLower) ||
        user.lastName.toLowerCase().includes(queryLower) ||
        user.displayName.toLowerCase().includes(queryLower)
      );

      console.log('Filtered users:', filteredUsers.length);
      return filteredUsers;
    } catch (error) {
      console.error('Error searching users:', error);
      throw new Error('Failed to search users');
    }
  },

  onFriendRequestsUpdate(uid: string, callback: (requests: FriendRequest[]) => void) {
    const requestsRef = ref(db, 'friendRequests');
    
    const unsubscribe = onValue(requestsRef, (snapshot) => {
      if (!snapshot.exists()) {
        callback([]);
        return;
      }

      const requests: FriendRequest[] = [];
      snapshot.forEach((child) => {
        const request = child.val();
        if (request.to === uid && request.status === 'pending') {
          requests.push({
            id: child.key!,
            ...request
          });
        }
      });

      callback(requests);
    });

    return unsubscribe;
  },

  onFriendsUpdate(uid: string, callback: (friends: User[]) => void) {
    const friendsRef = ref(db, `users/${uid}/friends`);
    
    return onValue(friendsRef, async (snapshot) => {
      const friends: User[] = [];
      
      if (snapshot.exists()) {
        const friendsData = snapshot.val();
        for (const [friendId, friendData] of Object.entries(friendsData)) {
          if (friendData) { // Only include active friends
            friends.push({
              ...(friendData as User),
              uid: friendId
            });
          }
        }
      }
      
      callback(friends);
    });
  }
};

import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { ChatRoom } from "@/components/ChatRoom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { chatService } from "@/lib/chatService";
import { userService } from "@/lib/userService";
import { ChatRoom as ChatRoomType, User } from "@/types";
import { useSearchParams } from "react-router-dom";
import { 
  MessageSquare, 
  Users, 
  Search, 
  Plus,
  UserPlus,
  Settings,
  LogOut
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";

export function ChatPage() {
  const { currentUser, signOut } = useAuth();
  const [searchParams] = useSearchParams();
  const [activeRoom, setActiveRoom] = useState<string | null>(searchParams.get("room"));
  const [rooms, setRooms] = useState<ChatRoomType[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [onlineUsers, setOnlineUsers] = useState<User[]>([]);
  const [isCreatingGroup, setIsCreatingGroup] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentUser) return;

    const loadInitialData = async () => {
      try {
        setLoading(true);
        // Load user's friends
        const friends = await userService.getUserFriends(currentUser.uid);
        setOnlineUsers(friends);

        // Load user's chat rooms
        const userRooms = await chatService.getUserChatRooms(currentUser.uid);
        setRooms(userRooms);

        // If no active room is selected but we have rooms, select the first one
        if (!activeRoom && userRooms.length > 0) {
          setActiveRoom(userRooms[0].id);
        }
      } catch (error) {
        toast.error("Failed to load chat rooms");
      } finally {
        setLoading(false);
      }
    };

    loadInitialData();

    // Subscribe to rooms updates
    const unsubscribeRooms = chatService.onRoomsUpdate(currentUser.uid, (updatedRooms) => {
      setRooms(updatedRooms);
    });

    // Subscribe to friends' status updates
    const unsubscribeFriends = userService.onUsersStatus(
      onlineUsers.map(user => user.uid),
      (users) => {
        // Update online users with latest status
        setOnlineUsers(prevUsers => 
          prevUsers.map(user => ({
            ...user,
            ...users[user.uid]
          }))
        );
      }
    );

    return () => {
      unsubscribeRooms();
      unsubscribeFriends();
    };
  }, [currentUser, activeRoom, onlineUsers.length]);

  // Update active room when URL param changes
  useEffect(() => {
    const roomFromUrl = searchParams.get("room");
    if (roomFromUrl) {
      setActiveRoom(roomFromUrl);
      // Load room data
      chatService.getRoomById(roomFromUrl).then(room => {
        if (!room) {
          toast.error("Chat room not found");
          setActiveRoom(null);
        }
      });
    }
  }, [searchParams]);

  const createGroupChat = async () => {
    if (!currentUser || !groupName.trim() || selectedUsers.length === 0) {
      toast.error("Please enter a group name and select at least one user");
      return;
    }

    try {
      const participants = [...selectedUsers, currentUser.uid];
      const roomId = await chatService.createChatRoom(
        'group',
        participants,
        groupName,
        currentUser.uid
      );

      setActiveRoom(roomId);
      setIsCreatingGroup(false);
      setGroupName("");
      setSelectedUsers([]);
      toast.success("Group created successfully!");
    } catch (error) {
      toast.error("Failed to create group");
    }
  };

  const startPrivateChat = async (userId: string) => {
    if (!currentUser) return;

    try {
      // Check if chat already exists
      const existingRoom = rooms.find(room => 
        room.type === 'private' && 
        room.participants.includes(userId) &&
        room.participants.includes(currentUser.uid)
      );

      if (existingRoom) {
        setActiveRoom(existingRoom.id);
        // Close the dialog
        const dialogElement = document.querySelector('[role="dialog"]');
        if (dialogElement) {
          const closeButton = dialogElement.querySelector('button[aria-label="Close"]');
          if (closeButton instanceof HTMLButtonElement) {
            closeButton.click();
          }
        }
      } else {
        // Create new chat room
        const roomId = await chatService.createChatRoom(
          'private',
          [currentUser.uid, userId]
        );
        setActiveRoom(roomId);
        // Close the dialog
        const dialogElement = document.querySelector('[role="dialog"]');
        if (dialogElement) {
          const closeButton = dialogElement.querySelector('button[aria-label="Close"]');
          if (closeButton instanceof HTMLButtonElement) {
            closeButton.click();
          }
        }
      }
    } catch (error) {
      console.error('Error starting chat:', error);
      toast.error("Failed to start chat");
    }
  };

  const filteredRooms = rooms.filter(room => {
    if (!searchQuery) return true;
    if (room.name?.toLowerCase().includes(searchQuery.toLowerCase())) return true;
    return false;
  });

  if (!currentUser) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Please sign in to continue</h1>
          <p className="text-muted-foreground">You need to be signed in to access the chat.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen">
      {/* Sidebar */}
      <div className="w-80 border-r flex flex-col bg-background">
        {/* User Profile */}
        <div className="p-4 border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Avatar>
                <AvatarImage src={currentUser?.photoURL || undefined} />
                <AvatarFallback>{currentUser?.email?.[0]?.toUpperCase() || '?'}</AvatarFallback>
              </Avatar>
              <div>
                <div className="font-semibold">{currentUser?.displayName || 'User'}</div>
                <div className="text-sm text-muted-foreground">{currentUser?.email}</div>
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={() => signOut()}>
              <LogOut className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Search */}
        <div className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search chats..."
              className="pl-9"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {/* Chat List */}
        <ScrollArea className="flex-1">
          <div className="p-4 space-y-4">
            {/* Direct Messages Section */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold">Direct Messages</h2>
                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <UserPlus className="h-4 w-4" />
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Start a Chat</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 mt-4">
                      {onlineUsers
                        .filter(user => user.uid !== currentUser?.uid)
                        .map(user => (
                          <div
                            key={user.uid}
                            className="flex items-center justify-between p-2 hover:bg-accent rounded-md cursor-pointer"
                            onClick={() => startPrivateChat(user.uid)}
                          >
                            <div className="flex items-center gap-3">
                              <Avatar>
                                <AvatarImage src={user.photoURL} />
                                <AvatarFallback>{user.displayName?.[0] || '?'}</AvatarFallback>
                              </Avatar>
                              <div>
                                <div className="font-medium">{user.displayName || 'User'}</div>
                                <div className="text-sm text-muted-foreground">{user.email}</div>
                              </div>
                            </div>
                            <div className={`w-2 h-2 rounded-full ${user.status === 'online' ? 'bg-green-500' : 'bg-gray-300'}`} />
                          </div>
                        ))}
                    </div>
                  </DialogContent>
                </Dialog>
              </div>

              {filteredRooms
                .filter(room => room.type === 'private')
                .map(room => (
                  <div
                    key={room.id}
                    className={`flex items-center gap-3 p-2 rounded-md cursor-pointer hover:bg-accent ${
                      activeRoom === room.id ? 'bg-accent' : ''
                    }`}
                    onClick={() => setActiveRoom(room.id)}
                  >
                    <Avatar>
                      <AvatarFallback>
                        {room.name?.[0] || 'C'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">
                        {room.name || 'Chat'}
                      </div>
                      {room.lastMessage && (
                        <div className="text-sm text-muted-foreground truncate">
                          {room.lastMessage.text}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
            </div>

            {/* Groups Section */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold">Groups</h2>
                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <Plus className="h-4 w-4" />
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Create Group</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 mt-4">
                      <Input
                        placeholder="Group Name"
                        value={groupName}
                        onChange={(e) => setGroupName(e.target.value)}
                      />
                      <div className="space-y-2">
                        <div className="font-medium">Select Members</div>
                        {onlineUsers
                          .filter(user => user.uid !== currentUser?.uid)
                          .map(user => (
                            <div
                              key={user.uid}
                              className="flex items-center justify-between p-2 hover:bg-accent rounded-md cursor-pointer"
                              onClick={() => {
                                setSelectedUsers(prev => 
                                  prev.includes(user.uid)
                                    ? prev.filter(id => id !== user.uid)
                                    : [...prev, user.uid]
                                );
                              }}
                            >
                              <div className="flex items-center gap-3">
                                <Avatar>
                                  <AvatarImage src={user.photoURL} />
                                  <AvatarFallback>{user.displayName?.[0] || '?'}</AvatarFallback>
                                </Avatar>
                                <div>
                                  <div className="font-medium">{user.displayName || 'User'}</div>
                                  <div className="text-sm text-muted-foreground">{user.email}</div>
                                </div>
                              </div>
                              <div className={`w-5 h-5 rounded border ${
                                selectedUsers.includes(user.uid)
                                  ? 'bg-primary border-primary'
                                  : 'border-input'
                              }`}>
                                {selectedUsers.includes(user.uid) && (
                                  <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    className="w-4 h-4 text-primary-foreground"
                                  >
                                    <polyline points="20 6 9 17 4 12" />
                                  </svg>
                                )}
                              </div>
                            </div>
                          ))}
                      </div>
                      <Button 
                        onClick={createGroupChat}
                        disabled={!groupName.trim() || selectedUsers.length === 0}
                      >
                        Create Group
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>

              {filteredRooms
                .filter(room => room.type === 'group')
                .map(room => (
                  <div
                    key={room.id}
                    className={`flex items-center gap-3 p-2 rounded-md cursor-pointer hover:bg-accent ${
                      activeRoom === room.id ? 'bg-accent' : ''
                    }`}
                    onClick={() => setActiveRoom(room.id)}
                  >
                    <Avatar>
                      <AvatarFallback>
                        {room.name?.[0] || 'G'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">
                        {room.name || 'Group Chat'}
                      </div>
                      {room.lastMessage && (
                        <div className="text-sm text-muted-foreground truncate">
                          {room.lastMessage.text}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </ScrollArea>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col">
        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-4"></div>
              <p className="text-muted-foreground">Loading chat...</p>
            </div>
          </div>
        ) : activeRoom ? (
          <ChatRoom roomId={activeRoom} />
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <MessageSquare className="h-12 w-12 text-muted-foreground mb-4 mx-auto" />
              <h2 className="text-xl font-semibold mb-2">No chat selected</h2>
              <p className="text-muted-foreground">
                Select a chat from the sidebar or start a new conversation
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

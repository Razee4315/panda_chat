import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { userService } from "@/lib/userService";
import { chatService } from "@/lib/chatService";
import { User, FriendRequest } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import {
  MessageSquare,
  UserPlus,
  UserMinus,
  Check,
  X,
  Search,
  Users,
  Loader2,
  Clock
} from "lucide-react";
import { toast } from "sonner";

export function FriendsPage() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [friends, setFriends] = useState<User[]>([]);
  const [pendingRequests, setPendingRequests] = useState<FriendRequest[]>([]);
  const [sentRequests, setSentRequests] = useState<FriendRequest[]>([]);
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("friends");
  const [rooms, setRooms] = useState<any[]>([]);

  // Load initial data and set up listeners
  useEffect(() => {
    if (!currentUser) return;

    const loadInitialData = async () => {
      try {
        setIsSearching(true);
        setError(null);

        // Load pending friend requests (received)
        const requests = await userService.getPendingFriendRequests(currentUser.uid);
        setPendingRequests(requests);

        // Load sent friend requests
        const sent = await userService.getSentFriendRequests(currentUser.uid);
        setSentRequests(sent);

        // Load user's chat rooms
        const userRooms = await chatService.getUserChatRooms(currentUser.uid);
        setRooms(userRooms);

        // Initial search
        await handleSearch(searchQuery);
      } catch (error) {
        console.error('Error loading initial data:', error);
        setError('Failed to load users. Please try again.');
      } finally {
        setIsSearching(false);
      }
    };

    loadInitialData();

    // Subscribe to friend requests updates
    const unsubscribeRequests = userService.onFriendRequestsUpdate(
      currentUser.uid,
      (requests) => {
        setPendingRequests(requests);
      }
    );

    // Subscribe to friends list updates
    const unsubscribeFriends = userService.onFriendsUpdate(
      currentUser.uid,
      (updatedFriends) => {
        setFriends(updatedFriends);
      }
    );

    // Subscribe to rooms updates
    const unsubscribeRooms = chatService.onRoomsUpdate(
      currentUser.uid,
      (updatedRooms) => {
        setRooms(updatedRooms);
      }
    );

    return () => {
      unsubscribeRequests();
      unsubscribeFriends();
      unsubscribeRooms();
    };
  }, [currentUser]);

  // Effect for status updates
  useEffect(() => {
    if (!currentUser || friends.length === 0) return;

    const unsubscribeStatus = userService.onUsersStatus(
      friends.map(friend => friend.uid),
      (users) => {
        setFriends(prevFriends => 
          prevFriends.map(friend => ({
            ...friend,
            ...users[friend.uid]
          }))
        );
      }
    );

    return () => {
      unsubscribeStatus();
    };
  }, [currentUser, friends.map(f => f.uid).join(',')]);

  // Handle search
  const handleSearch = async (query: string) => {
    if (!currentUser) return;
    
    try {
      setIsSearching(true);
      setError(null);
      setSearchQuery(query);

      if (!query.trim()) {
        setSearchResults([]);
        return;
      }

      const results = await userService.searchUsers(query);
      console.log('Search results:', results.length);
      
      const filteredResults = results.filter(user =>
        user.uid !== currentUser.uid && // Exclude current user
        !friends.some(friend => friend.uid === user.uid) && // Exclude friends
        !pendingRequests.some(req => req.from === user.uid) && // Exclude users who sent requests
        !sentRequests.some(req => req.to === user.uid) // Exclude users who received requests
      );
      
      console.log('Filtered search results:', filteredResults.length);
      setSearchResults(filteredResults);
    } catch (error) {
      console.error('Error searching users:', error);
      setError('Failed to search users. Please try again.');
    } finally {
      setIsSearching(false);
    }
  };

  const sendFriendRequest = async (toUserId: string) => {
    if (!currentUser) return;
    
    try {
      setError(null);
      await userService.sendFriendRequest(currentUser.uid, toUserId);
      toast.success("Friend request sent successfully!");
      
      // Update the sent requests list
      const newRequest = {
        id: Date.now().toString(), // temporary ID
        from: currentUser.uid,
        to: toUserId,
        status: 'pending',
        timestamp: Date.now()
      };
      setSentRequests(prev => [...prev, newRequest]);
    } catch (error: any) {
      console.error('Error sending friend request:', error);
      setError(error.message || 'Failed to send friend request');
      toast.error(error.message || 'Failed to send friend request');
    }
  };

  const handleFriendRequest = async (requestId: string, action: 'accept' | 'reject') => {
    try {
      await userService.handleFriendRequest(requestId, action);
      // Refresh friend requests
      const updatedRequests = await userService.getPendingFriendRequests(currentUser!.uid);
      setPendingRequests(updatedRequests);
      
      if (action === 'accept') {
        // Refresh friends list
        const updatedFriends = await userService.getUserFriends(currentUser!.uid);
        setFriends(updatedFriends);
        // Show success message
        toast.success('Friend request accepted!');
      } else {
        toast.success('Friend request rejected');
      }
    } catch (error) {
      console.error('Error handling friend request:', error);
      toast.error('Failed to handle friend request');
    }
  };

  const removeFriend = async (friendId: string) => {
    if (!currentUser) return;

    try {
      await userService.removeFriend(currentUser.uid, friendId);
      setFriends(prev => prev.filter(friend => friend.uid !== friendId));
      toast.success("Friend removed");
    } catch (error) {
      console.error('Error removing friend:', error);
      toast.error("Failed to remove friend");
    }
  };

  const handleStartChat = async (userId: string) => {
    if (!currentUser) return;
    
    try {
      // Get user's data to set room name
      const user = friends.find(f => f.uid === userId) || 
                  searchResults.find(u => u.uid === userId);
                  
      const roomName = user ? `${user.firstName} ${user.lastName}` : 'Private Chat';
      
      // Create new chat room (or get existing one)
      const roomId = await chatService.createChatRoom(
        'private',
        [currentUser.uid, userId],
        roomName
      );

      // Navigate to the chat room
      navigate(`/chat?room=${roomId}`);
    } catch (error) {
      console.error('Error starting chat:', error);
      toast.error('Failed to start chat');
    }
  };

  return (
    <div className="container mx-auto p-4 max-w-4xl">
      <Tabs defaultValue={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3 mb-4">
          <TabsTrigger value="friends" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Friends
          </TabsTrigger>
          <TabsTrigger value="requests" className="flex items-center gap-2">
            <UserPlus className="h-4 w-4" />
            Requests {pendingRequests.length > 0 && `(${pendingRequests.length})`}
          </TabsTrigger>
          <TabsTrigger value="add" className="flex items-center gap-2">
            <Search className="h-4 w-4" />
            Add Friends
          </TabsTrigger>
        </TabsList>

        <TabsContent value="friends">
          <Card>
            <CardHeader>
              <CardTitle>Friends</CardTitle>
              <CardDescription>
                Your friends list. Click on message to start a chat.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px] pr-4">
                {friends.length === 0 ? (
                  <div className="text-center text-muted-foreground py-8">
                    No friends yet. Start adding friends to chat!
                  </div>
                ) : (
                  <div className="space-y-4">
                    {friends.map((friend) => (
                      <div
                        key={friend.uid}
                        className="flex items-center justify-between p-4 rounded-lg border"
                      >
                        <div className="flex items-center gap-4">
                          <Avatar>
                            <AvatarFallback>
                              {friend.firstName[0]}
                              {friend.lastName[0]}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="font-medium">
                              {friend.firstName} {friend.lastName}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {friend.email}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleStartChat(friend.uid)}
                            className="flex items-center gap-2"
                          >
                            <MessageSquare className="h-4 w-4" />
                            Message
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => removeFriend(friend.uid)}
                            className="flex items-center gap-2"
                          >
                            <UserMinus className="h-4 w-4" />
                            Remove
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="requests">
          <div className="space-y-4">
            <div className="space-y-2">
              <h3 className="text-lg font-medium">Friend Requests</h3>
              <p className="text-sm text-muted-foreground">
                Manage your incoming friend requests
              </p>
            </div>

            <ScrollArea className="h-[500px] w-full rounded-md border p-4">
              {pendingRequests.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <UserPlus className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No pending friend requests</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {pendingRequests.map((request) => (
                    <div
                      key={request.id}
                      className="flex items-center justify-between p-4 rounded-lg border bg-card"
                    >
                      <div className="flex items-center gap-3">
                        <Avatar>
                          <AvatarImage src={request.fromUser?.photoURL || undefined} />
                          <AvatarFallback>
                            {request.fromUser?.firstName?.[0]?.toUpperCase()}
                            {request.fromUser?.lastName?.[0]?.toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-medium">
                            {request.fromUser?.firstName} {request.fromUser?.lastName}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {request.fromUser?.email}
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="default"
                          size="sm"
                          onClick={() => handleFriendRequest(request.id, 'accept')}
                        >
                          <Check className="h-4 w-4 mr-2" />
                          Accept
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleFriendRequest(request.id, 'reject')}
                        >
                          <X className="h-4 w-4 mr-2" />
                          Reject
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>
        </TabsContent>

        <TabsContent value="add">
          <Card>
            <CardHeader>
              <CardTitle>Add Friends</CardTitle>
              <CardDescription>
                Search for users by email or name to add them as friends.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex gap-2">
                  <Input
                    placeholder="Search users..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleSearch(searchQuery);
                      }
                    }}
                  />
                  <Button
                    onClick={() => handleSearch(searchQuery)}
                    disabled={isSearching}
                  >
                    {isSearching ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Search className="h-4 w-4" />
                    )}
                  </Button>
                </div>

                <ScrollArea className="h-[300px]">
                  <div className="space-y-4">
                    {searchResults.map((user) => (
                      <div
                        key={user.uid}
                        className="flex items-center justify-between p-4 rounded-lg border"
                      >
                        <div className="flex items-center gap-4">
                          <Avatar>
                            <AvatarFallback>
                              {user.firstName[0]}
                              {user.lastName[0]}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="font-medium">
                              {user.firstName} {user.lastName}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {user.email}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleStartChat(user.uid)}
                            className="flex items-center gap-2"
                          >
                            <MessageSquare className="h-4 w-4" />
                            Message
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => sendFriendRequest(user.uid)}
                            disabled={
                              sentRequests.some(req => req.to === user.uid) ||
                              friends.some(friend => friend.uid === user.uid)
                            }
                            className="flex items-center gap-2"
                          >
                            <UserPlus className="h-4 w-4" />
                            Add Friend
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { userService } from "@/lib/userService";
import { chatService } from "@/lib/chatService";
import { User, ChatRoom } from "@/types";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useNavigate } from "react-router-dom";
import {
  MessageSquare,
  Users,
  Settings,
  UserPlus,
  UserMinus,
  Edit,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { Checkbox } from "@/components/ui/checkbox";

export function GroupsPage() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [groups, setGroups] = useState<ChatRoom[]>([]);
  const [friends, setFriends] = useState<User[]>([]);
  const [selectedFriends, setSelectedFriends] = useState<string[]>([]);
  const [newGroupName, setNewGroupName] = useState("");
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [currentGroup, setCurrentGroup] = useState<ChatRoom | null>(null);

  useEffect(() => {
    if (!currentUser) return;

    const loadGroups = async () => {
      const userRooms = await chatService.getUserChatRooms(currentUser.uid);
      setGroups(userRooms.filter(room => room.type === 'group'));
    };

    const loadFriends = async () => {
      const userFriends = await userService.getUserFriends(currentUser.uid);
      setFriends(userFriends);
    };

    loadGroups();
    loadFriends();

    // Subscribe to room updates and filter for groups
    const unsubscribe = chatService.onRoomsUpdate(currentUser.uid, (updatedRooms) => {
      setGroups(updatedRooms.filter(room => room.type === 'group'));
    });

    return () => unsubscribe();
  }, [currentUser]);

  const handleCreateGroup = async () => {
    if (!newGroupName.trim() || selectedFriends.length === 0 || !currentUser) {
      toast.error("Please enter a group name and select at least one friend");
      return;
    }

    try {
      const members = [...selectedFriends, currentUser.uid];
      await chatService.createChatRoom("group", members, newGroupName, currentUser.uid);
      setShowCreateDialog(false);
      setNewGroupName("");
      setSelectedFriends([]);
      toast.success("Group created successfully!");
    } catch (error) {
      console.error('Error creating group:', error);
      toast.error("Failed to create group");
    }
  };

  const handleEditGroup = async () => {
    if (!currentGroup || !newGroupName.trim()) return;

    try {
      await chatService.updateGroupName(currentGroup.id, newGroupName);
      setShowEditDialog(false);
      setNewGroupName("");
      setCurrentGroup(null);
      toast.success("Group name updated successfully!");
    } catch (error) {
      console.error('Error updating group name:', error);
      toast.error("Failed to update group name");
    }
  };

  const handleLeaveGroup = async (groupId: string) => {
    if (!currentUser || !confirm("Are you sure you want to leave this group?")) return;

    try {
      await chatService.removeUserFromGroup(groupId, currentUser.uid);
      toast.success("Left group successfully!");
    } catch (error) {
      console.error('Error leaving group:', error);
      toast.error("Failed to leave group");
    }
  };

  const openChat = (groupId: string) => {
    navigate(`/chat?room=${groupId}`);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Groups</CardTitle>
            <CardDescription>Manage your group chats</CardDescription>
          </div>
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button>
                <Users className="h-4 w-4 mr-2" />
                Create Group
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Group</DialogTitle>
                <DialogDescription>
                  Create a new group chat and add your friends.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <Input
                  placeholder="Group Name"
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                />
                <div className="space-y-2">
                  <h4 className="font-medium">Select Friends</h4>
                  <ScrollArea className="h-[200px]">
                    {friends.map((friend) => (
                      <div
                        key={friend.uid}
                        className="flex items-center space-x-2 p-2"
                      >
                        <Checkbox
                          id={friend.uid}
                          checked={selectedFriends.includes(friend.uid)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedFriends([...selectedFriends, friend.uid]);
                            } else {
                              setSelectedFriends(
                                selectedFriends.filter((id) => id !== friend.uid)
                              );
                            }
                          }}
                        />
                        <label
                          htmlFor={friend.uid}
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                        >
                          {friend.displayName || 'User'}
                        </label>
                      </div>
                    ))}
                  </ScrollArea>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreateGroup}>Create Group</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[500px]">
            <div className="space-y-4">
              {groups.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No groups yet</p>
                  <p className="text-sm">Create a group to start chatting with multiple friends</p>
                </div>
              ) : (
                groups.map((group) => (
                  <div
                    key={group.id}
                    className="flex items-center justify-between p-4 rounded-lg border hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex items-center space-x-4">
                      <Avatar>
                        <AvatarFallback>
                          {group.name?.[0]?.toUpperCase() || 'G'}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <h4 className="font-medium">{group.name || 'Unnamed Group'}</h4>
                        <p className="text-sm text-muted-foreground">
                          {group.participants.length} members
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openChat(group.id)}
                      >
                        <MessageSquare className="h-4 w-4" />
                      </Button>
                      {group.groupAdmin === currentUser?.uid ? (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setCurrentGroup(group);
                            setNewGroupName(group.name || '');
                            setShowEditDialog(true);
                          }}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      ) : (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleLeaveGroup(group.id)}
                        >
                          <UserMinus className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Group</DialogTitle>
            <DialogDescription>
              Change the group name or manage members.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              placeholder="Group Name"
              value={newGroupName}
              onChange={(e) => setNewGroupName(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleEditGroup}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
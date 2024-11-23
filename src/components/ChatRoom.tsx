import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { ChatMessage } from "./ChatMessage";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { Message, ChatRoom as ChatRoomType } from "@/types";
import { Send, Smile, UserPlus } from "lucide-react";
import data from '@emoji-mart/data';
import Picker from '@emoji-mart/react';
import { chatService } from "@/lib/chatService";
import { userService } from "@/lib/userService";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface ChatRoomProps {
  roomId: string;
}

export const ChatRoom = ({ roomId }: ChatRoomProps) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [currentRoom, setCurrentRoom] = useState<ChatRoomType | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { currentUser } = useAuth();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!currentUser?.uid || !roomId) return;

    const loadRoom = async () => {
      try {
        setIsLoading(true);
        const room = await chatService.getRoomById(roomId);
        if (room) {
          setCurrentRoom(room);
        }
      } catch (error) {
        console.error('Error loading room:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadRoom();

    const unsubscribeMessages = chatService.onRoomMessages(roomId, (messages) => {
      setMessages(messages || []);
    });

    const unsubscribeRoom = chatService.onRoomUpdated(roomId, (room) => {
      setCurrentRoom(room);
    });

    // Update user status to online
    userService.updateUserStatus(currentUser.uid, 'online');

    return () => {
      unsubscribeMessages();
      unsubscribeRoom();
      // Update user status to offline on unmount
      if (currentUser?.uid) {
        userService.updateUserStatus(currentUser.uid, 'offline');
      }
    };
  }, [currentUser?.uid, roomId]);

  useEffect(() => {
    if (messages.length > 0) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !currentUser?.uid || !roomId) return;

    try {
      await chatService.sendMessage(roomId, {
        text: newMessage,
        uid: currentUser.uid,
        timestamp: Date.now(),
        type: 'text',
        senderName: currentUser.displayName || currentUser.email?.split('@')[0] || 'Anonymous'
      });

      setNewMessage("");
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  const handleEmojiSelect = async (emoji: any) => {
    if (!currentUser?.uid || !roomId) return;

    try {
      await chatService.sendMessage(roomId, {
        text: emoji.native,
        uid: currentUser.uid,
        timestamp: Date.now(),
        type: 'emoji',
        senderName: currentUser.displayName || currentUser.email?.split('@')[0] || 'Anonymous'
      });
    } catch (error) {
      console.error('Error sending emoji:', error);
    }
  };

  if (isLoading) {
    return <div className="flex items-center justify-center h-full">Loading...</div>;
  }

  if (!currentRoom) {
    return <div className="flex items-center justify-center h-full">Chat room not found</div>;
  }

  return (
    <div className="flex flex-col h-full">
      {/* Chat Header */}
      <div className="p-4 border-b flex items-center justify-between">
        <div>
          <h2 className="font-semibold">{currentRoom.name || 'Chat'}</h2>
          <p className="text-sm text-muted-foreground">
            {currentRoom.type === 'group' 
              ? `${currentRoom.participants.length} members`
              : 'Direct Message'
            }
          </p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <ChatMessage
            key={message.id}
            message={message}
            roomId={roomId}
          />
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <form onSubmit={handleSubmit} className="p-4 border-t flex gap-2">
        <Input
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Type a message..."
          className="flex-1"
        />
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="icon" type="button">
              <Smile className="h-5 w-5" />
            </Button>
          </PopoverTrigger>
          <PopoverContent side="top" className="w-auto p-0">
            <Picker
              data={data}
              onEmojiSelect={handleEmojiSelect}
              theme="light"
            />
          </PopoverContent>
        </Popover>
        <Button type="submit">
          <Send className="h-5 w-5" />
        </Button>
      </form>
    </div>
  );
};
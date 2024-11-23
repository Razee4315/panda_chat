import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import { Message } from "@/types";
import { format } from "date-fns";
import { Trash2 } from "lucide-react";
import { Button } from "./ui/button";
import { chatService } from "@/lib/chatService";
import { toast } from "sonner";

interface ChatMessageProps {
  message: Message;
  roomId: string;
}

export const ChatMessage = ({ message, roomId }: ChatMessageProps) => {
  const { currentUser } = useAuth();
  const isOwn = currentUser?.uid === message.uid;

  const handleDelete = async () => {
    try {
      await chatService.deleteMessage(roomId, message.id);
      toast.success("Message deleted");
    } catch (error) {
      console.error("Error deleting message:", error);
      toast.error("Failed to delete message");
    }
  };

  return (
    <div
      className={cn(
        "flex group items-end gap-2",
        isOwn ? "justify-end" : "justify-start"
      )}
    >
      {isOwn && (
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={handleDelete}
        >
          <Trash2 className="h-4 w-4 text-destructive" />
        </Button>
      )}
      <div
        className={cn(
          "max-w-[70%] rounded-lg px-4 py-2",
          isOwn
            ? "bg-primary text-primary-foreground"
            : "bg-muted",
          message.type === 'emoji' && "text-2xl bg-transparent px-2 py-1"
        )}
      >
        {!isOwn && message.senderName && (
          <div className="text-sm font-medium mb-1">
            {message.senderName}
          </div>
        )}
        <div className={message.type === 'emoji' ? "text-2xl" : ""}>{message.text}</div>
        <div className="text-xs mt-1 opacity-70">
          {format(message.timestamp, 'HH:mm')}
        </div>
      </div>
    </div>
  );
};
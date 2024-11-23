import { Button } from "./ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { MessageSquare, Users, UserPlus, LogOut } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";

export const Navigation = () => {
  const { logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const isActive = (path: string) => location.pathname === path;

  const handleLogout = async () => {
    try {
      await logout();
      navigate("/");
    } catch (error) {
      console.error("Failed to log out:", error);
    }
  };

  return (
    <nav className="fixed bottom-0 left-0 w-full bg-background border-t py-2 px-4 flex justify-around items-center">
      <Link to="/chat">
        <Button
          variant={isActive("/chat") ? "default" : "ghost"}
          size="icon"
          className="relative"
        >
          <MessageSquare className="h-5 w-5" />
        </Button>
      </Link>
      <Link to="/groups">
        <Button
          variant={isActive("/groups") ? "default" : "ghost"}
          size="icon"
        >
          <Users className="h-5 w-5" />
        </Button>
      </Link>
      <Link to="/friends">
        <Button
          variant={isActive("/friends") ? "default" : "ghost"}
          size="icon"
        >
          <UserPlus className="h-5 w-5" />
        </Button>
      </Link>
      <Button
        variant="ghost"
        size="icon"
        onClick={handleLogout}
      >
        <LogOut className="h-5 w-5" />
      </Button>
    </nav>
  );
};
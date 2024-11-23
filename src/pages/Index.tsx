import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { MessageSquare, Shield, Users, Zap } from "lucide-react";

export default function Index() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  const features = [
    {
      icon: <MessageSquare className="h-8 w-8" />,
      title: "Real-time Chat",
      description: "Instant messaging with real-time updates and message status"
    },
    {
      icon: <Users className="h-8 w-8" />,
      title: "Group Chats",
      description: "Create and manage group conversations with multiple participants"
    },
    {
      icon: <Shield className="h-8 w-8" />,
      title: "Secure",
      description: "End-to-end encryption and secure authentication"
    },
    {
      icon: <Zap className="h-8 w-8" />,
      title: "Fast & Reliable",
      description: "Built with modern technology for speed and reliability"
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-secondary/20">
      {/* Hero Section */}
      <div className="container mx-auto px-4 py-16 text-center">
        <h1 className="text-4xl md:text-6xl font-bold mb-6 text-primary">
          Welcome to Panda Chat
        </h1>
        <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
          A modern chat application with real-time messaging, group chats, and more.
        </p>
        <div className="flex gap-4 justify-center">
          {currentUser ? (
            <Button size="lg" onClick={() => navigate("/chat")}>
              Go to Chat
            </Button>
          ) : (
            <>
              <Button size="lg" onClick={() => navigate("/signin")}>
                Get Started
              </Button>
              <Button size="lg" variant="outline" onClick={() => navigate("/signup")}>
                Sign Up
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Features Section */}
      <div className="container mx-auto px-4 py-16">
        <h2 className="text-3xl font-bold text-center mb-12">Features</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {features.map((feature, index) => (
            <div
              key={index}
              className="p-6 rounded-lg border bg-card text-card-foreground shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="mb-4 text-primary">{feature.icon}</div>
              <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
              <p className="text-muted-foreground">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Call to Action */}
      <div className="container mx-auto px-4 py-16 text-center">
        <div className="max-w-3xl mx-auto p-8 rounded-lg bg-card border shadow-lg">
          <h2 className="text-3xl font-bold mb-4">Ready to get started?</h2>
          <p className="text-muted-foreground mb-8">
            Join thousands of users already enjoying Panda Chat.
          </p>
          {currentUser ? (
            <Button size="lg" onClick={() => navigate("/chat")}>
              Continue to Chat
            </Button>
          ) : (
            <Button size="lg" onClick={() => navigate("/signup")}>
              Create an Account
            </Button>
          )}
        </div>
      </div>

      {/* Footer */}
      <footer className="container mx-auto px-4 py-8 mt-16 border-t">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="text-muted-foreground">
            &copy; 2024 Panda Chat. All rights reserved.
          </div>
          <div className="flex gap-4">
            <a href="#" className="text-muted-foreground hover:text-primary">
              Privacy Policy
            </a>
            <a href="#" className="text-muted-foreground hover:text-primary">
              Terms of Service
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
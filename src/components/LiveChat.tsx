import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Send, FileText, Gift, ChevronRight, ChevronLeft, MessageCircle, X } from "lucide-react";
import { LevelCrown } from "@/components/LevelCrown";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import { OnlineCounter } from "@/components/OnlineCounter";
import { GiveawayWidget } from "@/components/GiveawayWidget";
import { CreateGiveawayDialog } from "@/components/CreateGiveawayDialog";
import { UserProfileDialog } from "@/components/UserProfileDialog";
import logo from "@/assets/logo.png";

interface Message {
  id: string;
  user_id: string;
  username: string;
  message: string;
  created_at: string;
  reply_to_id?: string | null;
  reply_to_username?: string | null;
  reply_to_message?: string | null;
  profiles?: {
    avatar_url: string | null;
    roblox_username: string | null;
    level: number;
  };
}

export const LiveChat = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [tosOpen, setTosOpen] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(true);
  const [profileDialogOpen, setProfileDialogOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();
  const { toast } = useToast();

  const fetchMessages = useCallback(async () => {
    const { data, error } = await supabase
      .from("chat_messages")
      .select(`
        *,
        profiles!chat_messages_user_id_fkey(avatar_url, roblox_username, level)
      `)
      .order("created_at", { ascending: true })
      .limit(100);

    if (!error && data) {
      setMessages(data as any);
    }
  }, []);

  useEffect(() => {
    // Get current user
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
      if (user) {
        // Get profile
        supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .single()
          .then(({ data }) => setProfile(data));
      }
    });

    // Fetch initial messages
    fetchMessages();

    // Subscribe to new messages
    const channel = supabase
      .channel("chat_messages")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "chat_messages",
        },
        async (payload) => {
          // Fetch the profile data for the new message
          const { data: profile } = await supabase
            .from("profiles")
            .select("avatar_url, roblox_username, level")
            .eq("id", (payload.new as any).user_id)
            .single();
          
          const messageWithProfile = {
            ...payload.new,
            profiles: profile
          };
          setMessages((prev) => [...prev, messageWithProfile as Message]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchMessages]);

  useEffect(() => {
    // Auto scroll to bottom
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newMessage.trim() || !user || !profile) {
      if (!user) {
        toast({
          title: "Login required",
          description: "Please login to send messages",
          variant: "destructive",
        });
      }
      return;
    }

    const { error } = await supabase.from("chat_messages").insert({
      user_id: user.id,
      username: profile.username,
      message: newMessage.trim(),
      reply_to_id: replyTo?.id || null,
      reply_to_username: replyTo?.username || null,
      reply_to_message: replyTo?.message || null,
    });

    if (error) {
      toast({
        title: "Error",
        description: "Failed to send message",
        variant: "destructive",
      });
    } else {
      setNewMessage("");
      setReplyTo(null);
    }
  }, [user, profile, newMessage, replyTo, toast]);

  const chatContent = (
    <>
      <div className="p-4 border-b border-border/50 bg-gradient-to-r from-card to-card/80">
        <div className="flex items-center justify-center mb-3">
          <img src={logo} alt="RBXRoyale" className="h-12" />
        </div>
        <div className="flex items-center justify-between gap-2">
          <OnlineCounter />
          
          <div className="flex gap-2">
            <CreateGiveawayDialog 
              trigger={
                <Button variant="outline" size="icon">
                  <Gift className="w-4 h-4" />
                </Button>
              }
            />

          <Dialog open={tosOpen} onOpenChange={setTosOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="icon">
                <FileText className="w-4 h-4" />
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto bg-card border-border">
              <DialogHeader>
                <DialogTitle className="text-2xl font-bold text-primary">Terms of Service</DialogTitle>
              </DialogHeader>
              <ScrollArea className="h-96 pr-4">
                <div className="space-y-6 text-sm text-foreground">
                  <section>
                    <h3 className="font-bold text-lg mb-2 text-primary">1. Acceptance of Terms</h3>
                    <p className="text-muted-foreground">
                      By accessing and using RBXRoyale ("the Platform"), you agree to be bound by these Terms of Service. 
                      If you do not agree to these terms, please do not use our services.
                    </p>
                  </section>

                  <section>
                    <h3 className="font-bold text-lg mb-2 text-primary">2. Eligibility</h3>
                    <p className="text-muted-foreground">
                      You must be at least 13 years old to use this Platform. By using RBXRoyale, you represent and warrant 
                      that you meet this age requirement and have the right, authority, and capacity to enter into this agreement.
                    </p>
                  </section>

                  <section>
                    <h3 className="font-bold text-lg mb-2 text-primary">3. Virtual Items and Currency</h3>
                    <p className="text-muted-foreground">
                      All virtual items, currencies, and rewards on the Platform have no real-world monetary value outside the platform. 
                      They are for entertainment purposes only. Items are provided "as is" without any warranties.
                    </p>
                  </section>

                  <section>
                    <h3 className="font-bold text-lg mb-2 text-primary">4. Game Rules and Fair Play</h3>
                    <p className="text-muted-foreground">
                      Users must play fairly and not use any exploits, bots, or third-party software to gain unfair advantages. 
                      Violation of fair play rules may result in account suspension or termination without refund.
                    </p>
                  </section>

                  <section>
                    <h3 className="font-bold text-lg mb-2 text-primary">5. Transactions</h3>
                    <p className="text-muted-foreground">
                      All deposits and transactions are final. Refunds are not provided except where required by law. 
                      You are responsible for maintaining the security of your account and all transactions made under it.
                    </p>
                  </section>

                  <section>
                    <h3 className="font-bold text-lg mb-2 text-primary">6. Account Termination</h3>
                    <p className="text-muted-foreground">
                      We reserve the right to suspend or terminate your account at any time for violation of these terms, 
                      fraudulent activity, or any other reason we deem necessary to protect the Platform and its users.
                    </p>
                  </section>

                  <section>
                    <h3 className="font-bold text-lg mb-2 text-primary">7. Limitation of Liability</h3>
                    <p className="text-muted-foreground">
                      RBXRoyale is provided "as is" without warranties of any kind. We are not liable for any damages arising 
                      from your use of the Platform, including but not limited to loss of virtual items, account access, or data.
                    </p>
                  </section>

                  <section>
                    <h3 className="font-bold text-lg mb-2 text-primary">8. Responsible Gaming</h3>
                    <p className="text-muted-foreground">
                      Please play responsibly. If you feel you may have a gaming problem, we encourage you to seek help 
                      and consider limiting or stopping your use of the Platform.
                    </p>
                  </section>

                  <section>
                    <h3 className="font-bold text-lg mb-2 text-primary">9. Disclaimer</h3>
                    <p className="text-muted-foreground">
                      RBXRoyale is not affiliated with, endorsed by, or sponsored by Roblox Corporation. Use at your own risk.
                    </p>
                  </section>

                  <p className="text-xs text-muted-foreground pt-4">Last updated: November 2025</p>
                </div>
              </ScrollArea>
            </DialogContent>
          </Dialog>
          </div>
        </div>
      </div>

      <GiveawayWidget />

      <ScrollArea className="flex-1 p-4">
        <div className="space-y-2">
          {messages.map((msg) => (
            <div key={msg.id} className="animate-fade-in">
              <div className="bg-secondary/30 border border-border rounded-lg p-3 hover:bg-secondary/50 transition-all duration-200 group">
                {msg.reply_to_message && (
                  <div className="mb-2 pl-3 border-l-2 border-primary/50 text-xs text-muted-foreground">
                    <span className="font-medium text-primary">{msg.reply_to_username}</span>
                    <p className="truncate">{msg.reply_to_message}</p>
                  </div>
                )}
                <div className="flex items-start gap-3">
                  <Avatar className="w-8 h-8 flex-shrink-0">
                    <AvatarImage src={msg.profiles?.avatar_url || undefined} />
                    <AvatarFallback className="text-xs bg-primary/20 text-primary font-bold">
                      {(msg.profiles?.roblox_username || msg.username || 'U')[0].toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-2 mb-1 flex-wrap">
                      <span 
                        className="text-sm font-semibold text-primary cursor-pointer hover:underline"
                        onClick={() => {
                          setSelectedUserId(msg.user_id);
                          setProfileDialogOpen(true);
                        }}
                      >
                        {msg.profiles?.roblox_username || msg.username}
                      </span>
                      {msg.profiles?.level && (
                        <LevelCrown level={msg.profiles.level} size="sm" />
                      )}
                      <span className="text-xs text-muted-foreground">
                        {new Date(msg.created_at).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                    <p className="text-sm text-foreground/90 break-words leading-relaxed">
                      {msg.message}
                    </p>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="mt-1 h-6 px-2 text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => setReplyTo(msg)}
                    >
                      Reply
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      <form onSubmit={sendMessage} className="p-4 border-t border-border/50 bg-card/80 backdrop-blur-sm">
        {replyTo && (
          <div className="mb-2 p-2 bg-secondary/50 rounded-lg flex items-start justify-between gap-2 animate-fade-in">
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-primary">
                Replying to {replyTo.profiles?.roblox_username || replyTo.username}
              </p>
              <p className="text-xs text-muted-foreground truncate">{replyTo.message}</p>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => setReplyTo(null)}
            >
              <X className="w-3 h-3" />
            </Button>
          </div>
        )}
        <div className="flex gap-2">
          <Input
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder={user ? (replyTo ? "Type your reply..." : "Type a message...") : "Login to chat"}
            disabled={!user}
            className="flex-1 bg-background/50 transition-all"
            maxLength={500}
          />
          <Button
            type="submit"
            size="icon"
            disabled={!user || !newMessage.trim()}
            className="shadow-glow"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </form>
    </>
  );

  if (isMobile) {
    return (
      <>
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="fixed right-4 top-4 z-50 md:hidden"
            >
              <MessageCircle className="h-6 w-6" />
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-full sm:w-96 p-0">
            <div className="flex flex-col h-full">
              {chatContent}
            </div>
          </SheetContent>
        </Sheet>
        
        <UserProfileDialog 
          open={profileDialogOpen}
          onOpenChange={setProfileDialogOpen}
          userId={selectedUserId}
        />
      </>
    );
  }

  return (
    <>
      {/* Toggle Button - Desktop Only */}
      <Button
        onClick={() => setIsChatOpen(!isChatOpen)}
        className="fixed right-2 top-1/2 -translate-y-1/2 z-50 h-12 w-8 p-0 shadow-glow hidden md:flex"
        style={{ right: isChatOpen ? '384px' : '8px' }}
      >
        {isChatOpen ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
      </Button>

      {/* Chat Panel - Desktop */}
      <div 
        className={`fixed right-0 top-0 h-screen w-96 bg-card/95 backdrop-blur-sm border-l border-border flex flex-col shadow-2xl z-40 transition-transform duration-300 hidden md:flex ${
          isChatOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {chatContent}
      </div>
    
      <UserProfileDialog 
        open={profileDialogOpen}
        onOpenChange={setProfileDialogOpen}
        userId={selectedUserId}
      />
    </>
  );
};

import { useState, useEffect, useRef } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Send, FileText, Gift, Timer, Plus, ChevronRight, ChevronLeft } from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { OnlineCounter } from "@/components/OnlineCounter";
import logo from "@/assets/logo.png";

interface Message {
  id: string;
  user_id: string;
  username: string;
  message: string;
  created_at: string;
  profiles?: {
    avatar_url: string | null;
    roblox_username: string | null;
  };
}

export const LiveChat = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [userItems, setUserItems] = useState<any[]>([]);
  const [selectedItem, setSelectedItem] = useState("");
  const [giveaways, setGiveaways] = useState<any[]>([]);
  const [tosOpen, setTosOpen] = useState(false);
  const [giveawayOpen, setGiveawayOpen] = useState(false);
  const [selectedGiveawayItem, setSelectedGiveawayItem] = useState<string>("");
  const [isChatOpen, setIsChatOpen] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

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
        
        // Get user items
        fetchUserItems(user.id);
      }
    });

    // Fetch initial messages
    fetchMessages();
    fetchGiveaways();

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
            .select("avatar_url, roblox_username")
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

    // Subscribe to giveaway changes
    const giveawayChannel = supabase
      .channel("giveaways")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "giveaways",
        },
        () => {
          fetchGiveaways();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      supabase.removeChannel(giveawayChannel);
    };
  }, []);

  useEffect(() => {
    // Auto scroll to bottom
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const fetchMessages = async () => {
    const { data, error } = await supabase
      .from("chat_messages")
      .select(`
        *,
        profiles!chat_messages_user_id_fkey(avatar_url, roblox_username)
      `)
      .order("created_at", { ascending: true })
      .limit(100);

    if (!error && data) {
      setMessages(data as any);
    }
  };

  const fetchUserItems = async (userId: string) => {
    const { data } = await supabase
      .from("user_items")
      .select(`
        *,
        items (*)
      `)
      .eq("user_id", userId);
    
    if (data) {
      setUserItems(data);
    }
  };

  const fetchGiveaways = async () => {
    const { data } = await supabase
      .from("giveaways")
      .select(`
        *,
        items (*),
        profiles!giveaways_creator_id_fkey (username),
        giveaway_entries (
          id,
          user_id,
          profiles (username)
        )
      `)
      .eq("status", "active")
      .order("created_at", { ascending: false });
    
    if (data) {
      setGiveaways(data);
    }
  };

  const createGiveaway = async () => {
    if (!user || !selectedGiveawayItem) {
      toast({ title: "Please select an item", variant: "destructive" });
      return;
    }

    const userItem = userItems.find(ui => ui.item_id === selectedGiveawayItem);
    if (!userItem) return;

    // Remove item from user's inventory
    const { error: deleteError } = await supabase
      .from("user_items")
      .delete()
      .eq("id", userItem.id);

    if (deleteError) {
      toast({ title: "Error creating giveaway", variant: "destructive" });
      return;
    }

    // Create giveaway
    const { error: giveawayError } = await supabase
      .from("giveaways")
      .insert({
        creator_id: user.id,
        item_id: selectedGiveawayItem,
        status: "active"
      });

    if (giveawayError) {
      toast({ title: "Error creating giveaway", variant: "destructive" });
      return;
    }

    toast({ title: "Giveaway created!", description: "Users can now join!" });
    setGiveawayOpen(false);
    setSelectedGiveawayItem("");
    fetchUserItems(user.id);
  };

  const joinGiveaway = async (giveawayId: string) => {
    if (!user) {
      toast({ title: "Login required", variant: "destructive" });
      return;
    }

    const { error } = await supabase
      .from("giveaway_entries")
      .insert({
        giveaway_id: giveawayId,
        user_id: user.id
      });

    if (error) {
      if (error.code === "23505") {
        toast({ title: "Already joined", description: "You've already joined this giveaway", variant: "destructive" });
      } else {
        toast({ title: "Error joining giveaway", variant: "destructive" });
      }
      return;
    }

    toast({ title: "Joined giveaway!", description: "Good luck!" });
  };

  const sendMessage = async (e: React.FormEvent) => {
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
    });

    if (error) {
      toast({
        title: "Error",
        description: "Failed to send message",
        variant: "destructive",
      });
    } else {
      setNewMessage("");
    }
  };

  return (
    <>
      {/* Toggle Button - Always Visible */}
      <Button
        onClick={() => setIsChatOpen(!isChatOpen)}
        className="fixed right-2 top-1/2 -translate-y-1/2 z-50 h-12 w-8 p-0 shadow-glow"
        style={{ right: isChatOpen ? '384px' : '8px' }}
      >
        {isChatOpen ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
      </Button>

      {/* Chat Panel */}
      <div 
        className={`fixed right-0 top-0 h-screen w-96 bg-card/95 backdrop-blur-sm border-l border-border flex flex-col shadow-2xl z-40 transition-transform duration-300 ${
          isChatOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
      <div className="p-4 border-b border-border/50 bg-gradient-to-r from-card to-card/80">
        <div className="flex items-center justify-center mb-3">
          <img src={logo} alt="RBXRoyale" className="h-12" />
        </div>
        <div className="flex items-center justify-between gap-2">
          <OnlineCounter />
          
          <div className="flex gap-2">
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

          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="icon" className="relative">
                <Gift className="w-4 h-4" />
                {giveaways.length > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-primary text-primary-foreground text-xs rounded-full flex items-center justify-center">
                    {giveaways.length}
                  </span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-0 bg-card border-border" align="end">
              <div className="flex items-center justify-between p-3 border-b border-border">
                <div className="flex items-center gap-2">
                  <Gift className="w-4 h-4 text-primary" />
                  <h3 className="font-semibold text-sm">Giveaways</h3>
                </div>
                <Dialog open={giveawayOpen} onOpenChange={setGiveawayOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm" className="h-7 text-xs">
                      <Plus className="w-3 h-3 mr-1" />
                      Create
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-md bg-card border-border">
                    <DialogHeader>
                      <DialogTitle className="text-xl font-bold text-primary">Create Giveaway</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <label className="text-sm font-medium mb-2 block text-foreground">Select Item from Your Inventory</label>
                        <Select value={selectedGiveawayItem} onValueChange={setSelectedGiveawayItem}>
                          <SelectTrigger className="bg-input border-border">
                            <SelectValue placeholder="Choose an item" />
                          </SelectTrigger>
                          <SelectContent className="bg-card border-border">
                            {userItems.map((ui) => (
                              <SelectItem key={ui.id} value={ui.item_id}>
                                {ui.items?.name} - ${ui.items?.value} ({ui.items?.rarity})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {userItems.length === 0 && (
                          <p className="text-xs text-muted-foreground mt-2">
                            You need items in your inventory to create a giveaway
                          </p>
                        )}
                      </div>
                      <Button 
                        onClick={createGiveaway} 
                        className="w-full border border-primary/20 shadow-glow" 
                        disabled={!user || !selectedGiveawayItem || userItems.length === 0}
                      >
                        Create Giveaway
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
              <ScrollArea className="max-h-96">
                <div className="p-2 space-y-2">
                  {giveaways.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground text-sm">
                      <Gift className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      <p>No active giveaways</p>
                    </div>
                  ) : (
                    giveaways.map((giveaway) => {
                      const timeLeft = Math.max(0, new Date(giveaway.ends_at).getTime() - Date.now());
                      const secondsLeft = Math.floor(timeLeft / 1000);
                      const hasJoined = giveaway.giveaway_entries?.some((e: any) => e.user_id === user?.id);
                      
                      return (
                        <Card key={giveaway.id} className="p-3 bg-muted/30 hover:bg-muted/50 transition-colors border-border">
                          <div className="flex gap-3">
                            {giveaway.items?.image_url && (
                              <div className="w-16 h-16 flex-shrink-0 rounded bg-background/50 border border-border overflow-hidden">
                                <img 
                                  src={giveaway.items.image_url} 
                                  alt={giveaway.items.name}
                                  className="w-full h-full object-contain"
                                />
                              </div>
                            )}
                            <div className="flex-1 min-w-0 space-y-2">
                              <div>
                                <div className="flex items-center justify-between gap-2">
                                  <span className="text-sm font-semibold truncate">{giveaway.items?.name}</span>
                                  <span className="text-xs font-bold text-primary flex-shrink-0">${giveaway.items?.value}</span>
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  by {giveaway.profiles?.username}
                                </div>
                              </div>
                              <div className="flex items-center justify-between text-xs">
                                <span className="flex items-center gap-1 text-muted-foreground">
                                  <Timer className="w-3 h-3" />
                                  {secondsLeft}s
                                </span>
                                <span className="text-muted-foreground">{giveaway.giveaway_entries?.length || 0} entries</span>
                              </div>
                              <Button 
                                size="sm" 
                                className="w-full h-7 text-xs" 
                                onClick={() => joinGiveaway(giveaway.id)}
                                disabled={hasJoined || !user}
                              >
                                {hasJoined ? "Joined ✓" : "Join Giveaway"}
                              </Button>
                            </div>
                          </div>
                        </Card>
                      );
                    })
                  )}
                </div>
              </ScrollArea>
            </PopoverContent>
          </Popover>
          </div>
        </div>
      </div>

      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4">
          {/* Chat Messages */}
          {messages.map((msg) => (
            <div key={msg.id} className="group hover:bg-muted/30 p-3 rounded-lg transition-colors">
              <div className="flex items-start gap-2">
                <Avatar className="w-8 h-8 flex-shrink-0">
                  <AvatarImage src={msg.profiles?.avatar_url || undefined} />
                  <AvatarFallback className="text-xs bg-primary/20 text-primary font-bold">
                    {(msg.profiles?.roblox_username || msg.username || 'U')[0].toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2 mb-1">
                    <span className="text-sm font-semibold text-primary">
                      {msg.profiles?.roblox_username || msg.username}
                    </span>
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
                </div>
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      <form onSubmit={sendMessage} className="p-4 border-t border-border/50 bg-card/80 backdrop-blur-sm">
        <div className="flex gap-2">
          <Input
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder={user ? "Type a message..." : "Login to chat"}
            disabled={!user}
            className="flex-1 bg-background/50"
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
    </div>
    </>
  );
};

import { useState, useEffect, useRef } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Send, FileText, Gift, Timer } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import logo from "@/assets/logo.png";

interface Message {
  id: string;
  username: string;
  message: string;
  created_at: string;
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
  const scrollRef = useRef<HTMLDivElement>(null);
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
        (payload) => {
          setMessages((prev) => [...prev, payload.new as Message]);
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
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const fetchMessages = async () => {
    const { data, error } = await supabase
      .from("chat_messages")
      .select("*")
      .order("created_at", { ascending: true })
      .limit(100);

    if (!error && data) {
      setMessages(data);
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
    if (!user || !selectedItem) {
      toast({ title: "Please select an item", variant: "destructive" });
      return;
    }

    const userItem = userItems.find(ui => ui.item_id === selectedItem);
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
        item_id: selectedItem,
        status: "active"
      });

    if (giveawayError) {
      toast({ title: "Error creating giveaway", variant: "destructive" });
      return;
    }

    toast({ title: "Giveaway created!", description: "Users can now join!" });
    setGiveawayOpen(false);
    setSelectedItem("");
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
    <div className="fixed right-0 top-0 h-screen w-96 bg-card/95 backdrop-blur-sm border-l border-border flex flex-col shadow-2xl z-40">
      <div className="p-4 border-b border-border/50 bg-gradient-to-r from-card to-card/80">
        <div className="flex items-center justify-center mb-3">
          <img src={logo} alt="RBXRoyale" className="h-12" />
        </div>
        <div className="flex gap-2">
          <Dialog open={tosOpen} onOpenChange={setTosOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="flex-1">
                <FileText className="w-4 h-4 mr-2" />
                TOS
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Terms of Service</DialogTitle>
              </DialogHeader>
              <ScrollArea className="h-96">
                <div className="space-y-4 text-sm">
                  <p>Welcome to RBXRoyale. By using our services, you agree to the following terms:</p>
                  
                  <h3 className="font-semibold">1. Eligibility</h3>
                  <p>You must be at least 13 years old to use this platform.</p>
                  
                  <h3 className="font-semibold">2. Account Security</h3>
                  <p>You are responsible for maintaining the security of your account and any activities under it.</p>
                  
                  <h3 className="font-semibold">3. Fair Play</h3>
                  <p>Any form of cheating, exploiting, or unfair advantage will result in account termination.</p>
                  
                  <h3 className="font-semibold">4. Virtual Items</h3>
                  <p>All items have value only within the platform. We are not responsible for trades outside our system.</p>
                  
                  <h3 className="font-semibold">5. Deposits & Withdrawals</h3>
                  <p>All transactions are final. Process times may vary. Minimum amounts apply.</p>
                  
                  <h3 className="font-semibold">6. Prohibited Activities</h3>
                  <p>No harassment, scamming, or illegal activities. Violations will be reported and accounts banned.</p>
                  
                  <h3 className="font-semibold">7. Disclaimer</h3>
                  <p>RBXRoyale is not affiliated with Roblox Corporation. Use at your own risk.</p>
                  
                  <p className="text-muted-foreground">Last updated: November 2025</p>
                </div>
              </ScrollArea>
            </DialogContent>
          </Dialog>

          <Dialog open={giveawayOpen} onOpenChange={setGiveawayOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="flex-1">
                <Gift className="w-4 h-4 mr-2" />
                Giveaway
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Giveaway</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Select Item</label>
                  <Select value={selectedItem} onValueChange={setSelectedItem}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose an item" />
                    </SelectTrigger>
                    <SelectContent>
                      {userItems.map((ui) => (
                        <SelectItem key={ui.id} value={ui.item_id}>
                          {ui.items?.name} - ${ui.items?.value}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={createGiveaway} className="w-full" disabled={!user || !selectedItem}>
                  Create Giveaway
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <ScrollArea className="flex-1 p-4" ref={scrollRef}>
        <div className="space-y-4">
          {/* Active Giveaways */}
          {giveaways.length > 0 && (
            <div className="space-y-2 mb-4">
              <h3 className="text-sm font-semibold text-primary flex items-center gap-2">
                <Gift className="w-4 h-4" />
                Active Giveaways
              </h3>
              {giveaways.map((giveaway) => {
                const timeLeft = Math.max(0, new Date(giveaway.ends_at).getTime() - Date.now());
                const secondsLeft = Math.floor(timeLeft / 1000);
                const hasJoined = giveaway.giveaway_entries?.some((e: any) => e.user_id === user?.id);
                
                return (
                  <Card key={giveaway.id} className="p-3 bg-muted/50">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">{giveaway.items?.name}</span>
                        <span className="text-xs text-primary">${giveaway.items?.value}</span>
                      </div>
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Timer className="w-3 h-3" />
                          {secondsLeft}s left
                        </span>
                        <span>{giveaway.giveaway_entries?.length || 0} entries</span>
                      </div>
                      <Button 
                        size="sm" 
                        className="w-full" 
                        onClick={() => joinGiveaway(giveaway.id)}
                        disabled={hasJoined || !user}
                      >
                        {hasJoined ? "Joined" : "Join"}
                      </Button>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}

          {/* Chat Messages */}
          {messages.map((msg) => (
            <div key={msg.id} className="group hover:bg-muted/30 p-3 rounded-lg transition-colors">
              <div className="flex items-baseline gap-2 mb-1">
                <span className="text-sm font-semibold text-primary">
                  {msg.username}
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
          ))}
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
  );
};

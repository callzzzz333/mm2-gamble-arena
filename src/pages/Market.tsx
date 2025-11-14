import { useState, useEffect } from "react";
import { Sidebar } from "@/components/Sidebar";
import { TopBar } from "@/components/TopBar";
import { LiveChat } from "@/components/LiveChat";
import { MobileBottomNav } from "@/components/MobileBottomNav";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { Package, Search, Clock, ShoppingCart, User, Filter } from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Listing {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  items: any[];
  price: number;
  status: string;
  created_at: string;
  profiles?: {
    username: string;
    roblox_username: string;
  };
}

export default function Market() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("newest");
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    fetchListings();
    subscribeToListings();
  }, []);

  const fetchListings = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("marketplace_listings")
      .select(`
        *,
        profiles (username, roblox_username)
      `)
      .eq("status", "active")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching listings:", error);
      toast({
        title: "Error",
        description: "Failed to load marketplace listings",
        variant: "destructive",
      });
    } else {
      setListings(data as any || []);
    }
    setLoading(false);
  };

  const subscribeToListings = () => {
    const channel = supabase
      .channel("marketplace-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "marketplace_listings",
        },
        () => {
          fetchListings();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const handleBuyListing = async (listing: Listing) => {
    if (!user) {
      toast({
        title: "Authentication required",
        description: "Please log in to purchase items",
        variant: "destructive",
      });
      navigate("/auth");
      return;
    }

    if (listing.user_id === user.id) {
      toast({
        title: "Cannot purchase",
        description: "You cannot buy your own listing",
        variant: "destructive",
      });
      return;
    }

    // Check user balance
    const { data: profile } = await supabase
      .from("profiles")
      .select("balance")
      .eq("id", user.id)
      .single();

    if (!profile || profile.balance < listing.price) {
      toast({
        title: "Insufficient balance",
        description: "You don't have enough balance to purchase this listing",
        variant: "destructive",
      });
      return;
    }

    // Execute purchase
    const success = await supabase.rpc("update_user_balance", {
      p_user_id: user.id,
      p_amount: -listing.price,
      p_type: "purchase",
      p_description: `Purchased: ${listing.title}`,
    });

    if (success.data) {
      // Credit seller
      await supabase.rpc("update_user_balance", {
        p_user_id: listing.user_id,
        p_amount: listing.price * 0.95, // 5% marketplace fee
        p_type: "sale",
        p_description: `Sold: ${listing.title}`,
      });

      // Add items to buyer inventory
      for (const item of listing.items) {
        await supabase.rpc("update_user_balance", {
          p_user_id: user.id,
          p_amount: 0,
          p_type: "item_received",
          p_description: `Received ${item.quantity}x ${item.name}`,
        });
      }

      // Record transaction
      await supabase.from("marketplace_transactions").insert({
        listing_id: listing.id,
        seller_id: listing.user_id,
        buyer_id: user.id,
        items: listing.items,
        price: listing.price,
      });

      // Update listing status
      await supabase
        .from("marketplace_listings")
        .update({ status: "sold", sold_to: user.id, sold_at: new Date().toISOString() })
        .eq("id", listing.id);

      toast({
        title: "Purchase successful!",
        description: `You bought ${listing.title} for $${listing.price.toFixed(2)}`,
      });
    } else {
      toast({
        title: "Purchase failed",
        description: "Transaction failed. Please try again.",
        variant: "destructive",
      });
    }
  };

  const filteredListings = listings
    .filter(
      (listing) =>
        listing.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        listing.description?.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => {
      switch (sortBy) {
        case "price-low":
          return a.price - b.price;
        case "price-high":
          return b.price - a.price;
        case "oldest":
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        default: // newest
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
    });

  const getRarityColor = (rarity: string) => {
    const colors: Record<string, string> = {
      Legendary: "bg-yellow-500",
      Mythical: "bg-purple-500",
      Ancient: "bg-red-500",
      Vintage: "bg-blue-500",
      Godly: "bg-pink-500",
      Unique: "bg-green-500",
      Rare: "bg-cyan-500",
      Uncommon: "bg-gray-400",
      Common: "bg-gray-300",
    };
    return colors[rarity] || "bg-gray-500";
  };

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <TopBar />
        
        <main className="flex-1 overflow-y-auto p-6 pb-24 lg:pb-6">
          <div className="max-w-7xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <div>
                <h1 className="text-4xl font-bold bg-gradient-to-r from-primary via-primary/80 to-primary bg-clip-text text-transparent">
                  Marketplace
                </h1>
                <p className="text-muted-foreground mt-1">
                  Browse and purchase Roblox items from other players
                </p>
              </div>
              
              <Button onClick={() => navigate("/create-listing")} size="lg">
                <Package className="w-4 h-4 mr-2" />
                Create Listing
              </Button>
            </div>

            {/* Search and Filters */}
            <Card className="p-4">
              <div className="flex flex-col lg:flex-row gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Search listings..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="w-full lg:w-48">
                    <Filter className="w-4 h-4 mr-2" />
                    <SelectValue placeholder="Sort by" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="newest">Newest First</SelectItem>
                    <SelectItem value="oldest">Oldest First</SelectItem>
                    <SelectItem value="price-low">Price: Low to High</SelectItem>
                    <SelectItem value="price-high">Price: High to Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </Card>

            {/* Listings Grid */}
            {loading ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground">Loading listings...</p>
              </div>
            ) : filteredListings.length === 0 ? (
              <Card className="p-12 text-center">
                <Package className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-xl font-semibold mb-2">No listings found</h3>
                <p className="text-muted-foreground mb-6">
                  {searchTerm ? "Try adjusting your search" : "Be the first to create a listing!"}
                </p>
                <Button onClick={() => navigate("/create-listing")}>
                  Create Listing
                </Button>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredListings.map((listing) => (
                  <Card key={listing.id} className="p-4 hover:shadow-lg transition-shadow">
                    <div className="space-y-3">
                      {/* Header */}
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="font-semibold text-lg line-clamp-1">{listing.title}</h3>
                          <div className="flex items-center gap-2 mt-1">
                            <User className="w-3 h-3 text-muted-foreground" />
                            <span className="text-sm text-muted-foreground">
                              {listing.profiles?.username || "Unknown"}
                            </span>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-2xl font-bold text-primary">${listing.price.toFixed(2)}</p>
                        </div>
                      </div>

                      {/* Description */}
                      {listing.description && (
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {listing.description}
                        </p>
                      )}

                      {/* Items */}
                      <div className="space-y-2">
                        <p className="text-xs font-semibold text-muted-foreground uppercase">
                          Items ({listing.items.length})
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {listing.items.slice(0, 3).map((item: any, idx: number) => (
                            <Badge key={idx} className={getRarityColor(item.rarity)}>
                              {item.quantity}x {item.name}
                            </Badge>
                          ))}
                          {listing.items.length > 3 && (
                            <Badge variant="outline">+{listing.items.length - 3} more</Badge>
                          )}
                        </div>
                      </div>

                      {/* Time */}
                      <div className="flex items-center gap-2 text-xs text-muted-foreground pt-2 border-t">
                        <Clock className="w-3 h-3" />
                        <span>{new Date(listing.created_at).toLocaleDateString()}</span>
                      </div>

                      {/* Buy Button */}
                      <Button
                        className="w-full"
                        onClick={() => handleBuyListing(listing)}
                        disabled={listing.user_id === user?.id}
                      >
                        <ShoppingCart className="w-4 h-4 mr-2" />
                        {listing.user_id === user?.id ? "Your Listing" : "Buy Now"}
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </main>
      </div>

      <LiveChat />
      <MobileBottomNav />
    </div>
  );
}

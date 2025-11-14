import { useState, useEffect } from "react";
import { Sidebar } from "@/components/Sidebar";
import { TopBar } from "@/components/TopBar";
import { LiveChat } from "@/components/LiveChat";
import { MobileBottomNav } from "@/components/MobileBottomNav";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { Package, Clock, CheckCircle, XCircle, Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface Listing {
  id: string;
  title: string;
  description: string | null;
  items: any[];
  price: number;
  status: string;
  created_at: string;
  sold_at: string | null;
}

export default function MyListings() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const { toast } = useToast();
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      fetchMyListings();
    }
  }, [user]);

  const fetchMyListings = async () => {
    if (!user) return;
    
    setLoading(true);
    const { data, error } = await supabase
      .from("marketplace_listings")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching listings:", error);
      toast({
        title: "Error",
        description: "Failed to load your listings",
        variant: "destructive",
      });
    } else {
      setListings(data as any || []);
    }
    setLoading(false);
  };

  const handleDeleteListing = async (id: string) => {
    const { error } = await supabase
      .from("marketplace_listings")
      .delete()
      .eq("id", id)
      .eq("user_id", user?.id);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to delete listing",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Listing deleted",
        description: "Your listing has been removed from the marketplace",
      });
      fetchMyListings();
    }
    setDeleteId(null);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return (
          <Badge className="bg-green-500">
            <Clock className="w-3 h-3 mr-1" />
            Active
          </Badge>
        );
      case "sold":
        return (
          <Badge className="bg-blue-500">
            <CheckCircle className="w-3 h-3 mr-1" />
            Sold
          </Badge>
        );
      case "cancelled":
        return (
          <Badge variant="destructive">
            <XCircle className="w-3 h-3 mr-1" />
            Cancelled
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

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
                  My Listings
                </h1>
                <p className="text-muted-foreground mt-1">
                  Manage your marketplace listings
                </p>
              </div>

              <Button onClick={() => navigate("/create-listing")} size="lg">
                <Package className="w-4 h-4 mr-2" />
                Create New Listing
              </Button>
            </div>

            {/* Listings */}
            {loading ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground">Loading your listings...</p>
              </div>
            ) : listings.length === 0 ? (
              <Card className="p-12 text-center">
                <Package className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-xl font-semibold mb-2">No listings yet</h3>
                <p className="text-muted-foreground mb-6">
                  Create your first listing to start selling on the marketplace
                </p>
                <Button onClick={() => navigate("/create-listing")}>
                  Create Listing
                </Button>
              </Card>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {listings.map((listing) => (
                  <Card key={listing.id} className="p-6">
                    <div className="space-y-4">
                      {/* Header */}
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="font-semibold text-xl">{listing.title}</h3>
                          {listing.description && (
                            <p className="text-sm text-muted-foreground mt-1">
                              {listing.description}
                            </p>
                          )}
                        </div>
                        {getStatusBadge(listing.status)}
                      </div>

                      {/* Price */}
                      <div className="flex items-center justify-between py-3 border-y">
                        <span className="text-muted-foreground">Price</span>
                        <span className="text-2xl font-bold text-primary">
                          ${listing.price.toFixed(2)}
                        </span>
                      </div>

                      {/* Items */}
                      <div className="space-y-2">
                        <p className="text-sm font-semibold text-muted-foreground">
                          Items ({listing.items.length})
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {listing.items.map((item: any, idx: number) => (
                            <Badge key={idx} className={getRarityColor(item.rarity)}>
                              {item.quantity}x {item.name}
                            </Badge>
                          ))}
                        </div>
                      </div>

                      {/* Dates */}
                      <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t">
                        <div className="flex items-center gap-2">
                          <Clock className="w-3 h-3" />
                          <span>Listed: {new Date(listing.created_at).toLocaleDateString()}</span>
                        </div>
                        {listing.sold_at && (
                          <span>Sold: {new Date(listing.sold_at).toLocaleDateString()}</span>
                        )}
                      </div>

                      {/* Actions */}
                      {listing.status === "active" && (
                        <Button
                          variant="destructive"
                          className="w-full"
                          onClick={() => setDeleteId(listing.id)}
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Cancel Listing
                        </Button>
                      )}
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </main>
      </div>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Listing</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to cancel this listing? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep Listing</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteId && handleDeleteListing(deleteId)}>
              Cancel Listing
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <LiveChat />
      <MobileBottomNav />
    </div>
  );
}

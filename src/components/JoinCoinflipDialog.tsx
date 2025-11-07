import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { UserInventoryDialog } from "@/components/UserInventoryDialog";
import { Package, Minus, Coins } from "lucide-react";
import coinHeads from "@/assets/coin-heads.png";
import coinTails from "@/assets/coin-tails.png";

interface Item {
  id: string;
  name: string;
  rarity: string;
  value: number;
  image_url: string | null;
}

interface SelectedItem {
  item: Item;
  quantity: number;
}

interface CoinflipGame {
  id: string;
  creator_id: string;
  bet_amount: string;
  creator_side: string;
  creator_items: any[];
  profiles: any;
}

interface JoinCoinflipDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  game: CoinflipGame | null;
  onJoin: (game: CoinflipGame, items: SelectedItem[]) => void;
  isJoining: boolean;
}

export const JoinCoinflipDialog = ({ 
  open, 
  onOpenChange, 
  game, 
  onJoin,
  isJoining 
}: JoinCoinflipDialogProps) => {
  const [selectedItems, setSelectedItems] = useState<SelectedItem[]>([]);
  const [inventoryOpen, setInventoryOpen] = useState(false);

  const handleSelectItem = (itemWithQty: Item & { quantity: number }) => {
    const existing = selectedItems.find(si => si.item.id === itemWithQty.id);
    if (existing) {
      setSelectedItems(selectedItems.map(si =>
        si.item.id === itemWithQty.id ? { ...si, quantity: si.quantity + 1 } : si
      ));
    } else {
      const { quantity, ...item } = itemWithQty;
      setSelectedItems([...selectedItems, { item, quantity: 1 }]);
    }
  };

  const removeItem = (itemId: string) => {
    const existing = selectedItems.find(si => si.item.id === itemId);
    if (existing && existing.quantity > 1) {
      setSelectedItems(selectedItems.map(si =>
        si.item.id === itemId ? { ...si, quantity: si.quantity - 1 } : si
      ));
    } else {
      setSelectedItems(selectedItems.filter(si => si.item.id !== itemId));
    }
  };

  const getTotalValue = () => {
    return selectedItems.reduce((sum, si) => sum + (si.item.value * si.quantity), 0);
  };

  const getRarityColor = (rarity: string) => {
    const colors: any = {
      'Godly': 'bg-red-500/20 text-red-500',
      'Ancient': 'bg-purple-500/20 text-purple-500',
      'Legendary': 'bg-orange-500/20 text-orange-500',
      'Rare': 'bg-blue-500/20 text-blue-500',
      'Uncommon': 'bg-green-500/20 text-green-500',
      'Common': 'bg-gray-500/20 text-gray-500'
    };
    return colors[rarity] || 'bg-gray-500/20 text-gray-500';
  };

  const handleClose = (open: boolean) => {
    if (!open) {
      setSelectedItems([]);
    }
    onOpenChange(open);
  };

  const handleJoin = () => {
    if (game) {
      onJoin(game, selectedItems);
      setSelectedItems([]);
    }
  };

  if (!game) return null;

  const betAmount = parseFloat(game.bet_amount);
  const minBet = betAmount * 0.9;
  const maxBet = betAmount * 1.1;
  const userTotal = getTotalValue();
  const canJoin = userTotal >= minBet && userTotal <= maxBet && selectedItems.length > 0;
  const playerSide = game.creator_side === 'heads' ? 'tails' : 'heads';

  return (
    <>
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-2xl">
              <Coins className="w-6 h-6 text-primary" />
              Join Coinflip Game
            </DialogTitle>
            <DialogDescription>
              Select items to match the bet amount (±10%)
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Game Info */}
            <Card className="p-4 bg-muted/50">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Avatar className="w-10 h-10">
                    <AvatarImage src={game.profiles?.avatar_url || undefined} />
                    <AvatarFallback className="bg-primary/20 text-primary font-bold">
                      {(game.profiles?.roblox_username || game.profiles?.username || 'U')[0].toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-semibold">{game.profiles?.roblox_username || game.profiles?.username || 'Unknown'}</p>
                    <p className="text-xs text-muted-foreground">Opponent</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-primary">${betAmount.toFixed(2)}</p>
                  <p className="text-xs text-muted-foreground">${minBet.toFixed(0)}-${maxBet.toFixed(0)} range</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex items-center gap-2 p-2 bg-background rounded-lg">
                  <div className="relative w-10 h-10 rounded-full overflow-hidden flex-shrink-0">
                    <img 
                      src={game.creator_side === 'heads' ? coinHeads : coinTails} 
                      alt={game.creator_side}
                      className="w-full h-full object-contain"
                    />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-xl font-black text-white drop-shadow-[0_0_6px_rgba(0,0,0,1)]">
                        {game.creator_side === 'heads' ? 'H' : 'T'}
                      </span>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Opponent Side</p>
                    <p className="font-semibold uppercase">{game.creator_side}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 p-2 bg-primary/10 rounded-lg border border-primary/30">
                  <div className="relative w-10 h-10 rounded-full overflow-hidden flex-shrink-0">
                    <img 
                      src={playerSide === 'heads' ? coinHeads : coinTails} 
                      alt={playerSide}
                      className="w-full h-full object-contain"
                    />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-xl font-black text-white drop-shadow-[0_0_6px_rgba(0,0,0,1)]">
                        {playerSide === 'heads' ? 'H' : 'T'}
                      </span>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Your Side</p>
                    <p className="font-semibold uppercase text-primary">{playerSide}</p>
                  </div>
                </div>
              </div>
            </Card>

            {/* Item Selection */}
            <div>
              <label className="text-sm font-medium mb-2 block">Select Your Items</label>
              <Button 
                variant="outline" 
                className="w-full justify-start gap-2"
                onClick={() => setInventoryOpen(true)}
              >
                <Package className="w-4 h-4" />
                {selectedItems.length === 0 ? 'Select from inventory' : `${selectedItems.length} items selected`}
              </Button>

              {selectedItems.length > 0 && (
                <div className="mt-3 space-y-2">
                  {selectedItems.map((si) => (
                    <div key={si.item.id} className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                      {si.item.image_url && (
                        <img src={si.item.image_url} alt={si.item.name} className="w-12 h-12 object-cover rounded" />
                      )}
                      <div className="flex-1">
                        <p className="font-semibold text-sm">{si.item.name}</p>
                        <div className="flex items-center gap-2">
                          <Badge className={getRarityColor(si.item.rarity)}>{si.item.rarity}</Badge>
                          <span className="text-xs text-muted-foreground">x{si.quantity}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-primary">${(si.item.value * si.quantity).toFixed(2)}</p>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => removeItem(si.item.id)}
                        >
                          <Minus className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                  <div className="pt-2 border-t border-border flex items-center justify-between">
                    <p className="text-lg font-bold">Your Total:</p>
                    <div className="text-right">
                      <p className="text-lg font-bold text-primary">${userTotal.toFixed(2)}</p>
                      {userTotal < minBet && (
                        <p className="text-xs text-destructive">Too low (min: ${minBet.toFixed(2)})</p>
                      )}
                      {userTotal > maxBet && (
                        <p className="text-xs text-destructive">Too high (max: ${maxBet.toFixed(2)})</p>
                      )}
                      {canJoin && (
                        <p className="text-xs text-green-500">✓ Within range</p>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => handleClose(false)} disabled={isJoining}>
              Cancel
            </Button>
            <Button 
              onClick={handleJoin}
              disabled={!canJoin || isJoining}
            >
              {isJoining ? 'Joining...' : `Join Game - ${playerSide.toUpperCase()}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <UserInventoryDialog 
        open={inventoryOpen} 
        onOpenChange={setInventoryOpen}
        onSelectItem={handleSelectItem}
        multiSelect={true}
        selectedItems={selectedItems.map(si => si.item.id)}
      />
    </>
  );
};

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const LiveBets = () => {
  return (
    <div className="bg-card rounded-xl border border-border p-6">
      <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
        <span className="w-2 h-2 bg-primary rounded-full animate-pulse"></span>
        Live Activity
      </h2>
      
      <Tabs defaultValue="live" className="w-full">
        <TabsList className="bg-secondary">
          <TabsTrigger value="live">Live Bets</TabsTrigger>
          <TabsTrigger value="luckiest">Luckiest</TabsTrigger>
          <TabsTrigger value="biggest">Biggest</TabsTrigger>
        </TabsList>
        
        <TabsContent value="live" className="mt-6">
          <div className="text-center py-12 text-muted-foreground">
            No recent bets to display
          </div>
        </TabsContent>
        
        <TabsContent value="luckiest" className="mt-6">
          <div className="text-center py-12 text-muted-foreground">
            No data available
          </div>
        </TabsContent>
        
        <TabsContent value="biggest" className="mt-6">
          <div className="text-center py-12 text-muted-foreground">
            No data available
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

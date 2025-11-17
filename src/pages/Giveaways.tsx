import { Sidebar } from "@/components/Sidebar";
import { TopBar } from "@/components/TopBar";
import { MobileBottomNav } from "@/components/MobileBottomNav";

const Giveaways = () => {
  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <div className="md:ml-64">
        <TopBar />
        <main className="container mx-auto px-4 py-8 pb-24 md:pb-8">
          <h1 className="text-4xl font-bold mb-6">Giveaways</h1>
          <p className="text-muted-foreground">Coming soon...</p>
        </main>
      </div>
      <MobileBottomNav />
    </div>
  );
};

export default Giveaways;

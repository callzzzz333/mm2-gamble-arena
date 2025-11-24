import { useEffect, useState, memo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Activity, TrendingUp, DollarSign } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface ActivityItem {
  id: string;
  activity_type: string;
  amount: number | null;
  created_at: string;
  metadata: any;
}

export const ActivityFeed = memo(() => {
  const [activities, setActivities] = useState<ActivityItem[]>([]);

  useEffect(() => {
    fetchActivities();

    // Real-time subscription
    const channel = supabase
      .channel('activity-feed')
      .on('postgres_changes', 
        { event: 'INSERT', schema: 'public', table: 'activity_feed' },
        (payload) => {
          setActivities(prev => [payload.new as ActivityItem, ...prev].slice(0, 20));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchActivities = async () => {
    const { data } = await supabase
      .from('activity_feed')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(20);

    if (data) setActivities(data);
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'deposit':
        return <DollarSign className="h-4 w-4 text-green-500" />;
      case 'trade':
        return <TrendingUp className="h-4 w-4 text-blue-500" />;
      default:
        return <Activity className="h-4 w-4 text-primary" />;
    }
  };

  return (
    <Card className="p-4">
      <div className="flex items-center gap-2 mb-4">
        <Activity className="h-5 w-5 text-primary" />
        <h3 className="font-semibold">Live Activity</h3>
        <div className="ml-auto">
          <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
        </div>
      </div>

      <ScrollArea className="h-[300px]">
        <div className="space-y-2">
          {activities.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No recent activity
            </p>
          ) : (
            activities.map((activity) => (
              <div
                key={activity.id}
                className="flex items-center gap-3 p-2 rounded-lg bg-muted/50 hover:bg-muted transition-colors animate-fade-in"
              >
                {getActivityIcon(activity.activity_type)}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate capitalize">
                    {activity.activity_type.replace('_', ' ')}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(activity.created_at).toLocaleTimeString()}
                  </p>
                </div>
                {activity.amount && (
                  <span className="text-sm font-semibold text-primary">
                    ${Number(activity.amount).toFixed(2)}
                  </span>
                )}
              </div>
            ))
          )}
        </div>
      </ScrollArea>
    </Card>
  );
});
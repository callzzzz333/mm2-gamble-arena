import { useEffect, useState, memo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Users } from "lucide-react";
import { Card } from "@/components/ui/card";

export const OnlineUsersCounter = memo(() => {
  const [onlineUsers, setOnlineUsers] = useState(0);

  useEffect(() => {
    const channel = supabase.channel('online-users', {
      config: {
        presence: {
          key: 'user',
        },
      },
    });

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        setOnlineUsers(Object.keys(state).length);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({
            online_at: new Date().toISOString(),
          });
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return (
    <Card className="p-4">
      <div className="flex items-center gap-3">
        <div className="relative">
          <Users className="h-5 w-5 text-primary" />
          <div className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-green-500 animate-pulse" />
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Online Users</p>
          <p className="text-2xl font-bold">{onlineUsers}</p>
        </div>
      </div>
    </Card>
  );
});
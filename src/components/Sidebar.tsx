import { Home, Sword, Trophy, Users, Wallet, Settings } from "lucide-react";
import { NavLink } from "react-router-dom";

const navItems = [
  { icon: Home, label: "Home", path: "/" },
  { icon: Sword, label: "PVP", path: "/pvp" },
  { icon: Trophy, label: "Jackpot", path: "/jackpot" },
  { icon: Users, label: "Leaderboard", path: "/leaderboard" },
  { icon: Wallet, label: "Wallet", path: "/wallet" },
  { icon: Settings, label: "Settings", path: "/settings" },
];

export const Sidebar = () => {
  return (
    <aside className="fixed left-0 top-0 h-screen w-16 bg-sidebar border-r border-sidebar-border flex flex-col items-center py-6 gap-6 z-50">
      {navItems.map((item) => {
        const Icon = item.icon;
        return (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `relative group flex items-center justify-center w-10 h-10 rounded-lg transition-all duration-200 ${
                isActive
                  ? "bg-sidebar-accent text-primary"
                  : "text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
              }`
            }
          >
            <Icon className="w-5 h-5" />
            <div className="absolute left-full ml-2 px-3 py-1.5 bg-popover text-popover-foreground text-sm rounded-md opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50">
              {item.label}
            </div>
          </NavLink>
        );
      })}
    </aside>
  );
};

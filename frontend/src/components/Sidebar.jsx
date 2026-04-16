import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import {
  LayoutGrid,
  Link2,
  Key,
  BookOpen,
  BarChart3,
  Settings,
  LogOut,
} from "lucide-react";

const navItems = [
  { label: "Dashboard", icon: LayoutGrid, path: "/", exact: true },
  { label: "Connect", icon: Link2, path: "/connect", exact: true },
  { label: "API Keys", icon: Key, path: "/keys", exact: false },
  { label: "Docs", icon: BookOpen, path: "/docs", exact: false },
  { label: "Analytics", icon: BarChart3, path: "/analytics", exact: false },
  { label: "Settings", icon: Settings, path: "/settings", exact: true },
];

export default function Sidebar() {
  const { pathname } = useLocation();
  const { user, logout } = useAuth();

  const initial = user?.name?.charAt(0)?.toUpperCase() || user?.email?.charAt(0)?.toUpperCase() || "U";

  return (
    <aside
      className="fixed left-0 top-0 bottom-0 w-64 bg-[#09090B] border-r border-[#27272A] flex flex-col z-40"
      data-testid="sidebar"
    >
      {/* Logo */}
      <div className="h-14 flex items-center px-5 border-b border-[#27272A]">
        <Link to="/" className="flex items-center gap-2" data-testid="sidebar-logo">
          <span className="text-[#2563EB] font-semibold text-lg tracking-tight">Scalable</span>
        </Link>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-3 px-3 space-y-0.5" data-testid="sidebar-nav">
        {navItems.map((item) => {
          const isActive = item.exact ? pathname === item.path : pathname === item.path || pathname.startsWith(item.path + "/");
          return (
            <Link
              key={item.path}
              to={item.path}
              data-testid={`sidebar-nav-${item.label.toLowerCase()}`}
              className={`flex items-center gap-3 h-10 px-3 text-sm transition-colors duration-150 rounded-sm
                ${isActive
                  ? "bg-[#2563EB]/10 text-[#2563EB] border-l-2 border-[#2563EB] pl-[10px]"
                  : "text-[#A1A1AA] hover:bg-[#18181B] hover:text-[#FAFAFA] border-l-2 border-transparent pl-[10px]"
                }`}
            >
              <item.icon className="w-4 h-4 shrink-0" strokeWidth={1.5} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* User section */}
      <div className="border-t border-[#27272A] p-3" data-testid="sidebar-user">
        <div className="flex items-center gap-3 px-2">
          <div className="w-8 h-8 rounded-sm bg-[#18181B] border border-[#27272A] flex items-center justify-center text-xs font-medium text-[#FAFAFA]">
            {initial}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm text-[#FAFAFA] truncate">{user?.name || "User"}</p>
            <p className="text-xs text-[#71717A] truncate">{user?.email}</p>
          </div>
          <button
            onClick={logout}
            data-testid="sidebar-logout-btn"
            className="p-1.5 text-[#71717A] hover:text-[#FAFAFA] hover:bg-[#18181B] rounded-sm transition-colors"
            title="Logout"
          >
            <LogOut className="w-4 h-4" strokeWidth={1.5} />
          </button>
        </div>
      </div>
    </aside>
  );
}

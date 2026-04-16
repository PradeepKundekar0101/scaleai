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
      className="fixed left-0 top-0 bottom-0 w-64 bg-white border-r border-[#dcd7d3] flex flex-col z-40"
      data-testid="sidebar"
    >
      {/* Logo */}
      <div className="h-16 flex items-center px-6 border-b border-[#dcd7d3]">
        <Link to="/" className="flex items-center gap-2.5" data-testid="sidebar-logo">
          <div className="w-7 h-7 bg-[#1b1938] rounded-lg flex items-center justify-center">
            <span className="text-white text-xs font-bold">S</span>
          </div>
          <span className="text-[#292827] font-semibold text-lg tracking-tight">Scalable</span>
        </Link>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-4 px-3 space-y-0.5" data-testid="sidebar-nav">
        {navItems.map((item) => {
          const isActive = item.exact ? pathname === item.path : pathname === item.path || pathname.startsWith(item.path + "/");
          return (
            <Link
              key={item.path}
              to={item.path}
              data-testid={`sidebar-nav-${item.label.toLowerCase()}`}
              className={`flex items-center gap-3 h-10 px-3 text-sm transition-all duration-150 rounded-lg
                ${isActive
                  ? "bg-[#cbb7fb]/15 text-[#714cb6] font-medium"
                  : "text-[#292827]/60 hover:bg-[#f5f3f0] hover:text-[#292827]"
                }`}
            >
              <item.icon className="w-[18px] h-[18px] shrink-0" strokeWidth={1.5} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* User section */}
      <div className="border-t border-[#dcd7d3] p-3" data-testid="sidebar-user">
        <div className="flex items-center gap-3 px-2">
          <div className="w-8 h-8 rounded-lg bg-[#1b1938] flex items-center justify-center text-xs font-semibold text-white">
            {initial}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm text-[#292827] font-medium truncate">{user?.name || "User"}</p>
            <p className="text-xs text-[#292827]/50 truncate">{user?.email}</p>
          </div>
          <button
            onClick={logout}
            data-testid="sidebar-logout-btn"
            className="p-1.5 text-[#292827]/40 hover:text-[#292827] hover:bg-[#f5f3f0] rounded-lg transition-colors"
            title="Logout"
          >
            <LogOut className="w-4 h-4" strokeWidth={1.5} />
          </button>
        </div>
      </div>
    </aside>
  );
}

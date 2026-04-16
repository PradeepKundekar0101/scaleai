import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import {
  LayoutGrid,
  Link2,
  Key,
  BookOpen,
  BarChart3,
  Settings,
  LogOut,
  Moon,
  Sun,
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
  const { theme, toggleTheme } = useTheme();

  const initial = user?.name?.charAt(0)?.toUpperCase() || user?.email?.charAt(0)?.toUpperCase() || "U";

  return (
    <aside
      className="fixed left-0 top-0 bottom-0 w-64 bg-[var(--bg-primary)] border-r border-[var(--border-primary)] flex flex-col z-40 transition-colors duration-200"
      data-testid="sidebar"
    >
      {/* Logo */}
      <div className="h-16 flex items-center px-6 border-b border-[var(--border-primary)]">
        <Link to="/" className="flex items-center gap-2.5" data-testid="sidebar-logo">
          <div className="w-7 h-7 bg-[var(--mysteria)] rounded-xl flex items-center justify-center">
            <span className="text-white text-xs font-bold">S</span>
          </div>
          <span className="text-[var(--text-primary)] font-semibold text-lg tracking-tight">Scalable</span>
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
              className={`flex items-center gap-3 h-10 px-3 text-sm transition-all duration-150 rounded-2xl
                ${isActive
                  ? "bg-[var(--accent-primary)]/15 text-[var(--accent-primary)] font-medium"
                  : "text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] hover:text-[var(--text-primary)]"
                }`}
            >
              <item.icon className="w-[18px] h-[18px] shrink-0" strokeWidth={1.5} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Theme Toggle */}
      <div className="px-3 pb-3">
        <button
          onClick={toggleTheme}
          className="w-full flex items-center gap-3 h-10 px-3 text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] hover:text-[var(--text-primary)] rounded-2xl transition-all duration-150"
          title={theme === "light" ? "Switch to Dark Mode" : "Switch to Light Mode"}
        >
          {theme === "light" ? (
            <>
              <Moon className="w-[18px] h-[18px] shrink-0" strokeWidth={1.5} />
              <span>Dark Mode</span>
            </>
          ) : (
            <>
              <Sun className="w-[18px] h-[18px] shrink-0" strokeWidth={1.5} />
              <span>Light Mode</span>
            </>
          )}
        </button>
      </div>

      {/* User section */}
      <div className="border-t border-[var(--border-primary)] p-3" data-testid="sidebar-user">
        <div className="flex items-center gap-3 px-2">
          <div className="w-8 h-8 rounded-xl bg-[var(--mysteria)] flex items-center justify-center text-xs font-semibold text-white">
            {initial}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm text-[var(--text-primary)] font-medium truncate">{user?.name || "User"}</p>
            <p className="text-xs text-[var(--text-tertiary)] truncate">{user?.email}</p>
          </div>
          <button
            onClick={logout}
            data-testid="sidebar-logout-btn"
            className="p-1.5 text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] rounded-xl transition-colors"
            title="Logout"
          >
            <LogOut className="w-4 h-4" strokeWidth={1.5} />
          </button>
        </div>
      </div>
    </aside>
  );
}

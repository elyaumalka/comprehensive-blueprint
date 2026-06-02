import { Link, useLocation } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Users,
  Sparkles,
  Package,
  ShoppingBag,
  ClipboardList,
  Wallet,
  UserCog,
  Calendar,
  Megaphone,
  Settings,
  LogOut,
  Scissors,
  RotateCcw,
  BarChart3,
  History,
  ArrowLeftRight,
} from "lucide-react";
import { useAuth, type AppRole } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface NavItem {
  to: string;
  label: string;
  icon: typeof LayoutDashboard;
  roles?: AppRole[]; // אם מוגדר — מוצג רק לתפקידים האלו (מנהלת תמיד רואה הכל)
}

const navItems: NavItem[] = [
  { to: "/", label: "דשבורד", icon: LayoutDashboard },
  { to: "/customers", label: "לקוחות", icon: Users },
  { to: "/leads", label: "לידים", icon: Sparkles },
  { to: "/products", label: "מוצרים ומלאי", icon: Package },
  { to: "/inventory", label: "תנועות מלאי", icon: ArrowLeftRight, roles: ["admin", "accounting"] },
  { to: "/sales", label: "מכירות", icon: ShoppingBag },
  { to: "/orders", label: "הזמנות", icon: ClipboardList },
  { to: "/returns", label: "החזרות והחלפות", icon: RotateCcw },
  { to: "/accounting", label: "הנהלת חשבונות", icon: Wallet, roles: ["admin", "accounting"] },
  { to: "/reports", label: "דוחות וניתוחים", icon: BarChart3, roles: ["admin", "accounting"] },
  { to: "/employees", label: "עובדות ושעון", icon: UserCog, roles: ["admin", "accounting"] },
  { to: "/calendar", label: "יומן ומשימות", icon: Calendar },
  { to: "/campaigns", label: "קמפיינים", icon: Megaphone, roles: ["admin", "marketing"] },
  { to: "/history", label: "היסטוריית שינויים", icon: History, roles: ["admin"] },
  { to: "/settings", label: "הגדרות", icon: Settings, roles: ["admin"] },
];

export function AppSidebar() {
  const { isAdmin, hasAnyRole, signOut, user } = useAuth();
  const location = useLocation();

  const visibleItems = navItems.filter((i) => !i.roles || isAdmin || hasAnyRole(i.roles));

  return (
    <aside className="fixed top-0 right-0 h-screen w-64 bg-sidebar border-l border-sidebar-border flex flex-col shadow-soft z-40">
      {/* Brand */}
      <div className="px-6 py-6 border-b border-sidebar-border">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gold flex items-center justify-center shadow-soft">
            <Scissors className="w-5 h-5 text-gold-foreground" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-sidebar-foreground tracking-tight">
              הבוטיק
            </h1>
            <p className="text-xs text-muted-foreground">מערכת ניהול</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        {visibleItems.map((item) => {
          const isActive =
            item.to === "/"
              ? location.pathname === "/"
              : location.pathname.startsWith(item.to);
          const Icon = item.icon;
          return (
            <Link
              key={item.to}
              to={item.to}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all",
                isActive
                  ? "bg-gold text-gold-foreground shadow-soft"
                  : "text-sidebar-foreground hover:bg-sidebar-accent",
              )}
            >
              <Icon className="w-4 h-4" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* User footer */}
      <div className="px-3 py-4 border-t border-sidebar-border space-y-2">
        <div className="px-3 py-2 text-xs">
          <p className="text-sidebar-foreground font-medium truncate">{user?.email}</p>
          <p className="text-muted-foreground">{isAdmin ? "מנהלת" : "עובדת"}</p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start gap-2 text-sidebar-foreground hover:bg-sidebar-accent"
          onClick={signOut}
        >
          <LogOut className="w-4 h-4" />
          התנתקות
        </Button>
      </div>
    </aside>
  );
}

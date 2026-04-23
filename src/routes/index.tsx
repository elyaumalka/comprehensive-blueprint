import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { RequireAuth } from "@/components/RequireAuth";
import { AppShell, PageHeader } from "@/components/AppShell";
import { Card } from "@/components/ui/card";
import { useAuth } from "@/lib/auth";
import {
  Users,
  ShoppingBag,
  Package,
  AlertCircle,
  TrendingUp,
  ClipboardList,
} from "lucide-react";

export const Route = createFileRoute("/")({
  component: () => (
    <RequireAuth>
      <DashboardPage />
    </RequireAuth>
  ),
});

function DashboardPage() {
  const { user, isAdmin } = useAuth();

  const { data: stats } = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: async () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const [customers, sales, openOrders, lowStock] = await Promise.all([
        supabase.from("customers").select("id", { count: "exact", head: true }),
        supabase
          .from("sales")
          .select("total")
          .gte("created_at", today.toISOString())
          .eq("is_cancelled", false),
        supabase
          .from("orders")
          .select("id", { count: "exact", head: true })
          .in("status", ["pending", "in_production", "ready", "awaiting_pickup"]),
        supabase.from("product_variants").select("stock_qty, min_stock_alert"),
      ]);

      const todayTotal = (sales.data ?? []).reduce((s, r) => s + Number(r.total ?? 0), 0);
      const lowStockCount = (lowStock.data ?? []).filter(
        (v) => v.stock_qty <= (v.min_stock_alert ?? 1),
      ).length;

      return {
        customersCount: customers.count ?? 0,
        todaySales: todayTotal,
        openOrders: openOrders.count ?? 0,
        lowStockCount,
      };
    },
  });

  return (
    <AppShell>
      <PageHeader
        title={`שלום${user?.email ? "" : ""} 👋`}
        description="סקירה כללית של הפעילות בעסק"
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          icon={TrendingUp}
          label="מכירות היום"
          value={`₪${(stats?.todaySales ?? 0).toLocaleString("he-IL")}`}
          accent="gold"
        />
        <StatCard
          icon={ClipboardList}
          label="הזמנות פתוחות"
          value={String(stats?.openOrders ?? 0)}
        />
        <StatCard
          icon={Users}
          label="סך הלקוחות"
          value={String(stats?.customersCount ?? 0)}
        />
        <StatCard
          icon={AlertCircle}
          label="מלאי נמוך"
          value={String(stats?.lowStockCount ?? 0)}
          alert={(stats?.lowStockCount ?? 0) > 0}
        />
      </div>

      <Card className="p-8 text-center shadow-soft">
        <div className="w-16 h-16 rounded-2xl bg-gold mx-auto mb-4 flex items-center justify-center">
          <ShoppingBag className="w-8 h-8 text-gold-foreground" />
        </div>
        <h2 className="text-xl font-bold mb-2">המערכת מוכנה לשימוש</h2>
        <p className="text-muted-foreground max-w-lg mx-auto">
          זוהי המערכת הראשונית. בשלבים הבאים נוסיף את כל המודולים: לקוחות, לידים, מוצרים,
          מכירות, הנהלת חשבונות, עובדות, יומן וקמפיינים.
        </p>
        {isAdmin && (
          <p className="text-xs gold-accent mt-4 font-medium">✨ את מנהלת המערכת</p>
        )}
      </Card>
    </AppShell>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  accent,
  alert,
}: {
  icon: typeof Users;
  label: string;
  value: string;
  accent?: "gold";
  alert?: boolean;
}) {
  return (
    <Card className="p-5 shadow-soft">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className={`text-2xl font-bold mt-1 ${alert ? "text-alert" : ""}`}>{value}</p>
        </div>
        <div
          className={`w-10 h-10 rounded-lg flex items-center justify-center ${
            alert
              ? "bg-alert/10 text-alert"
              : accent === "gold"
                ? "bg-gold text-gold-foreground"
                : "bg-secondary text-secondary-foreground"
          }`}
        >
          <Icon className="w-5 h-5" />
        </div>
      </div>
    </Card>
  );
}

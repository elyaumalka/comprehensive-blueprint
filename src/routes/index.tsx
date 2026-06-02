import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { RequireAuth } from "@/components/RequireAuth";
import { AppShell, PageHeader } from "@/components/AppShell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { useAuth } from "@/lib/auth";
import { fmtCurrency } from "@/lib/format";
import { toast } from "sonner";
import {
  Users,
  ShoppingBag,
  AlertCircle,
  TrendingUp,
  ClipboardList,
  Target,
  MessageCircle,
  Loader2,
  Calendar,
} from "lucide-react";

export const Route = createFileRoute("/")({
  component: () => (
    <RequireAuth>
      <DashboardPage />
    </RequireAuth>
  ),
});

const now = new Date();
const YEAR = now.getFullYear();
const MONTH = now.getMonth() + 1; // 1-12
const monthStart = new Date(YEAR, MONTH - 1, 1).toISOString();
const todayStart = (() => { const d = new Date(); d.setHours(0, 0, 0, 0); return d.toISOString(); })();

function DashboardPage() {
  const { isAdmin } = useAuth();

  // נתוני ליבה — מתרעננים אוטומטית (זמן אמת)
  const { data: stats } = useQuery({
    queryKey: ["dashboard-stats"],
    refetchInterval: 30000,
    queryFn: async () => {
      const [customers, today, month, openOrders, lowStock, whatsapp] = await Promise.all([
        supabase.from("customers").select("id", { count: "exact", head: true }),
        supabase.from("sales").select("total").gte("created_at", todayStart).eq("is_cancelled", false),
        supabase.from("sales").select("total").gte("created_at", monthStart).eq("is_cancelled", false),
        supabase.from("orders").select("id", { count: "exact", head: true })
          .in("status", ["pending", "in_production", "ready", "awaiting_pickup"]),
        supabase.from("product_variants").select("stock_qty, min_stock_alert"),
        supabase.from("customers").select("id", { count: "exact", head: true }).eq("whatsapp_group", true),
      ]);
      const sum = (rows: { total: number | null }[] | null) => (rows ?? []).reduce((s, r) => s + Number(r.total ?? 0), 0);
      return {
        customersCount: customers.count ?? 0,
        todaySales: sum(today.data),
        monthSales: sum(month.data),
        openOrders: openOrders.count ?? 0,
        lowStockCount: (lowStock.data ?? []).filter((v) => v.stock_qty <= (v.min_stock_alert ?? 1)).length,
        whatsappCount: whatsapp.count ?? 0,
      };
    },
  });

  // יעדים לחודש הנוכחי
  const { data: goals } = useQuery({
    queryKey: ["goals", YEAR, MONTH],
    refetchInterval: 30000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("business_goals")
        .select("*")
        .eq("period_year", YEAR)
        .eq("period_month", MONTH);
      if (error) throw error;
      return data;
    },
  });

  // מכירות לפי עובדת החודש (ליעדי עובדות)
  const { data: empPerf } = useQuery({
    queryKey: ["emp-perf", YEAR, MONTH],
    refetchInterval: 30000,
    queryFn: async () => {
      const [emps, sales] = await Promise.all([
        supabase.from("employees").select("id, full_name").eq("is_active", true),
        supabase.from("sales").select("employee_id, total").gte("created_at", monthStart).eq("is_cancelled", false),
      ]);
      return (emps.data ?? []).map((e) => ({
        id: e.id,
        full_name: e.full_name,
        sold: (sales.data ?? []).filter((s) => s.employee_id === e.id).reduce((s, r) => s + Number(r.total ?? 0), 0),
      }));
    },
  });

  const monthlyGoal = goals?.find((g) => g.goal_type === "monthly_sales")?.target ?? 0;
  const whatsappGoal = goals?.find((g) => g.goal_type === "whatsapp")?.target ?? 0;
  const empGoals = (goals ?? []).filter((g) => g.goal_type === "employee_sales");

  return (
    <AppShell>
      <PageHeader
        title="דשבורד 👋"
        description="סקירה כללית בזמן אמת"
        action={isAdmin ? <GoalsDialog employees={empPerf ?? []} goals={goals ?? []} /> : undefined}
      />

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
        <StatCard icon={TrendingUp} label="מכירות היום" value={fmtCurrency(stats?.todaySales ?? 0)} accent="gold" />
        <StatCard icon={Calendar} label="מכירות החודש" value={fmtCurrency(stats?.monthSales ?? 0)} />
        <StatCard icon={ClipboardList} label="הזמנות פתוחות" value={String(stats?.openOrders ?? 0)} />
        <StatCard icon={Users} label="סך לקוחות" value={String(stats?.customersCount ?? 0)} />
        <StatCard icon={MessageCircle} label="בקבוצת וואטסאפ" value={String(stats?.whatsappCount ?? 0)} />
        <StatCard icon={AlertCircle} label="מלאי נמוך" value={String(stats?.lowStockCount ?? 0)} alert={(stats?.lowStockCount ?? 0) > 0} />
      </div>

      {/* יעדים */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        <GoalCard
          title="יעד מכירות חודשי"
          icon={Target}
          current={stats?.monthSales ?? 0}
          target={Number(monthlyGoal)}
          format={fmtCurrency}
        />
        <GoalCard
          title="יעד הצטרפות לקבוצת וואטסאפ"
          icon={MessageCircle}
          current={stats?.whatsappCount ?? 0}
          target={Number(whatsappGoal)}
          format={(n) => String(Math.round(n))}
        />
      </div>

      {/* יעדי עובדות */}
      {empGoals.length > 0 && (
        <Card className="p-5 shadow-soft">
          <h3 className="font-semibold mb-4 flex items-center gap-2"><Target className="w-4 h-4" />יעדי מכירות לעובדות (החודש)</h3>
          <div className="space-y-4">
            {empGoals.map((g) => {
              const emp = (empPerf ?? []).find((e) => e.id === g.employee_id);
              const current = emp?.sold ?? 0;
              const pct = Number(g.target) > 0 ? Math.min(100, (current / Number(g.target)) * 100) : 0;
              return (
                <div key={g.id}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-medium">{emp?.full_name ?? "—"}</span>
                    <span className="text-muted-foreground">{fmtCurrency(current)} / {fmtCurrency(Number(g.target))}</span>
                  </div>
                  <Progress value={pct} />
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {!monthlyGoal && !whatsappGoal && empGoals.length === 0 && isAdmin && (
        <Card className="p-6 text-center shadow-soft text-muted-foreground">
          עדיין לא הוגדרו יעדים לחודש זה. לחצי על "הגדרת יעדים" כדי להתחיל.
        </Card>
      )}
    </AppShell>
  );
}

function GoalCard({
  title,
  icon: Icon,
  current,
  target,
  format,
}: {
  title: string;
  icon: typeof Target;
  current: number;
  target: number;
  format: (n: number) => string;
}) {
  const pct = target > 0 ? Math.min(100, (current / target) * 100) : 0;
  return (
    <Card className="p-5 shadow-soft">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold flex items-center gap-2"><Icon className="w-4 h-4" />{title}</h3>
        <span className="text-sm text-muted-foreground">{target > 0 ? `${Math.round(pct)}%` : "ללא יעד"}</span>
      </div>
      <div className="flex items-end justify-between mb-2">
        <span className="text-2xl font-bold">{format(current)}</span>
        <span className="text-sm text-muted-foreground">יעד: {target > 0 ? format(target) : "—"}</span>
      </div>
      <Progress value={pct} />
    </Card>
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
    <Card className="p-4 shadow-soft">
      <div className="flex items-start justify-between">
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground truncate">{label}</p>
          <p className={`text-lg font-bold mt-1 ${alert ? "text-alert" : ""}`}>{value}</p>
        </div>
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
          alert ? "bg-alert/10 text-alert" : accent === "gold" ? "bg-gold text-gold-foreground" : "bg-secondary text-secondary-foreground"
        }`}>
          <Icon className="w-4 h-4" />
        </div>
      </div>
    </Card>
  );
}

type GoalRow = { id: string; goal_type: string; employee_id: string | null; target: number };

function GoalsDialog({
  employees,
  goals,
}: {
  employees: { id: string; full_name: string }[];
  goals: GoalRow[];
}) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [monthly, setMonthly] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [empTargets, setEmpTargets] = useState<Record<string, string>>({});

  // טעינת ערכים קיימים כשנפתח
  function syncFromGoals() {
    setMonthly(String(goals.find((g) => g.goal_type === "monthly_sales")?.target ?? ""));
    setWhatsapp(String(goals.find((g) => g.goal_type === "whatsapp")?.target ?? ""));
    const et: Record<string, string> = {};
    goals.filter((g) => g.goal_type === "employee_sales").forEach((g) => {
      if (g.employee_id) et[g.employee_id] = String(g.target);
    });
    setEmpTargets(et);
  }

  const saveMut = useMutation({
    mutationFn: async () => {
      const setGoal = async (goal_type: string, target: number, employee_id: string | null) => {
        const existing = goals.find((g) => g.goal_type === goal_type && g.employee_id === employee_id);
        if (existing) {
          if (target > 0) {
            await supabase.from("business_goals").update({ target }).eq("id", existing.id);
          } else {
            await supabase.from("business_goals").delete().eq("id", existing.id);
          }
        } else if (target > 0) {
          await supabase.from("business_goals").insert({
            goal_type, target, employee_id, period_year: YEAR, period_month: MONTH,
          });
        }
      };
      await setGoal("monthly_sales", Number(monthly) || 0, null);
      await setGoal("whatsapp", Number(whatsapp) || 0, null);
      for (const emp of employees) {
        await setGoal("employee_sales", Number(empTargets[emp.id]) || 0, emp.id);
      }
    },
    onSuccess: () => {
      toast.success("היעדים נשמרו");
      qc.invalidateQueries({ queryKey: ["goals"] });
      setOpen(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (v) syncFromGoals(); }}>
      <DialogTrigger asChild>
        <Button className="gap-2"><Target className="w-4 h-4" />הגדרת יעדים</Button>
      </DialogTrigger>
      <DialogContent dir="rtl" className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>הגדרת יעדים — {MONTH}/{YEAR}</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>יעד מכירות חודשי (₪)</Label>
            <Input type="number" min="0" value={monthly} onChange={(e) => setMonthly(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>יעד מצטרפות לקבוצת וואטסאפ (כמות כוללת)</Label>
            <Input type="number" min="0" value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} />
          </div>
          {employees.length > 0 && (
            <div className="space-y-2">
              <Label>יעד מכירות לעובדת (₪)</Label>
              <div className="space-y-2">
                {employees.map((emp) => (
                  <div key={emp.id} className="flex items-center gap-2">
                    <span className="w-32 text-sm">{emp.full_name}</span>
                    <Input
                      type="number" min="0"
                      value={empTargets[emp.id] ?? ""}
                      onChange={(e) => setEmpTargets({ ...empTargets, [emp.id]: e.target.value })}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button disabled={saveMut.isPending} onClick={() => saveMut.mutate()} className="gap-2">
            {saveMut.isPending && <Loader2 className="w-4 h-4 animate-spin" />}שמירת יעדים
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

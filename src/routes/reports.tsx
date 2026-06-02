import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { RequireAuth } from "@/components/RequireAuth";
import { AppShell, PageHeader } from "@/components/AppShell";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAuth } from "@/lib/auth";
import { fmtCurrency } from "@/lib/format";
import { Lock, Loader2, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

export const Route = createFileRoute("/reports")({
  component: () => (
    <RequireAuth>
      <ReportsPage />
    </RequireAuth>
  ),
});

const MONTHS_HE = ["ינו", "פבר", "מרץ", "אפר", "מאי", "יוני", "יולי", "אוג", "ספט", "אוק", "נוב", "דצמ"];
const GOLD = "#C9A227";
const RED = "#DC2626";
const PALETTE = ["#C9A227", "#7C9885", "#8E7CC3", "#D98880", "#5DADE2", "#F0B27A", "#A2A2A2", "#48C9B0", "#EC7063"];
const currentYear = new Date().getFullYear();

function ReportsPage() {
  const { isAdmin } = useAuth();
  const [year, setYear] = useState(currentYear);

  if (!isAdmin) {
    return (
      <AppShell>
        <PageHeader title="דוחות" />
        <Card className="p-12 text-center shadow-soft">
          <Lock className="w-10 h-10 mx-auto mb-3 text-muted-foreground" />
          <p className="text-muted-foreground">גישה למנהלות בלבד</p>
        </Card>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <PageHeader
        title="דוחות וניתוחים"
        description="ניתוח מכירות, עובדות, מקורות הגעה והוצאות"
        action={
          <div className="flex items-center gap-2 print:hidden">
            <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
              <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
              <SelectContent>
                {[currentYear, currentYear - 1, currentYear - 2].map((y) => (
                  <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" size="icon" onClick={() => window.print()} title="הדפסה / PDF">
              <Printer className="w-4 h-4" />
            </Button>
          </div>
        }
      />

      <Tabs defaultValue="sales">
        <TabsList className="mb-4 flex-wrap h-auto">
          <TabsTrigger value="sales">מכירות</TabsTrigger>
          <TabsTrigger value="profit">רווחיות</TabsTrigger>
          <TabsTrigger value="bestsellers">מוצרים מובילים</TabsTrigger>
          <TabsTrigger value="employees">השוואת עובדות</TabsTrigger>
          <TabsTrigger value="customers">לקוחות</TabsTrigger>
          <TabsTrigger value="canceldiscount">ביטולים והנחות</TabsTrigger>
          <TabsTrigger value="sources">מקורות הגעה</TabsTrigger>
          <TabsTrigger value="returns">החזרות</TabsTrigger>
          <TabsTrigger value="expenses">הוצאות</TabsTrigger>
        </TabsList>
        <TabsContent value="sales"><SalesReport year={year} /></TabsContent>
        <TabsContent value="profit"><ProfitReport year={year} /></TabsContent>
        <TabsContent value="bestsellers"><BestSellersReport year={year} /></TabsContent>
        <TabsContent value="employees"><EmployeesReport year={year} /></TabsContent>
        <TabsContent value="customers"><CustomersReport /></TabsContent>
        <TabsContent value="canceldiscount"><CancelDiscountReport year={year} /></TabsContent>
        <TabsContent value="sources"><SourcesReport year={year} /></TabsContent>
        <TabsContent value="returns"><ReturnsReport year={year} /></TabsContent>
        <TabsContent value="expenses"><ExpensesReport year={year} /></TabsContent>
      </Tabs>
    </AppShell>
  );
}

function yearRange(year: number) {
  return { start: `${year}-01-01`, end: `${year}-12-31T23:59:59` };
}

function Wrap({ loading, children }: { loading: boolean; children: React.ReactNode }) {
  if (loading) return <div className="py-20 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>;
  return <>{children}</>;
}

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <Card className="p-4 shadow-soft">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-xl font-bold mt-1">{value}</p>
    </Card>
  );
}

// ---------- מכירות ----------
function SalesReport({ year }: { year: number }) {
  const { start, end } = yearRange(year);
  const { data, isLoading } = useQuery({
    queryKey: ["report-sales", year],
    queryFn: async () => {
      const { data } = await supabase
        .from("sales")
        .select("total, created_at, installments")
        .gte("created_at", start).lte("created_at", end).eq("is_cancelled", false);
      return data ?? [];
    },
  });

  const months = MONTHS_HE.map((name) => ({ name, total: 0, count: 0 }));
  let morning = 0, evening = 0;
  const byInstallments: Record<string, number> = {};
  (data ?? []).forEach((s) => {
    const d = new Date(s.created_at);
    months[d.getMonth()].total += Number(s.total ?? 0);
    months[d.getMonth()].count += 1;
    if (d.getHours() < 14) morning += 1; else evening += 1;
    const inst = String(s.installments ?? 1);
    byInstallments[inst] = (byInstallments[inst] ?? 0) + 1;
  });
  const totalSum = months.reduce((s, m) => s + m.total, 0);
  const totalCount = months.reduce((s, m) => s + m.count, 0);
  const instData = Object.entries(byInstallments).map(([k, v]) => ({ name: `${k} תשלומים`, value: v }));

  return (
    <Wrap loading={isLoading}>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <Kpi label={`סה"כ מכירות ${year}`} value={fmtCurrency(totalSum)} />
        <Kpi label="כמות עסקאות" value={String(totalCount)} />
        <Kpi label="מכירות בוקר (עד 14:00)" value={String(morning)} />
        <Kpi label="מכירות ערב" value={String(evening)} />
      </div>
      <Card className="p-5 shadow-soft mb-4">
        <h3 className="font-semibold mb-4">מכירות חודשיות {year}</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={months}>
            <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
            <XAxis dataKey="name" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip formatter={(v: number) => fmtCurrency(v)} />
            <Bar dataKey="total" name="מכירות" fill={GOLD} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </Card>
      {instData.length > 0 && (
        <Card className="p-5 shadow-soft">
          <h3 className="font-semibold mb-4">פילוח לפי כמות תשלומים</h3>
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie data={instData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label>
                {instData.map((_, i) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} />)}
              </Pie>
              <Legend />
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </Card>
      )}
    </Wrap>
  );
}

// ---------- השוואת עובדות ----------
function EmployeesReport({ year }: { year: number }) {
  const { start, end } = yearRange(year);
  const { data, isLoading } = useQuery({
    queryKey: ["report-employees", year],
    queryFn: async () => {
      const [emps, sales] = await Promise.all([
        supabase.from("employees").select("id, full_name"),
        supabase.from("sales").select("employee_id, total").gte("created_at", start).lte("created_at", end).eq("is_cancelled", false),
      ]);
      return (emps.data ?? []).map((e) => ({
        name: e.full_name,
        total: (sales.data ?? []).filter((s) => s.employee_id === e.id).reduce((sum, r) => sum + Number(r.total ?? 0), 0),
        count: (sales.data ?? []).filter((s) => s.employee_id === e.id).length,
      })).filter((e) => e.total > 0 || e.count > 0).sort((a, b) => b.total - a.total);
    },
  });

  return (
    <Wrap loading={isLoading}>
      <Card className="p-5 shadow-soft">
        <h3 className="font-semibold mb-4">השוואת מכירות בין עובדות {year}</h3>
        {!data?.length ? (
          <p className="text-sm text-muted-foreground py-6 text-center">אין נתוני מכירות לעובדות בשנה זו</p>
        ) : (
          <ResponsiveContainer width="100%" height={Math.max(220, data.length * 50)}>
            <BarChart data={data} layout="vertical" margin={{ right: 30 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
              <XAxis type="number" tick={{ fontSize: 12 }} />
              <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 12 }} />
              <Tooltip formatter={(v: number) => fmtCurrency(v)} />
              <Bar dataKey="total" name="מכירות" fill={GOLD} radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </Card>
    </Wrap>
  );
}

// ---------- מקורות הגעה ----------
function SourcesReport({ year }: { year: number }) {
  const { data, isLoading } = useQuery({
    queryKey: ["report-sources", year],
    queryFn: async () => {
      const { data } = await supabase.from("customers").select("source");
      const counts: Record<string, number> = {};
      (data ?? []).forEach((c) => {
        const key = c.source || "לא צוין";
        counts[key] = (counts[key] ?? 0) + 1;
      });
      return Object.entries(counts).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
    },
  });

  return (
    <Wrap loading={isLoading}>
      <Card className="p-5 shadow-soft">
        <h3 className="font-semibold mb-4">לקוחות לפי מקור הגעה</h3>
        {!data?.length ? (
          <p className="text-sm text-muted-foreground py-6 text-center">אין נתונים</p>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label>
                {data.map((_, i) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} />)}
              </Pie>
              <Legend />
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        )}
      </Card>
    </Wrap>
  );
}

// ---------- החזרות ----------
function ReturnsReport({ year }: { year: number }) {
  const { start, end } = yearRange(year);
  const { data, isLoading } = useQuery({
    queryKey: ["report-returns", year],
    queryFn: async () => {
      const { data } = await supabase.from("returns").select("action_type, refund_amount").gte("created_at", start).lte("created_at", end);
      const counts: Record<string, number> = { return: 0, exchange: 0, cancel: 0 };
      let refunds = 0;
      (data ?? []).forEach((r) => {
        counts[r.action_type] = (counts[r.action_type] ?? 0) + 1;
        refunds += Number(r.refund_amount ?? 0);
      });
      return {
        chart: [
          { name: "החזרות", value: counts.return },
          { name: "החלפות", value: counts.exchange },
          { name: "ביטולים", value: counts.cancel },
        ],
        total: (data ?? []).length,
        refunds,
      };
    },
  });

  return (
    <Wrap loading={isLoading}>
      <div className="grid grid-cols-2 gap-3 mb-4">
        <Kpi label="סה״כ פעולות" value={String(data?.total ?? 0)} />
        <Kpi label="סה״כ החזרים כספיים" value={fmtCurrency(data?.refunds ?? 0)} />
      </div>
      <Card className="p-5 shadow-soft">
        <h3 className="font-semibold mb-4">החזרות / החלפות / ביטולים {year}</h3>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={data?.chart ?? []}>
            <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
            <XAxis dataKey="name" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
            <Tooltip />
            <Bar dataKey="value" name="כמות" fill={RED} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </Card>
    </Wrap>
  );
}

// ---------- רווחיות (הכנסות מול הוצאות) ----------
function ProfitReport({ year }: { year: number }) {
  const { start, end } = yearRange(year);
  const { data, isLoading } = useQuery({
    queryKey: ["report-profit", year],
    queryFn: async () => {
      const [sales, incomes, expenses] = await Promise.all([
        supabase.from("sales").select("total, created_at").gte("created_at", start).lte("created_at", end).eq("is_cancelled", false),
        supabase.from("manual_incomes").select("amount, income_date").gte("income_date", `${year}-01-01`).lte("income_date", `${year}-12-31`),
        supabase.from("expenses").select("amount, expense_date").gte("expense_date", `${year}-01-01`).lte("expense_date", `${year}-12-31`),
      ]);
      const months = MONTHS_HE.map((name) => ({ name, income: 0, expense: 0, profit: 0 }));
      (sales.data ?? []).forEach((s) => { months[new Date(s.created_at).getMonth()].income += Number(s.total ?? 0); });
      (incomes.data ?? []).forEach((i) => { months[new Date(i.income_date).getMonth()].income += Number(i.amount ?? 0); });
      (expenses.data ?? []).forEach((e) => { months[new Date(e.expense_date).getMonth()].expense += Number(e.amount ?? 0); });
      months.forEach((m) => { m.profit = m.income - m.expense; });
      return months;
    },
  });
  const income = (data ?? []).reduce((s, m) => s + m.income, 0);
  const expense = (data ?? []).reduce((s, m) => s + m.expense, 0);
  return (
    <Wrap loading={isLoading}>
      <div className="grid grid-cols-3 gap-3 mb-4">
        <Kpi label={`הכנסות ${year}`} value={fmtCurrency(income)} />
        <Kpi label="הוצאות" value={fmtCurrency(expense)} />
        <Kpi label="רווח נקי" value={fmtCurrency(income - expense)} />
      </div>
      <Card className="p-5 shadow-soft">
        <h3 className="font-semibold mb-4">רווח נקי חודשי {year} (הכנסות פחות הוצאות)</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data ?? []}>
            <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
            <XAxis dataKey="name" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip formatter={(v: number) => fmtCurrency(v)} />
            <Legend />
            <Bar dataKey="income" name="הכנסות" fill="#7C9885" radius={[4, 4, 0, 0]} />
            <Bar dataKey="expense" name="הוצאות" fill={RED} radius={[4, 4, 0, 0]} />
            <Bar dataKey="profit" name="רווח נקי" fill={GOLD} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </Card>
    </Wrap>
  );
}

// ---------- מוצרים מובילים ----------
function BestSellersReport({ year }: { year: number }) {
  const { start, end } = yearRange(year);
  const { data, isLoading } = useQuery({
    queryKey: ["report-bestsellers", year],
    queryFn: async () => {
      const { data } = await supabase
        .from("sale_items")
        .select("product_name, qty, line_total, sales!inner(created_at, is_cancelled)")
        .gte("sales.created_at", start).lte("sales.created_at", end).eq("sales.is_cancelled", false);
      const map: Record<string, { name: string; qty: number; revenue: number }> = {};
      (data ?? []).forEach((it) => {
        const k = it.product_name;
        if (!map[k]) map[k] = { name: k, qty: 0, revenue: 0 };
        map[k].qty += Number(it.qty ?? 0);
        map[k].revenue += Number(it.line_total ?? 0);
      });
      return Object.values(map).sort((a, b) => b.qty - a.qty).slice(0, 15);
    },
  });
  return (
    <Wrap loading={isLoading}>
      <Card className="p-5 shadow-soft">
        <h3 className="font-semibold mb-4">15 המוצרים הנמכרים ביותר {year}</h3>
        {!data?.length ? <p className="text-sm text-muted-foreground py-6 text-center">אין נתוני מכירות</p> : (
          <Table>
            <TableHeader><TableRow><TableHead>מוצר</TableHead><TableHead>כמות שנמכרה</TableHead><TableHead>הכנסה</TableHead></TableRow></TableHeader>
            <TableBody>
              {data.map((r, i) => (
                <TableRow key={i}>
                  <TableCell className="font-medium">{r.name}</TableCell>
                  <TableCell>{r.qty}</TableCell>
                  <TableCell className="font-semibold">{fmtCurrency(r.revenue)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>
    </Wrap>
  );
}

// ---------- לקוחות (CLV / חוזרות / VIP) ----------
function CustomersReport() {
  const { data, isLoading } = useQuery({
    queryKey: ["report-customers"],
    queryFn: async () => {
      const [custs, sales] = await Promise.all([
        supabase.from("customers").select("id, is_returning, is_vip, whatsapp_group"),
        supabase.from("sales").select("total").eq("is_cancelled", false),
      ]);
      const total = (custs.data ?? []).length;
      const totalRevenue = (sales.data ?? []).reduce((s, r) => s + Number(r.total ?? 0), 0);
      return {
        total,
        returning: (custs.data ?? []).filter((c) => c.is_returning).length,
        vip: (custs.data ?? []).filter((c) => c.is_vip).length,
        whatsapp: (custs.data ?? []).filter((c) => c.whatsapp_group).length,
        clv: total ? totalRevenue / total : 0,
      };
    },
  });
  return (
    <Wrap loading={isLoading}>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Kpi label="סך לקוחות" value={String(data?.total ?? 0)} />
        <Kpi label="לקוחות חוזרות" value={String(data?.returning ?? 0)} />
        <Kpi label="לקוחות VIP" value={String(data?.vip ?? 0)} />
        <Kpi label="בקבוצת וואטסאפ" value={String(data?.whatsapp ?? 0)} />
        <Kpi label="ערך לקוח ממוצע (CLV)" value={fmtCurrency(data?.clv ?? 0)} />
      </div>
    </Wrap>
  );
}

// ---------- ביטולים והנחות ----------
function CancelDiscountReport({ year }: { year: number }) {
  const { start, end } = yearRange(year);
  const { data, isLoading } = useQuery({
    queryKey: ["report-canceldiscount", year],
    queryFn: async () => {
      const { data } = await supabase.from("sales").select("created_at, is_cancelled, discount").gte("created_at", start).lte("created_at", end);
      const months = MONTHS_HE.map((name) => ({ name, cancels: 0, discount: 0 }));
      (data ?? []).forEach((s) => {
        const m = new Date(s.created_at).getMonth();
        if (s.is_cancelled) months[m].cancels += 1;
        months[m].discount += Number(s.discount ?? 0);
      });
      return {
        months,
        totalCancels: (data ?? []).filter((s) => s.is_cancelled).length,
        totalDiscount: (data ?? []).reduce((s, r) => s + Number(r.discount ?? 0), 0),
      };
    },
  });
  return (
    <Wrap loading={isLoading}>
      <div className="grid grid-cols-2 gap-3 mb-4">
        <Kpi label="סה״כ ביטולים" value={String(data?.totalCancels ?? 0)} />
        <Kpi label="סה״כ הנחות שניתנו" value={fmtCurrency(data?.totalDiscount ?? 0)} />
      </div>
      <Card className="p-5 shadow-soft mb-4">
        <h3 className="font-semibold mb-4">ביטולים לפי חודש {year}</h3>
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={data?.months ?? []}>
            <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
            <XAxis dataKey="name" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
            <Tooltip />
            <Bar dataKey="cancels" name="ביטולים" fill={RED} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </Card>
      <Card className="p-5 shadow-soft">
        <h3 className="font-semibold mb-4">הנחות לפי חודש {year}</h3>
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={data?.months ?? []}>
            <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
            <XAxis dataKey="name" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip formatter={(v: number) => fmtCurrency(v)} />
            <Bar dataKey="discount" name="הנחות" fill={GOLD} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </Card>
    </Wrap>
  );
}

// ---------- הוצאות ----------
function ExpensesReport({ year }: { year: number }) {
  const { data, isLoading } = useQuery({
    queryKey: ["report-expenses", year],
    queryFn: async () => {
      const { data } = await supabase
        .from("expenses")
        .select("amount, expense_date, category")
        .gte("expense_date", `${year}-01-01`).lte("expense_date", `${year}-12-31`);
      const months = MONTHS_HE.map((name) => ({ name, total: 0 }));
      const byCat: Record<string, number> = {};
      (data ?? []).forEach((e) => {
        months[new Date(e.expense_date).getMonth()].total += Number(e.amount ?? 0);
        byCat[e.category] = (byCat[e.category] ?? 0) + Number(e.amount ?? 0);
      });
      return { months, total: months.reduce((s, m) => s + m.total, 0), byCat };
    },
  });

  return (
    <Wrap loading={isLoading}>
      <div className="grid grid-cols-2 gap-3 mb-4">
        <Kpi label={`סה"כ הוצאות ${year}`} value={fmtCurrency(data?.total ?? 0)} />
        <Kpi label="ממוצע חודשי" value={fmtCurrency((data?.total ?? 0) / 12)} />
      </div>
      <Card className="p-5 shadow-soft">
        <h3 className="font-semibold mb-4">הוצאות חודשיות {year}</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data?.months ?? []}>
            <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
            <XAxis dataKey="name" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip formatter={(v: number) => fmtCurrency(v)} />
            <Bar dataKey="total" name="הוצאות" fill={RED} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </Card>
    </Wrap>
  );
}

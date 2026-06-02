import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { fmtCurrency, fmtDate } from "@/lib/format";
import {
  Loader2,
  Clock,
  ShoppingBag,
  Wallet,
  Percent,
  Gift,
  Printer,
  Plus,
  Trash2,
  TrendingUp,
  Users,
} from "lucide-react";

export type Employee = {
  id: string;
  full_name: string;
  position: string | null;
  phone: string | null;
  email: string | null;
  hourly_rate: number | null;
  monthly_salary: number | null;
  commission_pct: number | null;
  is_commission_only: boolean | null;
  is_active: boolean;
};

const MONTHS_HE = [
  "ינואר", "פברואר", "מרץ", "אפריל", "מאי", "יוני",
  "יולי", "אוגוסט", "ספטמבר", "אוקטובר", "נובמבר", "דצמבר",
];

const EXPENSE_CATS = [
  { v: "gift", l: "שי" },
  { v: "holiday_gift", l: "מתנת חג" },
  { v: "bonus", l: "בונוס" },
  { v: "reimbursement", l: "החזר הוצאות" },
  { v: "other", l: "אחר" },
];

const currentYear = new Date().getFullYear();

export function EmployeeDetailSheet({
  employee,
  open,
  onOpenChange,
}: {
  employee: Employee | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const qc = useQueryClient();
  const [year, setYear] = useState(currentYear);
  const [edit, setEdit] = useState<Employee | null>(null);

  const emp = edit ?? employee;
  const yearStart = `${year}-01-01`;
  const yearEnd = `${year}-12-31T23:59:59`;

  // ----- שעות עבודה -----
  const { data: timeEntries, isLoading: loadingTime } = useQuery({
    queryKey: ["emp-time", employee?.id, year],
    enabled: !!employee?.id && open,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("time_entries")
        .select("clock_in, total_minutes, overtime_minutes")
        .eq("employee_id", employee!.id)
        .gte("clock_in", yearStart)
        .lte("clock_in", yearEnd);
      if (error) throw error;
      return data;
    },
  });

  // ----- מכירות שטיפלה בהן -----
  const { data: sales, isLoading: loadingSales } = useQuery({
    queryKey: ["emp-sales", employee?.id, year],
    enabled: !!employee?.id && open,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sales")
        .select("total, subtotal, created_at, is_cancelled")
        .eq("employee_id", employee!.id)
        .eq("is_cancelled", false)
        .gte("created_at", yearStart)
        .lte("created_at", yearEnd);
      if (error) throw error;
      return data;
    },
  });

  // ----- לקוחות שהפנתה (עמלת משווקת) -----
  const { data: referred, isLoading: loadingRef } = useQuery({
    queryKey: ["emp-referred", employee?.id, year],
    enabled: !!employee?.id && open,
    queryFn: async () => {
      const { data: custs, error } = await supabase
        .from("customers")
        .select("id, full_name")
        .eq("referred_by_employee_id", employee!.id);
      if (error) throw error;
      if (!custs?.length) return [] as { id: string; full_name: string; total: number; count: number }[];

      const ids = custs.map((c) => c.id);
      const { data: refSales, error: e2 } = await supabase
        .from("sales")
        .select("customer_id, total")
        .in("customer_id", ids)
        .eq("is_cancelled", false)
        .gte("created_at", yearStart)
        .lte("created_at", yearEnd);
      if (e2) throw e2;

      return custs.map((c) => {
        const cs = (refSales ?? []).filter((s) => s.customer_id === c.id);
        return {
          id: c.id,
          full_name: c.full_name,
          total: cs.reduce((s, r) => s + Number(r.total ?? 0), 0),
          count: cs.length,
        };
      });
    },
  });

  // ----- הוצאות נוספות -----
  const { data: expenses, isLoading: loadingExp } = useQuery({
    queryKey: ["emp-expenses", employee?.id, year],
    enabled: !!employee?.id && open,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("employee_expenses")
        .select("*")
        .eq("employee_id", employee!.id)
        .gte("expense_date", yearStart.slice(0, 10))
        .lte("expense_date", `${year}-12-31`)
        .order("expense_date", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // ----- אגרגציה חודשית -----
  const monthly = useMemo(() => {
    const rows = MONTHS_HE.map((name, i) => ({
      month: i,
      name,
      hours: 0,
      overtime: 0,
      salesCount: 0,
      salesTotal: 0,
      expenses: 0,
    }));
    (timeEntries ?? []).forEach((t) => {
      const m = new Date(t.clock_in).getMonth();
      rows[m].hours += Number(t.total_minutes ?? 0) / 60;
      rows[m].overtime += Number(t.overtime_minutes ?? 0) / 60;
    });
    (sales ?? []).forEach((s) => {
      const m = new Date(s.created_at).getMonth();
      rows[m].salesCount += 1;
      rows[m].salesTotal += Number(s.total ?? 0);
    });
    (expenses ?? []).forEach((e) => {
      const m = new Date(e.expense_date).getMonth();
      rows[m].expenses += Number(e.amount ?? 0);
    });
    return rows;
  }, [timeEntries, sales, expenses]);

  const totals = useMemo(() => {
    const hours = monthly.reduce((s, r) => s + r.hours, 0);
    const overtime = monthly.reduce((s, r) => s + r.overtime, 0);
    const salesCount = monthly.reduce((s, r) => s + r.salesCount, 0);
    const salesTotal = monthly.reduce((s, r) => s + r.salesTotal, 0);
    const expensesTotal = monthly.reduce((s, r) => s + r.expenses, 0);
    const referralTotal = (referred ?? []).reduce((s, r) => s + r.total, 0);
    const referralCustomers = (referred ?? []).filter((r) => r.count > 0).length;
    const pct = Number(emp?.commission_pct ?? 0);
    const referralCommission = (referralTotal * pct) / 100;
    return {
      hours,
      overtime,
      salesCount,
      salesTotal,
      expensesTotal,
      referralTotal,
      referralCustomers,
      referralCommission,
    };
  }, [monthly, referred, emp]);

  const loading = loadingTime || loadingSales || loadingRef || loadingExp;
  const isMarketer = !!emp?.is_commission_only || Number(emp?.commission_pct ?? 0) > 0;

  // ----- שמירת פרטי שכר -----
  const saveMut = useMutation({
    mutationFn: async (e: Employee) => {
      const { error } = await supabase
        .from("employees")
        .update({
          hourly_rate: e.hourly_rate,
          monthly_salary: e.monthly_salary,
          commission_pct: e.commission_pct,
          is_commission_only: e.is_commission_only,
        })
        .eq("id", e.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("פרטי השכר נשמרו");
      qc.invalidateQueries({ queryKey: ["employees"] });
      setEdit(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // ----- הוספת הוצאה -----
  const [expForm, setExpForm] = useState({
    category: "gift",
    description: "",
    amount: 0,
    expense_date: new Date().toISOString().slice(0, 10),
  });
  const addExpMut = useMutation({
    mutationFn: async () => {
      if (!employee) return;
      const { error } = await supabase.from("employee_expenses").insert({
        employee_id: employee.id,
        category: expForm.category,
        description: expForm.description || null,
        amount: expForm.amount,
        expense_date: expForm.expense_date,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("ההוצאה נוספה");
      qc.invalidateQueries({ queryKey: ["emp-expenses", employee?.id, year] });
      setExpForm({ category: "gift", description: "", amount: 0, expense_date: new Date().toISOString().slice(0, 10) });
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const delExpMut = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("employee_expenses").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["emp-expenses", employee?.id, year] }),
    onError: (e: Error) => toast.error(e.message),
  });

  if (!emp) return null;

  return (
    <Sheet open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) setEdit(null); }}>
      <SheetContent dir="rtl" side="left" className="w-full sm:max-w-2xl overflow-y-auto print:max-w-none">
        <SheetHeader className="text-right">
          <div className="flex items-center justify-between gap-2">
            <div>
              <SheetTitle className="text-xl">{emp.full_name}</SheetTitle>
              <SheetDescription>
                {emp.position || "עובדת"} · כרטיס עובד ודוח שנתי
              </SheetDescription>
            </div>
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
          </div>
        </SheetHeader>

        {loading ? (
          <div className="py-20 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
        ) : (
          <div className="space-y-5 mt-5">
            {/* כרטיסי סיכום שנתי */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <Kpi icon={Clock} label={`סה"כ שעות ${year}`} value={`${totals.hours.toFixed(1)}`} suffix="שעות" />
              <Kpi icon={TrendingUp} label="שעות נוספות" value={`${totals.overtime.toFixed(1)}`} suffix="שעות" />
              <Kpi icon={ShoppingBag} label="כמות מכירות" value={String(totals.salesCount)} />
              <Kpi icon={Wallet} label='סה"כ נמכר' value={fmtCurrency(totals.salesTotal)} />
              <Kpi icon={Gift} label="הוצאות נוספות" value={fmtCurrency(totals.expensesTotal)} />
              {isMarketer && (
                <Kpi icon={Percent} label="עמלת משווקת" value={fmtCurrency(totals.referralCommission)} accent />
              )}
            </div>

            {/* עמלת משווקת */}
            {isMarketer && (
              <Card className="p-4 shadow-soft">
                <h3 className="font-semibold mb-1 flex items-center gap-2">
                  <Users className="w-4 h-4" />עמלת משווקת (לפי לקוחות שהופנו)
                </h3>
                <p className="text-sm text-muted-foreground mb-3">
                  {totals.referralCustomers} לקוחות הופנו וביצעו רכישה · סה"כ רכישות {fmtCurrency(totals.referralTotal)} ·
                  אחוז עמלה {Number(emp.commission_pct ?? 0)}% ={" "}
                  <span className="font-semibold text-foreground">{fmtCurrency(totals.referralCommission)}</span>
                </p>
                {!referred?.length ? (
                  <p className="text-sm text-muted-foreground py-2">לא הוגדרו לקוחות שהופנו על ידי עובדת זו</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>לקוחה שהופנתה</TableHead>
                        <TableHead>רכישות</TableHead>
                        <TableHead>סכום רכישות</TableHead>
                        <TableHead>עמלה</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {referred.map((r) => (
                        <TableRow key={r.id}>
                          <TableCell className="font-medium">{r.full_name}</TableCell>
                          <TableCell>{r.count}</TableCell>
                          <TableCell>{fmtCurrency(r.total)}</TableCell>
                          <TableCell className="font-semibold">
                            {fmtCurrency((r.total * Number(emp.commission_pct ?? 0)) / 100)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </Card>
            )}

            {/* פירוט חודשי + השוואה */}
            <Card className="p-4 shadow-soft">
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />פירוט חודשי {year} (השוואה בין חודשים)
              </h3>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>חודש</TableHead>
                      <TableHead>שעות</TableHead>
                      <TableHead>ש. נוספות</TableHead>
                      <TableHead>מכירות</TableHead>
                      <TableHead>סכום</TableHead>
                      <TableHead>הוצאות</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {monthly.map((r) => (
                      <TableRow key={r.month} className={r.salesTotal || r.hours ? "" : "text-muted-foreground/60"}>
                        <TableCell className="font-medium">{r.name}</TableCell>
                        <TableCell>{r.hours ? r.hours.toFixed(1) : "-"}</TableCell>
                        <TableCell>{r.overtime ? r.overtime.toFixed(1) : "-"}</TableCell>
                        <TableCell>{r.salesCount || "-"}</TableCell>
                        <TableCell>{r.salesTotal ? fmtCurrency(r.salesTotal) : "-"}</TableCell>
                        <TableCell>{r.expenses ? fmtCurrency(r.expenses) : "-"}</TableCell>
                      </TableRow>
                    ))}
                    <TableRow className="border-t-2 font-bold bg-muted/40">
                      <TableCell>סה"כ שנתי</TableCell>
                      <TableCell>{totals.hours.toFixed(1)}</TableCell>
                      <TableCell>{totals.overtime.toFixed(1)}</TableCell>
                      <TableCell>{totals.salesCount}</TableCell>
                      <TableCell>{fmtCurrency(totals.salesTotal)}</TableCell>
                      <TableCell>{fmtCurrency(totals.expensesTotal)}</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            </Card>

            {/* הוצאות נוספות */}
            <Card className="p-4 shadow-soft">
              <h3 className="font-semibold mb-3 flex items-center gap-2"><Gift className="w-4 h-4" />הוצאות נוספות (שי / מתנות / בונוס)</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-3 print:hidden">
                <Select value={expForm.category} onValueChange={(v) => setExpForm({ ...expForm, category: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {EXPENSE_CATS.map((c) => <SelectItem key={c.v} value={c.v}>{c.l}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Input placeholder="סכום" type="number" min="0" value={expForm.amount || ""} onChange={(e) => setExpForm({ ...expForm, amount: Number(e.target.value) })} />
                <Input type="date" value={expForm.expense_date} onChange={(e) => setExpForm({ ...expForm, expense_date: e.target.value })} />
                <Button onClick={() => addExpMut.mutate()} disabled={addExpMut.isPending || !expForm.amount} className="gap-1">
                  {addExpMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}הוספה
                </Button>
                <Input className="col-span-2 md:col-span-4" placeholder="תיאור (אופציונלי)" value={expForm.description} onChange={(e) => setExpForm({ ...expForm, description: e.target.value })} />
              </div>
              {!expenses?.length ? (
                <p className="text-sm text-muted-foreground py-2">אין הוצאות נוספות לשנה זו</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>תאריך</TableHead>
                      <TableHead>סוג</TableHead>
                      <TableHead>תיאור</TableHead>
                      <TableHead>סכום</TableHead>
                      <TableHead className="print:hidden"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {expenses.map((e) => (
                      <TableRow key={e.id}>
                        <TableCell>{fmtDate(e.expense_date)}</TableCell>
                        <TableCell>{EXPENSE_CATS.find((c) => c.v === e.category)?.l ?? e.category}</TableCell>
                        <TableCell className="text-muted-foreground">{e.description ?? "-"}</TableCell>
                        <TableCell className="font-semibold">{fmtCurrency(e.amount)}</TableCell>
                        <TableCell className="print:hidden">
                          <Button variant="ghost" size="icon" onClick={() => delExpMut.mutate(e.id)}>
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </Card>

            {/* פרטי שכר (עריכה) */}
            <Card className="p-4 shadow-soft print:hidden">
              <h3 className="font-semibold mb-3 flex items-center gap-2"><Wallet className="w-4 h-4" />הגדרות שכר</h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>שכר חודשי</Label>
                  <Input type="number" min="0" value={emp.monthly_salary ?? 0} onChange={(e) => setEdit({ ...emp, monthly_salary: Number(e.target.value) })} />
                </div>
                <div className="space-y-1.5">
                  <Label>שכר שעה</Label>
                  <Input type="number" min="0" value={emp.hourly_rate ?? 0} onChange={(e) => setEdit({ ...emp, hourly_rate: Number(e.target.value) })} />
                </div>
                <div className="space-y-1.5">
                  <Label>אחוז עמלה %</Label>
                  <Input type="number" min="0" step="0.5" value={emp.commission_pct ?? 0} onChange={(e) => setEdit({ ...emp, commission_pct: Number(e.target.value) })} />
                </div>
                <div className="flex items-center justify-between rounded-md border px-3">
                  <Label>עמלה בלבד (משווקת)</Label>
                  <Switch checked={!!emp.is_commission_only} onCheckedChange={(v) => setEdit({ ...emp, is_commission_only: v })} />
                </div>
              </div>
              {edit && (
                <div className="flex justify-end mt-3">
                  <Button size="sm" disabled={saveMut.isPending} onClick={() => saveMut.mutate(edit)} className="gap-2">
                    {saveMut.isPending && <Loader2 className="w-4 h-4 animate-spin" />}שמירת שינויים
                  </Button>
                </div>
              )}
            </Card>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

function Kpi({
  icon: Icon,
  label,
  value,
  suffix,
  accent,
}: {
  icon: typeof Clock;
  label: string;
  value: string;
  suffix?: string;
  accent?: boolean;
}) {
  return (
    <Card className={`p-4 shadow-soft ${accent ? "border-gold/40 bg-gold/5" : ""}`}>
      <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
        <Icon className="w-4 h-4" />{label}
      </div>
      <p className="text-lg font-bold">
        {value} {suffix && <span className="text-xs font-normal text-muted-foreground">{suffix}</span>}
      </p>
    </Card>
  );
}

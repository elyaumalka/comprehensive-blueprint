import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { RequireAuth } from "@/components/RequireAuth";
import { AppShell, PageHeader } from "@/components/AppShell";
import { EmptyState } from "@/components/EmptyState";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";
import { Wallet, Plus, Loader2, TrendingDown, TrendingUp, Lock, Upload, FileText, Receipt } from "lucide-react";
import { fmtCurrency, fmtDate } from "@/lib/format";

const DOC_BUCKET = "supplier-documents";

export const Route = createFileRoute("/accounting")({
  component: () => (
    <RequireAuth>
      <AccountingPage />
    </RequireAuth>
  ),
});

const EXPENSE_CATS = [
  { v: "production_current", l: "ייצור נוכחי" },
  { v: "production_next", l: "ייצור הבא" },
  { v: "rent", l: "שכירות" },
  { v: "salary", l: "משכורות" },
  { v: "marketing", l: "שיווק" },
  { v: "branding", l: "מיתוג" },
  { v: "website", l: "אתר" },
  { v: "crm", l: "CRM" },
  { v: "processing_fees", l: "עמלות סליקה" },
  { v: "insurance", l: "ביטוח" },
  { v: "technology", l: "טכנולוגיה" },
  { v: "tax", l: "מסים" },
  { v: "loan", l: "הלוואה" },
  { v: "other", l: "אחר" },
] as const;

type ExpCat = (typeof EXPENSE_CATS)[number]["v"];

const expSchema = z.object({
  category: z.enum([
    "production_current","production_next","rent","salary","marketing","branding",
    "website","crm","processing_fees","insurance","technology","tax","loan","other",
  ]),
  description: z.string().trim().max(500).optional().or(z.literal("")),
  amount: z.coerce.number().min(0),
  expense_date: z.string().min(1),
  includes_vat: z.boolean(),
  supplier_id: z.string().optional().or(z.literal("")),
  receipt_received: z.boolean(),
  payment_method: z.enum(["cash", "credit", "transfer", "other"]),
  installments: z.coerce.number().min(1),
});

const incSchema = z.object({
  description: z.string().trim().min(1, "תיאור חובה").max(200),
  amount: z.coerce.number().min(0),
  income_date: z.string().min(1),
  category: z.string().trim().max(80).optional().or(z.literal("")),
});

function AccountingPage() {
  const { isAdmin } = useAuth();

  if (!isAdmin) {
    return (
      <AppShell>
        <PageHeader title="הנהלת חשבונות" />
        <Card className="p-12 text-center shadow-soft">
          <Lock className="w-10 h-10 mx-auto mb-3 text-muted-foreground" />
          <p className="text-muted-foreground">גישה למנהלות בלבד</p>
        </Card>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <PageHeader title="הנהלת חשבונות" description="הוצאות, הכנסות, רווח והפסד ומע״מ" />
      <Tabs defaultValue="summary">
        <TabsList className="mb-4">
          <TabsTrigger value="summary">סיכום</TabsTrigger>
          <TabsTrigger value="expenses">הוצאות</TabsTrigger>
          <TabsTrigger value="incomes">הכנסות ידניות</TabsTrigger>
          <TabsTrigger value="receipts">קבלות חסרות</TabsTrigger>
        </TabsList>
        <TabsContent value="summary"><Summary /></TabsContent>
        <TabsContent value="expenses"><Expenses /></TabsContent>
        <TabsContent value="incomes"><Incomes /></TabsContent>
        <TabsContent value="receipts"><MissingReceipts /></TabsContent>
      </Tabs>
    </AppShell>
  );
}

function Summary() {
  const { data } = useQuery({
    queryKey: ["accounting-summary"],
    queryFn: async () => {
      const monthAgo = new Date();
      monthAgo.setDate(1);
      const [sales, expenses, manual] = await Promise.all([
        supabase.from("sales").select("total, vat").gte("created_at", monthAgo.toISOString()).eq("is_cancelled", false),
        supabase.from("expenses").select("amount").gte("expense_date", monthAgo.toISOString().slice(0, 10)),
        supabase.from("manual_incomes").select("amount").gte("income_date", monthAgo.toISOString().slice(0, 10)),
      ]);
      const salesTotal = (sales.data ?? []).reduce((s, r) => s + Number(r.total ?? 0), 0);
      const vatTotal = (sales.data ?? []).reduce((s, r) => s + Number(r.vat ?? 0), 0);
      const expTotal = (expenses.data ?? []).reduce((s, r) => s + Number(r.amount ?? 0), 0);
      const manTotal = (manual.data ?? []).reduce((s, r) => s + Number(r.amount ?? 0), 0);
      return {
        income: salesTotal + manTotal,
        expenses: expTotal,
        profit: salesTotal + manTotal - expTotal,
        vat: vatTotal,
      };
    },
  });

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      <KPI label="הכנסות החודש" value={fmtCurrency(data?.income ?? 0)} icon={TrendingUp} accent="success" />
      <KPI label="הוצאות החודש" value={fmtCurrency(data?.expenses ?? 0)} icon={TrendingDown} accent="alert" />
      <KPI label="רווח נקי" value={fmtCurrency(data?.profit ?? 0)} accent="gold" />
      <KPI label="מע״מ לתשלום" value={fmtCurrency(data?.vat ?? 0)} />
    </div>
  );
}

function KPI({
  label,
  value,
  icon: Icon,
  accent,
}: {
  label: string;
  value: string;
  icon?: typeof Wallet;
  accent?: "gold" | "success" | "alert";
}) {
  const colorClass =
    accent === "gold"
      ? "text-gold"
      : accent === "success"
        ? "text-success"
        : accent === "alert"
          ? "text-alert"
          : "";
  return (
    <Card className="p-5 shadow-soft">
      <p className="text-sm text-muted-foreground">{label}</p>
      <div className="flex items-center justify-between mt-2">
        <p className={`text-2xl font-bold ${colorClass}`}>{value}</p>
        {Icon && <Icon className={`w-6 h-6 ${colorClass}`} />}
      </div>
    </Card>
  );
}

function useSuppliers() {
  return useQuery({
    queryKey: ["suppliers-min"],
    queryFn: async () => (await supabase.from("suppliers").select("id, name").order("name")).data ?? [],
  });
}

function Expenses() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const { data: suppliers } = useSuppliers();
  const supName = (id: string | null) => (suppliers ?? []).find((s) => s.id === id)?.name ?? "-";

  const { data, isLoading } = useQuery({
    queryKey: ["expenses"],
    queryFn: async () => {
      const { data, error } = await supabase.from("expenses").select("*").order("expense_date", { ascending: false }).limit(100);
      if (error) throw error;
      return data;
    },
  });
  const createMut = useMutation({
    mutationFn: async (input: z.infer<typeof expSchema>) => {
      const { error } = await supabase.from("expenses").insert({
        category: input.category,
        amount: input.amount,
        expense_date: input.expense_date,
        includes_vat: input.includes_vat,
        receipt_received: input.receipt_received,
        payment_method: input.payment_method,
        installments: input.installments,
        description: input.description || null,
        supplier_id: input.supplier_id || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("הוצאה נרשמה");
      qc.invalidateQueries({ queryKey: ["expenses"] });
      qc.invalidateQueries({ queryKey: ["accounting-summary"] });
      setOpen(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggleReceiptMut = useMutation({
    mutationFn: async ({ id, v }: { id: string; v: boolean }) => {
      const { error } = await supabase.from("expenses").update({ receipt_received: v }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["expenses"] }),
    onError: (e: Error) => toast.error(e.message),
  });

  async function uploadDoc(id: string, file: File) {
    try {
      const path = `expenses/${id}/${Date.now()}-${file.name}`;
      const { error: upErr } = await supabase.storage.from(DOC_BUCKET).upload(path, file);
      if (upErr) throw upErr;
      const { error } = await supabase.from("expenses").update({ document_url: path }).eq("id", id);
      if (error) throw error;
      toast.success("המסמך צורף");
      qc.invalidateQueries({ queryKey: ["expenses"] });
    } catch (e) { toast.error((e as Error).message); }
  }

  async function viewDoc(path: string) {
    const { data, error } = await supabase.storage.from(DOC_BUCKET).createSignedUrl(path, 60);
    if (error || !data) return toast.error("שגיאה בפתיחת המסמך");
    window.open(data.signedUrl, "_blank");
  }

  return (
    <Card className="shadow-soft overflow-hidden">
      <div className="p-4 flex justify-end">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-2">
              <Plus className="w-4 h-4" />
              הוצאה חדשה
            </Button>
          </DialogTrigger>
          <ExpenseForm suppliers={suppliers ?? []} onSubmit={(v) => createMut.mutate(v)} loading={createMut.isPending} />
        </Dialog>
      </div>
      {isLoading ? (
        <div className="py-12 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
      ) : !data?.length ? (
        <EmptyState icon={Wallet} title="אין הוצאות" />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>תאריך</TableHead>
              <TableHead>קטגוריה</TableHead>
              <TableHead>ספק</TableHead>
              <TableHead>סכום</TableHead>
              <TableHead>קבלה</TableHead>
              <TableHead>מסמך</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((e) => (
              <TableRow key={e.id}>
                <TableCell className="text-muted-foreground">{fmtDate(e.expense_date)}</TableCell>
                <TableCell>{EXPENSE_CATS.find((c) => c.v === e.category)?.l ?? e.category}</TableCell>
                <TableCell className="text-muted-foreground">{supName(e.supplier_id)}</TableCell>
                <TableCell className="font-semibold">{fmtCurrency(e.amount)}</TableCell>
                <TableCell>
                  <Switch checked={!!e.receipt_received} onCheckedChange={(v) => toggleReceiptMut.mutate({ id: e.id, v })} />
                </TableCell>
                <TableCell>
                  {e.document_url ? (
                    <Button variant="ghost" size="sm" className="gap-1 h-7" onClick={() => viewDoc(e.document_url!)}>
                      <FileText className="w-4 h-4" />צפה
                    </Button>
                  ) : (
                    <label>
                      <input type="file" className="hidden" onChange={(ev) => { const f = ev.target.files?.[0]; if (f) uploadDoc(e.id, f); ev.target.value = ""; }} />
                      <span className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground cursor-pointer"><Upload className="w-4 h-4" />צרף</span>
                    </label>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </Card>
  );
}

function ExpenseForm({
  suppliers,
  onSubmit,
  loading,
}: {
  suppliers: { id: string; name: string }[];
  onSubmit: (v: z.infer<typeof expSchema>) => void;
  loading: boolean;
}) {
  const [form, setForm] = useState<z.infer<typeof expSchema>>({
    category: "other",
    description: "",
    amount: 0,
    expense_date: new Date().toISOString().slice(0, 10),
    includes_vat: true,
    supplier_id: "",
    receipt_received: false,
    payment_method: "transfer",
    installments: 1,
  });
  const handle = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = expSchema.safeParse(form);
    if (!parsed.success) return toast.error(parsed.error.issues[0].message);
    onSubmit(parsed.data);
  };
  return (
    <DialogContent dir="rtl" className="max-h-[90vh] overflow-y-auto">
      <DialogHeader><DialogTitle>הוצאה חדשה</DialogTitle></DialogHeader>
      <form onSubmit={handle} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>קטגוריה *</Label>
            <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v as ExpCat })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {EXPENSE_CATS.map((c) => <SelectItem key={c.v} value={c.v}>{c.l}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>ספק</Label>
            <Select value={form.supplier_id || "none"} onValueChange={(v) => setForm({ ...form, supplier_id: v === "none" ? "" : v })}>
              <SelectTrigger><SelectValue placeholder="ללא" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">ללא</SelectItem>
                {suppliers.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>סכום *</Label>
            <Input type="number" min="0" step="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: Number(e.target.value) })} />
          </div>
          <div className="space-y-2">
            <Label>תאריך *</Label>
            <Input type="date" value={form.expense_date} onChange={(e) => setForm({ ...form, expense_date: e.target.value })} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>אמצעי תשלום</Label>
            <Select value={form.payment_method} onValueChange={(v) => setForm({ ...form, payment_method: v as "cash" | "credit" | "transfer" | "other" })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="cash">מזומן</SelectItem>
                <SelectItem value="credit">אשראי</SelectItem>
                <SelectItem value="transfer">העברה</SelectItem>
                <SelectItem value="other">אחר</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>מספר תשלומים</Label>
            <Input type="number" min="1" value={form.installments} onChange={(e) => setForm({ ...form, installments: Number(e.target.value) })} />
          </div>
        </div>
        <div className="space-y-2">
          <Label>תיאור</Label>
          <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center justify-between rounded-md border px-3 py-2">
            <Label>כולל מע״מ</Label>
            <Switch checked={form.includes_vat} onCheckedChange={(v) => setForm({ ...form, includes_vat: v })} />
          </div>
          <div className="flex items-center justify-between rounded-md border px-3 py-2">
            <Label>התקבלה קבלה</Label>
            <Switch checked={form.receipt_received} onCheckedChange={(v) => setForm({ ...form, receipt_received: v })} />
          </div>
        </div>
        <DialogFooter>
          <Button type="submit" disabled={loading} className="gap-2">
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            שמירה
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}

function Incomes() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const { data, isLoading } = useQuery({
    queryKey: ["manual_incomes"],
    queryFn: async () => {
      const { data, error } = await supabase.from("manual_incomes").select("*").order("income_date", { ascending: false }).limit(100);
      if (error) throw error;
      return data;
    },
  });
  const createMut = useMutation({
    mutationFn: async (input: z.infer<typeof incSchema>) => {
      const { error } = await supabase.from("manual_incomes").insert({
        ...input,
        category: input.category || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("הכנסה נרשמה");
      qc.invalidateQueries({ queryKey: ["manual_incomes"] });
      qc.invalidateQueries({ queryKey: ["accounting-summary"] });
      setOpen(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const [form, setForm] = useState<z.infer<typeof incSchema>>({
    description: "",
    amount: 0,
    income_date: new Date().toISOString().slice(0, 10),
    category: "",
  });

  return (
    <Card className="shadow-soft overflow-hidden">
      <div className="p-4 flex justify-end">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-2"><Plus className="w-4 h-4" />הכנסה ידנית</Button>
          </DialogTrigger>
          <DialogContent dir="rtl">
            <DialogHeader><DialogTitle>הכנסה חדשה</DialogTitle></DialogHeader>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const p = incSchema.safeParse(form);
                if (!p.success) return toast.error(p.error.issues[0].message);
                createMut.mutate(p.data);
              }}
              className="space-y-4"
            >
              <div className="space-y-2">
                <Label>תיאור *</Label>
                <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>סכום *</Label>
                  <Input type="number" min="0" step="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: Number(e.target.value) })} />
                </div>
                <div className="space-y-2">
                  <Label>תאריך *</Label>
                  <Input type="date" value={form.income_date} onChange={(e) => setForm({ ...form, income_date: e.target.value })} />
                </div>
              </div>
              <DialogFooter>
                <Button type="submit" disabled={createMut.isPending} className="gap-2">
                  {createMut.isPending && <Loader2 className="w-4 h-4 animate-spin" />}שמירה
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
      {isLoading ? (
        <div className="py-12 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
      ) : !data?.length ? (
        <EmptyState icon={Wallet} title="אין הכנסות ידניות" />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>תאריך</TableHead>
              <TableHead>תיאור</TableHead>
              <TableHead>סכום</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((i) => (
              <TableRow key={i.id}>
                <TableCell className="text-muted-foreground">{fmtDate(i.income_date)}</TableCell>
                <TableCell>{i.description}</TableCell>
                <TableCell className="font-semibold">{fmtCurrency(i.amount)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </Card>
  );
}

function MissingReceipts() {
  const qc = useQueryClient();
  const { data: suppliers } = useSuppliers();
  const supName = (id: string | null) => (suppliers ?? []).find((s) => s.id === id)?.name ?? "ללא ספק";

  const { data, isLoading } = useQuery({
    queryKey: ["missing-receipts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("expenses")
        .select("id, expense_date, amount, supplier_id, description, category")
        .eq("receipt_received", false)
        .order("expense_date", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const markMut = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("expenses").update({ receipt_received: true }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("סומן כהתקבל");
      qc.invalidateQueries({ queryKey: ["missing-receipts"] });
      qc.invalidateQueries({ queryKey: ["expenses"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const total = (data ?? []).reduce((s, e) => s + Number(e.amount ?? 0), 0);

  return (
    <Card className="shadow-soft overflow-hidden">
      <div className="p-4 flex items-center justify-between">
        <h3 className="font-semibold flex items-center gap-2"><Receipt className="w-4 h-4" />הוצאות שטרם התקבלה עליהן קבלה</h3>
        <Badge variant="outline" className="text-destructive">סה"כ {fmtCurrency(total)}</Badge>
      </div>
      {isLoading ? (
        <div className="py-12 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
      ) : !data?.length ? (
        <EmptyState icon={Receipt} title="כל הקבלות התקבלו 🎉" />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>תאריך</TableHead>
              <TableHead>ספק</TableHead>
              <TableHead>תיאור</TableHead>
              <TableHead>סכום</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((e) => (
              <TableRow key={e.id}>
                <TableCell className="text-muted-foreground">{fmtDate(e.expense_date)}</TableCell>
                <TableCell className="font-medium">{supName(e.supplier_id)}</TableCell>
                <TableCell className="text-muted-foreground">{e.description ?? "-"}</TableCell>
                <TableCell className="font-semibold">{fmtCurrency(e.amount)}</TableCell>
                <TableCell>
                  <Button variant="outline" size="sm" onClick={() => markMut.mutate(e.id)}>התקבלה</Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </Card>
  );
}

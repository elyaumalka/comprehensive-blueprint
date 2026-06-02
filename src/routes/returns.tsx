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
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { RotateCcw, Plus, Loader2 } from "lucide-react";
import { fmtCurrency, fmtDate } from "@/lib/format";

export const Route = createFileRoute("/returns")({
  component: () => (
    <RequireAuth>
      <ReturnsPage />
    </RequireAuth>
  ),
});

const ACTION_TYPES = [
  { v: "return", l: "החזרה" },
  { v: "exchange", l: "החלפה" },
  { v: "cancel", l: "ביטול" },
] as const;

const STATUSES = [
  { v: "open", l: "פתוח" },
  { v: "in_progress", l: "בטיפול" },
  { v: "done", l: "טופל" },
] as const;

const actionLabel = (v: string) => ACTION_TYPES.find((a) => a.v === v)?.l ?? v;
const statusLabel = (v: string) => STATUSES.find((s) => s.v === v)?.l ?? v;

const ACTION_COLORS: Record<string, string> = {
  return: "bg-alert/10 text-alert",
  exchange: "bg-gold text-gold-foreground",
  cancel: "bg-muted",
};

// חוק נעילה: אי אפשר לבצע החזר ללא בחירת סיבה
const schema = z.object({
  customer_id: z.string().optional().or(z.literal("")),
  sale_id: z.string().optional().or(z.literal("")),
  action_type: z.enum(["return", "exchange", "cancel"]),
  reason: z.string().trim().min(1, "חובה לציין סיבה"),
  product_condition: z.string().trim().max(200).optional().or(z.literal("")),
  returned_to_stock: z.boolean(),
  refund_amount: z.coerce.number().min(0),
  credit_issued: z.coerce.number().min(0),
  exchanged_for: z.string().trim().max(200).optional().or(z.literal("")),
  status: z.enum(["open", "in_progress", "done"]),
});

function ReturnsPage() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["returns"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("returns")
        .select("*, customers(full_name)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: customers } = useQuery({
    queryKey: ["customers-min"],
    queryFn: async () => {
      const { data } = await supabase.from("customers").select("id, full_name").order("full_name");
      return data ?? [];
    },
  });

  const createMut = useMutation({
    mutationFn: async (input: z.infer<typeof schema>) => {
      const { error } = await supabase.from("returns").insert({
        customer_id: input.customer_id || null,
        sale_id: input.sale_id || null,
        action_type: input.action_type,
        reason: input.reason,
        product_condition: input.product_condition || null,
        returned_to_stock: input.returned_to_stock,
        refund_amount: input.refund_amount,
        credit_issued: input.credit_issued,
        exchanged_for: input.exchanged_for || null,
        status: input.status,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("הפעולה נרשמה");
      qc.invalidateQueries({ queryKey: ["returns"] });
      setOpen(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const updateStatusMut = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from("returns").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["returns"] }),
  });

  return (
    <AppShell>
      <PageHeader
        title="החזרות, החלפות וביטולים"
        description="ניהול פעולות החזרה והחלפה כולל סיבות ומעקב"
        action={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2"><Plus className="w-4 h-4" />פעולה חדשה</Button>
            </DialogTrigger>
            <ReturnForm customers={customers ?? []} onSubmit={(v) => createMut.mutate(v)} loading={createMut.isPending} />
          </Dialog>
        }
      />

      <Card className="shadow-soft overflow-hidden">
        {isLoading ? (
          <div className="py-16 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
        ) : !data?.length ? (
          <EmptyState icon={RotateCcw} title="אין פעולות החזרה/החלפה" />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>תאריך</TableHead>
                <TableHead>סוג</TableHead>
                <TableHead>לקוחה</TableHead>
                <TableHead>סיבה</TableHead>
                <TableHead>החזר/זיכוי</TableHead>
                <TableHead>חזר למלאי</TableHead>
                <TableHead>סטטוס</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="text-muted-foreground">{fmtDate(r.created_at)}</TableCell>
                  <TableCell><Badge className={ACTION_COLORS[r.action_type]}>{actionLabel(r.action_type)}</Badge></TableCell>
                  <TableCell className="font-medium">{r.customers?.full_name ?? "—"}</TableCell>
                  <TableCell className="text-muted-foreground max-w-48 truncate">{r.reason ?? "-"}</TableCell>
                  <TableCell>
                    {Number(r.refund_amount) > 0 && <div className="text-alert">{fmtCurrency(r.refund_amount)} החזר</div>}
                    {Number(r.credit_issued) > 0 && <div className="text-muted-foreground">{fmtCurrency(r.credit_issued)} זיכוי</div>}
                    {!Number(r.refund_amount) && !Number(r.credit_issued) && <span className="text-muted-foreground">-</span>}
                  </TableCell>
                  <TableCell>{r.returned_to_stock ? <Badge variant="secondary">כן</Badge> : <Badge variant="outline">לא</Badge>}</TableCell>
                  <TableCell>
                    <Select value={r.status ?? "open"} onValueChange={(v) => updateStatusMut.mutate({ id: r.id, status: v })}>
                      <SelectTrigger className="h-8 w-28"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {STATUSES.map((s) => <SelectItem key={s.v} value={s.v}>{s.l}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>
    </AppShell>
  );
}

function ReturnForm({
  customers,
  onSubmit,
  loading,
}: {
  customers: { id: string; full_name: string }[];
  onSubmit: (v: z.infer<typeof schema>) => void;
  loading: boolean;
}) {
  const [form, setForm] = useState<z.infer<typeof schema>>({
    customer_id: "",
    sale_id: "",
    action_type: "return",
    reason: "",
    product_condition: "",
    returned_to_stock: true,
    refund_amount: 0,
    credit_issued: 0,
    exchanged_for: "",
    status: "open",
  });

  // מכירות של הלקוחה הנבחרת (לקישור)
  const { data: sales } = useQuery({
    queryKey: ["customer-sales-min", form.customer_id],
    enabled: !!form.customer_id,
    queryFn: async () => {
      const { data } = await supabase
        .from("sales")
        .select("id, receipt_number, total, created_at")
        .eq("customer_id", form.customer_id as string)
        .eq("is_cancelled", false)
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const handle = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = schema.safeParse(form);
    if (!parsed.success) return toast.error(parsed.error.issues[0].message);
    onSubmit(parsed.data);
  };

  return (
    <DialogContent dir="rtl" className="max-w-lg max-h-[90vh] overflow-y-auto">
      <DialogHeader><DialogTitle>פעולת החזרה / החלפה / ביטול</DialogTitle></DialogHeader>
      <form onSubmit={handle} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>סוג פעולה *</Label>
            <Select value={form.action_type} onValueChange={(v) => setForm({ ...form, action_type: v as "return" | "exchange" | "cancel" })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{ACTION_TYPES.map((a) => <SelectItem key={a.v} value={a.v}>{a.l}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>לקוחה</Label>
            <Select value={form.customer_id || "none"} onValueChange={(v) => setForm({ ...form, customer_id: v === "none" ? "" : v, sale_id: "" })}>
              <SelectTrigger><SelectValue placeholder="בחרי" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">ללא</SelectItem>
                {customers.map((c) => <SelectItem key={c.id} value={c.id}>{c.full_name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>

        {form.customer_id && (sales?.length ?? 0) > 0 && (
          <div className="space-y-2">
            <Label>קישור למכירה</Label>
            <Select value={form.sale_id || "none"} onValueChange={(v) => setForm({ ...form, sale_id: v === "none" ? "" : v })}>
              <SelectTrigger><SelectValue placeholder="בחרי מכירה" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">ללא</SelectItem>
                {(sales ?? []).map((s) => (
                  <SelectItem key={s.id} value={s.id}>#{s.receipt_number} · {fmtCurrency(Number(s.total))} · {fmtDate(s.created_at)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <div className="space-y-2">
          <Label>סיבת הפעולה * <span className="text-xs text-muted-foreground">(חובה)</span></Label>
          <Textarea rows={2} value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} placeholder="מדוע בוצעה ההחזרה/החלפה?" />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>מצב המוצר</Label>
            <Input value={form.product_condition} onChange={(e) => setForm({ ...form, product_condition: e.target.value })} placeholder="תקין / פגום…" />
          </div>
          {form.action_type === "exchange" && (
            <div className="space-y-2">
              <Label>הוחלף עבור</Label>
              <Input value={form.exchanged_for} onChange={(e) => setForm({ ...form, exchanged_for: e.target.value })} placeholder="מק״ט / תיאור" />
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>החזר כספי (₪)</Label>
            <Input type="number" min="0" step="0.01" value={form.refund_amount} onChange={(e) => setForm({ ...form, refund_amount: Number(e.target.value) })} />
          </div>
          <div className="space-y-2">
            <Label>זיכוי (₪)</Label>
            <Input type="number" min="0" step="0.01" value={form.credit_issued} onChange={(e) => setForm({ ...form, credit_issued: Number(e.target.value) })} />
          </div>
        </div>

        <div className="flex items-center justify-between rounded-md border px-3 py-2">
          <Label>חזר למלאי</Label>
          <Switch checked={form.returned_to_stock} onCheckedChange={(v) => setForm({ ...form, returned_to_stock: v })} />
        </div>

        <DialogFooter>
          <Button type="submit" disabled={loading} className="gap-2">
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}שמירה
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}

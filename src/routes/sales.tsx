import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { RequireAuth } from "@/components/RequireAuth";
import { AppShell, PageHeader } from "@/components/AppShell";
import { EmptyState } from "@/components/EmptyState";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { ShoppingBag, Loader2, Plus, Trash2, Ban, AlertCircle } from "lucide-react";
import { fmtCurrency, fmtDateTime } from "@/lib/format";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import { useMyShift } from "@/components/ShiftClock";

export const Route = createFileRoute("/sales")({
  component: () => (
    <RequireAuth>
      <SalesPage />
    </RequireAuth>
  ),
});

const PAYMENT_LABEL: Record<string, string> = {
  cash: "מזומן",
  credit: "אשראי",
  transfer: "העברה",
  other: "אחר",
};
const VAT_RATE = 0.17;

type LineItem = { product_id: string; product_name: string; sku: string; qty: number; unit_price: number };

function SalesPage() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [cancelId, setCancelId] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["sales-list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sales")
        .select("*, customers(full_name), sale_items(id)")
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data;
    },
  });

  return (
    <AppShell>
      <PageHeader
        title="מכירות"
        description="היסטוריית מכירות, מכירה חדשה וביטולים"
        action={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2"><Plus className="w-4 h-4" />מכירה חדשה</Button>
            </DialogTrigger>
            <NewSaleForm onDone={() => { setOpen(false); qc.invalidateQueries({ queryKey: ["sales-list"] }); }} />
          </Dialog>
        }
      />

      <Card className="shadow-soft overflow-hidden">
        {isLoading ? (
          <div className="py-16 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
        ) : !data?.length ? (
          <EmptyState icon={ShoppingBag} title="אין מכירות עדיין" description="לחצי על 'מכירה חדשה' כדי להתחיל" />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>קבלה</TableHead>
                <TableHead>תאריך</TableHead>
                <TableHead>לקוחה</TableHead>
                <TableHead>פריטים</TableHead>
                <TableHead>תשלום</TableHead>
                <TableHead>הנחה</TableHead>
                <TableHead>סה״כ</TableHead>
                <TableHead>סטטוס</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="font-mono">#{s.receipt_number}</TableCell>
                  <TableCell className="text-muted-foreground">{fmtDateTime(s.created_at)}</TableCell>
                  <TableCell>{s.customers?.full_name ?? "—"}</TableCell>
                  <TableCell className="text-muted-foreground">{s.sale_items?.length ?? 0}</TableCell>
                  <TableCell className="text-muted-foreground">{PAYMENT_LABEL[s.payment_method] ?? s.payment_method}</TableCell>
                  <TableCell className="text-muted-foreground">{Number(s.discount) > 0 ? fmtCurrency(s.discount) : "-"}</TableCell>
                  <TableCell className="font-semibold">{fmtCurrency(s.total)}</TableCell>
                  <TableCell>
                    {s.is_cancelled ? (
                      <Badge className="bg-alert/10 text-alert">בוטלה</Badge>
                    ) : (
                      <div className="flex items-center gap-2">
                        <Badge className="bg-success/20 text-success-foreground">הושלמה</Badge>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setCancelId(s.id)} title="ביטול עסקה">
                          <Ban className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      <CancelDialog
        saleId={cancelId}
        onClose={() => setCancelId(null)}
        onDone={() => { setCancelId(null); qc.invalidateQueries({ queryKey: ["sales-list"] }); }}
      />
    </AppShell>
  );
}

function NewSaleForm({ onDone }: { onDone: () => void }) {
  const { isAdmin } = useAuth();
  const { employee: myEmployee, hasOpenShift } = useMyShift();
  const blockedByShift = !isAdmin && !!myEmployee && !hasOpenShift;
  const [customerId, setCustomerId] = useState("");
  const [employeeId, setEmployeeId] = useState("");
  const [items, setItems] = useState<LineItem[]>([]);
  const [discountType, setDiscountType] = useState<"none" | "percent" | "amount">("none");
  const [discountValue, setDiscountValue] = useState(0);
  const [discountReason, setDiscountReason] = useState("");
  const [payment, setPayment] = useState("cash");
  const [installments, setInstallments] = useState(1);
  const [addProductId, setAddProductId] = useState("");

  const { data: customers } = useQuery({
    queryKey: ["customers-min"],
    queryFn: async () => (await supabase.from("customers").select("id, full_name").order("full_name")).data ?? [],
  });
  const { data: employees } = useQuery({
    queryKey: ["employees-min"],
    queryFn: async () => (await supabase.from("employees").select("id, full_name").eq("is_active", true).order("full_name")).data ?? [],
  });
  const { data: products } = useQuery({
    queryKey: ["products-min"],
    queryFn: async () => (await supabase.from("products").select("id, sku, internal_name, sale_price").eq("is_active", true).order("internal_name")).data ?? [],
  });

  const subtotal = items.reduce((s, it) => s + it.qty * it.unit_price, 0);
  const discount = discountType === "percent" ? (subtotal * discountValue) / 100 : discountType === "amount" ? discountValue : 0;
  const total = Math.max(0, subtotal - discount);
  const vat = total - total / (1 + VAT_RATE);

  function addProduct() {
    const p = (products ?? []).find((x) => x.id === addProductId);
    if (!p) return;
    if (items.some((it) => it.product_id === p.id)) {
      setItems(items.map((it) => it.product_id === p.id ? { ...it, qty: it.qty + 1 } : it));
    } else {
      setItems([...items, { product_id: p.id, product_name: p.internal_name, sku: p.sku, qty: 1, unit_price: Number(p.sale_price ?? 0) }]);
    }
    setAddProductId("");
  }

  const saveMut = useMutation({
    mutationFn: async () => {
      if (blockedByShift) throw new Error("יש לפתוח משמרת לפני רישום מכירה");
      if (!items.length) throw new Error("יש להוסיף לפחות פריט אחד");
      if (discountType !== "none" && discountValue > 0 && !discountReason.trim()) throw new Error("יש לציין סיבת הנחה");
      const { data: sale, error } = await supabase.from("sales").insert({
        customer_id: customerId || null,
        employee_id: employeeId || null,
        subtotal,
        discount,
        discount_reason: discountReason || null,
        vat,
        total,
        payment_method: payment as "cash" | "credit" | "transfer" | "other",
        installments,
      }).select("id").single();
      if (error) throw error;
      const rows = items.map((it) => ({
        sale_id: sale.id,
        product_name: it.product_name,
        sku: it.sku,
        qty: it.qty,
        unit_price: it.unit_price,
        line_total: it.qty * it.unit_price,
      }));
      const { error: e2 } = await supabase.from("sale_items").insert(rows);
      if (e2) throw e2;
    },
    onSuccess: () => { toast.success("המכירה נרשמה"); onDone(); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <DialogContent dir="rtl" className="max-w-2xl max-h-[90vh] overflow-y-auto">
      <DialogHeader><DialogTitle>מכירה חדשה</DialogTitle></DialogHeader>
      {blockedByShift && (
        <div className="flex items-center gap-2 rounded-lg bg-alert/10 text-alert px-3 py-2 text-sm">
          <AlertCircle className="w-4 h-4 shrink-0" />
          לא ניתן לרשום מכירה לפני פתיחת משמרת. לחצי על "התחלת משמרת" בראש המסך.
        </div>
      )}
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>לקוחה</Label>
            <Select value={customerId || "none"} onValueChange={(v) => setCustomerId(v === "none" ? "" : v)}>
              <SelectTrigger><SelectValue placeholder="לקוחה מזדמנת" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">לקוחה מזדמנת</SelectItem>
                {(customers ?? []).map((c) => <SelectItem key={c.id} value={c.id}>{c.full_name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>מוכרת</Label>
            <Select value={employeeId || "none"} onValueChange={(v) => setEmployeeId(v === "none" ? "" : v)}>
              <SelectTrigger><SelectValue placeholder="בחרי מוכרת" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">ללא</SelectItem>
                {(employees ?? []).map((e) => <SelectItem key={e.id} value={e.id}>{e.full_name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* הוספת פריטים */}
        <div className="space-y-2">
          <Label>הוספת מוצר</Label>
          <div className="flex gap-2">
            <Select value={addProductId} onValueChange={setAddProductId}>
              <SelectTrigger><SelectValue placeholder="בחרי מוצר…" /></SelectTrigger>
              <SelectContent>
                {(products ?? []).map((p) => <SelectItem key={p.id} value={p.id}>{p.internal_name} · {p.sku} · {fmtCurrency(Number(p.sale_price))}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button type="button" variant="outline" onClick={addProduct} disabled={!addProductId}>הוספה</Button>
          </div>
        </div>

        {items.length > 0 && (
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>מוצר</TableHead>
                  <TableHead className="w-20">כמות</TableHead>
                  <TableHead className="w-28">מחיר יח׳</TableHead>
                  <TableHead className="w-24">סה״כ</TableHead>
                  <TableHead className="w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((it, idx) => (
                  <TableRow key={it.product_id}>
                    <TableCell className="font-medium">{it.product_name}</TableCell>
                    <TableCell>
                      <Input type="number" min="1" value={it.qty} className="h-8"
                        onChange={(e) => setItems(items.map((x, i) => i === idx ? { ...x, qty: Math.max(1, Number(e.target.value)) } : x))} />
                    </TableCell>
                    <TableCell>
                      <Input type="number" min="0" step="0.01" value={it.unit_price} className="h-8"
                        onChange={(e) => setItems(items.map((x, i) => i === idx ? { ...x, unit_price: Number(e.target.value) } : x))} />
                    </TableCell>
                    <TableCell className="font-semibold">{fmtCurrency(it.qty * it.unit_price)}</TableCell>
                    <TableCell>
                      <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => setItems(items.filter((_, i) => i !== idx))}>
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {/* הנחה */}
        <div className="grid grid-cols-3 gap-3">
          <div className="space-y-2">
            <Label>סוג הנחה</Label>
            <Select value={discountType} onValueChange={(v) => setDiscountType(v as "none" | "percent" | "amount")}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">ללא</SelectItem>
                <SelectItem value="percent">אחוז %</SelectItem>
                <SelectItem value="amount">סכום ₪</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {discountType !== "none" && (
            <>
              <div className="space-y-2">
                <Label>ערך הנחה</Label>
                <Input type="number" min="0" value={discountValue} onChange={(e) => setDiscountValue(Number(e.target.value))} />
              </div>
              <div className="space-y-2">
                <Label>סיבת הנחה *</Label>
                <Input value={discountReason} onChange={(e) => setDiscountReason(e.target.value)} />
              </div>
            </>
          )}
        </div>

        {/* תשלום */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>אמצעי תשלום</Label>
            <Select value={payment} onValueChange={setPayment}>
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
            <Input type="number" min="1" value={installments} onChange={(e) => setInstallments(Math.max(1, Number(e.target.value)))} />
          </div>
        </div>

        {/* סיכום */}
        <div className="rounded-lg bg-muted/40 p-4 space-y-1 text-sm">
          <div className="flex justify-between"><span className="text-muted-foreground">סכום ביניים</span><span>{fmtCurrency(subtotal)}</span></div>
          {discount > 0 && <div className="flex justify-between text-alert"><span>הנחה</span><span>-{fmtCurrency(discount)}</span></div>}
          <div className="flex justify-between text-xs text-muted-foreground"><span>מתוכו מע״מ (17%)</span><span>{fmtCurrency(vat)}</span></div>
          <div className="flex justify-between font-bold text-base pt-1 border-t"><span>סה״כ לתשלום</span><span>{fmtCurrency(total)}</span></div>
        </div>
      </div>
      <DialogFooter>
        <Button disabled={saveMut.isPending || !items.length || blockedByShift} onClick={() => saveMut.mutate()} className="gap-2">
          {saveMut.isPending && <Loader2 className="w-4 h-4 animate-spin" />}שמירת מכירה
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}

function CancelDialog({ saleId, onClose, onDone }: { saleId: string | null; onClose: () => void; onDone: () => void }) {
  const [reason, setReason] = useState("");
  const cancelMut = useMutation({
    mutationFn: async () => {
      if (!reason.trim()) throw new Error("חובה לציין סיבת ביטול");
      const { error } = await supabase.from("sales").update({
        is_cancelled: true,
        cancellation_reason: reason,
        cancelled_at: new Date().toISOString(),
      }).eq("id", saleId!);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("העסקה בוטלה"); setReason(""); onDone(); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={!!saleId} onOpenChange={(v) => { if (!v) { setReason(""); onClose(); } }}>
      <DialogContent dir="rtl" className="max-w-md">
        <DialogHeader><DialogTitle>ביטול עסקה</DialogTitle></DialogHeader>
        <p className="text-sm text-muted-foreground">לא ניתן למחוק מכירה — רק לבטל עם סיבה. הביטול יישאר מתועד.</p>
        <div className="space-y-2 mt-2">
          <Label>סיבת ביטול *</Label>
          <Textarea rows={3} value={reason} onChange={(e) => setReason(e.target.value)} />
        </div>
        <DialogFooter>
          <Button variant="destructive" disabled={cancelMut.isPending} onClick={() => cancelMut.mutate()} className="gap-2">
            {cancelMut.isPending && <Loader2 className="w-4 h-4 animate-spin" />}אישור ביטול
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

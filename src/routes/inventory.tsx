import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { RequireAuth } from "@/components/RequireAuth";
import { AppShell, PageHeader } from "@/components/AppShell";
import { EmptyState } from "@/components/EmptyState";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";
import { ArrowLeftRight, Plus, Loader2 } from "lucide-react";
import { fmtDateTime } from "@/lib/format";

export const Route = createFileRoute("/inventory")({
  component: () => (
    <RequireAuth>
      <InventoryPage />
    </RequireAuth>
  ),
});

const MOVEMENT_TYPES = [
  { v: "purchase", l: "כניסת סחורה", sign: 1 },
  { v: "sale", l: "מכירה", sign: -1 },
  { v: "exchange", l: "החלפה", sign: 1 },
  { v: "return", l: "החזרה", sign: 1 },
  { v: "adjustment", l: "תיקון מלאי", sign: 1 },
  { v: "damage", l: "גריעה בגלל פגם", sign: -1 },
  { v: "transfer", l: "העברה", sign: -1 },
] as const;
const typeLabel = (v: string) => MOVEMENT_TYPES.find((t) => t.v === v)?.l ?? v;

function InventoryPage() {
  const { isAdmin } = useAuth();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["inventory-movements"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("inventory_movements")
        .select("*, product_variants(size, color, products(internal_name, sku))")
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return data;
    },
  });

  return (
    <AppShell>
      <PageHeader
        title="תנועות מלאי"
        description="תיעוד כל תנועה: כניסת סחורה, גריעה, תיקון מלאי ועוד"
        action={
          isAdmin && (
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2"><Plus className="w-4 h-4" />תנועה חדשה</Button>
              </DialogTrigger>
              <MovementForm onDone={() => { setOpen(false); qc.invalidateQueries({ queryKey: ["inventory-movements"] }); }} />
            </Dialog>
          )
        }
      />

      <Card className="shadow-soft overflow-hidden">
        {isLoading ? (
          <div className="py-16 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
        ) : !data?.length ? (
          <EmptyState icon={ArrowLeftRight} title="אין תנועות מלאי" description="תנועות שתירשמנה יופיעו כאן" />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>תאריך</TableHead>
                <TableHead>מוצר</TableHead>
                <TableHead>מידה/צבע</TableHead>
                <TableHead>סוג תנועה</TableHead>
                <TableHead>לפני</TableHead>
                <TableHead>שינוי</TableHead>
                <TableHead>אחרי</TableHead>
                <TableHead>סיבה</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((m) => {
                const v = m.product_variants as { size: string | null; color: string | null; products: { internal_name: string; sku: string } | null } | null;
                return (
                  <TableRow key={m.id}>
                    <TableCell className="text-muted-foreground whitespace-nowrap">{fmtDateTime(m.created_at)}</TableCell>
                    <TableCell className="font-medium">{v?.products?.internal_name ?? "—"}</TableCell>
                    <TableCell className="text-muted-foreground">{[v?.size, v?.color].filter(Boolean).join(" / ") || "-"}</TableCell>
                    <TableCell><Badge variant="secondary">{typeLabel(m.movement_type)}</Badge></TableCell>
                    <TableCell className="text-muted-foreground">{m.qty_before ?? "-"}</TableCell>
                    <TableCell className={Number(m.qty_change) < 0 ? "text-alert font-medium" : "text-success font-medium"}>
                      {Number(m.qty_change) > 0 ? "+" : ""}{m.qty_change}
                    </TableCell>
                    <TableCell className="font-semibold">{m.qty_after ?? "-"}</TableCell>
                    <TableCell className="text-muted-foreground max-w-40 truncate">{m.reason ?? "-"}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </Card>
    </AppShell>
  );
}

function MovementForm({ onDone }: { onDone: () => void }) {
  const [productId, setProductId] = useState("");
  const [variantId, setVariantId] = useState("");
  const [type, setType] = useState<string>("purchase");
  const [qty, setQty] = useState(1);
  const [reason, setReason] = useState("");

  const { data: products } = useQuery({
    queryKey: ["products-for-movement"],
    queryFn: async () => (await supabase.from("products").select("id, internal_name, sku").order("internal_name")).data ?? [],
  });
  const { data: variants } = useQuery({
    queryKey: ["variants-for-movement", productId],
    enabled: !!productId,
    queryFn: async () => (await supabase.from("product_variants").select("id, size, color, stock_qty").eq("product_id", productId)).data ?? [],
  });

  const selectedVariant = (variants ?? []).find((v) => v.id === variantId);
  const sign = MOVEMENT_TYPES.find((t) => t.v === type)?.sign ?? 1;

  const saveMut = useMutation({
    mutationFn: async () => {
      if (!variantId || !selectedVariant) throw new Error("יש לבחור מוצר ווריאציה");
      if (qty <= 0) throw new Error("כמות חייבת להיות גדולה מ-0");
      const before = Number(selectedVariant.stock_qty ?? 0);
      const change = sign * Math.abs(qty);
      const after = before + change;
      if (after < 0) throw new Error("המלאי לא יכול לרדת מתחת ל-0");
      const { error } = await supabase.from("inventory_movements").insert({
        variant_id: variantId,
        movement_type: type as "purchase" | "sale" | "exchange" | "return" | "adjustment" | "damage" | "transfer",
        qty_before: before,
        qty_change: change,
        qty_after: after,
        reason: reason || null,
      });
      if (error) throw error;
      const { error: e2 } = await supabase.from("product_variants").update({ stock_qty: after }).eq("id", variantId);
      if (e2) throw e2;
    },
    onSuccess: () => { toast.success("התנועה נרשמה והמלאי עודכן"); onDone(); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <DialogContent dir="rtl" className="max-w-lg max-h-[90vh] overflow-y-auto">
      <DialogHeader><DialogTitle>תנועת מלאי חדשה</DialogTitle></DialogHeader>
      <div className="space-y-4">
        <div className="space-y-2">
          <Label>מוצר *</Label>
          <Select value={productId} onValueChange={(v) => { setProductId(v); setVariantId(""); }}>
            <SelectTrigger><SelectValue placeholder="בחרי מוצר…" /></SelectTrigger>
            <SelectContent>
              {(products ?? []).map((p) => <SelectItem key={p.id} value={p.id}>{p.internal_name} · {p.sku}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        {productId && (
          <div className="space-y-2">
            <Label>וריאציה (מידה/צבע) *</Label>
            <Select value={variantId} onValueChange={setVariantId}>
              <SelectTrigger><SelectValue placeholder="בחרי וריאציה…" /></SelectTrigger>
              <SelectContent>
                {(variants ?? []).map((v) => (
                  <SelectItem key={v.id} value={v.id}>
                    {[v.size, v.color].filter(Boolean).join(" / ") || "ללא"} · במלאי: {v.stock_qty}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>סוג תנועה *</Label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{MOVEMENT_TYPES.map((t) => <SelectItem key={t.v} value={t.v}>{t.l}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>כמות *</Label>
            <Input type="number" min="1" value={qty} onChange={(e) => setQty(Number(e.target.value))} />
          </div>
        </div>
        {selectedVariant && (
          <p className="text-sm text-muted-foreground">
            לפני: {selectedVariant.stock_qty} → אחרי: <span className="font-semibold text-foreground">{Number(selectedVariant.stock_qty ?? 0) + sign * Math.abs(qty)}</span>
          </p>
        )}
        <div className="space-y-2">
          <Label>סיבה / הערה</Label>
          <Input value={reason} onChange={(e) => setReason(e.target.value)} />
        </div>
      </div>
      <DialogFooter>
        <Button disabled={saveMut.isPending || !variantId} onClick={() => saveMut.mutate()} className="gap-2">
          {saveMut.isPending && <Loader2 className="w-4 h-4 animate-spin" />}שמירת תנועה
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}

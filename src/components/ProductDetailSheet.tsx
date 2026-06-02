import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
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
import { fmtCurrency } from "@/lib/format";
import { Loader2, Plus, Trash2, Layers, AlertCircle } from "lucide-react";

export type Product = {
  id: string;
  sku: string;
  internal_name: string;
  category: string | null;
  subcategory: string | null;
  collection: string | null;
  season: string | null;
  fabric_description: string | null;
  cost_price: number | null;
  sale_price: number;
  promo_price: number | null;
  status: string | null;
  market: string | null;
};

export const STATUS_OPTIONS = [
  { v: "active", l: "פעיל" },
  { v: "inactive", l: "לא פעיל" },
  { v: "seasonal", l: "עונתי" },
  { v: "sale", l: "בהנחה" },
  { v: "archived", l: "בארכיון" },
];
export const MARKET_OPTIONS = [
  { v: "il", l: "ארץ" },
  { v: "abroad", l: "חו״ל" },
  { v: "both", l: "גם וגם" },
];
export const statusLabel = (v: string | null) => STATUS_OPTIONS.find((o) => o.v === v)?.l ?? v ?? "-";
export const marketLabel = (v: string | null) => MARKET_OPTIONS.find((o) => o.v === v)?.l ?? v ?? "-";

export function ProductDetailSheet({
  product,
  open,
  onOpenChange,
}: {
  product: Product | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const qc = useQueryClient();
  const [edit, setEdit] = useState<Product | null>(null);
  const [newVar, setNewVar] = useState({ size: "", color: "", stock_qty: 0, min_stock_alert: 1 });
  const p = edit ?? product;

  const { data: variants, isLoading } = useQuery({
    queryKey: ["product-variants", product?.id],
    enabled: !!product?.id && open,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("product_variants")
        .select("*")
        .eq("product_id", product!.id)
        .order("created_at");
      if (error) throw error;
      return data;
    },
  });

  const saveMut = useMutation({
    mutationFn: async (prod: Product) => {
      const { error } = await supabase.from("products").update({
        internal_name: prod.internal_name,
        category: prod.category || null,
        subcategory: prod.subcategory || null,
        collection: prod.collection || null,
        season: prod.season || null,
        fabric_description: prod.fabric_description || null,
        cost_price: prod.cost_price ?? 0,
        sale_price: prod.sale_price,
        promo_price: prod.promo_price ?? null,
        status: prod.status || "active",
        market: prod.market || "both",
      }).eq("id", prod.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("המוצר נשמר");
      qc.invalidateQueries({ queryKey: ["products"] });
      setEdit(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const addVarMut = useMutation({
    mutationFn: async () => {
      if (!product) return;
      const { error } = await supabase.from("product_variants").insert({
        product_id: product.id,
        size: newVar.size || null,
        color: newVar.color || null,
        stock_qty: newVar.stock_qty,
        min_stock_alert: newVar.min_stock_alert,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("וריאציה נוספה");
      qc.invalidateQueries({ queryKey: ["product-variants", product?.id] });
      qc.invalidateQueries({ queryKey: ["products"] });
      setNewVar({ size: "", color: "", stock_qty: 0, min_stock_alert: 1 });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const updateStockMut = useMutation({
    mutationFn: async ({ id, stock_qty }: { id: string; stock_qty: number }) => {
      const { error } = await supabase.from("product_variants").update({ stock_qty }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["product-variants", product?.id] });
      qc.invalidateQueries({ queryKey: ["products"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const delVarMut = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("product_variants").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["product-variants", product?.id] });
      qc.invalidateQueries({ queryKey: ["products"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (!p) return null;
  const totalStock = (variants ?? []).reduce((s, v) => s + Number(v.stock_qty ?? 0), 0);

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) setEdit(null); }}>
      <DialogContent dir="rtl" className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="text-right">
          <div className="flex items-center gap-2 flex-wrap">
            <DialogTitle className="text-xl">{p.internal_name}</DialogTitle>
            <Badge variant="outline" className="font-mono">{p.sku}</Badge>
            <Badge>{statusLabel(p.status)}</Badge>
            <Badge variant="secondary">{marketLabel(p.market)}</Badge>
          </div>
          <DialogDescription>סה"כ מלאי: {totalStock} יחידות</DialogDescription>
        </DialogHeader>

        {/* פרטי מוצר */}
        <Card className="p-4 shadow-soft mt-2">
          <h3 className="font-semibold mb-3">פרטי מוצר</h3>
          <div className="grid grid-cols-2 gap-3">
            <Field label="שם פנימי"><Input value={p.internal_name} onChange={(e) => setEdit({ ...p, internal_name: e.target.value })} /></Field>
            <Field label="קטגוריה"><Input value={p.category ?? ""} onChange={(e) => setEdit({ ...p, category: e.target.value })} /></Field>
            <Field label="תת קטגוריה"><Input value={p.subcategory ?? ""} onChange={(e) => setEdit({ ...p, subcategory: e.target.value })} /></Field>
            <Field label="קולקציה"><Input value={p.collection ?? ""} onChange={(e) => setEdit({ ...p, collection: e.target.value })} /></Field>
            <Field label="עונה"><Input value={p.season ?? ""} onChange={(e) => setEdit({ ...p, season: e.target.value })} /></Field>
            <Field label="עלות"><Input type="number" min="0" value={p.cost_price ?? 0} onChange={(e) => setEdit({ ...p, cost_price: Number(e.target.value) })} /></Field>
            <Field label="מחיר מכירה"><Input type="number" min="0" value={p.sale_price} onChange={(e) => setEdit({ ...p, sale_price: Number(e.target.value) })} /></Field>
            <Field label="מחיר מבצע"><Input type="number" min="0" value={p.promo_price ?? 0} onChange={(e) => setEdit({ ...p, promo_price: Number(e.target.value) })} /></Field>
            <Field label="סטטוס">
              <Select value={p.status ?? "active"} onValueChange={(v) => setEdit({ ...p, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{STATUS_OPTIONS.map((o) => <SelectItem key={o.v} value={o.v}>{o.l}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
            <Field label="שיווק (ארץ/חו״ל)">
              <Select value={p.market ?? "both"} onValueChange={(v) => setEdit({ ...p, market: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{MARKET_OPTIONS.map((o) => <SelectItem key={o.v} value={o.v}>{o.l}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
          </div>
          <div className="mt-3 space-y-1.5">
            <Label>תיאור בד / גזרה</Label>
            <Textarea rows={2} value={p.fabric_description ?? ""} onChange={(e) => setEdit({ ...p, fabric_description: e.target.value })} />
          </div>
          {edit && (
            <div className="flex justify-end mt-3">
              <Button size="sm" disabled={saveMut.isPending} onClick={() => saveMut.mutate(edit)} className="gap-2">
                {saveMut.isPending && <Loader2 className="w-4 h-4 animate-spin" />}שמירת שינויים
              </Button>
            </div>
          )}
        </Card>

        {/* וריאציות ומלאי */}
        <Card className="p-4 shadow-soft mt-4 mb-2">
          <h3 className="font-semibold mb-3 flex items-center gap-2"><Layers className="w-4 h-4" />וריאציות ומלאי (מידה × צבע)</h3>
          {/* הוספת וריאציה */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2 mb-3">
            <Input placeholder="מידה" value={newVar.size} onChange={(e) => setNewVar({ ...newVar, size: e.target.value })} />
            <Input placeholder="צבע" value={newVar.color} onChange={(e) => setNewVar({ ...newVar, color: e.target.value })} />
            <Input type="number" min="0" placeholder="מלאי" value={newVar.stock_qty || ""} onChange={(e) => setNewVar({ ...newVar, stock_qty: Number(e.target.value) })} />
            <Input type="number" min="0" placeholder="מינ' התראה" value={newVar.min_stock_alert} onChange={(e) => setNewVar({ ...newVar, min_stock_alert: Number(e.target.value) })} />
            <Button onClick={() => addVarMut.mutate()} disabled={addVarMut.isPending || (!newVar.size && !newVar.color)} className="gap-1">
              {addVarMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}הוספה
            </Button>
          </div>

          {isLoading ? (
            <div className="py-6 flex justify-center"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
          ) : !variants?.length ? (
            <p className="text-sm text-muted-foreground py-2">אין וריאציות. הוסיפי מידה/צבע למעלה.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>מידה</TableHead>
                  <TableHead>צבע</TableHead>
                  <TableHead>מלאי</TableHead>
                  <TableHead>סטטוס</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {variants.map((v) => {
                  const low = v.stock_qty <= (v.min_stock_alert ?? 1);
                  return (
                    <TableRow key={v.id}>
                      <TableCell>{v.size ?? "-"}</TableCell>
                      <TableCell>{v.color ?? "-"}</TableCell>
                      <TableCell>
                        <Input type="number" min="0" value={v.stock_qty} className="h-8 w-20"
                          onChange={(e) => updateStockMut.mutate({ id: v.id, stock_qty: Number(e.target.value) })} />
                      </TableCell>
                      <TableCell>
                        {v.stock_qty === 0 ? <Badge variant="outline">אזל</Badge>
                          : low ? <Badge className="bg-alert/10 text-alert gap-1"><AlertCircle className="w-3 h-3" />נמוך</Badge>
                          : <Badge variant="secondary">תקין</Badge>}
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => delVarMut.mutate(v.id)}>
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </Card>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
    </div>
  );
}

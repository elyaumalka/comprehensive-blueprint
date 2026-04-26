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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";
import { Package, Plus, Loader2, AlertCircle } from "lucide-react";
import { fmtCurrency } from "@/lib/format";

export const Route = createFileRoute("/products")({
  component: () => (
    <RequireAuth>
      <ProductsPage />
    </RequireAuth>
  ),
});

const schema = z.object({
  sku: z.string().trim().min(1, "SKU חובה").max(60),
  internal_name: z.string().trim().min(1, "שם חובה").max(160),
  category: z.string().trim().max(80).optional().or(z.literal("")),
  collection: z.string().trim().max(80).optional().or(z.literal("")),
  fabric_description: z.string().trim().max(500).optional().or(z.literal("")),
  cost_price: z.coerce.number().min(0),
  sale_price: z.coerce.number().min(0),
});

function ProductsPage() {
  const qc = useQueryClient();
  const { isAdmin } = useAuth();
  const [open, setOpen] = useState(false);

  const { data: products, isLoading } = useQuery({
    queryKey: ["products"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("*, product_variants(id, size, color, stock_qty, min_stock_alert)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const createMut = useMutation({
    mutationFn: async (input: z.infer<typeof schema>) => {
      const { error } = await supabase.from("products").insert({
        ...input,
        category: input.category || null,
        collection: input.collection || null,
        fabric_description: input.fabric_description || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("מוצר נוסף");
      qc.invalidateQueries({ queryKey: ["products"] });
      setOpen(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <AppShell>
      <PageHeader
        title="מוצרים ומלאי"
        description="קטלוג מוצרי הבוטיק וניהול מלאי"
        action={
          isAdmin && (
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2">
                  <Plus className="w-4 h-4" />
                  מוצר חדש
                </Button>
              </DialogTrigger>
              <ProductForm onSubmit={(v) => createMut.mutate(v)} loading={createMut.isPending} />
            </Dialog>
          )
        }
      />

      <Card className="shadow-soft overflow-hidden">
        {isLoading ? (
          <div className="py-16 flex justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : !products?.length ? (
          <EmptyState icon={Package} title="אין מוצרים עדיין" description="הוסיפי מוצר ראשון לקטלוג" />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>SKU</TableHead>
                <TableHead>שם</TableHead>
                <TableHead>קטגוריה</TableHead>
                <TableHead>קולקציה</TableHead>
                <TableHead>עלות</TableHead>
                <TableHead>מחיר</TableHead>
                <TableHead>מלאי</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {products.map((p) => {
                const totalStock = (p.product_variants ?? []).reduce(
                  (s: number, v: { stock_qty: number }) => s + Number(v.stock_qty ?? 0),
                  0,
                );
                const lowStock = (p.product_variants ?? []).some(
                  (v: { stock_qty: number; min_stock_alert: number | null }) =>
                    v.stock_qty <= (v.min_stock_alert ?? 1),
                );
                return (
                  <TableRow key={p.id}>
                    <TableCell className="font-mono text-xs">{p.sku}</TableCell>
                    <TableCell className="font-medium">{p.internal_name}</TableCell>
                    <TableCell className="text-muted-foreground">{p.category ?? "-"}</TableCell>
                    <TableCell className="text-muted-foreground">{p.collection ?? "-"}</TableCell>
                    <TableCell className="text-muted-foreground">{fmtCurrency(p.cost_price)}</TableCell>
                    <TableCell className="font-semibold">{fmtCurrency(p.sale_price)}</TableCell>
                    <TableCell>
                      {totalStock === 0 ? (
                        <Badge variant="outline">ללא מלאי</Badge>
                      ) : lowStock ? (
                        <Badge className="bg-alert/10 text-alert gap-1">
                          <AlertCircle className="w-3 h-3" />
                          {totalStock}
                        </Badge>
                      ) : (
                        <Badge variant="secondary">{totalStock}</Badge>
                      )}
                    </TableCell>
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

function ProductForm({
  onSubmit,
  loading,
}: {
  onSubmit: (v: z.infer<typeof schema>) => void;
  loading: boolean;
}) {
  const [form, setForm] = useState({
    sku: "",
    internal_name: "",
    category: "",
    collection: "",
    fabric_description: "",
    cost_price: 0,
    sale_price: 0,
  });
  const handle = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = schema.safeParse(form);
    if (!parsed.success) return toast.error(parsed.error.issues[0].message);
    onSubmit(parsed.data);
  };
  return (
    <DialogContent dir="rtl">
      <DialogHeader>
        <DialogTitle>מוצר חדש</DialogTitle>
      </DialogHeader>
      <form onSubmit={handle} className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>SKU *</Label>
          <Input value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} required />
        </div>
        <div className="space-y-2">
          <Label>שם פנימי *</Label>
          <Input value={form.internal_name} onChange={(e) => setForm({ ...form, internal_name: e.target.value })} required />
        </div>
        <div className="space-y-2">
          <Label>קטגוריה</Label>
          <Input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
        </div>
        <div className="space-y-2">
          <Label>קולקציה</Label>
          <Input value={form.collection} onChange={(e) => setForm({ ...form, collection: e.target.value })} />
        </div>
        <div className="space-y-2">
          <Label>מחיר עלות</Label>
          <Input type="number" min="0" step="0.01" value={form.cost_price} onChange={(e) => setForm({ ...form, cost_price: Number(e.target.value) })} />
        </div>
        <div className="space-y-2">
          <Label>מחיר מכירה</Label>
          <Input type="number" min="0" step="0.01" value={form.sale_price} onChange={(e) => setForm({ ...form, sale_price: Number(e.target.value) })} />
        </div>
        <div className="space-y-2 col-span-2">
          <Label>תיאור בד</Label>
          <Textarea rows={2} value={form.fabric_description} onChange={(e) => setForm({ ...form, fabric_description: e.target.value })} />
        </div>
        <DialogFooter className="col-span-2">
          <Button type="submit" disabled={loading} className="gap-2">
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            שמירה
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}

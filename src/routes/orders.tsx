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
import { ClipboardList, Plus, Loader2 } from "lucide-react";
import { fmtCurrency, fmtDate } from "@/lib/format";

export const Route = createFileRoute("/orders")({
  component: () => (
    <RequireAuth>
      <OrdersPage />
    </RequireAuth>
  ),
});

const STATUSES = [
  { v: "pending", l: "ממתינה" },
  { v: "in_production", l: "בייצור" },
  { v: "ready", l: "מוכנה" },
  { v: "awaiting_pickup", l: "ממתינה לאיסוף" },
  { v: "completed", l: "נמסרה" },
  { v: "cancelled", l: "בוטלה" },
] as const;

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-secondary",
  in_production: "bg-warning/20 text-warning-foreground",
  ready: "bg-success/20 text-success-foreground",
  awaiting_pickup: "bg-gold text-gold-foreground",
  completed: "bg-muted",
  cancelled: "bg-alert/10 text-alert",
};

const schema = z.object({
  customer_id: z.string().uuid("בחרי לקוחה"),
  delivery_date: z.string().optional().or(z.literal("")),
  total: z.coerce.number().min(0),
  notes: z.string().trim().max(2000).optional().or(z.literal("")),
});

function OrdersPage() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["orders"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
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
      const { error } = await supabase.from("orders").insert({
        customer_id: input.customer_id,
        delivery_date: input.delivery_date || null,
        total: input.total,
        notes: input.notes || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("הזמנה נוצרה");
      qc.invalidateQueries({ queryKey: ["orders"] });
      setOpen(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const updateStatusMut = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase
        .from("orders")
        .update({ status: status as "pending" | "in_production" | "ready" | "awaiting_pickup" | "completed" | "cancelled" })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["orders"] }),
  });

  return (
    <AppShell>
      <PageHeader
        title="הזמנות"
        description="הזמנות תפורות עם מעקב אחר סטטוס וייצור"
        action={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="w-4 h-4" />
                הזמנה חדשה
              </Button>
            </DialogTrigger>
            <OrderForm
              customers={customers ?? []}
              onSubmit={(v) => createMut.mutate(v)}
              loading={createMut.isPending}
            />
          </Dialog>
        }
      />

      <Card className="shadow-soft overflow-hidden">
        {isLoading ? (
          <div className="py-16 flex justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : !data?.length ? (
          <EmptyState icon={ClipboardList} title="אין הזמנות עדיין" />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>מס׳</TableHead>
                <TableHead>לקוחה</TableHead>
                <TableHead>סטטוס</TableHead>
                <TableHead>מסירה</TableHead>
                <TableHead>סה״כ</TableHead>
                <TableHead>שולם</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((o) => {
                const overdue =
                  o.delivery_date &&
                  new Date(o.delivery_date) < new Date() &&
                  !["completed", "cancelled"].includes(o.status);
                return (
                  <TableRow key={o.id}>
                    <TableCell className="font-mono">#{o.order_number}</TableCell>
                    <TableCell className="font-medium">{o.customers?.full_name ?? "—"}</TableCell>
                    <TableCell>
                      <Select
                        value={o.status}
                        onValueChange={(v) => updateStatusMut.mutate({ id: o.id, status: v })}
                      >
                        <SelectTrigger className="h-8 w-36">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {STATUSES.map((s) => (
                            <SelectItem key={s.v} value={s.v}>{s.l}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <span className={overdue ? "text-alert font-medium" : "text-muted-foreground"}>
                        {fmtDate(o.delivery_date)}
                      </span>
                    </TableCell>
                    <TableCell className="font-semibold">{fmtCurrency(o.total)}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {fmtCurrency(o.paid_amount)}
                      <Badge
                        className={`ml-2 ${STATUS_COLORS[o.status]}`}
                      >
                        {Number(o.paid_amount ?? 0) >= Number(o.total ?? 0) ? "שולם" : "חוב"}
                      </Badge>
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

function OrderForm({
  customers,
  onSubmit,
  loading,
}: {
  customers: { id: string; full_name: string }[];
  onSubmit: (v: z.infer<typeof schema>) => void;
  loading: boolean;
}) {
  const [form, setForm] = useState({
    customer_id: "",
    delivery_date: "",
    total: 0,
    notes: "",
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
        <DialogTitle>הזמנה חדשה</DialogTitle>
      </DialogHeader>
      <form onSubmit={handle} className="space-y-4">
        <div className="space-y-2">
          <Label>לקוחה *</Label>
          <Select value={form.customer_id} onValueChange={(v) => setForm({ ...form, customer_id: v })}>
            <SelectTrigger>
              <SelectValue placeholder="בחרי לקוחה…" />
            </SelectTrigger>
            <SelectContent>
              {customers.map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.full_name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>תאריך מסירה</Label>
            <Input type="date" value={form.delivery_date} onChange={(e) => setForm({ ...form, delivery_date: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label>סה״כ</Label>
            <Input type="number" min="0" step="0.01" value={form.total} onChange={(e) => setForm({ ...form, total: Number(e.target.value) })} />
          </div>
        </div>
        <div className="space-y-2">
          <Label>הערות</Label>
          <Textarea rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
        </div>
        <DialogFooter>
          <Button type="submit" disabled={loading} className="gap-2">
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            יצירה
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}

import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { RequireAuth } from "@/components/RequireAuth";
import { AppShell, PageHeader } from "@/components/AppShell";
import { EmptyState } from "@/components/EmptyState";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ShoppingBag, Loader2 } from "lucide-react";
import { fmtCurrency, fmtDateTime } from "@/lib/format";

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

function SalesPage() {
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
      <PageHeader title="מכירות" description="היסטוריית מכירות והפקת קבלות" />

      <Card className="shadow-soft overflow-hidden">
        {isLoading ? (
          <div className="py-16 flex justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : !data?.length ? (
          <EmptyState
            icon={ShoppingBag}
            title="אין מכירות עדיין"
            description="מכירות שתבוצענה יופיעו כאן"
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>קבלה</TableHead>
                <TableHead>תאריך</TableHead>
                <TableHead>לקוחה</TableHead>
                <TableHead>פריטים</TableHead>
                <TableHead>אמצעי תשלום</TableHead>
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
                  <TableCell className="text-muted-foreground">
                    {PAYMENT_LABEL[s.payment_method] ?? s.payment_method}
                  </TableCell>
                  <TableCell className="font-semibold">{fmtCurrency(s.total)}</TableCell>
                  <TableCell>
                    {s.is_cancelled ? (
                      <Badge className="bg-alert/10 text-alert">בוטלה</Badge>
                    ) : (
                      <Badge className="bg-success/20 text-success-foreground">הושלמה</Badge>
                    )}
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

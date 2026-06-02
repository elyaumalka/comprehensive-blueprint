import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { RequireAuth } from "@/components/RequireAuth";
import { AppShell, PageHeader } from "@/components/AppShell";
import { EmptyState } from "@/components/EmptyState";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
import { fmtDateTime } from "@/lib/format";
import { History, Lock, Loader2 } from "lucide-react";

export const Route = createFileRoute("/history")({
  component: () => (
    <RequireAuth>
      <HistoryPage />
    </RequireAuth>
  ),
});

const TABLE_LABEL: Record<string, string> = {
  customers: "לקוחות",
  sales: "מכירות",
  orders: "הזמנות",
  returns: "החזרות",
  products: "מוצרים",
  employees: "עובדות",
  expenses: "הוצאות",
};

const ACTION_LABEL: Record<string, { l: string; c: string }> = {
  INSERT: { l: "נוצר", c: "bg-success/20 text-success-foreground" },
  UPDATE: { l: "עודכן", c: "bg-warning/20" },
  DELETE: { l: "נמחק", c: "bg-alert/10 text-alert" },
};

function HistoryPage() {
  const { isAdmin } = useAuth();
  const [tableFilter, setTableFilter] = useState("all");

  const { data: profiles } = useQuery({
    queryKey: ["profiles-min"],
    enabled: isAdmin,
    queryFn: async () => (await supabase.from("profiles").select("id, full_name")).data ?? [],
  });

  const { data, isLoading } = useQuery({
    queryKey: ["audit", tableFilter],
    enabled: isAdmin,
    queryFn: async () => {
      let q = supabase.from("audit_log").select("*").order("created_at", { ascending: false }).limit(200);
      if (tableFilter !== "all") q = q.eq("table_name", tableFilter);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
  });

  if (!isAdmin) {
    return (
      <AppShell>
        <PageHeader title="היסטוריית שינויים" />
        <Card className="p-12 text-center shadow-soft">
          <Lock className="w-10 h-10 mx-auto mb-3 text-muted-foreground" />
          <p className="text-muted-foreground">גישה למנהלות בלבד</p>
        </Card>
      </AppShell>
    );
  }

  const nameOf = (id: string | null) => (profiles ?? []).find((p) => p.id === id)?.full_name ?? "מערכת";

  return (
    <AppShell>
      <PageHeader
        title="היסטוריית שינויים"
        description="תיעוד מלא: מי שינה מה ומתי"
        action={
          <Select value={tableFilter} onValueChange={setTableFilter}>
            <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">כל הטבלאות</SelectItem>
              {Object.entries(TABLE_LABEL).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
            </SelectContent>
          </Select>
        }
      />

      <Card className="shadow-soft overflow-hidden">
        {isLoading ? (
          <div className="py-16 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
        ) : !data?.length ? (
          <EmptyState icon={History} title="אין שינויים מתועדים עדיין" description="שינויים שיבוצעו מעכשיו יתועדו כאן" />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>מתי</TableHead>
                <TableHead>פעולה</TableHead>
                <TableHead>טבלה</TableHead>
                <TableHead>מי ביצע</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((a) => (
                <TableRow key={a.id}>
                  <TableCell className="text-muted-foreground whitespace-nowrap">{fmtDateTime(a.created_at)}</TableCell>
                  <TableCell><Badge className={ACTION_LABEL[a.action]?.c}>{ACTION_LABEL[a.action]?.l ?? a.action}</Badge></TableCell>
                  <TableCell>{TABLE_LABEL[a.table_name] ?? a.table_name}</TableCell>
                  <TableCell className="font-medium">{nameOf(a.performed_by)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>
    </AppShell>
  );
}

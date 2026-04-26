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
import { Sparkles, Plus, Loader2, ArrowLeftRight } from "lucide-react";
import { fmtDate } from "@/lib/format";

export const Route = createFileRoute("/leads")({
  component: () => (
    <RequireAuth>
      <LeadsPage />
    </RequireAuth>
  ),
});

const STATUSES = [
  { v: "new", l: "חדש", c: "bg-secondary" },
  { v: "in_progress", l: "בטיפול", c: "bg-warning/20 text-warning-foreground" },
  { v: "converted", l: "הומר ללקוחה", c: "bg-success/20 text-success-foreground" },
  { v: "lost", l: "אבוד", c: "bg-alert/10 text-alert" },
] as const;

const schema = z.object({
  full_name: z.string().trim().min(1, "שם חובה").max(120),
  phone: z.string().trim().max(30).optional().or(z.literal("")),
  email: z.string().trim().max(255).optional().or(z.literal("")),
  source: z.string().trim().max(80).optional().or(z.literal("")),
  notes: z.string().trim().max(2000).optional().or(z.literal("")),
  next_followup: z.string().optional().or(z.literal("")),
  status: z.enum(["new", "in_progress", "converted", "lost"]),
});

function LeadsPage() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["leads"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("leads")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const createMut = useMutation({
    mutationFn: async (input: z.infer<typeof schema>) => {
      const payload = {
        ...input,
        phone: input.phone || null,
        email: input.email || null,
        source: input.source || null,
        notes: input.notes || null,
        next_followup: input.next_followup || null,
      };
      const { error } = await supabase.from("leads").insert(payload);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("ליד נוסף");
      qc.invalidateQueries({ queryKey: ["leads"] });
      setOpen(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const convertMut = useMutation({
    mutationFn: async (lead: { id: string; full_name: string; phone: string | null; email: string | null }) => {
      const { data: customer, error: cErr } = await supabase
        .from("customers")
        .insert({
          full_name: lead.full_name,
          phone: lead.phone,
          email: lead.email,
        })
        .select("id")
        .single();
      if (cErr) throw cErr;
      const { error: uErr } = await supabase
        .from("leads")
        .update({ status: "converted", converted_customer_id: customer.id })
        .eq("id", lead.id);
      if (uErr) throw uErr;
    },
    onSuccess: () => {
      toast.success("הליד הומר ללקוחה");
      qc.invalidateQueries({ queryKey: ["leads"] });
      qc.invalidateQueries({ queryKey: ["customers"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const updateStatusMut = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase
        .from("leads")
        .update({ status: status as "new" | "in_progress" | "converted" | "lost" })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["leads"] }),
  });

  return (
    <AppShell>
      <PageHeader
        title="לידים"
        description="ניהול לקוחות פוטנציאליות עד להמרה"
        action={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="w-4 h-4" />
                ליד חדש
              </Button>
            </DialogTrigger>
            <LeadForm onSubmit={(v) => createMut.mutate(v)} loading={createMut.isPending} />
          </Dialog>
        }
      />

      <Card className="shadow-soft overflow-hidden">
        {isLoading ? (
          <div className="py-16 flex justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : !data?.length ? (
          <EmptyState icon={Sparkles} title="אין לידים עדיין" description="הוסיפי ליד ראשון למערכת" />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>שם</TableHead>
                <TableHead>טלפון</TableHead>
                <TableHead>מקור</TableHead>
                <TableHead>סטטוס</TableHead>
                <TableHead>פולואפ הבא</TableHead>
                <TableHead>נוצר</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((l) => {
                const overdue = l.next_followup && new Date(l.next_followup) < new Date() && l.status !== "converted";
                return (
                  <TableRow key={l.id}>
                    <TableCell className="font-medium">{l.full_name}</TableCell>
                    <TableCell className="text-muted-foreground">{l.phone ?? "-"}</TableCell>
                    <TableCell className="text-muted-foreground">{l.source ?? "-"}</TableCell>
                    <TableCell>
                      <Select
                        value={l.status}
                        onValueChange={(v) => updateStatusMut.mutate({ id: l.id, status: v })}
                      >
                        <SelectTrigger className="h-8 w-32">
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
                        {fmtDate(l.next_followup)}
                      </span>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{fmtDate(l.created_at)}</TableCell>
                    <TableCell>
                      {l.status !== "converted" && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-1"
                          onClick={() =>
                            convertMut.mutate({
                              id: l.id,
                              full_name: l.full_name,
                              phone: l.phone,
                              email: l.email,
                            })
                          }
                        >
                          <ArrowLeftRight className="w-3 h-3" />
                          המרה
                        </Button>
                      )}
                      {l.status === "converted" && (
                        <Badge className="bg-success/20 text-success-foreground">הומר</Badge>
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

function LeadForm({
  onSubmit,
  loading,
}: {
  onSubmit: (v: z.infer<typeof schema>) => void;
  loading: boolean;
}) {
  const [form, setForm] = useState<z.infer<typeof schema>>({
    full_name: "",
    phone: "",
    email: "",
    source: "",
    notes: "",
    next_followup: "",
    status: "new",
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
        <DialogTitle>ליד חדש</DialogTitle>
      </DialogHeader>
      <form onSubmit={handle} className="space-y-4">
        <div className="space-y-2">
          <Label>שם מלא *</Label>
          <Input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} required />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>טלפון</Label>
            <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label>מייל</Label>
            <Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </div>
        </div>
        <div className="space-y-2">
          <Label>מקור</Label>
          <Input value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })} />
        </div>
        <div className="space-y-2">
          <Label>תאריך פולואפ</Label>
          <Input type="date" value={form.next_followup} onChange={(e) => setForm({ ...form, next_followup: e.target.value })} />
        </div>
        <div className="space-y-2">
          <Label>הערות</Label>
          <Textarea rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
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

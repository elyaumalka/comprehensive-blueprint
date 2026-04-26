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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";
import { Megaphone, Plus, Loader2, Lock } from "lucide-react";
import { fmtCurrency, fmtDate } from "@/lib/format";

export const Route = createFileRoute("/campaigns")({
  component: () => (
    <RequireAuth>
      <CampaignsPage />
    </RequireAuth>
  ),
});

const schema = z.object({
  name: z.string().trim().min(1, "שם חובה").max(160),
  channel: z.string().trim().max(80).optional().or(z.literal("")),
  goal: z.string().trim().max(200).optional().or(z.literal("")),
  audience: z.string().trim().max(200).optional().or(z.literal("")),
  budget: z.coerce.number().min(0).optional(),
  start_date: z.string().optional().or(z.literal("")),
  end_date: z.string().optional().or(z.literal("")),
  notes: z.string().trim().max(2000).optional().or(z.literal("")),
});

function CampaignsPage() {
  const { isAdmin } = useAuth();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["campaigns"],
    queryFn: async () => {
      const { data, error } = await supabase.from("campaigns").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const createMut = useMutation({
    mutationFn: async (input: z.infer<typeof schema>) => {
      const { error } = await supabase.from("campaigns").insert({
        name: input.name,
        channel: input.channel || null,
        goal: input.goal || null,
        audience: input.audience || null,
        budget: input.budget ?? null,
        start_date: input.start_date || null,
        end_date: input.end_date || null,
        notes: input.notes || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("קמפיין נוצר");
      qc.invalidateQueries({ queryKey: ["campaigns"] });
      setOpen(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (!isAdmin) {
    return (
      <AppShell>
        <PageHeader title="קמפיינים" />
        <Card className="p-12 text-center shadow-soft">
          <Lock className="w-10 h-10 mx-auto mb-3 text-muted-foreground" />
          <p className="text-muted-foreground">גישה למנהלות בלבד</p>
        </Card>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <PageHeader
        title="קמפיינים"
        description="ניהול פעילות שיווקית וניוזלטרים"
        action={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2"><Plus className="w-4 h-4" />קמפיין חדש</Button>
            </DialogTrigger>
            <CampaignForm onSubmit={(v) => createMut.mutate(v)} loading={createMut.isPending} />
          </Dialog>
        }
      />

      <Card className="shadow-soft overflow-hidden">
        {isLoading ? (
          <div className="py-16 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
        ) : !data?.length ? (
          <EmptyState icon={Megaphone} title="אין קמפיינים" description="צרי קמפיין שיווקי ראשון" />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>שם</TableHead>
                <TableHead>ערוץ</TableHead>
                <TableHead>קהל יעד</TableHead>
                <TableHead>תקציב</TableHead>
                <TableHead>תקופה</TableHead>
                <TableHead>סטטוס</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">{c.name}</TableCell>
                  <TableCell className="text-muted-foreground">{c.channel ?? "-"}</TableCell>
                  <TableCell className="text-muted-foreground">{c.audience ?? "-"}</TableCell>
                  <TableCell className="text-muted-foreground">{c.budget ? fmtCurrency(c.budget) : "-"}</TableCell>
                  <TableCell className="text-muted-foreground text-xs">
                    {fmtDate(c.start_date)} ← {fmtDate(c.end_date)}
                  </TableCell>
                  <TableCell>
                    {c.is_active ? <Badge className="bg-success/20 text-success-foreground">פעיל</Badge> : <Badge variant="outline">לא פעיל</Badge>}
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

function CampaignForm({
  onSubmit,
  loading,
}: {
  onSubmit: (v: z.infer<typeof schema>) => void;
  loading: boolean;
}) {
  const [form, setForm] = useState({
    name: "",
    channel: "",
    goal: "",
    audience: "",
    budget: 0,
    start_date: "",
    end_date: "",
    notes: "",
  });
  return (
    <DialogContent dir="rtl">
      <DialogHeader><DialogTitle>קמפיין חדש</DialogTitle></DialogHeader>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const p = schema.safeParse(form);
          if (!p.success) return toast.error(p.error.issues[0].message);
          onSubmit(p.data);
        }}
        className="grid grid-cols-2 gap-4"
      >
        <div className="space-y-2 col-span-2">
          <Label>שם *</Label>
          <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
        </div>
        <div className="space-y-2">
          <Label>ערוץ</Label>
          <Input placeholder="אינסטגרם, פייסבוק, ניוזלטר…" value={form.channel} onChange={(e) => setForm({ ...form, channel: e.target.value })} />
        </div>
        <div className="space-y-2">
          <Label>קהל יעד</Label>
          <Input value={form.audience} onChange={(e) => setForm({ ...form, audience: e.target.value })} />
        </div>
        <div className="space-y-2">
          <Label>תקציב</Label>
          <Input type="number" min="0" value={form.budget} onChange={(e) => setForm({ ...form, budget: Number(e.target.value) })} />
        </div>
        <div className="space-y-2">
          <Label>מטרה</Label>
          <Input value={form.goal} onChange={(e) => setForm({ ...form, goal: e.target.value })} />
        </div>
        <div className="space-y-2">
          <Label>תאריך התחלה</Label>
          <Input type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} />
        </div>
        <div className="space-y-2">
          <Label>תאריך סיום</Label>
          <Input type="date" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} />
        </div>
        <div className="space-y-2 col-span-2">
          <Label>הערות</Label>
          <Textarea rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
        </div>
        <DialogFooter className="col-span-2">
          <Button type="submit" disabled={loading} className="gap-2">
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}שמירה
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}

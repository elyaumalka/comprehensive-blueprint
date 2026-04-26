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
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";
import { UserCog, Plus, Loader2, Lock } from "lucide-react";
import { fmtCurrency } from "@/lib/format";

export const Route = createFileRoute("/employees")({
  component: () => (
    <RequireAuth>
      <EmployeesPage />
    </RequireAuth>
  ),
});

const schema = z.object({
  full_name: z.string().trim().min(1).max(120),
  position: z.string().trim().max(80).optional().or(z.literal("")),
  phone: z.string().trim().max(30).optional().or(z.literal("")),
  email: z.string().trim().max(255).optional().or(z.literal("")),
  hourly_rate: z.coerce.number().min(0).optional(),
  monthly_salary: z.coerce.number().min(0).optional(),
});

function EmployeesPage() {
  const { isAdmin } = useAuth();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["employees"],
    queryFn: async () => {
      const { data, error } = await supabase.from("employees").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const createMut = useMutation({
    mutationFn: async (input: z.infer<typeof schema>) => {
      const { error } = await supabase.from("employees").insert({
        full_name: input.full_name,
        position: input.position || null,
        phone: input.phone || null,
        email: input.email || null,
        hourly_rate: input.hourly_rate ?? null,
        monthly_salary: input.monthly_salary ?? null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("עובדת נוספה");
      qc.invalidateQueries({ queryKey: ["employees"] });
      setOpen(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (!isAdmin) {
    return (
      <AppShell>
        <PageHeader title="עובדות" />
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
        title="עובדות ושעון"
        description="ניהול צוות, שעון נוכחות ומשכורות"
        action={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2"><Plus className="w-4 h-4" />עובדת חדשה</Button>
            </DialogTrigger>
            <EmployeeForm onSubmit={(v) => createMut.mutate(v)} loading={createMut.isPending} />
          </Dialog>
        }
      />

      <Card className="shadow-soft overflow-hidden">
        {isLoading ? (
          <div className="py-16 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
        ) : !data?.length ? (
          <EmptyState icon={UserCog} title="אין עובדות עדיין" />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>שם</TableHead>
                <TableHead>תפקיד</TableHead>
                <TableHead>טלפון</TableHead>
                <TableHead>שכר שעה</TableHead>
                <TableHead>שכר חודשי</TableHead>
                <TableHead>סטטוס</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((e) => (
                <TableRow key={e.id}>
                  <TableCell className="font-medium">{e.full_name}</TableCell>
                  <TableCell className="text-muted-foreground">{e.position ?? "-"}</TableCell>
                  <TableCell className="text-muted-foreground">{e.phone ?? "-"}</TableCell>
                  <TableCell className="text-muted-foreground">{e.hourly_rate ? fmtCurrency(e.hourly_rate) : "-"}</TableCell>
                  <TableCell className="text-muted-foreground">{e.monthly_salary ? fmtCurrency(e.monthly_salary) : "-"}</TableCell>
                  <TableCell>
                    {e.is_active ? <Badge className="bg-success/20 text-success-foreground">פעילה</Badge> : <Badge variant="outline">לא פעילה</Badge>}
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

function EmployeeForm({
  onSubmit,
  loading,
}: {
  onSubmit: (v: z.infer<typeof schema>) => void;
  loading: boolean;
}) {
  const [form, setForm] = useState({
    full_name: "",
    position: "",
    phone: "",
    email: "",
    hourly_rate: 0,
    monthly_salary: 0,
  });
  return (
    <DialogContent dir="rtl">
      <DialogHeader><DialogTitle>עובדת חדשה</DialogTitle></DialogHeader>
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
          <Label>שם מלא *</Label>
          <Input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} required />
        </div>
        <div className="space-y-2">
          <Label>תפקיד</Label>
          <Input value={form.position} onChange={(e) => setForm({ ...form, position: e.target.value })} />
        </div>
        <div className="space-y-2">
          <Label>טלפון</Label>
          <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
        </div>
        <div className="space-y-2">
          <Label>שכר שעה</Label>
          <Input type="number" min="0" value={form.hourly_rate} onChange={(e) => setForm({ ...form, hourly_rate: Number(e.target.value) })} />
        </div>
        <div className="space-y-2">
          <Label>שכר חודשי</Label>
          <Input type="number" min="0" value={form.monthly_salary} onChange={(e) => setForm({ ...form, monthly_salary: Number(e.target.value) })} />
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

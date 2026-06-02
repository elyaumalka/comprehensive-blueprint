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
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";
import { Settings as SettingsIcon, Plus, Loader2, Lock, Truck } from "lucide-react";
import { SupplierDetailSheet } from "@/components/SupplierDetailSheet";
import { PAYMENT_TERMS } from "@/lib/supplier-terms";

export const Route = createFileRoute("/settings")({
  component: () => (
    <RequireAuth>
      <SettingsPage />
    </RequireAuth>
  ),
});

function SettingsPage() {
  const { isAdmin } = useAuth();
  if (!isAdmin) {
    return (
      <AppShell>
        <PageHeader title="הגדרות" />
        <Card className="p-12 text-center shadow-soft">
          <Lock className="w-10 h-10 mx-auto mb-3 text-muted-foreground" />
          <p className="text-muted-foreground">גישה למנהלות בלבד</p>
        </Card>
      </AppShell>
    );
  }
  return (
    <AppShell>
      <PageHeader title="הגדרות" description="ניהול ספקים, משתמשות והגדרות עסק" />
      <Tabs defaultValue="suppliers">
        <TabsList className="mb-4">
          <TabsTrigger value="suppliers">ספקים</TabsTrigger>
          <TabsTrigger value="users">משתמשות והרשאות</TabsTrigger>
        </TabsList>
        <TabsContent value="suppliers"><Suppliers /></TabsContent>
        <TabsContent value="users"><Users /></TabsContent>
      </Tabs>
    </AppShell>
  );
}

const supSchema = z.object({
  name: z.string().trim().min(1, "שם חובה").max(160),
  contact_name: z.string().trim().max(120).optional().or(z.literal("")),
  phone: z.string().trim().max(30).optional().or(z.literal("")),
  email: z.string().trim().max(255).optional().or(z.literal("")),
  field: z.string().trim().max(80).optional().or(z.literal("")),
  payment_terms: z.string().trim().max(80).optional().or(z.literal("")),
});

function Suppliers() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<any>(null);
  const { data, isLoading } = useQuery({
    queryKey: ["suppliers"],
    queryFn: async () => {
      const { data, error } = await supabase.from("suppliers").select("*").order("name");
      if (error) throw error;
      return data;
    },
  });
  const createMut = useMutation({
    mutationFn: async (input: z.infer<typeof supSchema>) => {
      const { error } = await supabase.from("suppliers").insert({
        name: input.name,
        contact_name: input.contact_name || null,
        phone: input.phone || null,
        email: input.email || null,
        field: input.field || null,
        payment_terms: input.payment_terms || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("ספק נוסף");
      qc.invalidateQueries({ queryKey: ["suppliers"] });
      setOpen(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const [form, setForm] = useState({
    name: "",
    contact_name: "",
    phone: "",
    email: "",
    field: "",
    payment_terms: "",
  });

  return (
    <Card className="shadow-soft overflow-hidden">
      <div className="p-4 flex justify-end">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button size="sm" className="gap-2"><Plus className="w-4 h-4" />ספק חדש</Button></DialogTrigger>
          <DialogContent dir="rtl">
            <DialogHeader><DialogTitle>ספק חדש</DialogTitle></DialogHeader>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const p = supSchema.safeParse(form);
                if (!p.success) return toast.error(p.error.issues[0].message);
                createMut.mutate(p.data);
              }}
              className="grid grid-cols-2 gap-4"
            >
              <div className="space-y-2 col-span-2"><Label>שם *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></div>
              <div className="space-y-2"><Label>איש קשר</Label><Input value={form.contact_name} onChange={(e) => setForm({ ...form, contact_name: e.target.value })} /></div>
              <div className="space-y-2"><Label>תחום</Label><Input value={form.field} onChange={(e) => setForm({ ...form, field: e.target.value })} /></div>
              <div className="space-y-2"><Label>טלפון</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
              <div className="space-y-2"><Label>מייל</Label><Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
              <div className="space-y-2 col-span-2">
                <Label>תנאי תשלום</Label>
                <Select value={form.payment_terms} onValueChange={(v) => setForm({ ...form, payment_terms: v })}>
                  <SelectTrigger><SelectValue placeholder="בחרי תנאי תשלום" /></SelectTrigger>
                  <SelectContent>
                    {PAYMENT_TERMS.map((t) => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <DialogFooter className="col-span-2">
                <Button type="submit" disabled={createMut.isPending} className="gap-2">
                  {createMut.isPending && <Loader2 className="w-4 h-4 animate-spin" />}שמירה
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
      {isLoading ? (
        <div className="py-12 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
      ) : !data?.length ? (
        <EmptyState icon={Truck} title="אין ספקים" />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>שם</TableHead>
              <TableHead>איש קשר</TableHead>
              <TableHead>תחום</TableHead>
              <TableHead>טלפון</TableHead>
              <TableHead>תנאי תשלום</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((s) => (
              <TableRow key={s.id} className="cursor-pointer" onClick={() => setSelected(s)}>
                <TableCell className="font-medium">{s.name}</TableCell>
                <TableCell className="text-muted-foreground">{s.contact_name ?? "-"}</TableCell>
                <TableCell className="text-muted-foreground">{s.field ?? "-"}</TableCell>
                <TableCell className="text-muted-foreground">{s.phone ?? "-"}</TableCell>
                <TableCell className="text-muted-foreground">{s.payment_terms ?? "-"}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
      <SupplierDetailSheet
        supplier={selected}
        open={!!selected}
        onOpenChange={(v) => { if (!v) setSelected(null); }}
      />
    </Card>
  );
}

function Users() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["profiles-roles"],
    queryFn: async () => {
      const [{ data: profiles }, { data: roles }] = await Promise.all([
        supabase.from("profiles").select("id, full_name"),
        supabase.from("user_roles").select("user_id, role"),
      ]);
      return (profiles ?? []).map((p) => ({
        ...p,
        roles: (roles ?? []).filter((r) => r.user_id === p.id).map((r) => r.role),
      }));
    },
  });

  const setRoleMut = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: "admin" | "staff" | "viewer" }) => {
      const { error: delErr } = await supabase.from("user_roles").delete().eq("user_id", userId);
      if (delErr) throw delErr;
      const { error } = await supabase.from("user_roles").insert({ user_id: userId, role });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("הרשאה עודכנה");
      qc.invalidateQueries({ queryKey: ["profiles-roles"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Card className="shadow-soft overflow-hidden">
      {isLoading ? (
        <div className="py-12 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
      ) : !data?.length ? (
        <EmptyState icon={SettingsIcon} title="אין משתמשות" />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>שם</TableHead>
              <TableHead>הרשאה</TableHead>
              <TableHead>פעולות</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((u) => (
              <TableRow key={u.id}>
                <TableCell className="font-medium">{u.full_name ?? u.id.slice(0, 8)}</TableCell>
                <TableCell>
                  {u.roles.map((r) => (
                    <Badge key={r} className={r === "admin" ? "bg-gold text-gold-foreground mr-1" : "mr-1"}>
                      {r === "admin" ? "מנהלת" : r === "staff" ? "עובדת" : "צופה"}
                    </Badge>
                  ))}
                </TableCell>
                <TableCell className="space-x-1 space-x-reverse">
                  <Button variant="outline" size="sm" onClick={() => setRoleMut.mutate({ userId: u.id, role: "admin" })}>מנהלת</Button>
                  <Button variant="outline" size="sm" onClick={() => setRoleMut.mutate({ userId: u.id, role: "staff" })}>עובדת</Button>
                  <Button variant="outline" size="sm" onClick={() => setRoleMut.mutate({ userId: u.id, role: "viewer" })}>צופה</Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </Card>
  );
}

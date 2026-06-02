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
import { Settings as SettingsIcon, Plus, Loader2, Lock, Truck, UserPlus } from "lucide-react";
import { SupplierDetailSheet } from "@/components/SupplierDetailSheet";
import { PAYMENT_TERMS } from "@/lib/supplier-terms";
import { createClient } from "@supabase/supabase-js";

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

const ROLE_OPTIONS = [
  { v: "admin", l: "מנהלת" },
  { v: "staff", l: "מוכרת" },
  { v: "accounting", l: "הנהלת חשבונות" },
  { v: "marketing", l: "שיווק" },
  { v: "viewer", l: "צופה" },
] as const;
const roleLabel = (r: string) => ROLE_OPTIONS.find((o) => o.v === r)?.l ?? r;

function Users() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["profiles-roles"],
    queryFn: async () => {
      const [{ data: profiles }, { data: roles }, { data: employees }] = await Promise.all([
        supabase.from("profiles").select("id, full_name"),
        supabase.from("user_roles").select("user_id, role"),
        supabase.from("employees").select("id, full_name, user_id"),
      ]);
      return {
        users: (profiles ?? []).map((p) => ({
          ...p,
          roles: (roles ?? []).filter((r) => r.user_id === p.id).map((r) => r.role),
          employeeId: (employees ?? []).find((e) => e.user_id === p.id)?.id ?? "",
        })),
        employees: employees ?? [],
      };
    },
  });

  const setRoleMut = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: string }) => {
      const { error: delErr } = await supabase.from("user_roles").delete().eq("user_id", userId);
      if (delErr) throw delErr;
      const { error } = await supabase.from("user_roles").insert({ user_id: userId, role: role as "admin" });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("הרשאה עודכנה");
      qc.invalidateQueries({ queryKey: ["profiles-roles"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // קישור משתמש לרשומת עובדת (כדי שהשעון והמכירות יעבדו)
  const linkMut = useMutation({
    mutationFn: async ({ userId, employeeId }: { userId: string; employeeId: string }) => {
      // ניתוק קישור קודם של המשתמש
      await supabase.from("employees").update({ user_id: null }).eq("user_id", userId);
      if (employeeId) {
        const { error } = await supabase.from("employees").update({ user_id: userId }).eq("id", employeeId);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success("הקישור עודכן");
      qc.invalidateQueries({ queryKey: ["profiles-roles"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <AddUserDialog />
      </div>
    <Card className="shadow-soft overflow-hidden">
      {isLoading ? (
        <div className="py-12 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
      ) : !data?.users.length ? (
        <EmptyState icon={SettingsIcon} title="אין משתמשות" description="הוסיפי משתמשת ראשונה עם הכפתור למעלה" />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>שם</TableHead>
              <TableHead>תפקיד נוכחי</TableHead>
              <TableHead>שינוי תפקיד</TableHead>
              <TableHead>מקושרת לעובדת</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.users.map((u) => (
              <TableRow key={u.id}>
                <TableCell className="font-medium">{u.full_name ?? u.id.slice(0, 8)}</TableCell>
                <TableCell>
                  {u.roles.length ? u.roles.map((r) => (
                    <Badge key={r} className={r === "admin" ? "bg-gold text-gold-foreground mr-1" : "mr-1"}>{roleLabel(r)}</Badge>
                  )) : <span className="text-muted-foreground text-sm">—</span>}
                </TableCell>
                <TableCell>
                  <Select value={u.roles[0] ?? ""} onValueChange={(role) => setRoleMut.mutate({ userId: u.id, role })}>
                    <SelectTrigger className="h-8 w-40"><SelectValue placeholder="בחרי תפקיד" /></SelectTrigger>
                    <SelectContent>
                      {ROLE_OPTIONS.map((o) => <SelectItem key={o.v} value={o.v}>{o.l}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell>
                  <Select value={u.employeeId || "none"} onValueChange={(v) => linkMut.mutate({ userId: u.id, employeeId: v === "none" ? "" : v })}>
                    <SelectTrigger className="h-8 w-44"><SelectValue placeholder="ללא" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">ללא קישור</SelectItem>
                      {data.employees.map((e) => <SelectItem key={e.id} value={e.id}>{e.full_name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </Card>
    </div>
  );
}

function AddUserDialog() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ full_name: "", email: "", password: "", role: "staff" });
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.email || form.password.length < 6) {
      toast.error("חובה מייל וסיסמה של לפחות 6 תווים");
      return;
    }
    setLoading(true);
    try {
      // יצירת המשתמש דרך client זמני כדי לא להחליף את ההתחברות של המנהלת
      const url = import.meta.env.VITE_SUPABASE_URL as string;
      const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;
      const tmp = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
      const { data, error } = await tmp.auth.signUp({
        email: form.email,
        password: form.password,
        options: { data: { full_name: form.full_name } },
      });
      if (error) throw error;
      const newId = data.user?.id;
      if (newId) {
        // קביעת התפקיד הנבחר (במקום ברירת המחדל מהטריגר)
        await supabase.from("user_roles").delete().eq("user_id", newId);
        await supabase.from("user_roles").insert({ user_id: newId, role: form.role as "admin" });
      }
      toast.success("המשתמשת נוצרה בהצלחה");
      qc.invalidateQueries({ queryKey: ["profiles-roles"] });
      setForm({ full_name: "", email: "", password: "", role: "staff" });
      setOpen(false);
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2"><UserPlus className="w-4 h-4" />משתמשת חדשה</Button>
      </DialogTrigger>
      <DialogContent dir="rtl">
        <DialogHeader><DialogTitle>הוספת משתמשת (login)</DialogTitle></DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-2">
            <Label>שם מלא</Label>
            <Input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label>מייל *</Label>
            <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
          </div>
          <div className="space-y-2">
            <Label>סיסמה * <span className="text-xs text-muted-foreground">(לפחות 6 תווים)</span></Label>
            <Input type="text" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
          </div>
          <div className="space-y-2">
            <Label>תפקיד</Label>
            <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {ROLE_OPTIONS.map((o) => <SelectItem key={o.v} value={o.v}>{o.l}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <p className="text-xs text-muted-foreground">
            לאחר היצירה אפשר לקשר את המשתמשת לרשומת עובדת בטבלה (לשעון נוכחות). אם מופעל אימות מייל בפרויקט — המשתמשת תצטרך לאשר את המייל לפני התחברות.
          </p>
          <DialogFooter>
            <Button type="submit" disabled={loading} className="gap-2">
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}יצירת משתמשת
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

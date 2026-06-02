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
import { Switch } from "@/components/ui/switch";
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
import { Users, Plus, Search, Star, Loader2 } from "lucide-react";
import { fmtDate } from "@/lib/format";

export const Route = createFileRoute("/customers")({
  component: () => (
    <RequireAuth>
      <CustomersPage />
    </RequireAuth>
  ),
});

const schema = z.object({
  full_name: z.string().trim().min(1, "שם חובה").max(120),
  phone: z.string().trim().max(30).optional().or(z.literal("")),
  email: z.string().trim().email("מייל לא תקין").max(255).optional().or(z.literal("")),
  city: z.string().trim().max(80).optional().or(z.literal("")),
  birth_date: z.string().optional().or(z.literal("")),
  source: z.string().trim().max(80).optional().or(z.literal("")),
  style_notes: z.string().trim().max(2000).optional().or(z.literal("")),
  referred_by_employee_id: z.string().optional().or(z.literal("")),
  is_vip: z.boolean(),
  whatsapp_group: z.boolean(),
});

function CustomersPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["customers", search],
    queryFn: async () => {
      let q = supabase
        .from("customers")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200);
      if (search) q = q.or(`full_name.ilike.%${search}%,phone.ilike.%${search}%`);
      const { data, error } = await q;
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
        city: input.city || null,
        birth_date: input.birth_date || null,
        source: input.source || null,
        style_notes: input.style_notes || null,
        referred_by_employee_id: input.referred_by_employee_id || null,
      };
      const { error } = await supabase.from("customers").insert(payload);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("לקוחה נוספה");
      qc.invalidateQueries({ queryKey: ["customers"] });
      setOpen(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <AppShell>
      <PageHeader
        title="לקוחות"
        description="ניהול כרטסת לקוחות הבוטיק"
        action={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="w-4 h-4" />
                לקוחה חדשה
              </Button>
            </DialogTrigger>
            <CustomerForm onSubmit={(v) => createMut.mutate(v)} loading={createMut.isPending} />
          </Dialog>
        }
      />

      <Card className="p-4 mb-4 shadow-soft">
        <div className="relative">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="חיפוש לפי שם או טלפון…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pr-10"
          />
        </div>
      </Card>

      <Card className="shadow-soft overflow-hidden">
        {isLoading ? (
          <div className="py-16 flex justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : !data?.length ? (
          <EmptyState
            icon={Users}
            title="אין לקוחות עדיין"
            description="התחילי בהוספת לקוחה ראשונה למערכת"
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>שם</TableHead>
                <TableHead>טלפון</TableHead>
                <TableHead>עיר</TableHead>
                <TableHead>מקור</TableHead>
                <TableHead>תאריך הוספה</TableHead>
                <TableHead>תגיות</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">{c.full_name}</TableCell>
                  <TableCell className="text-muted-foreground">{c.phone ?? "-"}</TableCell>
                  <TableCell className="text-muted-foreground">{c.city ?? "-"}</TableCell>
                  <TableCell className="text-muted-foreground">{c.source ?? "-"}</TableCell>
                  <TableCell className="text-muted-foreground">{fmtDate(c.created_at)}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      {c.is_vip && (
                        <Badge className="bg-gold text-gold-foreground gap-1">
                          <Star className="w-3 h-3" />
                          VIP
                        </Badge>
                      )}
                      {c.is_returning && <Badge variant="secondary">חוזרת</Badge>}
                    </div>
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

function CustomerForm({
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
    city: "",
    birth_date: "",
    source: "",
    style_notes: "",
    referred_by_employee_id: "",
    is_vip: false,
    whatsapp_group: false,
  });

  const { data: employees } = useQuery({
    queryKey: ["employees-for-referral"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("employees")
        .select("id, full_name")
        .eq("is_active", true)
        .order("full_name");
      if (error) throw error;
      return data;
    },
  });

  const handle = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = schema.safeParse(form);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }
    onSubmit(parsed.data);
  };

  return (
    <DialogContent className="max-w-2xl" dir="rtl">
      <DialogHeader>
        <DialogTitle>לקוחה חדשה</DialogTitle>
      </DialogHeader>
      <form onSubmit={handle} className="grid grid-cols-2 gap-4">
        <div className="space-y-2 col-span-2">
          <Label>שם מלא *</Label>
          <Input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} required />
        </div>
        <div className="space-y-2">
          <Label>טלפון</Label>
          <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
        </div>
        <div className="space-y-2">
          <Label>מייל</Label>
          <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        </div>
        <div className="space-y-2">
          <Label>עיר</Label>
          <Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
        </div>
        <div className="space-y-2">
          <Label>תאריך לידה</Label>
          <Input type="date" value={form.birth_date} onChange={(e) => setForm({ ...form, birth_date: e.target.value })} />
        </div>
        <div className="space-y-2">
          <Label>מקור הגעה</Label>
          <Input placeholder="המלצה / אינסטגרם / חברה…" value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })} />
        </div>
        <div className="space-y-2">
          <Label>הופנתה ע"י עובדת (עמלת משווקת)</Label>
          <Select
            value={form.referred_by_employee_id || "none"}
            onValueChange={(v) => setForm({ ...form, referred_by_employee_id: v === "none" ? "" : v })}
          >
            <SelectTrigger><SelectValue placeholder="ללא" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">ללא</SelectItem>
              {(employees ?? []).map((e) => (
                <SelectItem key={e.id} value={e.id}>{e.full_name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2 col-span-2">
          <Label>הערות סגנון</Label>
          <Textarea rows={3} value={form.style_notes} onChange={(e) => setForm({ ...form, style_notes: e.target.value })} />
        </div>
        <div className="flex items-center justify-between col-span-2 p-3 rounded-lg bg-secondary">
          <Label className="cursor-pointer">לקוחה VIP</Label>
          <Switch checked={form.is_vip} onCheckedChange={(v) => setForm({ ...form, is_vip: v })} />
        </div>
        <div className="flex items-center justify-between col-span-2 p-3 rounded-lg bg-secondary">
          <Label className="cursor-pointer">בקבוצת WhatsApp</Label>
          <Switch checked={form.whatsapp_group} onCheckedChange={(v) => setForm({ ...form, whatsapp_group: v })} />
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

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
import { SECTORS, SOURCES, EVENT_TYPES, LANGUAGES } from "@/lib/customer-options";
import { CustomerDetailSheet, type Customer } from "@/components/CustomerDetailSheet";

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
  language: z.string().optional().or(z.literal("")),
  sector: z.string().trim().max(80).optional().or(z.literal("")),
  source: z.string().trim().max(80).optional().or(z.literal("")),
  referrer_name: z.string().trim().max(120).optional().or(z.literal("")),
  event_type: z.string().trim().max(80).optional().or(z.literal("")),
  style_notes: z.string().trim().max(2000).optional().or(z.literal("")),
  referred_by_employee_id: z.string().optional().or(z.literal("")),
  is_vip: z.boolean(),
  whatsapp_group: z.boolean(),
});

function CustomersPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<Customer | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

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
      // זיהוי לקוחה חוזרת — אם קיים טלפון זהה במערכת
      let isReturning = false;
      if (input.phone) {
        const { data: existing } = await supabase
          .from("customers")
          .select("id")
          .eq("phone", input.phone)
          .limit(1);
        isReturning = !!existing?.length;
      }
      const payload = {
        full_name: input.full_name,
        phone: input.phone || null,
        email: input.email || null,
        city: input.city || null,
        birth_date: input.birth_date || null,
        language: input.language || "he",
        sector: input.sector || null,
        source: input.source || null,
        referrer_name: input.referrer_name || null,
        event_type: input.event_type || null,
        style_notes: input.style_notes || null,
        referred_by_employee_id: input.referred_by_employee_id || null,
        is_vip: input.is_vip || isReturning, // לקוחה חוזרת -> VIP אוטומטי
        is_returning: isReturning,
        whatsapp_group: input.whatsapp_group,
      };
      const { error } = await supabase.from("customers").insert(payload);
      if (error) throw error;
      return { isReturning };
    },
    onSuccess: (res) => {
      toast.success(res?.isReturning ? "לקוחה חוזרת זוהתה ונוספה (VIP)" : "לקוחה נוספה");
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
                <TableRow
                  key={c.id}
                  className="cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => { setSelected(c as Customer); setSheetOpen(true); }}
                >
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

      <CustomerDetailSheet customer={selected} open={sheetOpen} onOpenChange={setSheetOpen} />
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
    language: "he",
    sector: "",
    source: "",
    referrer_name: "",
    event_type: "",
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
    <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" dir="rtl">
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
          <Label>שפה</Label>
          <Select value={form.language || "he"} onValueChange={(v) => setForm({ ...form, language: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{LANGUAGES.map((l) => <SelectItem key={l.v} value={l.v}>{l.l}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>מגזר</Label>
          <Select value={form.sector || ""} onValueChange={(v) => setForm({ ...form, sector: v })}>
            <SelectTrigger><SelectValue placeholder="בחרי מגזר" /></SelectTrigger>
            <SelectContent>{SECTORS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>מקור פרסום</Label>
          <Select value={form.source || ""} onValueChange={(v) => setForm({ ...form, source: v })}>
            <SelectTrigger><SelectValue placeholder="בחרי מקור" /></SelectTrigger>
            <SelectContent>{SOURCES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        {form.source === "המלצה" && (
          <div className="space-y-2">
            <Label>שם הממליצה</Label>
            <Input value={form.referrer_name} onChange={(e) => setForm({ ...form, referrer_name: e.target.value })} />
          </div>
        )}
        <div className="space-y-2">
          <Label>סוג אירוע</Label>
          <Select value={form.event_type || ""} onValueChange={(v) => setForm({ ...form, event_type: v })}>
            <SelectTrigger><SelectValue placeholder="בחרי אירוע" /></SelectTrigger>
            <SelectContent>{EVENT_TYPES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
          </Select>
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

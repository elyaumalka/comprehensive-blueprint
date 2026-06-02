import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
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
import { fmtCurrency, fmtDate } from "@/lib/format";
import { SECTORS, SOURCES, EVENT_TYPES, LANGUAGES } from "@/lib/customer-options";
import {
  Loader2,
  Star,
  Receipt,
  Wallet,
  ShoppingBag,
  UserX,
  MessageCircle,
  GitMerge,
} from "lucide-react";

export type Customer = {
  id: string;
  full_name: string;
  phone: string | null;
  email: string | null;
  city: string | null;
  birth_date: string | null;
  language: string | null;
  sector: string | null;
  source: string | null;
  referrer_name: string | null;
  event_type: string | null;
  style_notes: string | null;
  whatsapp_group: boolean;
  is_vip: boolean;
  is_returning: boolean;
  is_active: boolean;
  created_at: string;
};

export function CustomerDetailSheet({
  customer,
  open,
  onOpenChange,
}: {
  customer: Customer | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const qc = useQueryClient();
  const [edit, setEdit] = useState<Customer | null>(null);
  const [mergeId, setMergeId] = useState("");
  const c = edit ?? customer;

  // רשימת לקוחות אחרים למיזוג
  const { data: others } = useQuery({
    queryKey: ["customers-for-merge", customer?.id],
    enabled: !!customer?.id && open,
    queryFn: async () => {
      const { data } = await supabase
        .from("customers")
        .select("id, full_name, phone")
        .neq("id", customer!.id)
        .eq("is_active", true)
        .order("full_name");
      return data ?? [];
    },
  });

  // מיזוג: העברת כל הרשומות מהכרטיס הכפול לכרטיס הנוכחי, וסימון הכפול כלא פעיל
  const mergeMut = useMutation({
    mutationFn: async (dupId: string) => {
      if (!customer) return;
      await supabase.from("sales").update({ customer_id: customer.id }).eq("customer_id", dupId);
      await supabase.from("orders").update({ customer_id: customer.id }).eq("customer_id", dupId);
      await supabase.from("returns").update({ customer_id: customer.id }).eq("customer_id", dupId);
      const { error } = await supabase.from("customers")
        .update({ is_active: false, is_returning: true })
        .eq("id", dupId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("הכרטיסים מוזגו — הרכישות אוחדו לכרטיס זה");
      qc.invalidateQueries({ queryKey: ["customers"] });
      qc.invalidateQueries({ queryKey: ["customer-sales", customer?.id] });
      setMergeId("");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // היסטוריית רכישות
  const { data: sales, isLoading: salesLoading } = useQuery({
    queryKey: ["customer-sales", customer?.id],
    enabled: !!customer?.id && open,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sales")
        .select("id, receipt_number, total, created_at, payment_method, is_cancelled")
        .eq("customer_id", customer!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const validSales = (sales ?? []).filter((s) => !s.is_cancelled);
  const totalSpent = validSales.reduce((s, r) => s + Number(r.total ?? 0), 0);
  const purchaseCount = validSales.length;

  const saveMut = useMutation({
    mutationFn: async (cust: Customer) => {
      const { error } = await supabase
        .from("customers")
        .update({
          full_name: cust.full_name,
          phone: cust.phone || null,
          email: cust.email || null,
          city: cust.city || null,
          birth_date: cust.birth_date || null,
          language: cust.language || null,
          sector: cust.sector || null,
          source: cust.source || null,
          referrer_name: cust.referrer_name || null,
          event_type: cust.event_type || null,
          style_notes: cust.style_notes || null,
          whatsapp_group: cust.whatsapp_group,
          is_vip: cust.is_vip,
        })
        .eq("id", cust.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("פרטי הלקוחה נשמרו");
      qc.invalidateQueries({ queryKey: ["customers"] });
      setEdit(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // חוק נעילה — לא מוחקים לקוח, רק מסמנים לא פעיל
  const deactivateMut = useMutation({
    mutationFn: async () => {
      if (!customer) return;
      const { error } = await supabase
        .from("customers")
        .update({ is_active: !customer.is_active })
        .eq("id", customer.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("הסטטוס עודכן");
      qc.invalidateQueries({ queryKey: ["customers"] });
      onOpenChange(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (!c) return null;

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) setEdit(null); }}>
      <DialogContent dir="rtl" className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="text-right">
          <div className="flex items-center gap-2 flex-wrap">
            <DialogTitle className="text-xl">{c.full_name}</DialogTitle>
            {c.is_vip && (
              <Badge className="bg-gold text-gold-foreground gap-1"><Star className="w-3 h-3" />VIP</Badge>
            )}
            {c.is_returning && <Badge variant="secondary">לקוחה חוזרת</Badge>}
            {!c.is_active && <Badge variant="outline" className="text-destructive">לא פעילה</Badge>}
          </div>
          <DialogDescription>כרטיס לקוחה מלא · נוספה {fmtDate(c.created_at)}</DialogDescription>
        </DialogHeader>

        {/* סיכום */}
        <div className="grid grid-cols-2 gap-3 mt-4">
          <Card className="p-4 shadow-soft">
            <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
              <ShoppingBag className="w-4 h-4" />מספר רכישות
            </div>
            <p className="text-xl font-bold">{purchaseCount}</p>
          </Card>
          <Card className="p-4 shadow-soft">
            <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
              <Wallet className="w-4 h-4" />סה"כ רכישות
            </div>
            <p className="text-xl font-bold">{fmtCurrency(totalSpent)}</p>
          </Card>
        </div>

        {/* פרטי לקוחה */}
        <Card className="p-4 shadow-soft mt-4">
          <h3 className="font-semibold mb-3">פרטי לקוחה</h3>
          <div className="grid grid-cols-2 gap-3">
            <Field label="שם מלא"><Input value={c.full_name} onChange={(e) => setEdit({ ...c, full_name: e.target.value })} /></Field>
            <Field label="טלפון"><Input value={c.phone ?? ""} onChange={(e) => setEdit({ ...c, phone: e.target.value })} /></Field>
            <Field label="מייל"><Input value={c.email ?? ""} onChange={(e) => setEdit({ ...c, email: e.target.value })} /></Field>
            <Field label="עיר"><Input value={c.city ?? ""} onChange={(e) => setEdit({ ...c, city: e.target.value })} /></Field>
            <Field label="תאריך לידה"><Input type="date" value={c.birth_date ?? ""} onChange={(e) => setEdit({ ...c, birth_date: e.target.value })} /></Field>
            <Field label="שפה">
              <Select value={c.language ?? "he"} onValueChange={(v) => setEdit({ ...c, language: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{LANGUAGES.map((l) => <SelectItem key={l.v} value={l.v}>{l.l}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
            <Field label="מגזר">
              <Select value={c.sector ?? ""} onValueChange={(v) => setEdit({ ...c, sector: v })}>
                <SelectTrigger><SelectValue placeholder="בחרי מגזר" /></SelectTrigger>
                <SelectContent>{SECTORS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
            <Field label="מקור פרסום">
              <Select value={c.source ?? ""} onValueChange={(v) => setEdit({ ...c, source: v })}>
                <SelectTrigger><SelectValue placeholder="בחרי מקור" /></SelectTrigger>
                <SelectContent>{SOURCES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
            {c.source === "המלצה" && (
              <Field label="שם הממליצה"><Input value={c.referrer_name ?? ""} onChange={(e) => setEdit({ ...c, referrer_name: e.target.value })} /></Field>
            )}
            <Field label="סוג אירוע">
              <Select value={c.event_type ?? ""} onValueChange={(v) => setEdit({ ...c, event_type: v })}>
                <SelectTrigger><SelectValue placeholder="בחרי אירוע" /></SelectTrigger>
                <SelectContent>{EVENT_TYPES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
          </div>

          <div className="mt-3 space-y-1.5">
            <Label>הערות סטייל (מידות / סוג בד / העדפות)</Label>
            <Textarea rows={3} value={c.style_notes ?? ""} onChange={(e) => setEdit({ ...c, style_notes: e.target.value })} />
          </div>

          <div className="grid grid-cols-2 gap-3 mt-3">
            <div className="flex items-center justify-between rounded-md border px-3 py-2">
              <Label className="flex items-center gap-1"><MessageCircle className="w-4 h-4" />קבוצת WhatsApp</Label>
              <Switch checked={c.whatsapp_group} onCheckedChange={(v) => setEdit({ ...c, whatsapp_group: v })} />
            </div>
            <div className="flex items-center justify-between rounded-md border px-3 py-2">
              <Label className="flex items-center gap-1"><Star className="w-4 h-4" />לקוחה VIP</Label>
              <Switch checked={c.is_vip} onCheckedChange={(v) => setEdit({ ...c, is_vip: v })} />
            </div>
          </div>

          {edit && (
            <div className="flex justify-end mt-3">
              <Button size="sm" disabled={saveMut.isPending} onClick={() => saveMut.mutate(edit)} className="gap-2">
                {saveMut.isPending && <Loader2 className="w-4 h-4 animate-spin" />}שמירת שינויים
              </Button>
            </div>
          )}
        </Card>

        {/* היסטוריית רכישות */}
        <Card className="p-4 shadow-soft mt-4">
          <h3 className="font-semibold mb-3 flex items-center gap-2"><Receipt className="w-4 h-4" />היסטוריית רכישות</h3>
          {salesLoading ? (
            <div className="py-6 flex justify-center"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
          ) : !sales?.length ? (
            <p className="text-sm text-muted-foreground py-2">אין רכישות מתועדות עדיין</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>קבלה</TableHead>
                  <TableHead>תאריך</TableHead>
                  <TableHead>סכום</TableHead>
                  <TableHead>סטטוס</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sales.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell>#{s.receipt_number}</TableCell>
                    <TableCell>{fmtDate(s.created_at)}</TableCell>
                    <TableCell className="font-medium">{fmtCurrency(Number(s.total))}</TableCell>
                    <TableCell>
                      {s.is_cancelled ? <Badge variant="outline" className="text-destructive">בוטלה</Badge> : <Badge variant="secondary">תקינה</Badge>}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Card>

        {/* מיזוג כפילויות */}
        <Card className="p-4 shadow-soft mt-4">
          <h3 className="font-semibold mb-1 flex items-center gap-2"><GitMerge className="w-4 h-4" />מיזוג כפילויות</h3>
          <p className="text-xs text-muted-foreground mb-3">בחרי כרטיס כפול — כל הרכישות וההזמנות שלו יעברו לכרטיס זה, והכפול יסומן כלא פעיל.</p>
          <div className="flex gap-2">
            <Select value={mergeId} onValueChange={setMergeId}>
              <SelectTrigger><SelectValue placeholder="בחרי כרטיס למיזוג…" /></SelectTrigger>
              <SelectContent>
                {(others ?? []).map((o) => (
                  <SelectItem key={o.id} value={o.id}>{o.full_name}{o.phone ? ` · ${o.phone}` : ""}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" disabled={!mergeId || mergeMut.isPending} onClick={() => mergeMut.mutate(mergeId)} className="gap-1 whitespace-nowrap">
              {mergeMut.isPending && <Loader2 className="w-4 h-4 animate-spin" />}מזג לכאן
            </Button>
          </div>
        </Card>

        {/* חוק נעילה */}
        <Card className="p-4 shadow-soft mt-4 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium flex items-center gap-2"><UserX className="w-4 h-4" />ניהול סטטוס</p>
              <p className="text-xs text-muted-foreground mt-1">לא ניתן למחוק לקוחה — רק לסמן כלא פעילה</p>
            </div>
            <Button
              variant={c.is_active ? "outline" : "default"}
              size="sm"
              disabled={deactivateMut.isPending}
              onClick={() => deactivateMut.mutate()}
            >
              {deactivateMut.isPending && <Loader2 className="w-4 h-4 animate-spin ml-1" />}
              {c.is_active ? "סימון כלא פעילה" : "החזרה לפעילה"}
            </Button>
          </div>
        </Card>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
    </div>
  );
}

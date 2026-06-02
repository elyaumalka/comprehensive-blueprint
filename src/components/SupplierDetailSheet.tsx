import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { toast } from "sonner";
import { fmtCurrency, fmtDate } from "@/lib/format";
import { PAYMENT_TERMS } from "@/lib/supplier-terms";
import {
  Loader2,
  Upload,
  FileText,
  Trash2,
  Download,
  Receipt,
  Wallet,
  ShoppingBag,
} from "lucide-react";

type Supplier = {
  id: string;
  name: string;
  contact_name: string | null;
  phone: string | null;
  email: string | null;
  field: string | null;
  payment_terms: string | null;
  notes: string | null;
};

const BUCKET = "supplier-documents";

export function SupplierDetailSheet({
  supplier,
  open,
  onOpenChange,
}: {
  supplier: Supplier | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const qc = useQueryClient();
  const [edit, setEdit] = useState<Supplier | null>(null);
  const [uploading, setUploading] = useState(false);

  const sup = edit ?? supplier;

  // Purchase history (expenses linked to this supplier)
  const { data: expenses, isLoading: expLoading } = useQuery({
    queryKey: ["supplier-expenses", supplier?.id],
    enabled: !!supplier?.id && open,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("expenses")
        .select("id, amount, expense_date, description, receipt_received, is_paid, category")
        .eq("supplier_id", supplier!.id)
        .order("expense_date", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // Documents
  const { data: docs, isLoading: docsLoading } = useQuery({
    queryKey: ["supplier-docs", supplier?.id],
    enabled: !!supplier?.id && open,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("supplier_documents")
        .select("*")
        .eq("supplier_id", supplier!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const openBalance = (expenses ?? [])
    .filter((e) => !e.is_paid)
    .reduce((s, e) => s + Number(e.amount ?? 0), 0);
  const totalPurchases = (expenses ?? []).reduce((s, e) => s + Number(e.amount ?? 0), 0);

  const saveMut = useMutation({
    mutationFn: async (s: Supplier) => {
      const { error } = await supabase
        .from("suppliers")
        .update({
          contact_name: s.contact_name || null,
          phone: s.phone || null,
          email: s.email || null,
          field: s.field || null,
          payment_terms: s.payment_terms || null,
          notes: s.notes || null,
        })
        .eq("id", s.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("פרטי הספק נשמרו");
      qc.invalidateQueries({ queryKey: ["suppliers"] });
      setEdit(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const togglePaidMut = useMutation({
    mutationFn: async ({ id, is_paid }: { id: string; is_paid: boolean }) => {
      const { error } = await supabase.from("expenses").update({ is_paid }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["supplier-expenses", supplier?.id] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteDocMut = useMutation({
    mutationFn: async (doc: { id: string; file_path: string }) => {
      await supabase.storage.from(BUCKET).remove([doc.file_path]);
      const { error } = await supabase.from("supplier_documents").delete().eq("id", doc.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("מסמך נמחק");
      qc.invalidateQueries({ queryKey: ["supplier-docs", supplier?.id] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  async function handleUpload(file: File) {
    if (!supplier) return;
    setUploading(true);
    try {
      const path = `${supplier.id}/${Date.now()}-${file.name}`;
      const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, file);
      if (upErr) throw upErr;
      const { error } = await supabase.from("supplier_documents").insert({
        supplier_id: supplier.id,
        file_name: file.name,
        file_path: path,
      });
      if (error) throw error;
      toast.success("המסמך הועלה");
      qc.invalidateQueries({ queryKey: ["supplier-docs", supplier.id] });
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setUploading(false);
    }
  }

  async function handleDownload(path: string, name: string) {
    const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, 60);
    if (error || !data) return toast.error("שגיאה בהורדת הקובץ");
    const a = document.createElement("a");
    a.href = data.signedUrl;
    a.download = name;
    a.target = "_blank";
    a.click();
  }

  if (!sup) return null;

  return (
    <Sheet open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) setEdit(null); }}>
      <SheetContent dir="rtl" side="left" className="w-full sm:max-w-xl overflow-y-auto">
        <SheetHeader className="text-right">
          <SheetTitle>{sup.name}</SheetTitle>
          <SheetDescription>כרטיס ספק מלא</SheetDescription>
        </SheetHeader>

        {/* Summary cards */}
        <div className="grid grid-cols-2 gap-3 mt-4">
          <Card className="p-4 shadow-soft">
            <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
              <Wallet className="w-4 h-4" />יתרה פתוחה
            </div>
            <p className={`text-xl font-bold ${openBalance > 0 ? "text-destructive" : ""}`}>
              {fmtCurrency(openBalance)}
            </p>
          </Card>
          <Card className="p-4 shadow-soft">
            <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
              <ShoppingBag className="w-4 h-4" />סה"כ רכישות
            </div>
            <p className="text-xl font-bold">{fmtCurrency(totalPurchases)}</p>
          </Card>
        </div>

        {/* Editable details */}
        <Card className="p-4 shadow-soft mt-4 space-y-3">
          <h3 className="font-semibold">פרטי הספק</h3>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>איש קשר</Label>
              <Input value={sup.contact_name ?? ""} onChange={(e) => setEdit({ ...sup, contact_name: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>תחום</Label>
              <Input value={sup.field ?? ""} onChange={(e) => setEdit({ ...sup, field: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>טלפון</Label>
              <Input value={sup.phone ?? ""} onChange={(e) => setEdit({ ...sup, phone: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>מייל</Label>
              <Input value={sup.email ?? ""} onChange={(e) => setEdit({ ...sup, email: e.target.value })} />
            </div>
            <div className="space-y-1.5 col-span-2">
              <Label>תנאי תשלום</Label>
              <Select
                value={sup.payment_terms ?? ""}
                onValueChange={(v) => setEdit({ ...sup, payment_terms: v })}
              >
                <SelectTrigger><SelectValue placeholder="בחרי תנאי תשלום" /></SelectTrigger>
                <SelectContent>
                  {PAYMENT_TERMS.map((t) => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5 col-span-2">
              <Label>הערות</Label>
              <Input value={sup.notes ?? ""} onChange={(e) => setEdit({ ...sup, notes: e.target.value })} />
            </div>
          </div>
          {edit && (
            <div className="flex justify-end">
              <Button size="sm" disabled={saveMut.isPending} onClick={() => saveMut.mutate(edit)} className="gap-2">
                {saveMut.isPending && <Loader2 className="w-4 h-4 animate-spin" />}שמירת שינויים
              </Button>
            </div>
          )}
        </Card>

        {/* Purchase history */}
        <Card className="p-4 shadow-soft mt-4">
          <h3 className="font-semibold mb-3 flex items-center gap-2"><Receipt className="w-4 h-4" />היסטוריית רכישות</h3>
          {expLoading ? (
            <div className="py-6 flex justify-center"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
          ) : !expenses?.length ? (
            <p className="text-sm text-muted-foreground py-2">אין רכישות מתועדות מספק זה</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>תאריך</TableHead>
                  <TableHead>סכום</TableHead>
                  <TableHead>קבלה/חשבונית</TableHead>
                  <TableHead>תשלום</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {expenses.map((e) => (
                  <TableRow key={e.id}>
                    <TableCell>{fmtDate(e.expense_date)}</TableCell>
                    <TableCell className="font-medium">{fmtCurrency(Number(e.amount))}</TableCell>
                    <TableCell>
                      {e.receipt_received ? (
                        <Badge variant="secondary">התקבלה</Badge>
                      ) : (
                        <Badge variant="outline" className="text-destructive">חסרה</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant={e.is_paid ? "outline" : "default"}
                        size="sm"
                        onClick={() => togglePaidMut.mutate({ id: e.id, is_paid: !e.is_paid })}
                      >
                        {e.is_paid ? "שולם" : "לתשלום"}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Card>

        {/* Documents */}
        <Card className="p-4 shadow-soft mt-4 mb-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold flex items-center gap-2"><FileText className="w-4 h-4" />מסמכים מצורפים</h3>
            <label>
              <input
                type="file"
                className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUpload(f); e.target.value = ""; }}
              />
              <Button size="sm" variant="outline" className="gap-2 pointer-events-none" asChild={false} disabled={uploading}>
                {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                העלאת מסמך
              </Button>
            </label>
          </div>
          {docsLoading ? (
            <div className="py-6 flex justify-center"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
          ) : !docs?.length ? (
            <p className="text-sm text-muted-foreground py-2">אין מסמכים מצורפים</p>
          ) : (
            <ul className="space-y-2">
              {docs.map((d) => (
                <li key={d.id} className="flex items-center justify-between border rounded-md px-3 py-2">
                  <span className="flex items-center gap-2 text-sm truncate">
                    <FileText className="w-4 h-4 text-muted-foreground shrink-0" />
                    <span className="truncate">{d.file_name}</span>
                  </span>
                  <span className="flex items-center gap-1 shrink-0">
                    <Button variant="ghost" size="icon" onClick={() => handleDownload(d.file_path, d.file_name)}>
                      <Download className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => deleteDocMut.mutate(d)}>
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </SheetContent>
    </Sheet>
  );
}

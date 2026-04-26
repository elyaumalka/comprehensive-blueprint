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
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Calendar as CalendarIcon, Plus, Loader2, AlertCircle } from "lucide-react";
import { fmtDateTime } from "@/lib/format";

export const Route = createFileRoute("/calendar")({
  component: () => (
    <RequireAuth>
      <CalendarPage />
    </RequireAuth>
  ),
});

const taskSchema = z.object({
  title: z.string().trim().min(1, "כותרת חובה").max(200),
  description: z.string().trim().max(2000).optional().or(z.literal("")),
  due_date: z.string().optional().or(z.literal("")),
  priority: z.enum(["low", "medium", "high", "urgent"]),
});

const PRIO: Record<string, { l: string; c: string }> = {
  low: { l: "נמוכה", c: "bg-secondary" },
  medium: { l: "בינונית", c: "bg-warning/20" },
  high: { l: "גבוהה", c: "bg-gold text-gold-foreground" },
  urgent: { l: "דחופה", c: "bg-alert text-alert-foreground" },
};

function CalendarPage() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const { data, isLoading } = useQuery({
    queryKey: ["tasks"],
    queryFn: async () => {
      const { data, error } = await supabase.from("tasks").select("*").order("due_date", { ascending: true, nullsFirst: false });
      if (error) throw error;
      return data;
    },
  });

  const createMut = useMutation({
    mutationFn: async (input: z.infer<typeof taskSchema>) => {
      const { error } = await supabase.from("tasks").insert({
        title: input.title,
        description: input.description || null,
        due_date: input.due_date || null,
        priority: input.priority,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("משימה נוספה");
      qc.invalidateQueries({ queryKey: ["tasks"] });
      setOpen(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggleMut = useMutation({
    mutationFn: async ({ id, done }: { id: string; done: boolean }) => {
      const { error } = await supabase
        .from("tasks")
        .update({
          status: done ? "done" : "open",
          completed_at: done ? new Date().toISOString() : null,
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tasks"] }),
  });

  return (
    <AppShell>
      <PageHeader
        title="יומן ומשימות"
        description="ניהול אירועים, פגישות ומשימות פנימיות"
        action={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2"><Plus className="w-4 h-4" />משימה חדשה</Button>
            </DialogTrigger>
            <TaskForm onSubmit={(v) => createMut.mutate(v)} loading={createMut.isPending} />
          </Dialog>
        }
      />

      <Card className="shadow-soft">
        {isLoading ? (
          <div className="py-16 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
        ) : !data?.length ? (
          <EmptyState icon={CalendarIcon} title="אין משימות" description="הוסיפי משימה ראשונה" />
        ) : (
          <div className="divide-y">
            {data.map((t) => {
              const overdue = t.due_date && new Date(t.due_date) < new Date() && t.status !== "done";
              return (
                <div key={t.id} className="p-4 flex items-start gap-3">
                  <Checkbox
                    checked={t.status === "done"}
                    onCheckedChange={(v) => toggleMut.mutate({ id: t.id, done: !!v })}
                    className="mt-1"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className={`font-medium ${t.status === "done" ? "line-through text-muted-foreground" : ""}`}>
                        {t.title}
                      </h4>
                      <Badge className={PRIO[t.priority]?.c}>{PRIO[t.priority]?.l}</Badge>
                      {overdue && (
                        <Badge className="bg-alert/10 text-alert gap-1">
                          <AlertCircle className="w-3 h-3" />
                          באיחור
                        </Badge>
                      )}
                    </div>
                    {t.description && <p className="text-sm text-muted-foreground mt-1">{t.description}</p>}
                    {t.due_date && (
                      <p className={`text-xs mt-1 ${overdue ? "text-alert font-medium" : "text-muted-foreground"}`}>
                        {fmtDateTime(t.due_date)}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </AppShell>
  );
}

function TaskForm({
  onSubmit,
  loading,
}: {
  onSubmit: (v: z.infer<typeof taskSchema>) => void;
  loading: boolean;
}) {
  const [form, setForm] = useState<z.infer<typeof taskSchema>>({
    title: "",
    description: "",
    due_date: "",
    priority: "medium",
  });
  return (
    <DialogContent dir="rtl">
      <DialogHeader><DialogTitle>משימה חדשה</DialogTitle></DialogHeader>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const p = taskSchema.safeParse(form);
          if (!p.success) return toast.error(p.error.issues[0].message);
          onSubmit(p.data);
        }}
        className="space-y-4"
      >
        <div className="space-y-2">
          <Label>כותרת *</Label>
          <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
        </div>
        <div className="space-y-2">
          <Label>תיאור</Label>
          <Textarea rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>עדיפות</Label>
            <Select value={form.priority} onValueChange={(v) => setForm({ ...form, priority: v as "low" | "medium" | "high" | "urgent" })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="low">נמוכה</SelectItem>
                <SelectItem value="medium">בינונית</SelectItem>
                <SelectItem value="high">גבוהה</SelectItem>
                <SelectItem value="urgent">דחופה</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>יעד</Label>
            <Input type="datetime-local" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} />
          </div>
        </div>
        <DialogFooter>
          <Button type="submit" disabled={loading} className="gap-2">
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}שמירה
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}

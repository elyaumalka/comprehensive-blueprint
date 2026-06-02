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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Calendar as CalendarIcon, Plus, Loader2, AlertCircle, User, List, ChevronRight, ChevronLeft } from "lucide-react";
import { fmtDateTime } from "@/lib/format";

const WEEKDAYS_HE = ["א", "ב", "ג", "ד", "ה", "ו", "ש"];
const MONTHS_HE = ["ינואר", "פברואר", "מרץ", "אפריל", "מאי", "יוני", "יולי", "אוגוסט", "ספטמבר", "אוקטובר", "נובמבר", "דצמבר"];

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
  assigned_to: z.string().optional().or(z.literal("")),
});

const PRIO: Record<string, { l: string; c: string }> = {
  low: { l: "נמוכה", c: "bg-secondary" },
  medium: { l: "בינונית", c: "bg-warning/20" },
  high: { l: "גבוהה", c: "bg-gold text-gold-foreground" },
  urgent: { l: "דחופה", c: "bg-alert text-alert-foreground" },
};

const STATUSES = [
  { v: "open", l: "פתוח" },
  { v: "in_progress", l: "בטיפול" },
  { v: "waiting", l: "ממתין" },
  { v: "done", l: "הושלם" },
] as const;

type Filter = "all" | "today" | "overdue" | "done";

function isToday(d: string | null) {
  if (!d) return false;
  const due = new Date(d);
  const now = new Date();
  return due.getFullYear() === now.getFullYear() && due.getMonth() === now.getMonth() && due.getDate() === now.getDate();
}

function CalendarPage() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState<Filter>("all");
  const [view, setView] = useState<"list" | "month">("list");
  const [cursor, setCursor] = useState(() => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1); });
  const [prefill, setPrefill] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["tasks"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tasks")
        .select("*")
        .order("due_date", { ascending: true, nullsFirst: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: profiles } = useQuery({
    queryKey: ["task-assignees"],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("id, full_name").order("full_name");
      return data ?? [];
    },
  });

  const createMut = useMutation({
    mutationFn: async (input: z.infer<typeof taskSchema>) => {
      const { error } = await supabase.from("tasks").insert({
        title: input.title,
        description: input.description || null,
        due_date: input.due_date || null,
        priority: input.priority,
        assigned_to: input.assigned_to || null,
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

  const statusMut = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase
        .from("tasks")
        .update({
          status: status as "open" | "in_progress" | "waiting" | "done",
          completed_at: status === "done" ? new Date().toISOString() : null,
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tasks"] }),
  });

  const all = data ?? [];
  const counts = {
    all: all.length,
    today: all.filter((t) => isToday(t.due_date) && t.status !== "done").length,
    overdue: all.filter((t) => t.due_date && new Date(t.due_date) < new Date() && t.status !== "done").length,
    done: all.filter((t) => t.status === "done").length,
  };
  const filtered = all.filter((t) => {
    if (filter === "today") return isToday(t.due_date) && t.status !== "done";
    if (filter === "overdue") return t.due_date && new Date(t.due_date) < new Date() && t.status !== "done";
    if (filter === "done") return t.status === "done";
    return true;
  });

  return (
    <AppShell>
      <PageHeader
        title="יומן ומשימות"
        description="ניהול משימות, פגישות ותזכורות עם שיוך לעובדות"
        action={
          <div className="flex items-center gap-2">
            <div className="flex rounded-lg border p-0.5">
              <Button variant={view === "list" ? "secondary" : "ghost"} size="sm" className="gap-1 h-8" onClick={() => setView("list")}>
                <List className="w-4 h-4" />רשימה
              </Button>
              <Button variant={view === "month" ? "secondary" : "ghost"} size="sm" className="gap-1 h-8" onClick={() => setView("month")}>
                <CalendarIcon className="w-4 h-4" />לוח שנה
              </Button>
            </div>
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2" onClick={() => setPrefill("")}><Plus className="w-4 h-4" />משימה חדשה</Button>
              </DialogTrigger>
              <TaskForm key={prefill || "manual"} initialDate={prefill} assignees={profiles ?? []} onSubmit={(v) => createMut.mutate(v)} loading={createMut.isPending} />
            </Dialog>
          </div>
        }
      />

      {view === "month" ? (
        <MonthGrid
          cursor={cursor}
          tasks={all}
          onPrev={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))}
          onNext={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))}
          onToday={() => setCursor(() => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1); })}
          onDayClick={(dateStr) => { setPrefill(`${dateStr}T09:00`); setOpen(true); }}
        />
      ) : (
      <>
      <Tabs value={filter} onValueChange={(v) => setFilter(v as Filter)}>
        <TabsList className="mb-4">
          <TabsTrigger value="all">הכל ({counts.all})</TabsTrigger>
          <TabsTrigger value="today">להיום ({counts.today})</TabsTrigger>
          <TabsTrigger value="overdue" className="data-[state=active]:text-alert">באיחור ({counts.overdue})</TabsTrigger>
          <TabsTrigger value="done">הושלמו ({counts.done})</TabsTrigger>
        </TabsList>
      </Tabs>

      <Card className="shadow-soft">
        {isLoading ? (
          <div className="py-16 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
        ) : !filtered.length ? (
          <EmptyState icon={CalendarIcon} title="אין משימות בתצוגה זו" />
        ) : (
          <div className="divide-y">
            {filtered.map((t) => {
              const overdue = t.due_date && new Date(t.due_date) < new Date() && t.status !== "done";
              const assignee = (profiles ?? []).find((p) => p.id === t.assigned_to)?.full_name;
              return (
                <div key={t.id} className="p-4 flex items-start gap-3">
                  <Checkbox
                    checked={t.status === "done"}
                    onCheckedChange={(v) => statusMut.mutate({ id: t.id, status: v ? "done" : "open" })}
                    className="mt-1"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className={`font-medium ${t.status === "done" ? "line-through text-muted-foreground" : ""}`}>{t.title}</h4>
                      <Badge className={PRIO[t.priority]?.c}>{PRIO[t.priority]?.l}</Badge>
                      {overdue && <Badge className="bg-alert/10 text-alert gap-1"><AlertCircle className="w-3 h-3" />באיחור</Badge>}
                      {assignee && <Badge variant="outline" className="gap-1"><User className="w-3 h-3" />{assignee}</Badge>}
                    </div>
                    {t.description && <p className="text-sm text-muted-foreground mt-1">{t.description}</p>}
                    {t.due_date && (
                      <p className={`text-xs mt-1 ${overdue ? "text-alert font-medium" : "text-muted-foreground"}`}>{fmtDateTime(t.due_date)}</p>
                    )}
                  </div>
                  <Select value={t.status} onValueChange={(v) => statusMut.mutate({ id: t.id, status: v })}>
                    <SelectTrigger className="h-8 w-28 shrink-0"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {STATUSES.map((s) => <SelectItem key={s.v} value={s.v}>{s.l}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              );
            })}
          </div>
        )}
      </Card>
      </>
      )}
    </AppShell>
  );
}

function MonthGrid({
  cursor,
  tasks,
  onPrev,
  onNext,
  onToday,
  onDayClick,
}: {
  cursor: Date;
  tasks: { id: string; title: string; due_date: string | null; priority: string; status: string }[];
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
  onDayClick: (dateStr: string) => void;
}) {
  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const firstWeekday = new Date(year, month, 1).getDay(); // 0=Sunday
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const todayStr = (() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; })();

  const cells: (number | null)[] = [];
  for (let i = 0; i < firstWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  const dayStr = (d: number) => `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
  const tasksForDay = (d: number) =>
    tasks.filter((t) => t.due_date && t.due_date.slice(0, 10) === dayStr(d));

  return (
    <Card className="p-4 shadow-soft">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-lg">{MONTHS_HE[month]} {year}</h3>
        <div className="flex items-center gap-1">
          <Button variant="outline" size="sm" onClick={onToday}>היום</Button>
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={onNext}><ChevronLeft className="w-4 h-4" /></Button>
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={onPrev}><ChevronRight className="w-4 h-4" /></Button>
        </div>
      </div>
      <div className="grid grid-cols-7 gap-1 mb-1">
        {WEEKDAYS_HE.map((w) => (
          <div key={w} className="text-center text-xs font-medium text-muted-foreground py-1">{w}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((d, i) => {
          if (d === null) return <div key={i} className="min-h-20 rounded-md bg-muted/20" />;
          const dayTasks = tasksForDay(d);
          const isToday = dayStr(d) === todayStr;
          return (
            <button
              key={i}
              onClick={() => onDayClick(dayStr(d))}
              className={`min-h-20 rounded-md border p-1 text-right align-top hover:bg-muted/40 transition-colors ${isToday ? "border-gold bg-gold/5" : "border-border"}`}
            >
              <div className={`text-xs font-medium mb-1 ${isToday ? "text-gold" : "text-muted-foreground"}`}>{d}</div>
              <div className="space-y-0.5">
                {dayTasks.slice(0, 3).map((t) => (
                  <div
                    key={t.id}
                    className={`text-[10px] leading-tight truncate rounded px-1 py-0.5 ${t.status === "done" ? "line-through opacity-60 bg-secondary" : PRIO[t.priority]?.c ?? "bg-secondary"}`}
                  >
                    {t.title}
                  </div>
                ))}
                {dayTasks.length > 3 && <div className="text-[10px] text-muted-foreground">+{dayTasks.length - 3}</div>}
              </div>
            </button>
          );
        })}
      </div>
      <p className="text-xs text-muted-foreground mt-3 text-center">לחצי על יום כדי להוסיף משימה לתאריך זה</p>
    </Card>
  );
}

function TaskForm({
  assignees,
  onSubmit,
  loading,
  initialDate,
}: {
  assignees: { id: string; full_name: string | null }[];
  onSubmit: (v: z.infer<typeof taskSchema>) => void;
  loading: boolean;
  initialDate?: string;
}) {
  const [form, setForm] = useState<z.infer<typeof taskSchema>>({
    title: "",
    description: "",
    due_date: initialDate || "",
    priority: "medium",
    assigned_to: "",
  });
  return (
    <DialogContent dir="rtl" className="max-h-[90vh] overflow-y-auto">
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
            <Label>תאריך יעד</Label>
            <Input type="datetime-local" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} />
          </div>
        </div>
        <div className="space-y-2">
          <Label>שיוך לעובדת</Label>
          <Select value={form.assigned_to || "none"} onValueChange={(v) => setForm({ ...form, assigned_to: v === "none" ? "" : v })}>
            <SelectTrigger><SelectValue placeholder="ללא שיוך" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">ללא שיוך</SelectItem>
              {assignees.map((a) => <SelectItem key={a.id} value={a.id}>{a.full_name ?? "—"}</SelectItem>)}
            </SelectContent>
          </Select>
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

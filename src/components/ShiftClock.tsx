import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Play, Square, Loader2, Clock } from "lucide-react";

// שולף את העובדת המקושרת למשתמש הנוכחי + המשמרת הפתוחה (אם יש)
export function useMyShift() {
  const { user } = useAuth();
  const { data: employee } = useQuery({
    queryKey: ["my-employee", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data } = await supabase.from("employees").select("id, full_name").eq("user_id", user!.id).maybeSingle();
      return data;
    },
  });
  const { data: openShift } = useQuery({
    queryKey: ["my-open-shift", employee?.id],
    enabled: !!employee?.id,
    refetchInterval: 60000,
    queryFn: async () => {
      const { data } = await supabase
        .from("time_entries")
        .select("id, clock_in")
        .eq("employee_id", employee!.id)
        .is("clock_out", null)
        .order("clock_in", { ascending: false })
        .limit(1)
        .maybeSingle();
      return data;
    },
  });
  return { employee, openShift, hasOpenShift: !!openShift };
}

export function ShiftClock() {
  const qc = useQueryClient();
  const { employee, openShift } = useMyShift();

  const startMut = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("time_entries").insert({ employee_id: employee!.id });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("משמרת התחילה — בהצלחה!");
      qc.invalidateQueries({ queryKey: ["my-open-shift"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const endMut = useMutation({
    mutationFn: async () => {
      const start = new Date(openShift!.clock_in).getTime();
      const minutes = Math.max(0, Math.round((Date.now() - start) / 60000));
      const { error } = await supabase
        .from("time_entries")
        .update({ clock_out: new Date().toISOString(), total_minutes: minutes })
        .eq("id", openShift!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("המשמרת הסתיימה — תודה!");
      qc.invalidateQueries({ queryKey: ["my-open-shift"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // משתמש שאינו עובדת (למשל מנהלת ללא רישום עובדת) — לא מציגים שעון
  if (!employee) return null;

  if (openShift) {
    const since = new Date(openShift.clock_in).toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" });
    return (
      <div className="flex items-center gap-2">
        <span className="flex items-center gap-1.5 text-sm text-success font-medium whitespace-nowrap">
          <Clock className="w-4 h-4" />במשמרת מ-{since}
        </span>
        <Button size="sm" variant="outline" className="gap-1.5" disabled={endMut.isPending} onClick={() => endMut.mutate()}>
          {endMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Square className="w-4 h-4" />}סיום משמרת
        </Button>
      </div>
    );
  }

  return (
    <Button size="sm" className="gap-1.5 whitespace-nowrap" disabled={startMut.isPending} onClick={() => startMut.mutate()}>
      {startMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}התחלת משמרת
    </Button>
  );
}

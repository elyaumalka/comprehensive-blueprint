import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { Scissors, Loader2 } from "lucide-react";

export const Route = createFileRoute("/login")({
  component: LoginPage,
});

const schema = z.object({
  email: z.string().trim().email("מייל לא תקין").max(255),
  password: z.string().min(6, "סיסמה לפחות 6 תווים").max(100),
});

function LoginPage() {
  const navigate = useNavigate();
  const { isAuthenticated, loading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && isAuthenticated) navigate({ to: "/" });
  }, [isAuthenticated, loading, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = schema.safeParse({ email, password });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.auth.signInWithPassword(parsed.data);
    setSubmitting(false);
    if (error) {
      toast.error("התחברות נכשלה. בדקי את הפרטים");
      return;
    }
    toast.success("ברוכה השבה!");
    navigate({ to: "/" });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4" dir="rtl">
      <Card className="w-full max-w-md p-8 shadow-elegant">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-12 h-12 rounded-xl bg-gold flex items-center justify-center shadow-soft">
            <Scissors className="w-6 h-6 text-gold-foreground" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight">מערכת הבוטיק</h1>
            <p className="text-sm text-muted-foreground">התחברות לחשבון</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">מייל</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@example.com"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">סיסמה</Label>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting && <Loader2 className="w-4 h-4 animate-spin ml-2" />}
            כניסה
          </Button>
        </form>

        <p className="text-sm text-center text-muted-foreground mt-6">
          אין חשבון?{" "}
          <Link to="/signup" className="text-foreground font-medium hover:underline">
            הרשמה
          </Link>
        </p>
      </Card>
    </div>
  );
}

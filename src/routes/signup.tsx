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

export const Route = createFileRoute("/signup")({
  component: SignupPage,
});

const schema = z.object({
  full_name: z.string().trim().min(2, "שם מלא נדרש").max(100),
  email: z.string().trim().email("מייל לא תקין").max(255),
  password: z.string().min(6, "סיסמה לפחות 6 תווים").max(100),
});

function SignupPage() {
  const navigate = useNavigate();
  const { isAuthenticated, loading } = useAuth();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && isAuthenticated) navigate({ to: "/" });
  }, [isAuthenticated, loading, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = schema.safeParse({ full_name: fullName, email, password });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.auth.signUp({
      email: parsed.data.email,
      password: parsed.data.password,
      options: {
        emailRedirectTo: `${window.location.origin}/`,
        data: { full_name: parsed.data.full_name },
      },
    });
    setSubmitting(false);
    if (error) {
      toast.error(error.message.includes("registered") ? "המייל כבר רשום" : "הרשמה נכשלה");
      return;
    }
    toast.success("נרשמת בהצלחה! בדקי את המייל לאישור");
    navigate({ to: "/login" });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4" dir="rtl">
      <Card className="w-full max-w-md p-8 shadow-elegant">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-12 h-12 rounded-xl bg-gold flex items-center justify-center shadow-soft">
            <Scissors className="w-6 h-6 text-gold-foreground" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight">פתיחת חשבון</h1>
            <p className="text-sm text-muted-foreground">המשתמש הראשון יוגדר כמנהלת</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="full_name">שם מלא</Label>
            <Input id="full_name" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">מייל</Label>
            <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">סיסמה</Label>
            <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </div>
          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting && <Loader2 className="w-4 h-4 animate-spin ml-2" />}
            הרשמה
          </Button>
        </form>

        <p className="text-sm text-center text-muted-foreground mt-6">
          כבר רשומה?{" "}
          <Link to="/login" className="text-foreground font-medium hover:underline">
            כניסה
          </Link>
        </p>
      </Card>
    </div>
  );
}

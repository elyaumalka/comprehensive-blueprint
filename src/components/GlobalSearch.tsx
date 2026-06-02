import { useState, useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from "@/components/ui/command";
import { Search, Users, Package, ClipboardList } from "lucide-react";
import { fmtCurrency } from "@/lib/format";

export function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const navigate = useNavigate();

  // קיצור מקלדת Ctrl/Cmd + K
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  const enabled = q.trim().length >= 2;

  const { data: results } = useQuery({
    queryKey: ["global-search", q],
    enabled,
    queryFn: async () => {
      const term = `%${q.trim()}%`;
      const numeric = /^\d+$/.test(q.trim()) ? Number(q.trim()) : null;
      const [customers, products, orders] = await Promise.all([
        supabase.from("customers").select("id, full_name, phone, city")
          .or(`full_name.ilike.${term},phone.ilike.${term},email.ilike.${term},city.ilike.${term}`).limit(6),
        supabase.from("products").select("id, sku, internal_name, sale_price")
          .or(`internal_name.ilike.${term},sku.ilike.${term}`).limit(6),
        numeric !== null
          ? supabase.from("orders").select("id, order_number, total, customers(full_name)").eq("order_number", numeric).limit(6)
          : Promise.resolve({ data: [] }),
      ]);
      return {
        customers: customers.data ?? [],
        products: products.data ?? [],
        orders: (orders.data ?? []) as { id: string; order_number: number; total: number; customers: { full_name: string } | null }[],
      };
    },
  });

  function go(path: string) {
    setOpen(false);
    setQ("");
    navigate({ to: path });
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 w-full max-w-md rounded-lg border border-border bg-card px-3 py-2 text-sm text-muted-foreground hover:bg-muted/50 transition-colors"
      >
        <Search className="w-4 h-4" />
        <span className="flex-1 text-right">חיפוש לקוחה, מוצר או מספר הזמנה…</span>
        <kbd className="text-xs bg-muted rounded px-1.5 py-0.5">Ctrl K</kbd>
      </button>

      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput placeholder="חיפוש לפי שם, טלפון, עיר, מק״ט או מספר הזמנה…" value={q} onValueChange={setQ} />
        <CommandList>
          {enabled && !results?.customers.length && !results?.products.length && !results?.orders.length && (
            <CommandEmpty>לא נמצאו תוצאות</CommandEmpty>
          )}
          {!enabled && <CommandEmpty>הקלידי לפחות 2 תווים…</CommandEmpty>}

          {!!results?.customers.length && (
            <CommandGroup heading="לקוחות">
              {results.customers.map((c) => (
                <CommandItem key={c.id} value={`cust-${c.id}-${c.full_name}`} onSelect={() => go("/customers")}>
                  <Users className="w-4 h-4 ml-2 text-muted-foreground" />
                  <span className="flex-1">{c.full_name}</span>
                  <span className="text-xs text-muted-foreground">{c.phone ?? c.city ?? ""}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          )}

          {!!results?.products.length && (
            <CommandGroup heading="מוצרים">
              {results.products.map((p) => (
                <CommandItem key={p.id} value={`prod-${p.id}-${p.internal_name}`} onSelect={() => go("/products")}>
                  <Package className="w-4 h-4 ml-2 text-muted-foreground" />
                  <span className="flex-1">{p.internal_name}</span>
                  <span className="text-xs text-muted-foreground font-mono">{p.sku}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          )}

          {!!results?.orders.length && (
            <CommandGroup heading="הזמנות">
              {results.orders.map((o) => (
                <CommandItem key={o.id} value={`order-${o.id}`} onSelect={() => go("/orders")}>
                  <ClipboardList className="w-4 h-4 ml-2 text-muted-foreground" />
                  <span className="flex-1">הזמנה #{o.order_number} · {o.customers?.full_name ?? ""}</span>
                  <span className="text-xs text-muted-foreground">{fmtCurrency(Number(o.total))}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          )}
        </CommandList>
      </CommandDialog>
    </>
  );
}

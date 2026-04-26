export const fmtCurrency = (n: number | null | undefined) =>
  `₪${Number(n ?? 0).toLocaleString("he-IL", { maximumFractionDigits: 2 })}`;

export const fmtDate = (d: string | Date | null | undefined) => {
  if (!d) return "-";
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleDateString("he-IL");
};

export const fmtDateTime = (d: string | Date | null | undefined) => {
  if (!d) return "-";
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleString("he-IL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

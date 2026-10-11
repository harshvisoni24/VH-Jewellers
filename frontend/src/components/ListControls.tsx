import { ReactNode, useEffect, useState } from "react";

export const PAGE_SIZE = 20;

export interface Paged<T> { total: number; page: number; pageSize: number; pages: number; items: T[] }

export function useDebounced<T>(value: T, ms = 350) {
  const [v, setV] = useState(value);
  useEffect(() => { const t = setTimeout(() => setV(value), ms); return () => clearTimeout(t); }, [value, ms]);
  return v;
}

/**
 * Filter + page state for one list. Changing any filter jumps back to page 1.
 * The search box (`q`) is debounced so the server isn't queried on every keystroke.
 */
export function useListState<F extends Record<string, string>>(initial: F) {
  const [filters, setFilters] = useState<F>(initial);
  const [page, setPage] = useState(1);
  const q = useDebounced(filters.q ?? "");
  const set = (key: keyof F, value: string) => { setFilters((f) => ({ ...f, [key]: value })); setPage(1); };
  const reset = () => { setFilters(initial); setPage(1); };
  const active = (Object.keys(initial) as (keyof F)[]).some((k) => k !== "sort" && filters[k] !== initial[k]);
  const query = () => {
    const sp = new URLSearchParams();
    Object.entries({ ...filters, q }).forEach(([k, v]) => { if (v) sp.set(k, v); });
    sp.set("page", String(page)); sp.set("pageSize", String(PAGE_SIZE));
    return sp.toString();
  };
  /** The server clamps out-of-range pages (e.g. after deleting the last row of the last page); follow it. */
  const follow = (serverPage?: number) => { if (serverPage && serverPage !== page) setPage(serverPage); };
  return { filters, page, setPage, set, reset, active, query, follow, key: [{ ...filters, q }, page] as const };
}

const field = "w-full rounded-sm border border-gold/30 bg-panel px-2 py-1.5 text-sm";

export function FilterBar({ children, onReset, active }: { children: ReactNode; onReset: () => void; active: boolean }) {
  return (
    <div className="mt-5 grid gap-3 bg-panel p-4 sm:grid-cols-2 lg:grid-cols-4">
      {children}
      <div className="flex items-end">{active && <button type="button" onClick={onReset} className="text-sm underline">Clear filters</button>}</div>
    </div>
  );
}

export const Label = ({ text, children }: { text: string; children: ReactNode }) => <label className="block text-xs text-ink/70">{text}<div className="mt-1">{children}</div></label>;

export const TextFilter = ({ label, value, onChange, placeholder, type = "text" }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string }) => (
  <Label text={label}><input type={type} min={type === "number" ? 0 : undefined} value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} className={field} /></Label>);

export const SelectFilter = ({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: [string, string][] }) => (
  <Label text={label}><select value={value} onChange={(e) => onChange(e.target.value)} className={field}>{options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></Label>);

/** Compact page list: 1 … 4 5 [6] 7 8 … 20 */
function pageNumbers(page: number, pages: number): (number | "…")[] {
  const keep = new Set([1, pages, page - 1, page, page + 1].filter((n) => n >= 1 && n <= pages));
  const out: (number | "…")[] = [];
  [...keep].sort((a, b) => a - b).forEach((n, i, arr) => { if (i && n - arr[i - 1] > 1) out.push("…"); out.push(n); });
  return out;
}

export function Pager({ data, onPage: setPage }: { data?: Paged<unknown>; onPage: (p: number) => void }) {
  if (!data) return null;
  const onPage = (n: number) => { setPage(n); window.scrollTo({ top: 0, behavior: "smooth" }); };
  if (!data.total) return null;
  const from = (data.page - 1) * data.pageSize + 1, to = Math.min(data.total, data.page * data.pageSize);
  const btn = "min-w-9 rounded-sm border border-gold/30 bg-panel px-3 py-1.5 text-sm disabled:opacity-40";
  return (
    <nav aria-label="Pagination" className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm">
      <p>Showing {from}–{to} of {data.total}</p>
      <div className="flex flex-wrap items-center gap-1">
        <button className={btn} disabled={data.page <= 1} onClick={() => onPage(data.page - 1)}>Previous</button>
        {pageNumbers(data.page, data.pages).map((n, i) => n === "…" ? <span key={`gap${i}`} className="px-1">…</span>
          : <button key={n} aria-current={n === data.page ? "page" : undefined} onClick={() => onPage(n)} className={`${btn} ${n === data.page ? "!border-gold !bg-gold text-night !opacity-100" : ""}`}>{n}</button>)}
        <button className={btn} disabled={data.page >= data.pages} onClick={() => onPage(data.page + 1)}>Next</button>
      </div>
    </nav>
  );
}

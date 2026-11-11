/* Static portfolio transport. All writes stay in this tab; no request reaches a server. */
import { Analytics, Payment, Prefs, Refund, Sub, User, minorUnits } from "./lib";

type Cancellation = {
  id: number;
  subscription_id: number;
  status: string;
  planned_for: string | null;
  reference_note: string | null;
};
type Event = { id: number; refund_case_id: number; happened_on: string; kind: string; body: string };
type State = {
  user: User;
  subs: Sub[];
  refunds: Refund[];
  payments: Payment[];
  cancellations: Cancellation[];
  events: Event[];
};
const storageKey = "subguard.showcase.v1";
const iso = (date: Date) => date.toLocaleDateString("en-CA");
const after = (days: number) => {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return iso(date);
};
const dayDiff = (date: string) => Math.ceil((new Date(date + "T12:00:00").getTime() - new Date(iso(new Date()) + "T12:00:00").getTime()) / 86400000);
function monthly(amount: number, interval: string, days: number | null) {
  const factor: Record<string, number> = { weekly: 52 / 12, monthly: 1, quarterly: 1 / 3, semiannual: 1 / 6, annual: 1 / 12 };
  return Math.round(amount * (factor[interval] || 30.4375 / (days || 30)));
}
function nextBill(anchor: string, interval: string, days: number | null) {
  const now = iso(new Date());
  if (anchor >= now) return anchor;
  const date = new Date(anchor + "T12:00:00");
  if (interval === "weekly" || interval === "custom_days") {
    const gap = interval === "weekly" ? 7 : Math.max(1, days || 30);
    while (iso(date) < now) date.setDate(date.getDate() + gap);
  } else {
    const step = { monthly: 1, quarterly: 3, semiannual: 6, annual: 12 }[interval] || 1;
    const anchorDay = date.getDate();
    let count = 0;
    while (iso(date) < now && count++ < 1200) {
      const y = date.getFullYear();
      const m = date.getMonth() + step;
      const last = new Date(y, m + 1, 0).getDate();
      date.setFullYear(y, m, Math.min(anchorDay, last));
    }
  }
  return iso(date);
}
function sub(data: Partial<Sub> & Pick<Sub, "id" | "name" | "amount_minor" | "currency" | "interval" | "anchor_date">): Sub {
  const due = nextBill(data.anchor_date, data.interval, data.interval_days || null);
  return {
    provider: null, interval_days: null, status: "active", is_trial: false,
    trial_end_date: null, cancel_before_date: null, cancellation_url: null,
    notes: null, payment_method_label: null, ...data,
    next_billing_date: due, days_until_billing: dayDiff(due),
    monthly_equivalent_minor: monthly(data.amount_minor, data.interval, data.interval_days || null),
  };
}
function initial(): State {
  const storedLocale = localStorage.getItem("subguard.locale");
  const sampleLocale: Prefs["locale"] = storedLocale === "ru" || storedLocale === "tr" ? storedLocale : "en";
  const refundCopy = {
    en: { title: "Example duplicate charge", reason: "A sample charge appeared twice in the statement." },
    ru: { title: "Пример повторного списания", reason: "Учебное списание дважды появилось в выписке." },
    tr: { title: "Örnek çift ödeme", reason: "Örnek ödeme hesap özetinde iki kez göründü." },
  }[sampleLocale];
  const settings: Prefs = {
    locale: sampleLocale, timezone: "UTC", primary_currency: "USD", reminder_days_before: 3,
    trial_reminder_days_before: 2, quiet_hours_start: 22, quiet_hours_end: 8,
    notifications_enabled: false,
  };
  return {
    user: { id: 1, first_name: "Explorer", is_demo: true, settings },
    subs: [
      sub({ id: 1, name: "Cinema Club", provider: "Example Studio", amount_minor: 1499, currency: "USD", interval: "monthly", anchor_date: after(5) }),
      sub({ id: 2, name: "Cloud Workspace", provider: "Example Cloud", amount_minor: 899, currency: "USD", interval: "monthly", anchor_date: after(12) }),
      sub({ id: 3, name: "Language Studio", provider: "Example Learning", amount_minor: 24900, currency: "TRY", interval: "monthly", anchor_date: after(7), status: "trial", is_trial: true, trial_end_date: after(7), cancel_before_date: after(6) }),
      sub({ id: 4, name: "Design Library", provider: "Example Design", amount_minor: 7900, currency: "EUR", interval: "annual", anchor_date: after(24) }),
    ],
    refunds: [{ id: 1, title: refundCopy.title, amount_minor: 1499, currency: "USD", status: "draft", reason: refundCopy.reason, charged_on: after(-4), next_follow_up_on: after(6) }],
    payments: [{ id: 1, subscription_id: 1, amount_minor: 1499, currency: "USD", charged_on: after(-25) }],
    cancellations: [], events: [],
  };
}
function load(): State {
  try {
    const value = sessionStorage.getItem(storageKey);
    if (value) return JSON.parse(value) as State;
  } catch { /* use fresh fictional data */ }
  const state = initial();
  save(state);
  return state;
}
function save(state: State) { sessionStorage.setItem(storageKey, JSON.stringify(state)); }
function id(rows: { id: number }[]) { return Math.max(0, ...rows.map((row) => row.id)) + 1; }
function totals(rows: { currency: string; amount_minor: number }[]) {
  const amounts = new Map<string, number>();
  for (const row of rows) amounts.set(row.currency, (amounts.get(row.currency) || 0) + row.amount_minor);
  return [...amounts].map(([currency, amount_minor]) => ({ currency, amount_minor }));
}
function analytics(state: State): Analytics {
  const active = state.subs.filter((s) => ["active", "trial"].includes(s.status));
  const by_subscription = active.map((s) => ({ name: s.name, currency: s.currency, amount_minor: s.monthly_equivalent_minor }));
  return {
    active_count: active.length,
    trial_count: active.filter((s) => s.is_trial && s.trial_end_date && s.trial_end_date >= iso(new Date())).length,
    monthly_totals: totals(by_subscription),
    annual_totals: totals(by_subscription.map((s) => ({ ...s, amount_minor: s.amount_minor * 12 }))),
    upcoming: [...active].sort((a, b) => a.next_billing_date.localeCompare(b.next_billing_date)),
    recorded_totals: totals(state.payments), payments: state.payments,
    by_subscription,
  };
}
function csvRows(content: string) {
  if (new TextEncoder().encode(content).length > 65536) throw new Error("CSV too large");
  content = content.replace(/^\uFEFF/, "");
  const delimiter = content.split(/\r?\n/, 1)[0].includes(";") ? ";" : content.split(/\r?\n/, 1)[0].includes("\t") ? "\t" : ",";
  const lines: string[][] = [];
  let row: string[] = [], cell = "", quoted = false;
  for (let i = 0; i < content.length; i++) {
    const c = content[i];
    if (c === '"') {
      if (quoted && content[i + 1] === '"') { cell += '"'; i++; }
      else quoted = !quoted;
    } else if (c === delimiter && !quoted) { row.push(cell); cell = ""; }
    else if ((c === "\n" || c === "\r") && !quoted) {
      if (c === "\r" && content[i + 1] === "\n") i++;
      row.push(cell); if (row.some(Boolean)) lines.push(row);
      row = []; cell = "";
    } else cell += c;
  }
  if (quoted) throw new Error("Unclosed quote");
  row.push(cell); if (row.some(Boolean)) lines.push(row);
  if (!lines.length || lines.length > 201 || lines[0].length > 30) throw new Error("Invalid CSV");
  return lines;
}
const csvFields = ["name", "amount", "currency", "interval", "anchor_date", "provider", "notes", "is_trial", "trial_end_date", "interval_days"];
function preview(content: string, supplied: Record<string, string> | undefined, state: State) {
  const [headers, ...raw] = csvRows(content);
  const mapping = supplied && Object.keys(supplied).length ? supplied : Object.fromEntries(csvFields.filter((key) => headers.includes(key)).map((key) => [key, key]));
  const needs_mapping = ["name", "amount", "currency", "interval", "anchor_date"].some((key) => !mapping[key]);
  const known = new Set(state.subs.map((s) => `${s.name.toLowerCase()}|${s.amount_minor}|${s.currency}|${s.anchor_date}`));
  const rows = needs_mapping ? [] : raw.map((cells, i) => {
    const value = (field: string) => (cells[headers.indexOf(mapping[field])] || "").trim();
    const name = value("name");
    let data: Partial<Sub> | null = null;
    let status: "ready" | "duplicate" | "invalid" = "invalid";
    const errors: { field: string; code: string }[] = [];
    try {
      const amount_minor = minorUnits(value("amount").replace(",", "."));
      const currency = value("currency").toUpperCase();
      const interval = value("interval");
      const anchor_date = value("anchor_date");
      if (!name || !["USD", "EUR", "TRY", "GBP", "KGS"].includes(currency) || !["weekly", "monthly", "quarterly", "semiannual", "annual", "custom_days"].includes(interval) || !/^\d{4}-\d{2}-\d{2}$/.test(anchor_date)) throw new Error();
      const trial = ["true", "1"].includes(value("is_trial").toLowerCase());
      data = { name, amount_minor, currency, interval, anchor_date, provider: value("provider") || null, notes: value("notes") || null, is_trial: trial, trial_end_date: value("trial_end_date") || null, status: trial ? "trial" : "active", interval_days: Number(value("interval_days")) || null };
      if (trial && (!data.trial_end_date || data.trial_end_date > anchor_date)) throw new Error();
      if (interval === "custom_days" && !data.interval_days) throw new Error();
      const key = `${name.toLowerCase()}|${amount_minor}|${currency}|${anchor_date}`;
      status = known.has(key) ? "duplicate" : "ready";
      known.add(key);
    } catch { errors.push({ field: "row", code: "invalid" }); data = null; }
    return { row: i + 2, name, status, errors, data };
  });
  return { headers, mapping, needs_mapping, rows };
}

export async function showcaseRequest<T>(path: string, method = "GET", body?: unknown): Promise<T> {
  const state = load();
  const input = (body || {}) as Record<string, unknown>;
  let result: unknown;
  if (path === "/auth/demo" && method === "POST") {
    const fresh = initial(); save(fresh);
    result = { access_token: "showcase-local-session", user: fresh.user };
  } else if (path === "/me") result = state.user;
  else if (path === "/subscriptions" && method === "GET") result = state.subs;
  else if (path === "/subscriptions" && method === "POST") {
    const item = sub({ ...input as Partial<Sub>, id: id(state.subs) } as Sub);
    state.subs.unshift(item); result = item;
  } else if (/^\/subscriptions\/\d+$/.test(path)) {
    const sid = Number(path.split("/")[2]);
    if (method === "DELETE") {
      state.subs = state.subs.filter((s) => s.id !== sid);
      state.payments = state.payments.filter((p) => p.subscription_id !== sid);
      state.cancellations = state.cancellations.filter((c) => c.subscription_id !== sid);
      result = undefined;
    } else {
      const index = state.subs.findIndex((s) => s.id === sid);
      if (index < 0) throw new Error("Record not found");
      const item = sub({ ...state.subs[index], ...input, id: sid } as Sub);
      state.subs[index] = item; result = item;
    }
  } else if (/^\/subscriptions\/\d+\/payments$/.test(path)) {
    const item = { id: id(state.payments), subscription_id: Number(path.split("/")[2]), amount_minor: Number(input.amount_minor), currency: state.subs.find((s) => s.id === Number(path.split("/")[2]))?.currency || "USD", charged_on: String(input.charged_on) };
    state.payments.unshift(item); result = item;
  } else if (/^\/payments\/\d+$/.test(path) && method === "DELETE") {
    state.payments = state.payments.filter((p) => p.id !== Number(path.split("/")[2])); result = undefined;
  } else if (path === "/analytics") result = analytics(state);
  else if (path === "/cancellations") result = state.cancellations;
  else if (/^\/subscriptions\/\d+\/cancellation$/.test(path)) {
    const sid = Number(path.split("/")[2]);
    const item = { id: id(state.cancellations), subscription_id: sid, status: String(input.status), planned_for: input.planned_for as string | null, reference_note: input.reference_note as string | null };
    state.cancellations.unshift(item);
    const target = state.subs.find((s) => s.id === sid);
    if (target) { target.cancel_before_date = item.planned_for; if (item.status === "confirmed") target.status = "cancelled"; }
    result = item;
  } else if (path === "/refunds" && method === "GET") result = state.refunds;
  else if (path === "/refunds" && method === "POST") {
    const item = { ...input, id: id(state.refunds), status: "draft" } as Refund;
    state.refunds.unshift(item); result = item;
  } else if (/^\/refunds\/\d+$/.test(path) && method === "PUT") {
    const rid = Number(path.split("/")[2]);
    const target = state.refunds.find((r) => r.id === rid);
    if (!target) throw new Error("Record not found");
    target.status = String(input.status);
    target.next_follow_up_on = input.next_follow_up_on as string | null;
    state.events.push({ id: id(state.events), refund_case_id: rid, happened_on: iso(new Date()), kind: target.status, body: String(input.note || "") });
    result = target;
  } else if (/^\/refunds\/\d+\/events$/.test(path)) result = state.events.filter((e) => e.refund_case_id === Number(path.split("/")[2]));
  else if (/^\/refunds\/\d+\/message\?locale=(en|ru|tr)$/.test(path)) {
    const rid = Number(path.split("/")[2]);
    const target = state.refunds.find((r) => r.id === rid);
    if (!target) throw new Error("Record not found");
    const locale = path.split("=")[1];
    const intro = { en: "Hello, please review this charge:", ru: "Здравствуйте! Прошу рассмотреть это списание:", tr: "Merhaba, lütfen bu ödemeyi inceleyin:" }[locale];
    result = { message: `${intro}\n${target.title} — ${(target.amount_minor / 100).toFixed(2)} ${target.currency}, ${target.charged_on}.\n${target.reason}` };
  } else if (path === "/settings" && method === "PUT") {
    state.user.settings = input as Prefs; result = state.user.settings;
  } else if (path === "/notifications") result = [];
  else if (path === "/demo" && method === "DELETE") {
    sessionStorage.removeItem(storageKey); return { deleted: true } as T;
  } else if (path === "/import/subscriptions/preview") result = preview(String(input.content || ""), input.mapping as Record<string, string> | undefined, state);
  else if (path === "/import/subscriptions" && method === "POST") {
    const inspected = preview(String(input.content || ""), input.mapping as Record<string, string> | undefined, state);
    const selected = new Set(input.selected_rows as number[]);
    let imported = 0;
    for (const row of inspected.rows) if (row.status === "ready" && selected.has(row.row) && row.data) {
      state.subs.unshift(sub({ ...row.data, id: id(state.subs) } as Sub)); imported++;
    }
    result = { imported, skipped: inspected.rows.length - imported };
  } else throw new Error("This action is unavailable in the static preview");
  save(state);
  return result as T;
}

import CsvImport from "./CsvImport";
import BotPreview from "./BotPreview";
import React, {
  useEffect,
  useRef,
  useState,
  FormEvent,
  ReactNode,
} from "react";
import { createRoot } from "react-dom/client";
import {
  ShieldCheck,
  LayoutDashboard,
  Layers,
  Shield,
  ChartNoAxesCombined,
  Settings,
  ArrowUpRight,
  Plus,
  Search,
  X,
  ChevronRight,
  Clock,
  Check,
  Wallet,
  Globe,
  ArrowRight,
  ReceiptText,
  LogOut,
  RefreshCw,
  Trash2,
  Pencil,
  CheckCircle2,
  MessageCircle,
} from "lucide-react";
import { dictionaries, Locale, Key } from "./i18n";
import {
  Sub,
  User,
  Refund,
  Analytics,
  Prefs,
  minorUnits,
  decimal,
  currencies,
  intervals,
  statuses,
} from "./lib";
import "./styles.css";
import { showcaseRequest } from "./showcase";
const showcase = import.meta.env.VITE_SHOWCASE === "true";
declare global {
  interface Window {
    Telegram?: {
      WebApp: { initData: string; ready: () => void; expand: () => void };
    };
  }
}
const tabs = [
  ["overview", LayoutDashboard],
  ["subscriptions", Layers],
  ["protection", Shield],
  ["refunds", ReceiptText],
  ["analytics", ChartNoAxesCombined],
  ["settings", Settings],
] as const;
type Tab = (typeof tabs)[number][0];
type Modal =
  | { type: "subscription" | "payment" | "cancellation"; sub?: Sub }
  | { type: "refund"; refund?: Refund }
  | { type: "message"; text: string }
  | null;
type Cancellation = {
  id: number;
  subscription_id: number;
  status: string;
  planned_for: string | null;
  reference_note: string | null;
};
type Notice = {
  id: number;
  kind: string;
  status: string;
  due_at: string;
  payload_text: string;
};
const today = () => new Date().toLocaleDateString("en-CA");
function App() {
  const [locale, setLocale] = useState<Locale>(
    (localStorage.getItem("subguard.locale") as Locale) ||
      (showcase && ["ru", "tr"].includes(navigator.language.slice(0, 2))
        ? (navigator.language.slice(0, 2) as Locale)
        : "en"),
  );
  const t = (key: string) =>
    dictionaries[locale]?.[key as Key] || dictionaries.en[key as Key] || key;
  const [token, setToken] = useState(
    sessionStorage.getItem("subguard.token") || "",
  );
  const [user, setUser] = useState<User | null>(null),
    [tab, setTab] = useState<Tab>("overview");
  const [subs, setSubs] = useState<Sub[]>([]),
    [refunds, setRefunds] = useState<Refund[]>([]),
    [analytics, setAnalytics] = useState<Analytics | null>(null),
    [cancellations, setCancellations] = useState<Cancellation[]>([]),
    [notices, setNotices] = useState<Notice[]>([]);
  const [loading, setLoading] = useState(
      !!token || !!window.Telegram?.WebApp.initData,
    ),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [toast, setToast] = useState(""),
    [modal, setModal] = useState<Modal>(null);
  const [search, setSearch] = useState(""),
    [filter, setFilter] = useState(""),
    [currency, setCurrency] = useState(""),
    [sort, setSort] = useState("date");
  const [csvOpen, setCsvOpen] = useState(false);
  const [botOpen, setBotOpen] = useState(showcase && window.location.hash === "#bot");
  const openBot = () => {
    window.history.replaceState(null, "", "#bot");
    setBotOpen(true);
  };
  const closeBot = () => {
    window.history.replaceState(null, "", window.location.pathname + window.location.search);
    setBotOpen(false);
  };
  const [trial, setTrial] = useState(false),
    [cycle, setCycle] = useState("monthly");
  const [anchorDate, setAnchorDate] = useState(today());
  const [trialEnd, setTrialEnd] = useState(today());
  const [subStatus, setSubStatus] = useState("active");
  const [cancelDate, setCancelDate] = useState("");
  const [events, setEvents] = useState<
    { id: number; happened_on: string; kind: string; body: string }[]
  >([]);
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    if (!["en", "ru", "tr"].includes(locale)) {
      setLocale("en");
      return;
    }
    localStorage.setItem("subguard.locale", locale);
    document.documentElement.lang = locale;
  }, [locale]);
  useEffect(() => {
    if (modal) {
      dialog.current?.showModal();
    } else {
      dialog.current?.close();
    }
  }, [modal]);
  useEffect(() => {
    if (toast) {
      const id = setTimeout(() => setToast(""), 3500);
      return () => clearTimeout(id);
    }
  }, [toast]);
  async function api<T>(
    path: string,
    method = "GET",
    body?: unknown,
    auth = token,
  ): Promise<T> {
    if (showcase) return showcaseRequest<T>(path, method, body);
    const res = await fetch("/api" + path, {
      method,
      headers: {
        "Content-Type": "application/json",
        ...(auth ? { Authorization: "Bearer " + auth } : {}),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    }).catch(() => {
      throw new Error(t("networkError"));
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      if (res.status === 401 && auth) {
        sessionStorage.removeItem("subguard.token");
        setToken("");
        setUser(null);
      }
      const details = JSON.stringify(data.detail || "");
      throw new Error(
        res.status === 401
          ? t("sessionExpired")
          : res.status === 429
            ? t("rateLimit")
            : res.status === 404
              ? t("notFound")
              : details.includes("First billing date")
                ? t("trialDateError")
                : res.status === 422
                  ? t("validationError")
                  : t("error"),
      );
    }
    return res.status === 204 ? (undefined as T) : await res.json();
  }
  async function refresh(auth = token) {
    const [u, s, r, a, c, n] = await Promise.all([
      api<User>("/me", "GET", undefined, auth),
      api<Sub[]>("/subscriptions", "GET", undefined, auth),
      api<Refund[]>("/refunds", "GET", undefined, auth),
      api<Analytics>("/analytics", "GET", undefined, auth),
      api<Cancellation[]>("/cancellations", "GET", undefined, auth),
      api<Notice[]>("/notifications", "GET", undefined, auth),
    ]);
    setUser(u);
    setSubs(s);
    setRefunds(r);
    setAnalytics(a);
    setCancellations(c);
    setNotices(n);
  }
  async function signIn(demo = false) {
    setBusy(true);
    setError("");
    try {
      const auth = await api<{ access_token: string; user: User }>(
        demo ? "/auth/demo" : "/auth/telegram",
        "POST",
        demo ? { seed: true } : { init_data: window.Telegram?.WebApp.initData },
        "",
      );
      sessionStorage.setItem("subguard.token", auth.access_token);
      setToken(auth.access_token);
      await refresh(auth.access_token);
      setTab("overview");
      if (!demo) setLocale(auth.user.settings.locale);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
      setLoading(false);
    }
  }
  useEffect(() => {
    if (!showcase) {
      window.Telegram?.WebApp.ready();
      window.Telegram?.WebApp.expand();
    }
    if (token) {
      refresh()
        .catch((e) => setError(e.message))
        .finally(() => setLoading(false));
    } else if (!showcase && window.Telegram?.WebApp.initData) {
      void signIn();
    }
  }, []);
  async function act(fn: () => Promise<unknown>, close = true) {
    setBusy(true);
    setError("");
    try {
      await fn();
      await refresh();
      if (close) setModal(null);
      setToast(t("saved"));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  const filteredSubs = subs.filter(
    (s) =>
      s.name.toLowerCase().includes(search.toLowerCase()) &&
      (!filter || s.status === filter) &&
      (!currency || s.currency === currency),
  );
  const money = (n: number, c: string) =>
    new Intl.NumberFormat(locale, { style: "currency", currency: c }).format(
      n / 100,
    );
  const dateLabel = (d: string) =>
    new Intl.DateTimeFormat(locale, {
      day: "numeric",
      month: "short",
      year: "numeric",
    }).format(new Date(d + "T12:00:00"));
  const intervalLabel = (i: string) =>
    t(i === "monthly" ? "monthlyCycle" : i === "annual" ? "annualCycle" : i);
  const openSub = (s?: Sub) => {
    setTrial(s?.is_trial || false);
    setCycle(s?.interval || "monthly");
    setAnchorDate(s?.anchor_date || today());
    setTrialEnd(s?.trial_end_date || s?.anchor_date || today());
    setSubStatus(s?.status || "active");
    setCancelDate(s?.cancel_before_date || "");
    setModal({ type: "subscription", sub: s });
    setError("");
  };
  const openRefund = async (r?: Refund) => {
    setError("");
    setEvents([]);
    setModal({ type: "refund", refund: r });
    if (r)
      try {
        setEvents(await api(`/refunds/${r.id}/events`));
      } catch (e) {
        setError((e as Error).message);
      }
  };
  const field = (
    label: string,
    name: string,
    defaultValue: string | number = "",
    type = "text",
    required = false,
    extra: React.InputHTMLAttributes<HTMLInputElement> = {},
  ) => (
    <label>
      {t(label)}
      <input
        name={name}
        type={type}
        defaultValue={defaultValue}
        required={required}
        {...extra}
      />
    </label>
  );
  const select = (
    label: string,
    name: string,
    values: string[],
    value: string,
    labels: (v: string) => string = t,
  ) => (
    <label>
      {t(label)}
      <select name={name} aria-label={t(label)} defaultValue={value}>
        {values.map((v) => (
          <option value={v} key={v}>
            {labels(v)}
          </option>
        ))}
      </select>
    </label>
  );
  const totals = (rows: { currency: string; amount_minor: number }[]) =>
    rows.length ? (
      rows.map((r) => (
        <span className="total-line" key={r.currency}>
          {money(r.amount_minor, r.currency)}
          <small>{r.currency}</small>
        </span>
      ))
    ) : (
      <span className="total-line">—</span>
    );
  const empty = (note = t("emptyNote")) => (
    <div className="empty">
      <Layers size={32} />
      <h3>{t("empty")}</h3>
      <p>{note}</p>
    </div>
  );
  function parseAmount(value: string) {
    try {
      return minorUnits(value.trim().replace(",", "."));
    } catch {
      throw new Error(t("amountError"));
    }
  }
  async function formSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const d = Object.fromEntries(new FormData(e.currentTarget));
    if (!modal) return;
    try {
      if (modal.type === "subscription") {
        if (trial && anchorDate < trialEnd)
          throw new Error(t("trialDateError"));
        const data = {
          name: d.name,
          provider: d.provider || null,
          amount_minor: parseAmount(String(d.amount)),
          currency: d.currency,
          interval: d.interval,
          interval_days:
            d.interval === "custom_days" ? Number(d.interval_days) : null,
          anchor_date: d.anchor_date,
          status: d.status,
          is_trial: trial,
          trial_end_date: trial ? d.trial_end_date : null,
          cancel_before_date: d.cancel_before_date || null,
          cancellation_url: d.cancellation_url || null,
          notes: d.notes || null,
          payment_method_label: d.payment_method_label || null,
        };
        await act(() =>
          api(
            "/subscriptions" + (modal.sub ? "/" + modal.sub.id : ""),
            modal.sub ? "PUT" : "POST",
            data,
          ),
        );
      } else if (modal.type === "payment" && modal.sub) {
        await act(() =>
          api(`/subscriptions/${modal.sub!.id}/payments`, "POST", {
            amount_minor: parseAmount(String(d.amount)),
            charged_on: d.charged_on,
            was_expected: !d.unexpected,
            note: d.notes || null,
          }),
        );
      } else if (modal.type === "cancellation" && modal.sub) {
        await act(() =>
          api(`/subscriptions/${modal.sub!.id}/cancellation`, "POST", {
            status: d.status,
            planned_for: d.planned_for || null,
            reference_note: d.reference_note || null,
          }),
        );
      } else if (modal.type === "refund") {
        if (modal.refund) {
          await act(() =>
            api(`/refunds/${modal.refund!.id}`, "PUT", {
              status: d.status,
              next_follow_up_on: d.next_follow_up_on || null,
              note: d.note || "",
            }),
          );
        } else {
          await act(() =>
            api("/refunds", "POST", {
              title: d.title,
              subscription_id: d.subscription_id
                ? Number(d.subscription_id)
                : null,
              amount_minor: parseAmount(String(d.amount)),
              currency: d.currency,
              charged_on: d.charged_on,
              reason: d.reason,
              next_follow_up_on: d.next_follow_up_on || null,
            }),
          );
        }
      }
    } catch (e) {
      setError((e as Error).message);
    }
  }
  function subRow(s: Sub, actions = false) {
    return (
      <article className="sub-row" key={s.id}>
        <div className={"service-icon color-" + (s.id % 5)}>
          {s.name.slice(0, 1).toUpperCase()}
        </div>
        <div className="sub-title">
          <button className="text-button" onClick={() => openSub(s)}>
            {s.name}
          </button>
          <span>
            {intervalLabel(s.interval)} <i>·</i>{" "}
            <em className={"status " + s.status}>{t(s.status)}</em>
          </span>
        </div>
        <div className="sub-price">
          <strong>{money(s.amount_minor, s.currency)}</strong>
          <small>{dateLabel(s.next_billing_date)}</small>
        </div>
        {actions ? (
          <div className="row-actions">
            <button
              className="icon-button"
              aria-label={t("edit") + " " + s.name}
              onClick={() => openSub(s)}
            >
              <Pencil size={16} />
            </button>
            <button
              className="icon-button"
              aria-label={t("payment") + " " + s.name}
              onClick={() => setModal({ type: "payment", sub: s })}
            >
              <Wallet size={17} />
            </button>
            <button
              className="icon-button danger"
              aria-label={t("delete") + " " + s.name}
              onClick={() => {
                if (confirm(t("confirmDelete")))
                  void act(() => api("/subscriptions/" + s.id, "DELETE"));
              }}
            >
              <Trash2 size={16} />
            </button>
          </div>
        ) : (
          <button
            className="icon-button"
            aria-label={t("view") + " " + s.name}
            onClick={() => openSub(s)}
          >
            <ChevronRight size={18} />
          </button>
        )}
      </article>
    );
  }
  const languagePicker = (
    <select
      className="language"
      aria-label={t("language")}
      value={locale}
      onChange={(e) => setLocale(e.target.value as Locale)}
    >
      <option value="en">EN</option>
      <option value="ru">RU</option>
      <option value="tr">TR</option>
    </select>
  );
  if (loading)
    return (
      <main className="loading">
        <ShieldCheck size={40} />
        <p>{t("loading")}</p>
      </main>
    );
  return (
    <>
      {showcase && (
        <div className="showcase-banner" role="note">
          {t("showcaseNotice")}
        </div>
      )}
      {!user ? (
        <main className="landing">
          <header>
            <a className="brand" href="#">
              <ShieldCheck />
              SubGuard
              <span className="brand-dot" />
            </a>
            <div className="landing-header-actions">
              {showcase && <button className="secondary" onClick={() => void signIn(true)}>{t("showcaseOpen")}<ArrowUpRight size={15} /></button>}
              {languagePicker}
            </div>
          </header>
          <section className="hero">
            <div className="eyebrow">
              <span /> {t("tagline")}
            </div>
            <h1>{t("headline")}</h1>
            <p>{t("intro")}</p>
            <div className="hero-actions">
              <button
                className="primary"
                disabled={busy}
                onClick={() => signIn(true)}
              >
                {busy ? t("loading") : t(showcase ? "showcaseOpen" : "demo")}
                <ArrowRight size={18} />
              </button>
              {showcase && <button className="secondary" onClick={openBot}><MessageCircle size={17} />{t("showcaseBot")}</button>}
              {window.Telegram?.WebApp.initData && (
                <button
                  className="secondary"
                  disabled={busy}
                  onClick={() => signIn()}
                >
                  {t("open")}
                </button>
              )}
            </div>
            {error && (
              <p role="alert" className="error">
                {error}
              </p>
            )}
            <small>{showcase ? t("showcaseIntro") : t("demoNote")}</small>
            <div className="hero-art" aria-hidden="true">
              <div className="orbit orbit-one" />
              <div className="orbit orbit-two" />
              <div className="shield-orb">
                <ShieldCheck size={92} strokeWidth={1} />
              </div>
              <span className="floating-label">
                <CheckCircle2 size={17} />
                {t("welcome")}
              </span>
            </div>
          </section>
          {showcase && <section className="showcase-guide" aria-label={t("showcaseGuide")}>
            <div className="showcase-guide-heading"><span className="eyebrow">01 / 02 / 03</span><h2>{t("showcaseGuide")}</h2><p>{t("showcaseGuideIntro")}</p></div>
            <div className="showcase-guide-grid">
              <div><strong>01</strong><h3>{t("showcaseStepOne")}</h3><p>{t("showcaseStepOneText")}</p></div>
              <div><strong>02</strong><h3>{t("showcaseStepTwo")}</h3><p>{t("showcaseStepTwoText")}</p></div>
              <div><strong>03</strong><h3>{t("showcaseStepThree")}</h3><p>{t("showcaseStepThreeText")}</p></div>
            </div>
          </section>}
          <section className="founder">
            <span>01 / SUBGUARD</span>
            <h2>{t("storyTitle")}</h2>
            <p>{t("story")}</p>
          </section>
          <footer>SubGuard · {t("privacy")}</footer>
        </main>
      ) : (
        <div className="app-shell">
          <aside className="sidebar">
            <a
              className="brand"
              href="#"
              onClick={(e) => {
                e.preventDefault();
                setTab("overview");
              }}
            >
              <ShieldCheck />
              SubGuard
              <span className="brand-dot" />
            </a>
            <div className="workspace-label">
              {t("overview")} <span>01</span>
            </div>
            <nav>
              {tabs.map(([id, Icon]) => (
                <button
                  key={id}
                  className={tab === id ? "selected" : ""}
                  onClick={() => setTab(id)}
                >
                  <Icon size={19} />
                  <span>{t(id)}</span>
                  {tab === id && <span className="nav-dot" />}
                </button>
              ))}
            </nav>
            <div className="sidebar-bottom">
              <div className="mini-shield">
                <ShieldCheck size={22} />
              </div>
              <p>{t("tagline")}</p>
              <small>{t("privacy")}</small>
              <div className="profile">
                <span className="avatar">{user.first_name?.[0] || "S"}</span>
                <div>
                  <strong>{user.first_name || "SubGuard"}</strong>
                  <small>{user.is_demo ? t("demoBadge") : "Telegram"}</small>
                </div>
              </div>
            </div>
          </aside>
          <main className="main">
            <header className="topbar">
              <span className="breadcrumb">
                SubGuard <ChevronRight size={13} /> {t(tab)}
              </span>
              <div>
                {showcase && <button className="showcase-topbar-button" onClick={openBot} aria-label={t("showcaseBot")}><MessageCircle size={16} /><span>{t("showcaseBot")}</span></button>}
                {user.is_demo && (
                  <span className="demo-pill">
                    <span />
                    {t("demoBadge")}
                  </span>
                )}
                {languagePicker}
              </div>
            </header>
            <div className="page" key={tab}>
              <div className="page-heading">
                <div>
                  <div className="eyebrow">
                    {new Intl.DateTimeFormat(locale, {
                      weekday: "long",
                      day: "numeric",
                      month: "long",
                    }).format(new Date())}
                  </div>
                  <h1>{tab === "overview" ? t("welcome") : t(tab)}</h1>
                  <p>
                    {tab === "overview"
                      ? t("subtitle")
                      : tab === "refunds"
                        ? t("refundTitle")
                        : tab === "protection"
                          ? t("protectTitle")
                          : tab === "analytics"
                            ? t("currencyNote")
                            : tab === "settings"
                              ? t("preferences")
                              : t("subtitle")}
                  </p>
                </div>
                {["overview", "subscriptions"].includes(tab) && (
                  <div className="heading-actions">
                    {tab === "subscriptions" && (
                      <button
                        className="secondary"
                        onClick={() => setCsvOpen(true)}
                      >
                        {t("importCsv")}
                      </button>
                    )}
                    <button className="primary" onClick={() => openSub()}>
                      <Plus size={18} />
                      {t("add")}
                    </button>
                  </div>
                )}
                {tab === "refunds" && (
                  <button className="primary" onClick={() => openRefund()}>
                    <Plus size={18} />
                    {t("newRefund")}
                  </button>
                )}
              </div>
              {error && !modal && (
                <div role="alert" className="error">
                  {error}
                  <button
                    onClick={() => void act(() => Promise.resolve(), false)}
                  >
                    {t("retry")}
                  </button>
                </div>
              )}
              {tab === "overview" && analytics && (
                <>
                  <section className="metrics">
                    <div className="metric featured">
                      <div>
                        <Wallet size={18} />
                        <span>{t("monthly")}</span>
                        <ArrowUpRight size={17} />
                      </div>
                      <div className="metric-number">
                        {totals(analytics.monthly_totals)}
                      </div>
                      <small>{t("currencyNote")}</small>
                    </div>
                    <div className="metric">
                      <div>
                        <Layers size={18} />
                        <span>{t("activeCount")}</span>
                      </div>
                      <strong className="big-number">
                        {analytics.active_count.toString().padStart(2, "0")}
                      </strong>
                      <small>{t("all")}</small>
                    </div>
                    <div className="metric">
                      <div>
                        <Clock size={18} />
                        <span>{t("trials")}</span>
                      </div>
                      <strong className="big-number">
                        {analytics.trial_count.toString().padStart(2, "0")}
                        <span className="accent-dot" />
                      </strong>
                      <small>{t("trial_ending")}</small>
                    </div>
                  </section>
                  <div className="overview-grid">
                    <section className="panel">
                      <div className="section-head">
                        <h2>{t("upcoming")}</h2>
                        <button
                          className="text-link"
                          onClick={() => setTab("subscriptions")}
                        >
                          {t("viewAll")}
                          <ArrowUpRight size={15} />
                        </button>
                      </div>
                      {analytics.upcoming.length
                        ? analytics.upcoming.slice(0, 5).map((s) => subRow(s))
                        : empty()}
                    </section>
                    <section className="protection-card">
                      <div className="round-icon">
                        <ShieldCheck size={28} />
                      </div>
                      <span className="eyebrow">
                        SubGuard · {t("protection")}
                      </span>
                      <h2>{t("protectTitle")}</h2>
                      <p>{t("protectNote")}</p>
                      <button
                        className="secondary"
                        onClick={() => setTab("protection")}
                      >
                        {t("protection")}
                        <ArrowRight size={17} />
                      </button>
                    </section>
                  </div>
                  <section className="quiet-banner">
                    <span className="small-circle">
                      <Check size={18} />
                    </span>
                    <p>{user.is_demo ? t("demoDelivery") : t("quietNote")}</p>
                    <button
                      className="text-link"
                      onClick={() => setTab("settings")}
                    >
                      {t("settings")}
                      <ArrowRight size={16} />
                    </button>
                  </section>
                </>
              )}
              {tab === "subscriptions" && (
                <>
                  <div className="filters">
                    <label className="search">
                      <Search size={17} />
                      <input
                        aria-label={t("search")}
                        placeholder={t("search")}
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                      />
                    </label>
                    <select
                      aria-label={t("status")}
                      value={filter}
                      onChange={(e) => setFilter(e.target.value)}
                    >
                      <option value="">{t("allStatuses")}</option>
                      {statuses.map((s) => (
                        <option value={s} key={s}>
                          {t(s)}
                        </option>
                      ))}
                    </select>
                    <select
                      aria-label={t("currency")}
                      value={currency}
                      onChange={(e) => setCurrency(e.target.value)}
                    >
                      <option value="">{t("allCurrencies")}</option>
                      {currencies.map((c) => (
                        <option key={c}>{c}</option>
                      ))}
                    </select>
                    <select
                      aria-label={t("sortDate")}
                      value={sort}
                      onChange={(e) => setSort(e.target.value)}
                    >
                      <option value="date">{t("sortDate")}</option>
                      <option value="amount">{t("sortAmount")}</option>
                    </select>
                  </div>
                  <section className="panel">
                    {filteredSubs
                      .sort((a, b) =>
                        sort === "date"
                          ? a.next_billing_date.localeCompare(
                              b.next_billing_date,
                            )
                          : a.currency.localeCompare(b.currency) ||
                            b.amount_minor - a.amount_minor,
                      )
                      .map((s) => subRow(s, true))}
                    {!filteredSubs.length &&
                      empty(subs.length ? t("emptySearch") : t("emptyNote"))}
                  </section>
                </>
              )}
              {tab === "protection" && (
                <>
                  <div className="info-banner">
                    <Shield size={20} />
                    {t("protectNote")}
                  </div>
                  <div className="card-grid">
                    {subs
                      .filter((s) => s.status !== "archived")
                      .map((s) => {
                        const c = cancellations.find(
                          (c) => c.subscription_id === s.id,
                        );
                        return (
                          <article className="panel protect-item" key={s.id}>
                            <div className="section-head">
                              <div
                                className={"service-icon color-" + (s.id % 5)}
                              >
                                {s.name[0]}
                              </div>
                              <span
                                className={"badge " + (c?.status || s.status)}
                              >
                                {t(c?.status || s.status)}
                              </span>
                            </div>
                            <h3>{s.name}</h3>
                            <dl>
                              {s.is_trial && s.trial_end_date && (
                                <>
                                  <dt>{t("trialEnd")}</dt>
                                  <dd>{dateLabel(s.trial_end_date)}</dd>
                                </>
                              )}
                              <dt>{t("cancelBefore")}</dt>
                              <dd>
                                {s.cancel_before_date
                                  ? dateLabel(s.cancel_before_date)
                                  : "—"}
                              </dd>
                            </dl>
                            {c?.reference_note && (
                              <p className="reference">{c.reference_note}</p>
                            )}
                            <div className="stack-actions">
                              <button
                                className="secondary"
                                onClick={() =>
                                  setModal({ type: "cancellation", sub: s })
                                }
                              >
                                {t("plan")}
                                <ArrowRight size={16} />
                              </button>
                              {s.cancellation_url ? (
                                <a
                                  className="text-link"
                                  href={s.cancellation_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                >
                                  {t("providerLink")}
                                  <ArrowUpRight size={15} />
                                </a>
                              ) : (
                                <small>{t("noLink")}</small>
                              )}
                            </div>
                          </article>
                        );
                      })}
                  </div>
                  {!subs.length && empty()}
                </>
              )}
              {tab === "refunds" && (
                <>
                  <div className="info-banner">
                    <ReceiptText size={21} />
                    {t("refundNote")}
                  </div>
                  <div className="card-grid">
                    {refunds.map((r) => (
                      <article className="panel refund-item" key={r.id}>
                        <div className="section-head">
                          <span className={"badge " + r.status}>
                            {t(r.status)}
                          </span>
                          <small>#{String(r.id).padStart(3, "0")}</small>
                        </div>
                        <h3>{r.title}</h3>
                        <strong className="refund-amount">
                          {money(r.amount_minor, r.currency)}
                        </strong>
                        <p>{r.reason}</p>
                        <dl>
                          <dt>{t("charged")}</dt>
                          <dd>{dateLabel(r.charged_on)}</dd>
                          <dt>{t("followup")}</dt>
                          <dd>
                            {r.next_follow_up_on
                              ? dateLabel(r.next_follow_up_on)
                              : "—"}
                          </dd>
                        </dl>
                        <div className="stack-actions">
                          <button
                            className="secondary"
                            onClick={() => openRefund(r)}
                          >
                            {t("update")}
                            <Pencil size={15} />
                          </button>
                          <button
                            className="text-link"
                            onClick={async () => {
                              try {
                                const d = await api<{ message: string }>(
                                  `/refunds/${r.id}/message?locale=${locale}`,
                                );
                                setModal({ type: "message", text: d.message });
                              } catch (e) {
                                setError((e as Error).message);
                              }
                            }}
                          >
                            {t("message")}
                            <ArrowUpRight size={15} />
                          </button>
                        </div>
                      </article>
                    ))}
                  </div>
                  {!refunds.length && empty(t("refundNote"))}
                </>
              )}
              {tab === "analytics" && analytics && (
                <>
                  <section className="metrics analytics-metrics">
                    <div className="metric featured">
                      <div>
                        <Wallet size={18} />
                        {t("monthly")}
                      </div>
                      <div className="metric-number">
                        {totals(analytics.monthly_totals)}
                      </div>
                    </div>
                    <div className="metric">
                      <div>
                        <ChartNoAxesCombined size={18} />
                        {t("annual")}
                      </div>
                      <div className="metric-number">
                        {totals(analytics.annual_totals)}
                      </div>
                    </div>
                    <div className="metric">
                      <div>
                        <ReceiptText size={18} />
                        {t("recorded")}
                      </div>
                      <div className="metric-number">
                        {totals(analytics.recorded_totals)}
                      </div>
                    </div>
                  </section>
                  <section className="panel chart">
                    <h2>{t("distribution")}</h2>
                    <p>{t("currencyNote")}</p>
                    {currencies.map((c) => {
                      const entries = analytics.by_subscription.filter(
                        (s) => s.currency === c,
                      );
                      const max = Math.max(
                        ...entries.map((s) => s.amount_minor),
                        1,
                      );
                      return (
                        entries.length > 0 && (
                          <div className="chart-group" key={c}>
                            <span className="eyebrow">{c}</span>
                            {entries.map((s, i) => (
                              <div className="bar-row" key={i}>
                                <div>
                                  <span>{s.name}</span>
                                  <strong>{money(s.amount_minor, c)}</strong>
                                </div>
                                <div className="bar-track">
                                  <span
                                    style={{
                                      width: (s.amount_minor / max) * 100 + "%",
                                    }}
                                  />
                                </div>
                              </div>
                            ))}
                          </div>
                        )
                      );
                    })}
                    {!analytics.by_subscription.length && empty()}
                  </section>
                  <section className="panel payment-list">
                    <div className="section-head">
                      <h2>{t("recorded")}</h2>
                      <button
                        className="text-link"
                        onClick={() => {
                          const escape = (s: unknown) =>
                            '"' + String(s).replace(/"/g, '""') + '"';
                          const csv =
                            "date,currency,amount_minor\n" +
                            analytics.payments
                              .map((p) =>
                                [p.charged_on, p.currency, p.amount_minor]
                                  .map(escape)
                                  .join(","),
                              )
                              .join("\n");
                          const url = URL.createObjectURL(
                            new Blob([csv], { type: "text/csv" }),
                          );
                          const a = document.createElement("a");
                          a.href = url;
                          a.download = "subguard-payments.csv";
                          a.click();
                          URL.revokeObjectURL(url);
                        }}
                      >
                        {t("export")}
                      </button>
                    </div>
                    <p>{t("recordNote")}</p>
                    {analytics.payments.map((p) => (
                      <div className="payment-row" key={p.id}>
                        <span>
                          {subs.find((s) => s.id === p.subscription_id)?.name ||
                            "#" + p.subscription_id}
                          <small>{dateLabel(p.charged_on)}</small>
                        </span>
                        <strong>{money(p.amount_minor, p.currency)}</strong>
                        <button
                          className="icon-button danger"
                          aria-label={t("deletePayment")}
                          onClick={() => {
                            if (confirm(t("confirmDelete")))
                              void act(() =>
                                api("/payments/" + p.id, "DELETE"),
                              );
                          }}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ))}
                    {!analytics.payments.length && (
                      <p className="muted">{t("noPayments")}</p>
                    )}
                  </section>
                </>
              )}
              {tab === "settings" && (
                <>
                  <form
                    className="panel settings-form"
                    onSubmit={(e) => {
                      e.preventDefault();
                      const d = Object.fromEntries(
                        new FormData(e.currentTarget),
                      );
                      const prefs: Prefs = {
                        locale: d.locale as Locale,
                        timezone: String(d.timezone),
                        primary_currency: String(d.primary_currency),
                        reminder_days_before: Number(d.reminder_days_before),
                        trial_reminder_days_before: Number(
                          d.trial_reminder_days_before,
                        ),
                        quiet_hours_start: Number(d.quiet_hours_start),
                        quiet_hours_end: Number(d.quiet_hours_end),
                        notifications_enabled: !!d.notifications_enabled,
                      };
                      void act(async () => {
                        await api("/settings", "PUT", prefs);
                        setLocale(prefs.locale);
                      }, false);
                    }}
                    key={user.id}
                  >
                    <h2>{t("preferences")}</h2>
                    <div className="form-grid">
                      {select(
                        "language",
                        "locale",
                        ["en", "ru", "tr"],
                        locale,
                        (v) =>
                          ({ en: "English", ru: "Русский", tr: "Türkçe" })[v] ||
                          v,
                      )}
                      {select(
                        "primaryCurrency",
                        "primary_currency",
                        currencies,
                        user.settings.primary_currency,
                        (v) => v,
                      )}
                      {field(
                        "timezone",
                        "timezone",
                        user.settings.timezone,
                        "text",
                        true,
                        { list: "timezones" },
                      )}
                      <datalist id="timezones">
                        {[
                          "UTC",
                          "Europe/Istanbul",
                          "Europe/Moscow",
                          "Europe/London",
                          "Europe/Berlin",
                          "America/New_York",
                          "Asia/Bishkek",
                        ].map((z) => (
                          <option key={z}>{z}</option>
                        ))}
                      </datalist>
                      {field(
                        "renewalDays",
                        "reminder_days_before",
                        user.settings.reminder_days_before,
                        "number",
                        true,
                        { min: 0, max: 30 },
                      )}
                      {field(
                        "trialDays",
                        "trial_reminder_days_before",
                        user.settings.trial_reminder_days_before,
                        "number",
                        true,
                        { min: 0, max: 30 },
                      )}
                      {field(
                        "quietStart",
                        "quiet_hours_start",
                        user.settings.quiet_hours_start,
                        "number",
                        true,
                        { min: 0, max: 23 },
                      )}
                      {field(
                        "quietEnd",
                        "quiet_hours_end",
                        user.settings.quiet_hours_end,
                        "number",
                        true,
                        { min: 0, max: 23 },
                      )}
                    </div>
                    <p className="muted">{t("quietNote")}</p>
                    <label className="checkbox">
                      <input
                        name="notifications_enabled"
                        type="checkbox"
                        defaultChecked={user.settings.notifications_enabled}
                      />
                      {t("reminders")}
                    </label>
                    {user.is_demo && (
                      <p className="info-banner">{t("demoDelivery")}</p>
                    )}
                    <button className="primary" disabled={busy}>
                      <Check size={17} />
                      {t("save")}
                    </button>
                  </form>
                  <section className="panel notification-list">
                    <h2>{t("notify")}</h2>
                    {notices.map((n) => (
                      <div className="notice" key={n.id}>
                        <Clock size={18} />
                        <div>
                          <strong>{t(n.kind)}</strong>
                          <p>{n.payload_text}</p>
                          <small>
                            {new Date(n.due_at).toLocaleString(locale)}
                          </small>
                        </div>
                        <span className="badge">{t(n.status)}</span>
                        {n.status === "failed" && (
                          <button
                            className="text-link"
                            disabled={busy}
                            onClick={() =>
                              void act(
                                () =>
                                  api(`/notifications/${n.id}/retry`, "POST"),
                                false,
                              )
                            }
                          >
                            {t("retry")}
                          </button>
                        )}
                      </div>
                    ))}
                    {!notices.length && <p>{t("noNotifications")}</p>}
                  </section>
                  <div className="account-actions">
                    {user.is_demo && (
                      <button
                        className="secondary"
                        disabled={busy}
                        onClick={async () => {
                          if (confirm(t("resetConfirm"))) {
                            setBusy(true);
                            try {
                              await api("/demo", "DELETE");
                              sessionStorage.removeItem("subguard.token");
                              setToken("");
                              setUser(null);
                              await signIn(true);
                            } catch (e) {
                              setError((e as Error).message);
                              setBusy(false);
                            }
                          }
                        }}
                      >
                        <RefreshCw size={16} />
                        {t("reset")}
                      </button>
                    )}
                    <button
                      className="text-link"
                      onClick={() => {
                        sessionStorage.removeItem("subguard.token");
                        setToken("");
                        setUser(null);
                      }}
                    >
                      <LogOut size={16} />
                      {t("logout")}
                    </button>
                  </div>
                </>
              )}
              <footer className="page-footer">
                <ShieldCheck size={15} /> SubGuard <span>{t("tagline")}</span>
              </footer>
            </div>
          </main>
          <nav className="mobile-nav">
            {tabs.map(([id, Icon]) => (
              <button
                key={id}
                className={tab === id ? "selected" : ""}
                onClick={() => setTab(id)}
                aria-label={t(id)}
              >
                <Icon size={20} />
                <span>{t(id)}</span>
              </button>
            ))}
          </nav>
        </div>
      )}
      {showcase && botOpen && <BotPreview locale={locale} onClose={closeBot} onOpenApp={() => {
        closeBot();
        if (user) setTab("overview");
        else void signIn(true);
      }} />}
      {csvOpen && (
        <CsvImport
          locale={locale}
          request={api}
          onClose={() => setCsvOpen(false)}
          onImported={() => refresh()}
        />
      )}
      <dialog
        ref={dialog}
        onCancel={() => setModal(null)}
        onClick={(e) => {
          if (e.target === e.currentTarget && !busy) setModal(null);
        }}
      >
        <div className="modal-content">
          <button
            className="close icon-button"
            aria-label={t("close")}
            disabled={busy}
            onClick={() => setModal(null)}
          >
            <X size={21} />
          </button>
          {modal && (
            <>
              <h2>
                {t(
                  modal.type === "subscription"
                    ? modal.sub
                      ? "edit"
                      : "add"
                    : modal.type === "payment"
                      ? "payment"
                      : modal.type === "cancellation"
                        ? "plan"
                        : modal.type === "refund"
                          ? modal.refund
                            ? "update"
                            : "newRefund"
                          : "message",
                )}
              </h2>
              {error && (
                <p role="alert" className="error">
                  {error}
                </p>
              )}
              {modal.type === "message" ? (
                <>
                  <textarea
                    aria-label={t("message")}
                    className="message-text"
                    readOnly
                    value={modal.text}
                  />
                  <p className="muted">{t("refundNote")}</p>
                  <button
                    className="primary"
                    onClick={async () => {
                      try {
                        await navigator.clipboard.writeText(modal.text);
                        setToast(t("copied"));
                      } catch {
                        setError(t("error"));
                      }
                    }}
                  >
                    {t("copy")}
                  </button>
                </>
              ) : (
                <form
                  onSubmit={formSubmit}
                  key={
                    modal.type +
                    ("sub" in modal
                      ? modal.sub?.id
                      : "refund" in modal
                        ? modal.refund?.id
                        : "")
                  }
                >
                  <div className="form-grid">
                    {modal.type === "subscription" && (
                      <>
                        {field("name", "name", modal.sub?.name, "text", true, {
                          maxLength: 128,
                        })}
                        {field(
                          "provider",
                          "provider",
                          modal.sub?.provider || "",
                        )}
                        {field(
                          "amount",
                          "amount",
                          modal.sub ? decimal(modal.sub.amount_minor) : "",
                          "text",
                          true,
                          {
                            inputMode: "decimal",
                            pattern: "[0-9]+([.,][0-9]{1,2})?",
                          },
                        )}
                        {select(
                          "currency",
                          "currency",
                          currencies,
                          modal.sub?.currency ||
                            user?.settings.primary_currency ||
                            "USD",
                          (v) => v,
                        )}
                        <label>
                          {t("interval")}
                          <select
                            name="interval"
                            aria-label={t("interval")}
                            value={cycle}
                            onChange={(e) => setCycle(e.target.value)}
                          >
                            {intervals.map((i) => (
                              <option key={i} value={i}>
                                {intervalLabel(i)}
                              </option>
                            ))}
                          </select>
                        </label>
                        {cycle === "custom_days" &&
                          field(
                            "customDays",
                            "interval_days",
                            modal.sub?.interval_days || 30,
                            "number",
                            true,
                            { min: 1, max: 3650 },
                          )}
                        <label>
                          {t("anchor")}
                          <input
                            name="anchor_date"
                            type="date"
                            required
                            value={anchorDate}
                            min={trial ? trialEnd : undefined}
                            aria-describedby={trial ? "trial-help" : undefined}
                            onChange={(e) => setAnchorDate(e.target.value)}
                          />
                        </label>
                        <label>
                          {t("status")}
                          <select
                            aria-label={t("status")}
                            name="status"
                            value={subStatus}
                            onChange={(e) => {
                              const status = e.target.value;
                              setSubStatus(status);
                              if (status === "trial") {
                                setTrial(true);
                                if (anchorDate < trialEnd)
                                  setAnchorDate(trialEnd);
                              } else if (subStatus === "trial") setTrial(false);
                            }}
                          >
                            {statuses.map((s) => (
                              <option key={s} value={s}>
                                {t(s)}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label className="checkbox">
                          <input
                            type="checkbox"
                            checked={trial}
                            onChange={(e) => {
                              setTrial(e.target.checked);
                              setSubStatus(
                                e.target.checked ? "trial" : "active",
                              );
                              if (e.target.checked && anchorDate < trialEnd)
                                setAnchorDate(trialEnd);
                            }}
                          />
                          {t("trial")}
                        </label>
                        {trial && (
                          <>
                            <label>
                              {t("trialEnd")}
                              <input
                                name="trial_end_date"
                                type="date"
                                required
                                value={trialEnd}
                                onChange={(e) => {
                                  const value = e.target.value;
                                  setTrialEnd(value);
                                  if (value > anchorDate) setAnchorDate(value);
                                }}
                              />
                            </label>
                            <p className="form-help full" id="trial-help">
                              {t("trialHelp")}
                            </p>
                          </>
                        )}
                        <label>
                          {t("cancelBefore")}
                          <input
                            name="cancel_before_date"
                            type="date"
                            value={cancelDate}
                            onChange={(e) => setCancelDate(e.target.value)}
                          />
                        </label>
                        {cancelDate > anchorDate && (
                          <p
                            className="form-help field-warning full"
                            role="status"
                          >
                            {t("cancelWarning")}
                          </p>
                        )}
                        {field(
                          "cancelUrl",
                          "cancellation_url",
                          modal.sub?.cancellation_url || "",
                          "url",
                        )}
                        {field(
                          "paymentLabel",
                          "payment_method_label",
                          modal.sub?.payment_method_label || "",
                        )}
                        <label className="full">
                          {t("notes")}
                          <textarea
                            name="notes"
                            maxLength={4000}
                            defaultValue={modal.sub?.notes || ""}
                          />
                        </label>
                      </>
                    )}
                    {modal.type === "payment" && (
                      <>
                        {field("name", "name", modal.sub?.name, "text", false, {
                          readOnly: true,
                        })}
                        {field(
                          "amount",
                          "amount",
                          decimal(modal.sub?.amount_minor || 0),
                          "text",
                          true,
                          { inputMode: "decimal" },
                        )}
                        {field("charged", "charged_on", today(), "date", true)}
                        <label className="checkbox">
                          <input name="unexpected" type="checkbox" />
                          {t("unexpected")}
                        </label>
                        <label className="full">
                          {t("notes")}
                          <textarea name="notes" maxLength={4000} />
                        </label>
                      </>
                    )}
                    {modal.type === "cancellation" && (
                      <>
                        <p className="full muted">{t("protectNote")}</p>
                        {select(
                          "status",
                          "status",
                          ["planned", "requested", "confirmed", "failed"],
                          cancellations.find(
                            (c) => c.subscription_id === modal.sub?.id,
                          )?.status || "planned",
                        )}
                        {field(
                          "deadline",
                          "planned_for",
                          cancellations.find(
                            (c) => c.subscription_id === modal.sub?.id,
                          )?.planned_for ||
                            modal.sub?.cancel_before_date ||
                            "",
                          "date",
                        )}
                        <label className="full">
                          {t("reference")}
                          <textarea
                            name="reference_note"
                            maxLength={4000}
                            defaultValue={
                              cancellations.find(
                                (c) => c.subscription_id === modal.sub?.id,
                              )?.reference_note || ""
                            }
                          />
                        </label>
                      </>
                    )}
                    {modal.type === "refund" &&
                      (modal.refund ? (
                        <>
                          {select(
                            "status",
                            "status",
                            [
                              "draft",
                              "sent",
                              "awaiting_reply",
                              "escalated",
                              "approved",
                              "rejected",
                              "closed",
                            ],
                            modal.refund.status,
                          )}
                          {field(
                            "followup",
                            "next_follow_up_on",
                            modal.refund.next_follow_up_on || "",
                            "date",
                          )}
                          <label className="full">
                            {t("notes")}
                            <textarea name="note" maxLength={4000} />
                          </label>
                          <div className="full">
                            <h3>{t("history")}</h3>
                            {events.map((e) => (
                              <div className="event" key={e.id}>
                                <span>
                                  {dateLabel(e.happened_on)} · {t(e.kind)}
                                </span>
                                <p>{e.body}</p>
                              </div>
                            ))}
                          </div>
                        </>
                      ) : (
                        <>
                          {field("title", "title", "", "text", true, {
                            maxLength: 160,
                          })}
                          <label>
                            {t("subscriptions")}
                            <select name="subscription_id">
                              <option value="">{t("none")}</option>
                              {subs.map((s) => (
                                <option key={s.id} value={s.id}>
                                  {s.name}
                                </option>
                              ))}
                            </select>
                          </label>
                          {field("amount", "amount", "", "text", true, {
                            inputMode: "decimal",
                          })}
                          {select(
                            "currency",
                            "currency",
                            currencies,
                            user?.settings.primary_currency || "USD",
                            (v) => v,
                          )}
                          {field(
                            "charged",
                            "charged_on",
                            today(),
                            "date",
                            true,
                          )}
                          {field("followup", "next_follow_up_on", "", "date")}
                          <label className="full">
                            {t("reason")}
                            <textarea name="reason" required maxLength={4000} />
                          </label>
                        </>
                      ))}
                  </div>
                  <div className="modal-actions">
                    <button
                      type="button"
                      className="secondary"
                      disabled={busy}
                      onClick={() => setModal(null)}
                    >
                      {t("cancel")}
                    </button>
                    <button className="primary" disabled={busy}>
                      {busy ? "…" : t("save")}
                      <Check size={16} />
                    </button>
                  </div>
                </form>
              )}
            </>
          )}
        </div>
      </dialog>
      {toast && (
        <div className="toast" role="status">
          <CheckCircle2 size={18} />
          {toast}
        </div>
      )}
    </>
  );
}
createRoot(document.getElementById("root")!).render(<App />);

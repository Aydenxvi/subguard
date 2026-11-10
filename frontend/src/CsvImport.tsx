import { useEffect, useRef, useState } from "react";
import { X, Upload, Download, Check } from "lucide-react";
import { dictionaries, Locale } from "./i18n";
type Row = {
  row: number;
  name: string;
  status: "ready" | "duplicate" | "invalid";
  errors: { field: string; code: string }[];
  data: null | { amount_minor: number; currency: string; anchor_date: string };
};
type Preview = {
  headers: string[];
  mapping: Record<string, string>;
  needs_mapping: boolean;
  rows: Row[];
};
const fields = [
  ["name", "csvName"],
  ["amount", "csvAmount"],
  ["currency", "csvCurrency"],
  ["interval", "csvInterval"],
  ["anchor_date", "csvAnchor"],
  ["provider", "csvProvider"],
  ["notes", "csvNotes"],
  ["is_trial", "csvTrial"],
  ["trial_end_date", "csvTrialEnd"],
  ["interval_days", "customDays"],
] as const;
export default function CsvImport({
  locale,
  request,
  onClose,
  onImported,
}: {
  locale: Locale;
  request: <T>(path: string, method: string, body: unknown) => Promise<T>;
  onClose: () => void;
  onImported: () => Promise<void>;
}) {
  const t = (key: keyof typeof dictionaries.en) => dictionaries[locale][key];
  const ref = useRef<HTMLDialogElement>(null);
  const [content, setContent] = useState(""),
    [headers, setHeaders] = useState<string[]>([]),
    [mapping, setMapping] = useState<Record<string, string>>({}),
    [preview, setPreview] = useState<Preview | null>(null),
    [selected, setSelected] = useState<number[]>([]),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [result, setResult] = useState<{
      imported: number;
      skipped: number;
    } | null>(null);
  useEffect(() => {
    ref.current?.showModal();
  }, []);
  async function load(file?: File) {
    if (!file) return;
    setError("");
    setPreview(null);
    setResult(null);
    setHeaders([]);
    setContent("");
    setBusy(true);
    try {
      if (file.size > 65536) throw new Error();
      const text = new TextDecoder("utf-8", { fatal: true }).decode(
        await file.arrayBuffer(),
      );
      const p = await request<Preview>(
        "/import/subscriptions/preview",
        "POST",
        { content: text },
      );
      setContent(text);
      setHeaders(p.headers);
      setMapping(p.mapping);
    } catch {
      setError(t("csvFileError"));
    } finally {
      setBusy(false);
    }
  }
  async function inspect() {
    setBusy(true);
    setError("");
    try {
      const p = await request<Preview>(
        "/import/subscriptions/preview",
        "POST",
        { content, mapping },
      );
      if (p.needs_mapping) {
        setError(t("csvRequired"));
        return;
      }
      setPreview(p);
      setSelected(p.rows.filter((r) => r.status === "ready").map((r) => r.row));
    } catch {
      setError(t("csvError"));
    } finally {
      setBusy(false);
    }
  }
  async function commit() {
    setBusy(true);
    setError("");
    try {
      const r = await request<{ imported: number; skipped: number }>(
        "/import/subscriptions",
        "POST",
        { content, mapping, selected_rows: selected },
      );
      setResult(r);
      setPreview(null);
      setContent("");
      await onImported();
    } catch {
      setError(t("csvError"));
    } finally {
      setBusy(false);
    }
  }
  function template() {
    const data =
      "name,amount,currency,interval,anchor_date,is_trial,trial_end_date,provider,notes\nExample subscription,9.99,USD,monthly,2026-12-01,false,,Example,Replace with your real details\n";
    const url = URL.createObjectURL(
      new Blob([data], { type: "text/csv;charset=utf-8" }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = "subguard-subscriptions-template.csv";
    a.click();
    URL.revokeObjectURL(url);
  }
  return (
    <dialog
      className="csv-dialog"
      ref={ref}
      onCancel={(e) => {
        if (busy) e.preventDefault();
        else onClose();
      }}
    >
      <div className="modal-content">
        <button
          className="close icon-button"
          aria-label={t("close")}
          disabled={busy}
          onClick={onClose}
        >
          <X />
        </button>
        <h2>{t("importCsv")}</h2>
        <p className="muted">{t("csvIntro")}</p>
        <button className="text-link" onClick={template}>
          <Download size={16} />
          {t("template")}
        </button>
        <label className="csv-file">
          {t("chooseFile")}
          <input
            type="file"
            accept=".csv,text/csv"
            disabled={busy}
            onChange={(e) => void load(e.target.files?.[0])}
          />
        </label>
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        {result ? (
          <div className="info-banner" role="status">
            <Check />
            {t("csvImported")}: {result.imported}. {t("csvSkipped")}:{" "}
            {result.skipped}.
          </div>
        ) : (
          <>
            {headers.length > 0 && (
              <>
                <div className="form-grid">
                  {fields.map(([key, label], i) => (
                    <label key={key}>
                      {t(label)}
                      {i < 5 ? " *" : ""}
                      <select
                        aria-label={t(label)}
                        value={mapping[key] || ""}
                        disabled={busy}
                        onChange={(e) => {
                          const m = { ...mapping };
                          if (e.target.value) m[key] = e.target.value;
                          else delete m[key];
                          setMapping(m);
                          setPreview(null);
                        }}
                      >
                        <option value="">{t("none")}</option>
                        {headers.map((h) => (
                          <option key={h} value={h}>
                            {h}
                          </option>
                        ))}
                      </select>
                    </label>
                  ))}
                </div>
                <p className="form-help">
                  weekly · monthly · quarterly · semiannual · annual ·
                  custom_days
                </p>
                <button className="secondary" disabled={busy} onClick={inspect}>
                  {t("preview")}
                </button>
              </>
            )}
            {preview && (
              <>
                <div className="csv-table-wrap">
                  <table className="csv-table">
                    <thead>
                      <tr>
                        <th>{t("csvSelect")}</th>
                        <th>{t("rowNumber")}</th>
                        <th>{t("name")}</th>
                        <th>{t("amount")}</th>
                        <th>{t("status")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {preview.rows.map((r) => (
                        <tr key={r.row}>
                          <td>
                            <input
                              aria-label={`${t("rowNumber")} ${r.row}`}
                              type="checkbox"
                              disabled={busy || r.status !== "ready"}
                              checked={selected.includes(r.row)}
                              onChange={(e) =>
                                setSelected((s) =>
                                  e.target.checked
                                    ? [...s, r.row]
                                    : s.filter((i) => i !== r.row),
                                )
                              }
                            />
                          </td>
                          <td>{r.row}</td>
                          <td>{r.name || "—"}</td>
                          <td>
                            {r.data
                              ? new Intl.NumberFormat(locale, {
                                  style: "currency",
                                  currency: r.data.currency,
                                }).format(r.data.amount_minor / 100)
                              : "—"}
                          </td>
                          <td>
                            <span
                              className={
                                "badge " +
                                (r.status === "invalid" ? "failed" : "")
                              }
                            >
                              {t(
                                r.status === "ready"
                                  ? "csvReady"
                                  : r.status === "duplicate"
                                    ? "csvDuplicate"
                                    : "csvInvalid",
                              )}
                            </span>
                            {r.errors.map((e, i) => (
                              <small key={i}>
                                {fields.find((f) => f[0] === e.field)
                                  ? t(fields.find((f) => f[0] === e.field)![1])
                                  : t("validationError")}
                              </small>
                            ))}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <button
                  className="primary"
                  disabled={busy || !selected.length}
                  onClick={commit}
                >
                  <Upload size={16} />
                  {t("importSelected")} ({selected.length})
                </button>
              </>
            )}
          </>
        )}
      </div>
    </dialog>
  );
}

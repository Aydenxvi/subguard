import { useEffect, useRef, useState } from "react";
import { ArrowUpRight, ShieldCheck, X } from "lucide-react";
import { Locale } from "./i18n";

type Command = "/start" | "/app" | "/help" | "/stop" | "/reminders";
type ChatMessage = { id: number; side: "visitor" | "bot"; text: string; openApp?: boolean };
const content: Record<Locale, {
  label: string; subtitle: string; simulated: string; open: string; close: string;
  status: string;
  start: string; help: string; stopped: string; resumed: string;
}> = {
  en: {
    label: "Telegram bot preview", subtitle: "Try the command flow", simulated: "Interactive simulation · no message is sent to Telegram", status: "bot · preview",
    open: "Open Mini App preview", close: "Close bot preview",
    start: "Your subscriptions. Your decision.\n\nTrack renewals, trials, cancellations and refund requests. SubGuard does not cancel services or guarantee refunds.",
    help: "Track renewals, trials, cancellations and refund requests. SubGuard does not cancel services or guarantee refunds.",
    stopped: "Reminders paused.", resumed: "Reminders enabled. Open the app once to create your account.",
  },
  ru: {
    label: "Пример Telegram-бота", subtitle: "Попробуйте команды", simulated: "Интерактивный сценарий · сообщения в Telegram не отправляются", status: "бот · пример",
    open: "Открыть Mini App", close: "Закрыть пример бота",
    start: "Ваши подписки. Ваше решение.\n\nСледите за продлениями, пробными периодами, отменами и возвратами. SubGuard не отменяет услуги и не гарантирует возврат.",
    help: "Следите за продлениями, пробными периодами, отменами и возвратами. SubGuard не отменяет услуги и не гарантирует возврат.",
    stopped: "Напоминания отключены.", resumed: "Напоминания включены. Откройте приложение для создания аккаунта.",
  },
  tr: {
    label: "Telegram bot önizlemesi", subtitle: "Komutları deneyin", simulated: "Etkileşimli gösterim · Telegram'a mesaj gönderilmez", status: "bot · önizleme",
    open: "Mini App önizlemesini aç", close: "Bot önizlemesini kapat",
    start: "Abonelikleriniz. Karar sizin.\n\nYenilemeleri, denemeleri, iptalleri ve iade taleplerini takip edin. SubGuard hizmetleri iptal etmez veya iadeyi garanti etmez.",
    help: "Yenilemeleri, denemeleri, iptalleri ve iade taleplerini takip edin. SubGuard hizmetleri iptal etmez veya iadeyi garanti etmez.",
    stopped: "Hatırlatmalar durduruldu.", resumed: "Hatırlatmalar açıldı. Hesap oluşturmak için uygulamayı açın.",
  },
};

export default function BotPreview({ locale, onClose, onOpenApp }: {
  locale: Locale;
  onClose: () => void;
  onOpenApp: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const chat = useRef<HTMLDivElement>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([
    { id: 1, side: "visitor", text: "/start" },
    { id: 2, side: "bot", text: content[locale].start, openApp: true },
  ]);
  const copy = content[locale];
  useEffect(() => {
    ref.current?.showModal();
    return () => ref.current?.close();
  }, []);
  useEffect(() => { chat.current?.scrollTo({ top: chat.current.scrollHeight, behavior: "smooth" }); }, [messages]);
  function send(command: Command) {
    const answer = command === "/stop" ? copy.stopped : command === "/reminders" ? copy.resumed : command === "/help" ? copy.help : copy.start;
    setMessages((items) => [
      ...items,
      { id: items.length + 1, side: "visitor", text: command },
      { id: items.length + 2, side: "bot", text: answer, openApp: command === "/start" || command === "/app" || command === "/help" },
    ]);
  }
  return (
    <dialog className="bot-preview-dialog" ref={ref} aria-label={copy.label} onCancel={onClose} onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <div className="bot-preview-layout">
        <div className="bot-preview-intro">
          <span className="eyebrow">SubGuard / Telegram</span>
          <h2>{copy.label}</h2>
          <p>{copy.subtitle}</p>
          <div className="bot-simulation-note" role="note">{copy.simulated}</div>
          <button className="secondary" onClick={onOpenApp}>{copy.open}<ArrowUpRight size={16} /></button>
        </div>
        <div className="bot-phone">
          <div className="bot-phone-header"><span className="bot-avatar"><ShieldCheck size={20} /></span><div><strong>SubGuard</strong><small>{copy.status}</small></div><button className="icon-button" aria-label={copy.close} onClick={onClose}><X size={20} /></button></div>
          <div className="bot-chat" ref={chat} aria-live="polite">
            {messages.map((message) => <div className={`bot-bubble ${message.side}`} key={message.id}>
              <span>{message.text}</span>
              {message.openApp && <button onClick={onOpenApp}>{copy.open}<ArrowUpRight size={15} /></button>}
            </div>)}
          </div>
          <div className="bot-commands" aria-label={copy.subtitle}>
            {(["/start", "/app", "/help", "/stop", "/reminders"] as Command[]).map((command) => <button key={command} onClick={() => send(command)}>{command}</button>)}
          </div>
        </div>
      </div>
    </dialog>
  );
}

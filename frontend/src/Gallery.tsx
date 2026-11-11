const screens = [
  ["landing", "galleryLanding"],
  ["overview", "overview"],
  ["subscriptions", "subscriptions"],
  ["protection", "protection"],
  ["refunds", "refunds"],
  ["insights", "analytics"],
  ["settings", "settings"],
] as const;

export default function Gallery({ t }: { t: (key: string) => string }) {
  return (
    <section className="showcase-gallery" id="gallery" aria-label={t("galleryTitle")}>
      <div className="showcase-gallery-heading">
        <span className="eyebrow">SUBGUARD / GALLERY</span>
        <h2>{t("galleryTitle")}</h2>
        <p>{t("galleryIntro")}</p>
      </div>
      {(["desktop-en", "mobile-ru"] as const).map((format) => (
        <div className="showcase-gallery-group" key={format}>
          <h3>{t(format === "desktop-en" ? "galleryDesktop" : "galleryMobile")}</h3>
          <div className="showcase-gallery-grid">
            {screens.map(([file, label]) => {
              const path = `${import.meta.env.BASE_URL}gallery/${format}-${file}.${format === "desktop-en" ? "png" : "jpeg"}`;
              return (
                <a href={path} target="_blank" rel="noopener noreferrer" className="showcase-gallery-card" key={path} aria-label={`${t(label)} — ${t("galleryOpen")}`}>
                  <img src={path} alt={`${t(label)} — SubGuard`} loading="lazy" />
                  <span>{t(label)} <span aria-hidden="true">↗</span></span>
                </a>
              );
            })}
          </div>
        </div>
      ))}
    </section>
  );
}

type PublicFeaturePageProps = {
  title: string;
  description: string;
  imageLabel: string;
  features: string[];
  headerLabel?: string;
  footerLabel?: string;
  mediaLabel?: string;
  accent?: string;
};

export function PublicFeaturePage({
  title,
  description,
  imageLabel,
  features,
  headerLabel = "Header",
  footerLabel = "Footer",
  mediaLabel = "Video Preview",
  accent = "#3b5998",
}: PublicFeaturePageProps) {
  return (
    <div className="flex min-h-dvh flex-col overflow-x-hidden bg-[radial-gradient(circle_at_top,_rgba(59,89,152,0.12),_transparent_35%),linear-gradient(180deg,_#f8fbff_0%,_#eef3fb_100%)] text-slate-900">
      <header
        className="border-b border-white/15 px-4 py-3 text-center text-2xl font-semibold text-white shadow-[0_10px_30px_-18px_rgba(59,89,152,0.8)] sm:text-[1.75rem]"
        style={{ backgroundColor: accent }}
      >
        {headerLabel}
      </header>

      <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
          <div className="rounded-[28px] border border-slate-200/80 bg-white/95 px-4 py-6 shadow-[0_24px_80px_-36px_rgba(15,23,42,0.42)] backdrop-blur-sm sm:px-6 lg:px-8 lg:py-8">
            <div className="flex flex-wrap items-center justify-center gap-3 text-center">
              <span
                className="rounded-full px-4 py-1 text-xs font-bold uppercase tracking-[0.22em] text-white shadow-sm"
                style={{ backgroundColor: accent }}
              >
                Nobstacle
              </span>
              <span className="rounded-full border border-slate-200 bg-slate-50 px-4 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
                Public Page
              </span>
            </div>

            <h1 className="mt-5 text-center text-3xl font-extrabold uppercase tracking-[0.12em] text-slate-950 sm:text-4xl">
              {title}
            </h1>

            <div className="mt-7 grid gap-6 lg:grid-cols-[200px_minmax(0,1fr)] lg:items-start">
              <div
                className="flex aspect-square w-full max-w-[190px] items-center justify-center rounded-2xl border border-white/30 px-4 text-center text-xl font-semibold leading-snug text-white shadow-[0_20px_40px_-22px_rgba(15,23,42,0.75)] sm:max-w-[200px] lg:max-w-[210px]"
                style={{
                  background: `linear-gradient(145deg, ${accent} 0%, #2f477a 100%)`,
                }}
              >
                <span className="whitespace-pre-line">{imageLabel}</span>
              </div>

              <div className="flex flex-col gap-5 pt-0 lg:pt-1">
                <p className="max-w-3xl text-base leading-7 text-slate-600 sm:text-lg">
                  {description}
                </p>

                <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4 shadow-[0_14px_30px_-28px_rgba(15,23,42,0.45)]">
                  <h2 className="text-lg font-bold uppercase tracking-[0.14em] text-slate-900 sm:text-xl">
                    Features
                  </h2>
                  <ul className="mt-4 space-y-3 text-base leading-7 text-slate-700">
                    {features.map((feature) => (
                      <li
                        key={feature}
                        className="flex items-start gap-3 rounded-xl bg-white px-3 py-2 shadow-[0_8px_20px_-16px_rgba(15,23,42,0.35)]"
                      >
                        <span
                          className="mt-2 h-2.5 w-2.5 shrink-0 rounded-full shadow-sm"
                          style={{
                            background: `linear-gradient(145deg, ${accent} 0%, #6b83b7 100%)`,
                          }}
                        />
                        <span className="text-[0.98rem] text-slate-700">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>

            <div className="mt-8 overflow-hidden rounded-[26px] border border-slate-200 bg-white shadow-[0_22px_55px_-28px_rgba(15,23,42,0.42)]">
              <div
                className="relative aspect-[16/7] min-h-[240px] w-full overflow-hidden sm:min-h-[300px] lg:min-h-[360px]"
                style={{
                  background:
                    "linear-gradient(180deg, rgba(59,89,152,0.06) 0%, rgba(59,89,152,0.02) 100%)",
                }}
              >
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(59,89,152,0.12),_transparent_42%)]" />
                <div className="absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 items-center gap-4">
                  <div
                    className="flex h-16 w-16 items-center justify-center rounded-full border border-white/40 bg-white/90 shadow-[0_16px_30px_-18px_rgba(15,23,42,0.55)] sm:h-20 sm:w-20"
                    aria-hidden="true"
                  >
                    <div
                      className="h-0 w-0 border-y-[18px] border-y-transparent border-l-[28px] sm:border-y-[22px] sm:border-l-[34px]"
                      style={{ borderLeftColor: accent }}
                    />
                  </div>
                </div>
                <div className="absolute bottom-4 right-4 rounded-full border border-white/50 bg-white/90 px-3 py-1 text-xs font-bold uppercase tracking-[0.2em] text-slate-500 shadow-sm">
                  {mediaLabel}
                </div>
                <div
                  className="absolute left-4 top-4 rounded-full px-3 py-1 text-xs font-semibold text-white shadow-sm"
                  style={{ backgroundColor: accent }}
                >
                  Preview Area
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <footer
        className="border-t border-white/15 px-4 py-3 text-center text-2xl font-semibold text-white shadow-[0_-10px_30px_-20px_rgba(59,89,152,0.75)] sm:text-[1.75rem]"
        style={{ backgroundColor: accent }}
      >
        {footerLabel}
      </footer>
    </div>
  );
}

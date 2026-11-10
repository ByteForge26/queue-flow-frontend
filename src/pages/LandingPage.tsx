import { Link } from "react-router-dom";

import LanguageToggle from "../components/LanguageToggle";
import { useT } from "../i18n/LanguageContext";

export default function LandingPage() {
  const t = useT();
  const steps = [
    { number: "01", title: t("landing.step1Title"), description: t("landing.step1Desc") },
    { number: "02", title: t("landing.step2Title"), description: t("landing.step2Desc") },
    { number: "03", title: t("landing.step3Title"), description: t("landing.step3Desc") },
  ];

  return (
    <main className="min-h-screen px-4 pb-14 sm:px-6">
      <header className="mx-auto flex max-w-6xl items-center justify-between border-b border-slate-200 py-4">
        <Link to="/" className="flex items-center gap-3" aria-label="Meri Turn home">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900 text-sm font-bold tracking-tight text-white">
            MT
          </span>
          <span className="text-lg font-semibold tracking-tight text-slate-900">Meri Turn</span>
        </Link>
        <div className="flex items-center gap-2 sm:gap-4">
          <Link to="/shop" className="hidden min-h-11 items-center rounded-lg px-3 text-sm font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-900 sm:inline-flex">
            {t("landing.shop")}
          </Link>
          <LanguageToggle />
        </div>
      </header>

      <section className="mx-auto grid max-w-6xl items-center gap-10 py-12 sm:py-16 lg:grid-cols-[1.15fr_0.85fr] lg:gap-16 lg:py-20">
        <div>
          <p className="text-sm font-semibold tracking-wide text-brand">{t("landing.eyebrow")}</p>
          <h1 className="mt-4 max-w-2xl text-4xl font-semibold leading-tight tracking-tight text-slate-950 sm:text-5xl lg:text-[3.5rem]">
            {t("landing.headline")}
          </h1>
          <p className="mt-5 max-w-xl text-lg leading-8 text-slate-600">{t("landing.intro")}</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              to="/customer"
              className="inline-flex min-h-12 items-center justify-center rounded-xl bg-brand px-6 text-base font-semibold text-white shadow-sm transition hover:bg-brand-dark focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-indigo-200"
            >
              {t("landing.customerCta")}
              <span className="ml-2" aria-hidden="true">→</span>
            </Link>
            <Link
              to="/shop"
              className="inline-flex min-h-12 items-center justify-center rounded-xl border border-slate-300 bg-white px-6 text-base font-semibold text-slate-800 transition hover:border-slate-400 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-slate-200"
            >
              {t("landing.shopCta")}
            </Link>
          </div>
          <p className="mt-5 max-w-xl text-sm leading-6 text-slate-500">{t("landing.qrNote")}</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_12px_36px_rgba(15,23,42,0.06)] sm:p-7">
          <div className="border-b border-slate-100 pb-4">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">{t("landing.workflowLabel")}</p>
            <h2 className="mt-2 text-xl font-semibold tracking-tight text-slate-900">{t("landing.workflowTitle")}</h2>
          </div>
          <ol className="mt-2">
            {steps.map((step, index) => (
              <li key={step.number} className="flex gap-4 py-4">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-xs font-bold text-brand">
                  {step.number}
                </span>
                <div className={index < steps.length - 1 ? "border-b border-slate-100 pb-4" : ""}>
                  <h3 className="font-semibold text-slate-900">{step.title}</h3>
                  <p className="mt-1 text-sm leading-6 text-slate-600">{step.description}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-4 border-t border-slate-200 pt-8 sm:grid-cols-2 sm:gap-6">
        <Link to="/customer" className="group rounded-xl border border-slate-200 bg-white p-5 transition hover:border-indigo-200 hover:shadow-sm sm:p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">{t("landing.customer")}</p>
          <div className="mt-2 flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-slate-900">{t("landing.customerDesc")}</h2>
            <span className="text-xl text-brand transition-transform group-hover:translate-x-1" aria-hidden="true">→</span>
          </div>
        </Link>
        <Link to="/shop" className="group rounded-xl border border-slate-200 bg-white p-5 transition hover:border-indigo-200 hover:shadow-sm sm:p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">{t("landing.shop")}</p>
          <div className="mt-2 flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-slate-900">{t("landing.shopDesc")}</h2>
            <span className="text-xl text-brand transition-transform group-hover:translate-x-1" aria-hidden="true">→</span>
          </div>
        </Link>
      </section>
    </main>
  );
}

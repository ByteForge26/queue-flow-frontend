import { Link } from "react-router-dom";

import { Card } from "../components/ui";
import LanguageToggle from "../components/LanguageToggle";
import { useT } from "../i18n/LanguageContext";

export default function LandingPage() {
  const t = useT();

  const highlights = [
    { label: "Live queue", value: "24/7" },
    { label: "Avg. wait", value: "8 min" },
    { label: "Satisfaction", value: "96%" },
  ];

  const roleCards = [
    {
      to: "/customer",
      title: t("landing.customer"),
      description: t("landing.customerDesc"),
      icon: "👤",
      accent: "from-amber-500 to-orange-500",
    },
    {
      to: "/shop",
      title: t("landing.shop"),
      description: t("landing.shopDesc"),
      icon: "🏪",
      accent: "from-brand to-indigo-600",
    },
  ];

  return (
    <div className="min-h-screen px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <header className="mb-8 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-brand to-indigo-600 text-lg font-bold text-white shadow-lg shadow-indigo-500/30">
              QF
            </div>
            <div>
              <div className="text-xs uppercase tracking-[0.25em] text-slate-500">QueueFlow</div>
              <div className="font-semibold text-slate-800">{t("app.name")}</div>
            </div>
          </div>
          <LanguageToggle />
        </header>

        <section className="premium-shell overflow-hidden p-6 sm:p-8 lg:p-12">
          <div className="grid items-center gap-8 lg:grid-cols-[1.3fr_0.7fr]">
            <div>
              <span className="inline-flex items-center rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-brand">
                Smart queue management
              </span>
              <h1 className="mt-5 max-w-xl text-4xl font-black tracking-tight text-slate-900 sm:text-5xl">
                Keep your customers happy while your team stays in control.
              </h1>
              <p className="mt-4 max-w-xl text-base leading-7 text-slate-600">
                {t("landing.tagline")}
              </p>

              <div className="mt-7 flex flex-wrap gap-3">
                <Link
                  to="/customer"
                  className="inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-brand to-indigo-600 px-5 py-3 font-semibold text-white shadow-lg shadow-indigo-500/25 transition hover:-translate-y-0.5"
                >
                  Join queue
                </Link>
                <Link
                  to="/shop"
                  className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-5 py-3 font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
                >
                  Open dashboard
                </Link>
              </div>

              <div className="mt-8 grid gap-3 sm:grid-cols-3">
                {highlights.map((item) => (
                  <div key={item.label} className="metric-card">
                    <div className="text-2xl font-bold text-slate-900">{item.value}</div>
                    <div className="mt-1 text-xs uppercase tracking-[0.15em] text-slate-500">{item.label}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-[30px] bg-gradient-to-br from-brand via-indigo-600 to-violet-600 p-5 text-white shadow-[0_25px_70px_rgba(79,70,229,0.35)]">
              <div className="rounded-[24px] border border-white/20 bg-white/10 p-4 backdrop-blur-sm">
                <div className="flex items-center justify-between text-xs uppercase tracking-[0.18em] text-indigo-100">
                  <span>Live queue</span>
                  <span>Today</span>
                </div>

                <div className="mt-5 space-y-3">
                  {[
                    { name: "Aisha", status: "In progress", time: "2 min" },
                    { name: "Rahul", status: "Ready", time: "Now" },
                    { name: "Meera", status: "Waiting", time: "7 min" },
                  ].map((ticket) => (
                    <div key={ticket.name} className="flex items-center justify-between rounded-2xl border border-white/15 bg-slate-950/10 px-3 py-2.5">
                      <div>
                        <div className="font-semibold">{ticket.name}</div>
                        <div className="text-xs text-indigo-100">{ticket.status}</div>
                      </div>
                      <div className="rounded-full bg-white/10 px-2 py-1 text-xs font-medium text-white">
                        {ticket.time}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-8 grid gap-5 md:grid-cols-3">
          {[
            { title: "Faster service", text: "Cut queue wait times with live queue updates and streamlined check-ins." },
            { title: "Better visibility", text: "Staff and customers both know who is next without confusion or delays." },
            { title: "Built for scale", text: "Operate single shops or multiple branches from one simple workflow." },
          ].map((feature) => (
            <Card key={feature.title} className="h-full">
              <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-xl text-brand">
                ✦
              </div>
              <h3 className="text-lg font-semibold text-slate-900">{feature.title}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">{feature.text}</p>
            </Card>
          ))}
        </section>

        <section className="mt-8 grid gap-5 md:grid-cols-2">
          {roleCards.map((card) => (
            <Link key={card.title} to={card.to} className="group block h-full">
              <Card className="h-full overflow-hidden p-0">
                <div className={`bg-gradient-to-r ${card.accent} p-5 text-white`}>
                  <div className="flex items-center justify-between">
                    <span className="text-4xl">{card.icon}</span>
                    <span className="rounded-full bg-white/15 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-white/90">
                      Access
                    </span>
                  </div>
                </div>
                <div className="p-5">
                  <div className="text-2xl font-bold text-slate-900">{card.title}</div>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{card.description}</p>
                  <div className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-brand group-hover:gap-3 transition-all">
                    Enter portal
                    <span aria-hidden="true">→</span>
                  </div>
                </div>
              </Card>
            </Link>
          ))}
        </section>

        <p className="mt-8 text-center text-xs text-slate-500">{t("landing.qrNote")}</p>
      </div>
    </div>
  );
}
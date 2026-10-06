// =====================================================================
// StaffPage.tsx
// =====================================================================
import React, { useState, useEffect, useCallback } from "react";
import type { ChangeEvent, ReactElement as Element } from "react";
import { useParams, useNavigate } from "react-router-dom";
import type { NavigateFunction } from "react-router-dom";
import { getAuth, clearAuth } from "../lib/auth";
import { useT } from "../i18n/LanguageContext";
import {
  getQueue,
  getFutureQueue,
  getStats,
  getStaffHistory,
  getFormConfig,
  getShop,
  updateStatus,
  markPaymentPending,
} from "../lib/api";
import { useStomp } from "../hooks/useStomp";
import { Button, Card, Spinner, StatusBadge } from "../components/ui";
import LanguageToggle from "../components/LanguageToggle";
import type {
  TicketDto,
  TicketItemDto,
  TicketStatus,
  DashboardStatsDto,
  HistoryDto,
  SectionDto,
  ShopDto,
  FormConfigDto,
  AuthDto,
  FieldValueDto,
} from "../lib/types";

// Har status ke liye staff-facing action label key
// Ye map batata hai: "agla status kya hoga" -> "button par kya likhna hai (translation key)"
// Partial<Record<...>> isliye ki sirf kuch statuses ke liye hi button label define hai
const ACTION_KEY: Partial<Record<TicketStatus, string>> = {
  ACCEPTED: "staff.actionAccepted",
  IN_PROGRESS: "staff.actionInProgress",
  READY: "staff.actionReady",
  COMPLETED: "staff.actionCompleted",
};

export default function StaffPage(): Element {
  // URL se sectionCode nikaalte hain — e.g. /staff/COUNTER_1 => sectionCode = "COUNTER_1"
  // Default empty string isliye ki TypeScript ko undefined na mile
  const { sectionCode = "" } = useParams();

  // navigate — programmatically kisi dusre route par jaane ke liye (logout, admin dashboard)
  const navigate: NavigateFunction = useNavigate();

  // auth — localStorage/cookie se current logged-in user ka info (role, shopCode, sections, etc.)
  const auth: AuthDto | null = getAuth();

  // t — translation function, keys ko current language ki strings mein convert karta hai
  const t: (key: string, vars?: Record<string, string | number>) => string = useT();

  // ---------------------------------------------------------------------
  // STATE DECLARATIONS
  // ---------------------------------------------------------------------

  // queue — aaj ke active orders ki list (ACCEPTED / IN_PROGRESS / READY)
  // Ye tab="today" mein render hote hain
  const [queue, setQueue] = useState<TicketDto[]>([]);

  // futureQueue — future/scheduled orders ki list (aaj ke baad ke)
  // Ye tab="future" mein render hote hain
  const [futureQueue, setFutureQueue] = useState<TicketDto[]>([]);

  // stats — live counts: waiting, inProgress, ready, totalToday
  // Top stats bar mein dikhate hain
  const [stats, setStats] = useState<DashboardStatsDto | null>(null);

  // statusFlow — is section ke liye allowed status transitions ka order
  // E.g. ["ACCEPTED", "IN_PROGRESS", "READY", "COMPLETED"]
  // Ye server se aata hai aur advance() function isi ke basis par kaam karta hai
  const [statusFlow, setStatusFlow] = useState<TicketStatus[]>([]);

  // history — completed/cancelled orders ka record (today count, month count, orders list)
  const [history, setHistory] = useState<HistoryDto | null>(null);

  // tab — "today" ya "future" — konsa tab active hai uska state
  const [tab, setTab] = useState<"today" | "future">("today");

  // showHistory — history section expand/collapse karne ke liye toggle flag
  const [showHistory, setShowHistory] = useState(false);

  // loading — initial data fetch ho raha hai tab true rehta hai, Spinner dikhata hai
  const [loading, setLoading] = useState(true);

  // error — agar koi API call fail ho jaaye to error message string store karta hai
  // null hone par error banner nahi dikhta
  const [error, setError] = useState<string | null>(null);

  // paymentTicket — woh order jis par payment modal khula hai
  // null hone par modal band rehta hai
  const [paymentTicket, setPaymentTicket] = useState<TicketDto | null>(null);

  // payAmount — payment modal mein staff jo amount type karta hai
  const [payAmount, setPayAmount] = useState("");

  // payComment — payment modal mein staff jo note/comment type karta hai (optional)
  const [payComment, setPayComment] = useState("");

  // payPendingReason — payment pending mark karne ka reason (agar payment nahi mila)
  const [payPendingReason, setPayPendingReason] = useState("");

  // startTicket — woh order jis par "Start" confirm modal khula hai
  // IN_PROGRESS karne se pehle ek confirmation gate: "customer se baat ho gayi?"
  // null hone par ye modal nahi dikhta
  const [startTicket, setStartTicket] = useState<TicketDto | null>(null);

  // Admin ke liye shop ke saare active sections (switcher dropdown). Staff ke liye apne assigned.
  // Ye API se fresh laate hain kyunki login-time snapshot stale ho sakta hai
  const [shopSections, setShopSections] = useState<SectionDto[]>([]);

  // ---------------------------------------------------------------------
  // HELPER FUNCTION: nextStep
  // ---------------------------------------------------------------------

  // Section ka actual status flow se agla status nikalo (har section alag ho sakta hai)
  // Current status ka index dhundho statusFlow array mein, fir us se ek aage ka status return karo
  // Agar current status last hai ya nahi mila => null return (matlab koi aur action nahi)
  function nextStep(current: TicketStatus): { status: TicketStatus; label: string } | null {
    const idx: number = statusFlow.indexOf(current);
    if (idx < 0 || idx >= statusFlow.length - 1) return null;
    const next: TicketStatus = statusFlow[idx + 1];
    // ACTION_KEY mein agar is status ka label to use karo, warna generic label use karo
    const label: string = ACTION_KEY[next] ? t(ACTION_KEY[next]!) : t("staff.actionGeneric", { status: next });
    return { status: next, label };
  }

  // ---------------------------------------------------------------------
  // FUNCTION: refresh (useCallback)
  // ---------------------------------------------------------------------

  // refresh — sectionCode pe depend karta hai, sare 4 APIs parallel mein call karta hai
  // useCallback isliye wrap kiya hai taaki ye function reference stable rahe
  // aur useEffect ke dependency array mein stale closure na bane
  const refresh: () => void = useCallback((): void => {
    Promise.all([
      getQueue(sectionCode), // aaj ke active orders fetch karo
      getFutureQueue(sectionCode), // future/scheduled orders fetch karo
      getStats(sectionCode), // live stats fetch karo
      getStaffHistory(sectionCode), // history fetch karo
    ])
      .then(([q, fq, s, h]: [TicketDto[], TicketDto[], DashboardStatsDto, HistoryDto]): void => {
        setQueue(q);
        setFutureQueue(fq);
        setStats(s);
        setHistory(h);
      })
      // Loading spinner band karo, chahe success ho ya failure
      .finally((): void => setLoading(false));
  }, [sectionCode]);

  // ---------------------------------------------------------------------
  // EFFECT 1: Initial data load — sectionCode ya refresh change hone par
  // ---------------------------------------------------------------------

  // Jab page pehli baar load ho ya sectionCode badal jaaye (dropdown switch):
  //   1. Section ka statusFlow fetch karo (getFormConfig) — advance logic ke liye zaroori
  //   2. refresh() call karo — queue, future queue, stats, history sab laao
  useEffect((): void => {
    getFormConfig(sectionCode).then((cfg: FormConfigDto): void => setStatusFlow(cfg.statusFlow as TicketStatus[]));
    refresh();
  }, [sectionCode, refresh]);

  // ---------------------------------------------------------------------
  // EFFECT 2: Admin ke liye shop ki sections load karo
  // ---------------------------------------------------------------------

  // Admin: shop ke saare active sections fresh laao (login-time snapshot stale ho sakta hai)
  // Ye sirf tab chalta hai jab logged-in user ADMIN ho aur uska shopCode available ho
  // Staff ke liye nahi chalta — staff ko sirf apne assigned sections milte hain (auth.sections)
  useEffect((): void => {
    if (auth?.role === "ADMIN" && auth.shopCode) {
      getShop(auth.shopCode).then((shop: ShopDto): void => setShopSections(shop.sections)).catch((): undefined => undefined);
    }
  }, [auth?.role, auth?.shopCode]);

  // ---------------------------------------------------------------------
  // WEBSOCKET SUBSCRIPTION
  // ---------------------------------------------------------------------

  // Naya order ya status change hone pe queue auto-refresh
  // useStomp hook specified topic par subscribe karta hai
  // Jab bhi is topic par message bheje (naya order / status update), refresh() call hoga
  // Is tarah staff ko page reload karna nahi padta — real-time updates milte hain
  useStomp(`/topic/business/${sectionCode}/queue`, (): void => refresh());

  // ---------------------------------------------------------------------
  // FUNCTION: advance — order ko agale status par le jaao
  // ---------------------------------------------------------------------

  // advance — ek ticket leti hai aur uske status ke basis par decide karti hai:
  //   - Agar agla status IN_PROGRESS hai => start confirm modal kholo (setStartTicket)
  //   - Agar agla status COMPLETED hai => payment modal kholo (setPaymentTicket)
  //   - Baaki cases mein seedha API call kar ke status update karo
  async function advance(ticket: TicketDto): Promise<void> {
    const next: { status: TicketStatus; label: string } | null = nextStep(ticket.status);
    if (!next) return; // Koi agla step nahi — button nahi dikhna chahiye tha, safety check

    // Start (IN_PROGRESS) se pehle "customer se baat ho gayi?" confirm
    if (next.status === "IN_PROGRESS") {
      setStartTicket(ticket);
      return;
    }

    // Complete karne se pehle payment confirm — modal kholo
    // Payment amount pre-fill karo ticket ke totalAmount se (staff edit kar sakta hai)
    if (next.status === "COMPLETED") {
      setPayAmount(String(ticket.totalAmount || ""));
      setPayComment("");
      setPayPendingReason("");
      setPaymentTicket(ticket);
      return;
    }

    // Seedha status update (e.g. ACCEPTED -> kuch aur jo IN_PROGRESS ya COMPLETED nahi)
    setError(null);
    try {
      await updateStatus(sectionCode, ticket.id, next.status);
      refresh();
    } catch {
      setError(t("staff.actionFailed", { id: ticket.id, label: next.label }));
    }
  }

  // ---------------------------------------------------------------------
  // FUNCTION: confirmStart — "Haan" button — order IN_PROGRESS kar do
  // ---------------------------------------------------------------------

  // Start confirm "Haan" -> IN_PROGRESS
  // startTicket null karo (modal band karo) tab API call karo
  // Null pehle isliye karte hain taaki double-click par duplicate call na ho
  async function confirmStart(): Promise<void> {
    if (!startTicket) return;
    const ticket: TicketDto = startTicket;
    setStartTicket(null); // Modal band karo
    setError(null);
    try {
      await updateStatus(sectionCode, ticket.id, "IN_PROGRESS");
      refresh();
    } catch {
      setError(t("staff.actionFailed", { id: ticket.id, label: t("staff.actionInProgress") }));
    }
  }

  // ---------------------------------------------------------------------
  // FUNCTION: confirmPaymentAndComplete — payment mila, order COMPLETE karo
  // ---------------------------------------------------------------------

  // Payment mil gaya -> COMPLETED (amount + comment record)
  // payAmount string hai input se — trim check karo, empty hone par null bhejo
  // Number() conversion isliye ki API numeric expect karta hai
  async function confirmPaymentAndComplete(): Promise<void> {
    if (!paymentTicket) return;
    const ticket: TicketDto = paymentTicket;
    setPaymentTicket(null); // Modal band karo (double-click prevent)
    setError(null);
    try {
      // Agar amount field khali hai to null bhejo, warna number mein convert karo
      const amt: number | null = payAmount.trim() === "" ? null : Number(payAmount);
      await updateStatus(sectionCode, ticket.id, "COMPLETED", {
        paymentReceived: amt,
        paymentNote: payComment.trim() || null, // Khali string ko null karo
      });
      refresh();
    } catch {
      setError(t("staff.completeFailed", { id: ticket.id }));
    }
  }

  // ---------------------------------------------------------------------
  // FUNCTION: submitPaymentPending — payment nahi mila, pending mark karo
  // ---------------------------------------------------------------------

  // Payment nahi mila -> reason save, order complete na ho (READY pe rahe)
  // markPaymentPending API call karta hai jo order ka status change nahi karta,
  // sirf paymentPendingReason field set karta hai
  async function submitPaymentPending(): Promise<void> {
    if (!paymentTicket) return;
    const ticket: TicketDto = paymentTicket;
    setPaymentTicket(null); // Modal band karo
    setError(null);
    try {
      await markPaymentPending(sectionCode, ticket.id, payPendingReason.trim());
      refresh();
    } catch {
      setError(t("staff.completeFailed", { id: ticket.id }));
    }
  }

  // ---------------------------------------------------------------------
  // FUNCTION: cancel — kisi bhi order ko CANCELLED kar do
  // ---------------------------------------------------------------------

  // cancel — seedha CANCELLED status set karta hai, koi confirmation nahi (button click se hi)
  async function cancel(ticket: TicketDto): Promise<void> {
    setError(null);
    try {
      await updateStatus(sectionCode, ticket.id, "CANCELLED");
      refresh();
    } catch {
      setError(t("staff.cancelFailed", { id: ticket.id }));
    }
  }

  // ---------------------------------------------------------------------
  // FUNCTION: logout
  // ---------------------------------------------------------------------

  // logout — auth clear karo (localStorage/cookie) aur /shop login page par bhejo
  function logout(): void {
    clearAuth();
    navigate("/shop");
  }

  // ---------------------------------------------------------------------
  // LOADING STATE
  // ---------------------------------------------------------------------

  // Agar initial data abhi aa raha hai to sirf Spinner dikhao, baaki kuch nahi
  if (loading) return <Spinner />;

  // ---------------------------------------------------------------------
  // DERIVED VALUES — render se pehle compute karo
  // ---------------------------------------------------------------------

  // isAdmin — current user ka role ADMIN hai ya nahi
  const isAdmin: boolean = auth?.role === "ADMIN";

  // sections — Admin ke liye fresh shop sections (agar mili hain), warna auth ke assigned sections
  // Admin -> shop ke saare sections; staff -> apne assigned (token se)
  const sections: SectionDto[] = isAdmin && shopSections.length > 0 ? shopSections : auth?.sections ?? [];

  // current — URL mein jo sectionCode hai, us section ka full object (displayName ke liye)
  const current: SectionDto | undefined = sections.find((s: SectionDto): boolean => s.code === sectionCode);

  // title — page heading mein section ka readable naam dikhao (code nahi)
  const title: string = current?.displayName ?? sectionCode;

  // subtitle — "ShopName · Admin" ya "ShopName · Staff" format
  const subtitle: string = auth?.shopName
    ? `${auth.shopName} · ${isAdmin ? t("staff.adminRole") : t("staff.staffRole")}`
    : t("staff.staffRole");

  // ---------------------------------------------------------------------
  // JSX RENDER
  // ---------------------------------------------------------------------

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 lg:px-8">
      {/* ------------------------------------------------------------- */}
      {/* HEADER SECTION — gradient banner with title, section switcher, nav buttons */}
      {/* Teal gradient background; left side: pulsing dot + section name + shop name */}
      {/* Right side: section dropdown (agar multiple), admin link, refresh, logout, language */}
      {/* ------------------------------------------------------------- */}
      <div className="mb-4 rounded-[28px] bg-gradient-to-r from-slate-900 via-teal-700 to-cyan-600 p-4 text-white shadow-[0_20px_45px_rgba(13,148,136,0.18)]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {/* Live indicator — animated pulsing dot bata raha hai page real-time connected hai */}
            <span className="w-2.5 h-2.5 rounded-full bg-teal-300 animate-pulse flex-shrink-0" />
            <div>
              {/* Section ka display naam (e.g. "Counter 1") */}
              <h1 className="text-2xl font-bold">{title}</h1>
              {/* Shop name aur role (Admin / Staff) */}
              <p className="text-teal-100 text-sm">{subtitle}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* Section switcher dropdown — sirf tab dikhta hai jab 1 se zyada sections hon */}
            {/* onChange par navigate() call karta hai taaki URL update ho aur page re-render ho */}
            {sections.length > 1 && (
              <select
                value={sectionCode}
                onChange={(e: ChangeEvent<HTMLSelectElement>) => navigate(`/staff/${e.target.value}`)}
                className="border border-teal-400 bg-teal-700/50 text-white rounded-xl px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-white/40"
              >
                {sections.map((s: SectionDto): Element => (
                  <option key={s.code} value={s.code} className="text-gray-800 bg-white">
                    {s.displayName}
                  </option>
                ))}
              </select>
            )}
            {/* Admin dashboard button — sirf Admin role ke liye dikhta hai */}
            {isAdmin && (
              <Button variant="ghost" onClick={() => navigate(`/admin/${auth!.shopCode}`)}>
                {t("common.dashboard")}
              </Button>
            )}
            {/* Manual refresh button — WebSocket miss kar le to bhi data fresh ho jaaye */}
            <Button variant="ghost" onClick={refresh}>
              {t("common.refresh")}
            </Button>
            {/* Logout — auth token clear karo aur /shop par bhejo */}
            {auth && (
              <Button variant="ghost" onClick={logout}>
                {t("common.logout")}
              </Button>
            )}
            {/* Language toggle — Hindi/English switch */}
            <LanguageToggle />
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* ERROR BANNER — agar koi API action fail ho to yahan red box mein dikhao */}
      {/* error state null nahi hai tabhi render hota hai */}
      {/* ------------------------------------------------------------- */}
      {error && (
        <div className="mb-4 rounded-lg bg-red-50 border border-red-200 px-4 py-2 text-sm text-red-600">
          {error}
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* STATS BAR — 4 colored cards: Waiting / In Progress / Ready / Today Total */}
      {/* stats null nahi hai tabhi render hota hai (initial load ke baad aata hai) */}
      {/* ------------------------------------------------------------- */}
      {stats && (
        <div className="grid grid-cols-4 gap-3 mb-6">
          <Stat label={t("admin.waiting")} value={stats.waiting} bgClass="bg-amber-50" textClass="text-amber-700" />
          <Stat label={t("admin.inProgress")} value={stats.inProgress} bgClass="bg-blue-50" textClass="text-blue-700" />
          <Stat label={t("admin.ready")} value={stats.ready} bgClass="bg-emerald-50" textClass="text-emerald-700" />
          <Stat label={t("admin.today")} value={stats.totalToday} />
        </div>
      )}

      {/* Today / Future tabs */}
      {/* ------------------------------------------------------------- */}
      {/* TAB SWITCHER — "Today" aur "Future" ke beech toggle */}
      {/* Active tab ko white background + shadow milti hai, inactive gray text */}
      {/* tab state mein "today" ya "future" store hota hai */}
      {/* ------------------------------------------------------------- */}
      <div className="flex rounded-xl bg-gray-100 p-1 mb-3">
        {/* Today tab — active orders count bhi show karta hai badge mein */}
        <button
          onClick={(): void => setTab("today")}
          className={`flex-1 py-2 rounded-lg text-sm font-medium ${
            tab === "today" ? "bg-white shadow-sm text-brand" : "text-gray-500"
          }`}
        >
          {t("staff.todayTab", { n: queue.length })}
        </button>
        {/* Future tab — scheduled/future orders count bhi show karta hai */}
        <button
          onClick={(): void => setTab("future")}
          className={`flex-1 py-2 rounded-lg text-sm font-medium ${
            tab === "future" ? "bg-white shadow-sm text-brand" : "text-gray-500"
          }`}
        >
          {t("staff.futureTab", { n: futureQueue.length })}
        </button>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* QUEUE LIST — tab ke basis par today ya future orders dikhao */}
      {/* ------------------------------------------------------------- */}

      {tab === "today" ? (
        // TODAY TAB
        queue.length === 0 ? (
          // Aaj koi active order nahi — empty state message
          <Card className="text-center text-gray-400 py-10">
            {t("staff.noOrders")}
          </Card>
        ) : (
          // Aaj ke orders ki scrollable list (max height 60vh taaki page overflow na ho)
          <div className="space-y-3 overflow-y-auto pr-1 max-h-[60vh]">
            {queue.map((ord: TicketDto): Element => {
              // Har order ke liye nextStep compute karo — button label ke liye
              const next: { status: TicketStatus; label: string } | null = nextStep(ord.status);
              return (
                // ORDER CARD — ek ticket ki saari info + action buttons
                <Card key={ord.id} className="flex items-center justify-between">
                  <div>
                    {/* Order ID aur current status badge */}
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">#{ord.id}</span>
                      <StatusBadge status={ord.status} />
                    </div>
                    {/* Customer ka naam aur phone number (clickable tel: link) */}
                    <div className="text-sm text-gray-600 mt-1">
                      {ord.customerName}
                      {ord.customerPhone && (
                        <a href={`tel:${ord.customerPhone}`} className="text-brand ml-2">
                          📞 {ord.customerPhone}
                        </a>
                      )}
                    </div>
                    {/* Order items — "ItemName x Quantity" format mein join karo */}
                    <div className="text-xs text-gray-400">
                      {ord.items.map((i: TicketItemDto): string => `${i.itemName} x${i.quantity}`).join(", ") || "—"}
                    </div>
                    {/* Queue position aur estimated wait time */}
                    <div className="text-xs text-gray-400 mt-0.5">
                      {t("staff.position", { pos: ord.queuePosition, eta: ord.etaMinutes })}
                    </div>
                    {/* Collect amount — sirf tab dikhao jab totalAmount > 0 ho */}
                    {(ord.totalAmount ?? 0) > 0 && (
                      <div className="text-sm font-semibold text-emerald-700 mt-0.5">
                        {t("staff.collect", { amt: ord.totalAmount ?? 0 })}
                      </div>
                    )}
                    {/* Extra custom fields, comment, payment info, cancel reason */}
                    <OrderExtras ticket={ord} />
                  </div>
                  <div className="flex flex-col gap-2 items-end">
                    {/* Advance button — next step ka label dikhata hai (e.g. "Start", "Ready") */}
                    {/* Sirf tab dikhta hai jab koi agla step ho */}
                    {next && (
                      <Button variant="staff" onClick={(): Promise<void> => advance(ord)}>
                        {next.label}
                      </Button>
                    )}
                    {/* Cancel button — small red text link */}
                    <button
                      onClick={(): Promise<void> => cancel(ord)}
                      className="text-xs text-red-400 hover:text-red-600"
                    >
                      {t("common.cancel")}
                    </button>
                  </div>
                </Card>
              );
            })}
          </div>
        )
      ) : futureQueue.length === 0 ? (
        // FUTURE TAB — koi future order nahi — empty state
        <Card className="text-center text-gray-400 py-10">
          {t("staff.noFuture")}
        </Card>
      ) : (
        // FUTURE TAB — scheduled orders ki scrollable list
        // Future orders mein advance button nahi hota — sirf cancel milta hai
        <div className="space-y-3 overflow-y-auto pr-1 max-h-[60vh]">
          {futureQueue.map((ord: TicketDto): Element => (
            // FUTURE ORDER CARD
            <Card key={ord.id} className="flex items-center justify-between">
              <div>
                {/* Order ID aur scheduled time badge (indigo color) */}
                <div className="flex items-center gap-2">
                  <span className="font-semibold">#{ord.id}</span>
                  <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-700">
                    {ord.scheduledTime}
                  </span>
                </div>
                {/* Customer naam aur phone */}
                <div className="text-sm text-gray-600 mt-1">
                  {ord.customerName}
                  {ord.customerPhone && (
                    <a href={`tel:${ord.customerPhone}`} className="text-brand ml-2">
                      📞 {ord.customerPhone}
                    </a>
                  )}
                </div>
                {/* Order items */}
                <div className="text-xs text-gray-400">
                  {ord.items.map((i: TicketItemDto): string => `${i.itemName} x${i.quantity}`).join(", ") || "—"}
                </div>
                {/* Total amount — rupee sign hard-coded (future orders currency fixed hai) */}
                {(ord.totalAmount ?? 0) > 0 && (
                  <div className="text-sm font-semibold text-emerald-700 mt-0.5">₹{ord.totalAmount}</div>
                )}
                {/* Extra fields, comments, payment info */}
                <OrderExtras ticket={ord} />
              </div>
              {/* Future orders mein sirf cancel ka option — advance nahi hota abhi */}
              <button
                onClick={(): Promise<void> => cancel(ord)}
                className="text-xs text-red-400 hover:text-red-600"
              >
                {t("common.cancel")}
              </button>
            </Card>
          ))}
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* HISTORY SECTION — completed/cancelled orders ki summary aur list */}
      {/* ------------------------------------------------------------- */}

      {/* History section header — toggle button se show/hide karo */}
      <div className="flex items-center justify-between mt-8 mb-2">
        <h2 className="font-semibold">{t("staff.history")}</h2>
        {/* showHistory toggle — "Show" ya "Hide" text change hota hai state ke basis par */}
        <button
          onClick={(): void => setShowHistory((v: boolean): boolean => !v)}
          className="text-sm text-brand hover:underline"
        >
          {showHistory ? t("staff.hide") : t("staff.show")}
        </button>
      </div>

      {/* History stats — aaj aur is mahine ke completed orders ke counts */}
      {/* history null nahi hone par dikhta hai */}
      {history && (
        <div className="grid grid-cols-2 gap-3 mb-4">
          <Stat label={t("staff.todayCount")} value={history.today} bgClass="border-t-4 border-t-slate-400" />
          <Stat label={t("staff.monthCount")} value={history.month} bgClass="border-t-4 border-t-slate-400" />
        </div>
      )}

      {/* Detailed history list — sirf tab dikhti hai jab showHistory true ho */}
      {/* HistoryList component apne andar search bar aur filtered list manage karta hai */}
      {showHistory && <HistoryList orders={history?.orders ?? []} t={t} />}

      {/* ------------------------------------------------------------- */}
      {/* START CONFIRM MODAL — "Customer se baat ho gayi?" gate */}
      {/* startTicket non-null hone par yeh overlay render hota hai */}
      {/* fixed inset-0 = poora screen cover karta hai, z-50 = sabse upar */}
      {/* ------------------------------------------------------------- */}
      {/* Start confirm gate — customer se baat ho gayi? */}
      {startTicket && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center px-4 z-50">
          <Card className="max-w-sm w-full">
            <h2 className="text-lg font-bold mb-1">{t("staff.startTitle")}</h2>
            {/* Order ID aur customer naam ke saath confirmation question */}
            <p className="text-sm text-gray-500 mb-4">
              {t("staff.startBody", { id: startTicket.id, name: startTicket.customerName })}
            </p>
            <div className="flex flex-col gap-2">
              {/* "Haan" — confirmStart() call karo, order IN_PROGRESS ho jaayega */}
              <Button variant="staff" onClick={confirmStart} className="w-full">
                {t("staff.startYes")}
              </Button>
              {/* "Nahi" — modal band karo, kuch nahi badla */}
              <Button variant="ghost" onClick={(): void => setStartTicket(null)} className="w-full">
                {t("staff.startNo")}
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* PAYMENT MODAL — order COMPLETE karne se pehle payment handle karo */}
      {/* paymentTicket non-null hone par yeh overlay render hota hai */}
      {/* Do branches hain: "Received" (amount + note fill karo) vs "Pending" */}
      {/* ------------------------------------------------------------- */}
      {/* Payment modal — complete karne se pehle (received vs pending) */}
      {paymentTicket && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center px-4 z-50">
          <Card className="max-w-sm w-full">
            <h2 className="text-lg font-bold mb-1">{t("staff.payReceivedQ")}</h2>
            {/* Order ID aur customer naam */}
            <p className="text-sm text-gray-500 mb-1">
              {t("staff.payBody", { id: paymentTicket.id, name: paymentTicket.customerName })}
            </p>
            {/* Items list aur total amount reminder */}
            <div className="text-xs text-gray-400 mb-3">
              {paymentTicket.items.map((i: TicketItemDto) => `${i.itemName} x${i.quantity}`).join(", ") || "—"}
              {(paymentTicket.totalAmount ?? 0) > 0 && ` · ₹${paymentTicket.totalAmount}`}
            </div>

            {/* Received branch — payment mil gayi */}
            {/* Amount input + comment/note input + "Complete" button */}
            <div className="space-y-2 border-b border-gray-100 pb-3 mb-3">
              {/* Payment amount — numeric, pre-filled from ticket.totalAmount */}
              <input
                type="number"
                min="0"
                value={payAmount}
                placeholder={t("staff.payAmount")}
                onChange={(e: ChangeEvent<HTMLInputElement>): void => setPayAmount(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/40"
              />
              {/* Optional note/comment about payment */}
              <input
                value={payComment}
                placeholder={t("staff.payComment")}
                onChange={(e: ChangeEvent<HTMLInputElement>): void => setPayComment(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/40"
              />
              {/* Confirm button — amount record karo aur order COMPLETED kar do */}
              <Button variant="staff" onClick={confirmPaymentAndComplete} className="w-full">
                {t("staff.payConfirmComplete")}
              </Button>
            </div>

            {/* Pending branch — payment nahi mili */}
            {/* Reason input + "Mark Pending" button — order COMPLETED nahi hoga */}
            <div className="space-y-2">
              {/* Reason kyun payment pending hai (e.g. "UPI pending", "cash nahi tha") */}
              <input
                value={payPendingReason}
                placeholder={t("staff.payPendingReason")}
                onChange={(e: ChangeEvent<HTMLInputElement>): void => setPayPendingReason(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/40"
              />
              {/* Sirf pending mark karo, status READY pe hi rahe */}
              <Button variant="ghost" onClick={submitPaymentPending} className="w-full">
                {t("staff.payMarkPending")}
              </Button>
            </div>

            {/* Cancel — modal band karo, koi bhi action nahi */}
            <button
              onClick={(): void => setPaymentTicket(null)}
              className="text-xs text-gray-400 hover:text-gray-600 mt-3 w-full text-center"
            >
              {t("common.cancel")}
            </button>
          </Card>
        </div>
      )}
    </div>
  );
}

// =========================================================================
// COMPONENT: HistoryList
// -------------------------------------------------------------------------
// History section mein completed/cancelled orders ki searchable list dikhata hai.
// Props:
//   - orders: TicketDto[] — puri history (filtered nahi)
//   - t: translation function
// Apna local search state (q) manage karta hai.
// Search naam, phone, ya order ID se hoti hai (case-insensitive).
// =========================================================================

function HistoryList({
  orders,
  t,
}: {
  orders: TicketDto[];
  t: (key: string, vars?: Record<string, string | number>) => string;
}): Element {
  // q — search input ka current value (naam / phone / order ID)
  const [q, setQ] = React.useState("");

  // filtered — agar search query hai to match karo, warna saare orders dikhao
  // toLowerCase() isliye taaki case-insensitive search ho
  const filtered: TicketDto[] = q.trim()
    ? orders.filter((o: TicketDto): boolean =>
        o.customerName?.toLowerCase().includes(q.toLowerCase()) ||
        o.customerPhone?.includes(q) ||
        String(o.id).includes(q)
      )
    : orders;

  return (
    <>
      {/* Search input — naam / phone / order ID se filter karo */}
      <input
        value={q}
        onChange={(e: ChangeEvent<HTMLInputElement>): void => setQ(e.target.value)}
        placeholder="Search by name / phone / #id"
        className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm mb-2 focus:outline-none focus:ring-2 focus:ring-brand/40"
      />

      {/* Agar search ke baad koi match nahi mila — empty state */}
      {filtered.length === 0 ? (
        <Card className="text-center text-gray-400 py-6">{t("staff.noHistory")}</Card>
      ) : (
        // Filtered orders ki scrollable list (max height 50vh)
        <div className="space-y-2 overflow-y-auto pr-1 max-h-[50vh]">
          {filtered.map((ord: TicketDto): Element => (
            // HISTORY ORDER CARD — completed/cancelled order ka snapshot
            <Card key={ord.id} className="flex items-center justify-between py-3">
              <div>
                {/* Order ID aur final status badge */}
                <div className="flex items-center gap-2">
                  <span className="font-semibold">#{ord.id}</span>
                  <StatusBadge status={ord.status} />
                </div>
                {/* Customer naam aur phone (non-clickable in history — just display) */}
                <div className="text-sm text-gray-600 mt-1">
                  {ord.customerName}
                  {ord.customerPhone && <span className="text-gray-400 ml-2">📞 {ord.customerPhone}</span>}
                </div>
                {/* Items summary */}
                <div className="text-xs text-gray-400">
                  {ord.items.map((i: TicketItemDto): string => `${i.itemName} x${i.quantity}`).join(", ") || "—"}
                </div>
                {/* Extra fields, payment info, cancel reason */}
                <OrderExtras ticket={ord} />
              </div>
              {/* Right side — amount aur order placement time */}
              <div className="text-right">
                {/* Total amount — sirf tab dikhao jab > 0 ho */}
                {(ord.totalAmount ?? 0) > 0 && <div className="text-sm font-semibold text-gray-700">₹{ord.totalAmount}</div>}
                {/* Order date (e.g. "12 Jun") */}
                {ord.placedDate && <div className="text-xs text-gray-500">{ord.placedDate}</div>}
                {/* Order time (e.g. "14:30") */}
                <div className="text-xs text-gray-400">{ord.placedTime}</div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}

// =========================================================================
// COMPONENT: Stat
// -------------------------------------------------------------------------
// Ek chota stat card — ek number aur ek label dikhata hai.
// Stats bar mein 4 baar use hota hai (waiting, inProgress, ready, totalToday).
// aur History section mein 2 baar (today count, month count).
// Props:
//   - label: string — card ke neeche chota text (e.g. "Waiting")
//   - value: number — bada number jo dikhana hai
//   - bgClass: optional CSS classes for background / border styling
//   - textClass: optional CSS class for number color (default: text-brand)
// =========================================================================

function Stat({
  label,
  value,
  bgClass = "",
  textClass = "text-brand",
}: {
  label: string;
  value: number;
  bgClass?: string;
  textClass?: string;
}): Element {
  return (
    <Card className={`border border-slate-200/80 bg-gradient-to-br from-white to-slate-50/80 py-3 text-center shadow-sm ${bgClass}`}>
      <div className={`text-2xl font-bold ${textClass}`}>{value}</div>
      <div className="mt-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">{label}</div>
    </Card>
  );
}

// =========================================================================
// COMPONENT: OrderExtras (exported — dusre pages bhi use kar sakte hain)
// -------------------------------------------------------------------------
// Ek ticket ke additional/extra information render karta hai:
//   1. Custom form fields (extraFields) — customer ne jo bhi extra fill kiya
//   2. Customer comment — order ke saath koi note
//   3. Payment received — kitna mila aur koi note
//   4. Payment pending reason — kyun payment pending hai
//   5. Cancel reason — kisne cancel kiya aur kis stage par
//
// Agar koi bhi extra info nahi hai to null return karta hai (kuch render nahi hoga)
// =========================================================================

// Customer ke bhare custom fields + comment — order card mein dikhao
export function OrderExtras({ ticket }: { ticket: TicketDto }): Element | null {
  const t: (key: string, vars?: Record<string, string | number>) => string = useT();

  // hasExtras — koi custom form field hai ya nahi
  const hasExtras: boolean = ticket.extraFields?.length > 0;

  // hasPay — payment ka koi bhi info hai (received ya pending)
  const hasPay: string | true | null = ticket.paymentReceived != null || ticket.paymentPendingReason;

  // hasCancelInfo — order cancelled hai aur cancel reason bhi hai
  const hasCancelInfo: string | false | null = ticket.status === "CANCELLED" && ticket.cancelReason;

  // Agar kuch bhi extra nahi hai to component kuch render nahi karta
  if (!hasExtras && !ticket.comment && !hasPay && !hasCancelInfo) return null;

  return (
    <div className="mt-1 space-y-0.5">
      {/* Custom extra fields — customer ne form mein jo additional info diya */}
      {ticket.extraFields?.map((f: FieldValueDto, i: number): Element => (
        <div key={i} className="text-xs text-gray-500">
          <span className="text-gray-400">{f.label}:</span> {f.value}
        </div>
      ))}

      {/* Customer ka comment / note — agar diya hai to */}
      {ticket.comment && (
        <div className="text-xs text-gray-500">
          <span className="text-gray-400">{t("track.commentLabel")}:</span> {ticket.comment}
        </div>
      )}

      {/* Payment received amount aur optional note — green text mein */}
      {ticket.paymentReceived != null && (
        <div className="text-xs text-emerald-700">
          {t("staff.received", { amt: ticket.paymentReceived })}
          {/* Payment note sirf tab dikhao jab ho */}
          {ticket.paymentNote ? ` · ${ticket.paymentNote}` : ""}
        </div>
      )}

      {/* Payment pending reason — amber/yellow text mein */}
      {ticket.paymentPendingReason && (
        <div className="text-xs text-amber-700">
          {t("staff.paymentPending", { reason: ticket.paymentPendingReason })}
        </div>
      )}

      {/* Cancel reason — regex se parse karo "Cancelled by X at stage: Y" format */}
      {/* IIFE (Immediately Invoked Function Expression) isliye use kiya kyunki JSX mein
          complex conditional logic seedha nahi likh sakte — function call karo aur JSX return karo */}
      {hasCancelInfo && (() : Element => {
        // Cancel reason string se "who" aur "stage" nikalo regex se
        const match: RegExpMatchArray | null = ticket.cancelReason!.match(/Cancelled by (.+?) at stage: (.+)/);
        // Agar format match nahi kiya to raw string dikhao
        if (!match) return <div className="text-xs text-red-500">{ticket.cancelReason}</div>;
        const who: string = match[1]; // e.g. "Staff: John"
        const stage: string = match[2]; // e.g. "IN_PROGRESS"
        return (
          <div className="text-xs text-red-600">
            {t("track.cancelWho")}: <span className="font-medium">{who}</span> · {t("track.cancelStage")}:{" "}
            <span className="font-medium">{stage}</span>
          </div>
        );
      })()}
    </div>
  );
}
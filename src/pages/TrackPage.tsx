// ================================================================
// TrackPage.tsx
// ================================================================
import { useState, useEffect, useCallback, useRef } from "react";
import type { ReactElement as Element } from "react";
import { useParams, Link } from "react-router-dom";
import { useT } from "../i18n/LanguageContext";
import { getTicket, getFormConfig, cancelTicket,getPublicPaymentQrUrl } from "../lib/api";
import { getLocalOrders } from "../lib/auth";
import { useStomp } from "../hooks/useStomp";
import { Card, StatusBadge, Button, Spinner } from "../components/ui";
import CustomerHeader from "../components/CustomerHeader";
import ShopContact from "../components/ShopContact";
import type {
  TicketDto,
  TicketItemDto,
  FieldValueDto,
  FormConfigDto,
  LocalOrder,
} from "../lib/types";

// ================================================================
// STEP_KEY
//
// Har ticket status ke liye i18n translation key ka mapping.
// Jab Stepper component mein status label dikhana ho to iska key
// lookup karta hai aur translated string return karta hai
// (Hindi/English/etc.)
// ================================================================

const STEP_KEY: Record<string, string> = {
  PLACED: "track.stepPlaced",
  ACCEPTED: "track.stepAccepted",
  IN_PROGRESS: "track.stepInProgress",
  READY: "track.stepReady",
  COMPLETED: "track.stepCompleted",
};

export default function TrackPage(): Element {
  // URL se ticketId parameter nikalta hai,
  // e.g. /track/42 => ticketId = "42"
  //
  // Agar URL mein koi value nahi to default empty string "" milta hai
  const { ticketId = "" } = useParams();

  // t() function — i18n translation ke liye;
  // key dedo, translated string milega
  //
  // IMPORTANT: useT() ek Hook hai, isliye ise sirf EK baar,
  // component ke top-level par call karna chahiye — na ki har
  // baar jab t(key) use ho. Pehle ye har t(...) call par
  // useT() ko dobara invoke kar raha tha, jisse render ke
  // hisaab se Hook calls ki count badal jaati thi (Rules of
  // Hooks violation -> "change in order of Hooks" error).
  const t: (key: string, vars?: Record<string, string | number>) => string = useT();

  // ticketId string ko number mein convert karo
  // (API numeric ID expect karta hai)
  const id: number = Number(ticketId);

  // ticket state — is ticket ka poora data
  // (status, items, times, etc.)
  // Shuru mein null hai jab tak API se data nahi aata
  const [ticket, setTicket] = useState<TicketDto | null>(null);
  const [alertsEnabled, setAlertsEnabled] = useState<boolean>(false);
  const [statusNotice, setStatusNotice] = useState<string | null>(null);
  const [alertError, setAlertError] = useState<string | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  useEffect((): (() => void) => {
    return (): void => {
      if (audioContextRef.current && audioContextRef.current.state !== "closed") {
        void audioContextRef.current.close();
      }
    };
  }, []);

  // statusFlow — shop ka custom status sequence,
  // e.g. ["PLACED", "ACCEPTED", "IN_PROGRESS", "COMPLETED"]
  // Stepper component isi flow ke hisaab se steps dikhata hai
  const [statusFlow, setStatusFlow] = useState<string[]>([]);

  // shopName — us shop ka naam jisme ye ticket hai
  // (header mein dikhane ke liye)
  const [shopName, setShopName] = useState<string | null>(null);

  // shopCity — shop ki city
  // shopName ke saath "ShopName - CityName" format mein dikhti hai
  const [shopCity, setShopCity] = useState<string | null>(null);

  // shopPhone — shop ka phone number
  // ShopContact component ko pass kiya jaata hai
  const [shopPhone, setShopPhone] = useState<string | null>(null);

  // shopAddress — shop ki physical address
  // ShopContact component ko pass ki jaati hai
  const [shopAddress, setShopAddress] = useState<string | null>(null);

  // hasPaymentQr - true tabhi hota hai jab admin ne apna payment QR upload kiya hai
  // Aur shop PAID planpar ho AUR superAdmin ne feature ban na kiya ho ( backend se
  // teeno conditions check hoti hain.) Isi flag se "Scan to Pay" card dikhata hai.hai
  const[hasPaymentQr, setHasPaymentQr] = useState<boolean>(false);

  // notFound — agar ticket ID se nahi mila
  // (404 ya error) to "Not Found" message dikhate hain
  const [notFound, setNotFound] = useState(false);

  // load function — API se ticket data fetch karta hai
  //
  // useCallback isliye use kiya hai taaki har render par naya
  // function na bane jab id change ho.
  //
  // Success par ticket state set karta hai;
  // failure par notFound true karta hai.
  const load = useCallback((): void => {
    getTicket(id)
      .then(setTicket)
      .catch((): void => setNotFound(true));
  }, [id]);

  // Ye effect tab chalta hai jab component pehli baar mount ho
  // ya load function change ho.
  // load() call karta hai jo API ticket data lata hai
  useEffect((): void => {
    load();
  }, [load]);

  // ================================================================
  // Business ka actual status flow le aao taaki stepper sahi steps
  // dikhaye.
  //
  // Ye effect tab chalta hai jab ticket mein businessCode pehli baar
  // available ho ya change ho.
  //
  // getFormConfig() se shop ki config aati hai jisme:
  // statusFlow, shopName, city, phone, address sab hota hai.
  //
  // Agar businessCode nahi hai to ye effect kuch nahi karta.
  // ================================================================

  useEffect((): void => {
    if (ticket?.businessCode) {
      getFormConfig(ticket.businessCode).then(
        (cfg: FormConfigDto): void => {
          setStatusFlow(cfg.statusFlow);
          setShopName(cfg.shopName);
          setShopCity(cfg.shopCity);
          setShopPhone(cfg.shopPhone);
          setShopAddress(cfg.shopAddress);
          setHasPaymentQr(cfg.hasPaymentQr);
        }
      );
    }
  }, [ticket?.businessCode]);

  // ================================================================
  // Live updates
  //
  // Staff status change kare to turant yahan reflect hota hai.
  //
  // useStomp WebSocket topic subscribe karta hai:
  // /topic/tickets/<id>
  //
  // Jab bhi server us topic par message bheje (ticket update),
  // callback chalta hai aur agar naye message mein ticket data ho
  // to setTicket se state update ho jaati hai.
  //
  // Isse page refresh karne ki zaroorat nahi —
  // real-time tracking milti hai.
  // ================================================================

  useStomp(`/topic/tickets/${id}`, (body: any): void => {
    if (!body?.ticket) return;

    const updatedTicket = body.ticket as TicketDto;
    if (ticket && updatedTicket.status !== ticket.status) {
      const message = t("track.statusChanged", {
        status: t(`status.${updatedTicket.status}`),
      });
      setStatusNotice(message);

      if (alertsEnabled) {
        const audioContext = audioContextRef.current;
        if (audioContext?.state === "running") {
          const oscillator = audioContext.createOscillator();
          const gain = audioContext.createGain();
          oscillator.frequency.value = 880;
          gain.gain.setValueAtTime(0.0001, audioContext.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.18, audioContext.currentTime + 0.02);
          gain.gain.exponentialRampToValueAtTime(0.0001, audioContext.currentTime + 0.25);
          oscillator.connect(gain);
          gain.connect(audioContext.destination);
          oscillator.start();
          oscillator.stop(audioContext.currentTime + 0.26);
        }

        if ("Notification" in window && Notification.permission === "granted") {
          new Notification(t("track.statusChangedTitle"), { body: message });
        }
      }

      setTicket(updatedTicket);
      return;
    }

    setTicket(updatedTicket);
  });

  useEffect((): (() => void) | undefined => {
    if (!statusNotice) return;
    const timeout = window.setTimeout((): void => setStatusNotice(null), 6000);
    return (): void => window.clearTimeout(timeout);
  }, [statusNotice]);

  async function enableAlerts(): Promise<void> {
    setAlertError(null);
    try {
      if ("Notification" in window && Notification.permission === "default") {
        await Notification.requestPermission();
      }

      if ("AudioContext" in window) {
        const audioContext = audioContextRef.current ?? new AudioContext();
        audioContextRef.current = audioContext;
        if (audioContext.state === "suspended") await audioContext.resume();
      }

      setAlertsEnabled(true);
    } catch {
      setAlertError(t("track.alertEnableFailed"));
    }
  }

  function disableAlerts(): void {
    setAlertsEnabled(false);
  }

  // ================================================================
  // cancel() — ticket cancel karne ka function
  //
  // API ko cancelTicket() call bhejta hai;
  // success par updated ticket set karta hai.
  //
  // Agar API fail kare (e.g. ticket pehle hi pick ho chuka),
  // to silently load() se latest server state wapas fetch kar lete hain
  // taaki UI sahi state dikhaye.
  // ================================================================

  async function cancel(): Promise<void> {
    if (!ticket) return;

    try {
      const updated: TicketDto = await cancelTicket(ticket.id);
      setTicket(updated);
    } catch {
      // pick ho chuka hoga — reload se sahi state aayegi
      load();
    }
  }

  // Agar ticket nahi mila (404/error) to sirf header aur
  // "Not Found" message dikhao
  if (notFound) {
    return (
      <>
        <CustomerHeader />
        <Centered text={t("track.notFound")} />
      </>
    );
  }

  // Agar ticket abhi load ho raha hai (null) to spinner dikhao
  if (!ticket) {
    return (
      <>
        <CustomerHeader />
        <Spinner />
      </>
    );
  }

  // ================================================================
  // Ticket status ke liye boolean flags
  //
  // Inhe ek baar compute karo taaki JSX mein baar-baar
  // ticket.status === "..." na likhna pade
  // ================================================================

  const isDone: boolean = ticket.status === "COMPLETED";
  const isCancelled: boolean = ticket.status === "CANCELLED";
  const isReady: boolean = ticket.status === "READY";
  const isStarted: boolean = ticket.status === "IN_PROGRESS";
  const isPlaced: boolean = ticket.status === "PLACED";
  const isAccepted: boolean = ticket.status === "ACCEPTED";

  // ================================================================
  // Wapas jaane ke liye shop
  //
  // getLocalOrders() browser ke localStorage mein stored orders dekhta hai.
  //
  // Agar is ticket ka shopCode wahan mila to
  // "Back" link /q/<shopCode> par jayega.
  //
  // Warna generic /customer page par jayega.
  // ================================================================

  const shopCode: string | undefined = getLocalOrders().find(
    (o: LocalOrder): boolean => o.ticketId === ticket.id
  )?.shopCode;

  return (
    <>
      {/* Top navigation bar — customer header;
          agar shopCode hai to shop wapas jaane ka link bhi hoga */}
      <CustomerHeader shopCode={shopCode} />

      <div className="mx-auto max-w-2xl px-4 py-6 sm:px-6 lg:px-8">

        {/* ============================================================
            ORDER HEADER SECTION

            Order number (ID), customer ka naam, shop ka naam aur city,
            aur shop ke contact details (phone/address) dikhata hai.
        ============================================================ */}

        <div className="mb-6 rounded-[28px] bg-gradient-to-r from-brand via-indigo-600 to-violet-600 p-5 text-white shadow-[0_18px_45px_rgba(79,70,229,0.25)]">

          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-indigo-100">
                {t("track.orderNo", { id: ticket.id })}
              </p>
              <h1 className="mt-2 text-2xl font-bold leading-tight">
                {ticket.customerName}
              </h1>
            </div>
            <div className="rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-medium backdrop-blur-sm">
              <StatusBadge status={ticket.status} />
            </div>
          </div>

          <p className="mt-3 text-sm text-indigo-100">
            {shopName ? `${shopName}${shopCity ? ` · ${shopCity}` : ""}` : ""}
          </p>

          {/* ShopContact: phone aur address ka small UI block */}
          <div className="inline-block text-left">
            <ShopContact
              phone={shopPhone}
              address={shopAddress}
              tone="inverse"
            />
          </div>
        </div>

        {statusNotice && (
          <div
            className="mb-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-900 shadow-sm"
            role="status"
            aria-live="polite"
          >
            {statusNotice}
          </div>
        )}

        <Card className="mb-4 border-2 border-indigo-100 bg-gradient-to-br from-white via-white to-indigo-50/80 p-4 shadow-[0_14px_35px_rgba(79,70,229,0.1)] sm:p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-indigo-100 text-xl text-brand" aria-hidden="true">
                🔔
              </span>
              <div>
                <h2 className="font-bold text-slate-900">{t("track.alertTitle")}</h2>
                <p className="mt-1 text-sm leading-5 text-slate-600">{t("track.alertDescription")}</p>
                <span className={`mt-2 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${
                  alertsEnabled ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-600"
                }`}>
                  <span className={`h-1.5 w-1.5 rounded-full ${alertsEnabled ? "bg-emerald-500" : "bg-slate-400"}`} />
                  {t(alertsEnabled ? "track.alertsOn" : "track.alertsOff")}
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={alertsEnabled ? disableAlerts : enableAlerts}
              className={`w-full shrink-0 rounded-xl px-4 py-3 text-sm font-semibold shadow-sm transition focus:outline-none focus:ring-4 sm:w-auto ${
                alertsEnabled
                  ? "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 focus:ring-slate-100"
                  : "bg-gradient-to-r from-brand to-indigo-600 text-white shadow-indigo-500/20 hover:-translate-y-0.5 hover:shadow-lg focus:ring-indigo-200"
              }`}
            >
              {t(alertsEnabled ? "track.disableAlerts" : "track.enableAlerts")}
            </button>
          </div>
          {alertError && <p className="mt-3 text-sm text-red-600" role="alert">{alertError}</p>}
          {alertsEnabled && "Notification" in window && Notification.permission === "denied" && (
            <p className="mt-3 rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-800">{t("track.notificationsBlocked")}</p>
          )}
        </Card>

        {/* ---- PAYMENT QR CARD ----
            Admin ne apna payment QR (UPI etc.) upload kiya ho tabhi dikhta hai.
            Cancelled order mein payment ka koi matlab nahi, isliye wahan hide hai. */}
        {hasPaymentQr && ticket.status !== "CANCELLED" && (
          <Card className="mb-4 border border-indigo-100 bg-gradient-to-br from-white to-indigo-50/50 text-center">
            <p className="mb-2 text-sm font-semibold text-slate-700">💳 {t("track.scanToPay")}</p>
            <img
              src={getPublicPaymentQrUrl(ticket.businessCode)}
              alt="Payment QR"
              className="mx-auto h-48 w-48 rounded-2xl border border-indigo-100 bg-white object-contain p-2 shadow-sm"
            />
          </Card>
        )}

        {/* ============================================================
            MAIN STATUS CARD

            Ticket ka current status badge aur status-specific
            information dikhata hai.

            Alag-alag status ke liye alag content render hota hai
            (conditional rendering).
        ============================================================ */}

        <Card className="mb-4 border border-indigo-100 bg-gradient-to-b from-white to-indigo-50/40 text-center">

          {/* Status badge — colored pill showing current status
              (e.g. "In Progress", "Ready") */}
          <div className="flex justify-center mb-3">
            <StatusBadge status={ticket.status} />
          </div>

          {/* ==========================================================
              STATUS-SPECIFIC CONTENT

              Har status ke liye alag UI block hai:

              1. CANCELLED — cancel message aur reason
              2. COMPLETED — "Done!" message
              3. READY — "Ready for pickup!" message
              4. IN_PROGRESS — estimated ready time
              5. PLACED/ACCEPTED — queue position number
                 aur scheduled time (agar ho to)
          ========================================================== */}

          {isCancelled ? (

            <div>
              {/* CANCELLED status block — cancel reason parse karke dikhata hai */}
              <p className="text-red-600 font-medium">
                {t("track.cancelled")}
              </p>

              {ticket.cancelReason &&
                (() => {
                  const raw: string = ticket.cancelReason;

                  // Parse "Cancelled by X at stage: Y" format
                  //
                  // Backend ek specific format mein cancelReason store karta hai.
                  // Regex se "who" (Customer/Staff/System) aur "stage" nikalte hain
                  // taaki user-friendly message dikhaya ja sake.

                  const match: RegExpMatchArray | null =
                    raw.match(
                      /Cancelled by (.+?) at stage: (.+)/
                    );

                  if (match) {
                    const who: string = match[1];
                    const stage: string = match[2];

                    // "who" ke basis par label decide karo
                    const whoLabel: string =
                      who === "Customer"
                        ? t("track.cancelByCustomer")
                        : who.toLowerCase().includes("system") ||
                          who.toLowerCase().includes("auto")
                        ? t("track.cancelBySystem")
                        : `${t("track.cancelByStaff")}: ${who}`;

                    return (
                      <div className="mt-2 bg-red-50 rounded-xl px-3 py-2 text-xs space-y-0.5">

                        <p className="text-red-700">
                          <span className="font-medium">
                            {t("track.cancelWho")}:
                          </span>{" "}
                          {whoLabel}
                        </p>

                        <p className="text-red-600">
                          <span className="font-medium">
                            {t("track.cancelStage")}:
                          </span>{" "}
                          {stage}
                        </p>

                      </div>
                    );
                  }

                  return (
                    <p className="text-gray-500 text-sm mt-1">
                      {t("track.cancelReason", {
                        reason: raw,
                      })}
                    </p>
                  );
                })()}
            </div>

          ) : isDone ? (

            <>
              {/* COMPLETED status */}
              <p className="text-emerald-600 font-medium">
                {t("track.done")}
              </p>
            </>

          ) : isReady ? (

            <>
              {/* READY status — order pickup ke liye ready hai */}
              <p className="text-emerald-600 font-medium text-lg">
                {t("track.ready")}
              </p>
            </>

          ) : isStarted ? (

            <>
              {/* IN_PROGRESS status —
                  kaam shuru ho gaya; estimated ready time dikhao */}

              <div className="text-sm text-gray-500">
                {t("track.inProgress")}
              </div>

              {/* readyEstimateTime staff ne set ki hogi;
                  agar nahi set ki to "—" dikhao */}
              <div className="text-2xl font-bold text-brand mt-1">
                {t("track.readyBy", {
                  time: ticket.readyEstimateTime ?? "—",
                })}
              </div>

              <p className="text-gray-400 text-xs mt-1">
                {t("track.readyByNote")}
              </p>
            </>

          ) : (

            <>
              {/* PLACED ya ACCEPTED status —
                  queue mein wait kar raha hai;
                  queue number dikhao */}

              {/* Agar scheduled order hai to scheduled time dikhao */}
              {ticket.scheduled && (
                <div className="mb-2 text-sm text-indigo-600 font-medium">
                  {t("track.scheduledFor", {
                    time: ticket.scheduledTime ?? "",
                  })}
                </div>
              )}

              <div className="text-sm text-gray-500">
                {t("track.queueNumber")}
              </div>

              {/* queuePosition — customer queue mein kitne number par hai;
                  null ho to "-" */}
              <div className="text-4xl font-bold text-brand mt-1">
                {ticket.queuePosition || "-"}
              </div>

              {/* ACCEPTED state mein ek extra note dikhao customer ko */}
              {isAccepted && (
                <p className="text-gray-400 text-xs mt-1">
                  {t("track.acceptedNote")}
                </p>
              )}
            </>
          )}

          {/* ==========================================================
              TIME BOXES

              Start time aur Ready time do boxes mein dikhata hai.
              Ye TimeBox sub-component use karta hai.
              Jab tak time available nahi hota tab tak "—" dikhta hai.
          ========================================================== */}

          <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
            <TimeBox
              label={t("track.startTime")}
              value={ticket.startTime}
            />

            <TimeBox
              label={t("track.readyTime")}
              value={ticket.readyTime}
            />
          </div>

          {/* Cancel — sirf PLACED pe (pick se pehle)
              Cancel button sirf tab dikhao jab ticket abhi PLACED ho —
              yaani staff ne accept nahi kiya.
              Agar accept ho gaya to cancel nahi ho sakta. */}

          {isPlaced && (
            <div className="mt-4">
              <Button
                variant="ghost"
                onClick={cancel}
                className="w-full"
              >
                {t("track.cancelBtn")}
              </Button>
            </div>
          )}

        </Card>

        {/* ============================================================
            ORDER ITEMS CARD

            Sirf tab dikhata hai jab ticket mein koi items hon
            (e.g. food/service items).

            Har item ka naam, quantity, aur line total dikhata hai.
            Neeche total amount bold mein dikhata hai.
        ============================================================ */}

        {ticket.items.length > 0 && (
          <Card className="mb-4">

            <h2 className="font-semibold mb-2">
              {t("track.items")}
            </h2>

            <ul className="text-sm text-gray-600 space-y-1">

              {ticket.items.map(
                (it: TicketItemDto, i: number): Element => (
                  <li
                    key={i}
                    className="flex justify-between"
                  >
                    <span>
                      {it.itemName}{" "}
                      <span className="text-gray-400">
                        x{it.quantity}
                      </span>
                    </span>

                    <span className="text-gray-500">
                      ₹{it.lineTotal}
                    </span>
                  </li>
                )
              )}

            </ul>

            {/* Total amount — sabhi items ka sum */}
            <div className="flex justify-between border-t border-gray-100 mt-2 pt-2 font-semibold">

              <span>
                {t("common.total")}
              </span>

              <span className="text-brand">
                ₹{ticket.totalAmount}
              </span>

            </div>
          </Card>
        )}

        {/* ============================================================
            CUSTOMER DETAILS CARD

            Sirf tab dikhata hai jab extra fields ya comment ho.

            extraFields — shop ke custom form fields
            (e.g. "Car Number", "Table No")

            comment — customer ne booking ke time jo note likha tha.

            Dono ko label: value format mein dikhata hai.
        ============================================================ */}

        {(ticket.extraFields?.length > 0 || ticket.comment) && (
          <Card className="mb-4">

            <h2 className="font-semibold mb-2">
              {t("track.yourDetails")}
            </h2>

            <div className="text-sm text-gray-600 space-y-1">

              {ticket.extraFields?.map(
                (f: FieldValueDto, i: number): Element => (
                  <div
                    key={i}
                    className="flex justify-between gap-3"
                  >
                    <span className="text-gray-400">
                      {f.label}
                    </span>

                    <span className="text-right">
                      {f.value}
                    </span>
                  </div>
                )
              )}

              {/* Agar customer ne koi comment/note diya tha to yahan dikhao */}
              {ticket.comment && (
                <div className="flex justify-between gap-3">

                  <span className="text-gray-400">
                    {t("track.commentLabel")}
                  </span>

                  <span className="text-right">
                    {ticket.comment}
                  </span>

                </div>
              )}

            </div>
          </Card>
        )}

        {/* ============================================================
            PROGRESS STEPPER

            Ticket ke stages ka step-by-step visual progress dikhata hai.

            Stepper component is file ke neeche defined hai.

            statusFlow — shop ka custom order of stages
            (getFormConfig se aaya)

            ticket — timestamps nikalne ke liye
            (e.g. placedTime, pickTime, etc.)
        ============================================================ */}

        <Stepper
          status={ticket.status}
          flow={statusFlow}
          ticket={ticket}
          t={t}
        />

        {/* "Live updates on" note —
            user ko batata hai ki page automatically update hota hai */}
        <div className="mt-4 flex flex-col items-center gap-2 text-center">
          <p className="text-xs text-gray-500">{t("track.liveNote")}</p>
        </div>

        {/* ============================================================
            BACK LINK

            Agar shopCode available hai (localStorage mein mila)
            to shop ke queue page par le jao.

            Warna generic /customer page par le jao.
        ============================================================ */}

        <div className="mt-4 text-center">
          <Link
            to={shopCode ? `/q/${shopCode}` : "/customer"}
            className="text-sm text-brand hover:underline"
          >
            {t("track.backLink")}
          </Link>
        </div>

      </div>
    </>
  );
}

// ================================================================
// SUB-COMPONENT: TimeBox
//
// Ek chhota display box jo ek Label aur time value dikhata hai.
//
// Props:
// label — time ka naam (e.g. "Start Time", "Ready Time")
// value — actual time string; agar null ho to "—" dikhata hai.
//
// Use:
// Status card ke andar start time aur ready time ke liye.
// ================================================================

function TimeBox({
  label,
  value,
}: {
  label: string;
  value: string | null;
}): Element {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50/80 py-3 shadow-sm">

      <div className="px-3 text-[11px] font-medium uppercase tracking-[0.18em] text-slate-400">
        {label}
      </div>

      {/* value null ho sakti hai agar ticket abhi us stage tak nahi
          pahucha */}
      <div className="mt-1 px-3 text-base font-semibold text-slate-700">
        {value ?? "—"}
      </div>

    </div>
  );
}

// ================================================================
// SUB-COMPONENT: Stepper
//
// Ticket ki progress steps ko ordered list ke roop mein dikhata hai.
//
// Completed steps par colored circle aur checkmark (✓) hota hai.
// Pending steps par gray circle aur step number hota hai.
//
// Props:
//
// status — ticket ka current status
//          (e.g. "IN_PROGRESS")
//
// flow — shop ka custom status sequence array
//        (getFormConfig se aaya)
//
// ticket — timestamps
//          (placedTime, pickTime, startTime, etc.) nikalne ke liye
//
// t — translation function
// ================================================================

function Stepper({
  status,
  flow,
  ticket,
  t,
}: {
  status: string;
  flow: string[];
  ticket: TicketDto;
  t: (
    key: string,
    vars?: Record<string, string | number>
  ) => string;
}): Element {

  // Agar shop ka custom flow available hai to use karo,
  // warna default 4-step flow use karo as fallback
  const steps: string[] =
    flow.length > 0
      ? flow
      : [
          "PLACED",
          "ACCEPTED",
          "IN_PROGRESS",
          "COMPLETED",
        ];

  // current — active step ka index steps array mein.
  // Agar status steps mein nahi mila (e.g. CANCELLED) to -1 aayega
  const current: number = steps.indexOf(status);

  // Har stage ka timestamp —
  // konse stage par kab kya hua ye record karta hai.
  //
  // Stepper mein completed steps ke side mein time dikhane ke liye
  // use hota hai.
  const stageTime: Record<string, string | null> = {
    PLACED: ticket.placedTime,
    ACCEPTED: ticket.pickTime,
    IN_PROGRESS: ticket.startTime,
    READY: ticket.readyTime,
    COMPLETED: ticket.completedTime,
  };

  return (
    <Card>

      <ol className="space-y-3">

        {steps.map(
          (s: string, i: number): Element => {

            // done = true agar ye step current ya usse pehle
            // ka step hai.
            //
            // current === -1 (CANCELLED) hone par koi step
            // "done" nahi hoga.
            const done: boolean =
              current >= 0 && i <= current;

            // Is step ka timestamp
            // (agar available ho to side mein dikhate hain)
            const time: string | null = stageTime[s];

            return (
              <li
                key={s}
                className="flex items-center gap-3"
              >

                {/* ==================================================
                    Step indicator circle

                    done:
                    colored circle + checkmark

                    pending:
                    gray circle + step number
                ================================================== */}

                <span
                  className={`h-6 w-6 rounded-full flex items-center justify-center text-xs ${
                    done
                      ? "bg-brand text-white"
                      : "bg-gray-100 text-gray-400"
                  }`}
                >
                  {done ? "✓" : i + 1}
                </span>

                {/* ==================================================
                    Step Label

                    STEP_KEY se translation key nikalte hain.

                    Agar key nahi mila to raw status string
                    dikhate hain as fallback.
                ================================================== */}

                <span
                  className={`flex-1 ${
                    done
                      ? "text-gray-900"
                      : "text-gray-400"
                  }`}
                >
                  {t(STEP_KEY[s] ?? s)}
                </span>

                {/* Timestamp —
                    sirf tab dikhao jab step done ho
                    AND time available ho */}
                {done && time && (
                  <span className="text-xs text-gray-400">
                    {time}
                  </span>
                )}

              </li>
            );
          }
        )}

      </ol>

    </Card>
  );
}

// ================================================================
// SUB-COMPONENT: Centered
//
// Ek simple centered text message dikhata hai.
//
// Use:
// "Ticket not found" jaisi error states ke liye.
//
// Props:
// text — jo message dikhana ho
// ================================================================

function Centered({
  text,
}: {
  text: string;
}): Element {
  return (
    <div className="max-w-md mx-auto px-4 py-20 text-center text-gray-500">
      {text}
    </div>
  );
}
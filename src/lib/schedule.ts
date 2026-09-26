// ================================================================
// Week-model scheduling helpers (is week ke Mon-Sun tak).
// Aaj ke weekday se pehle ke din disabled; aaj + aage enabled.
//
// Har din ka human-readable naam - JS getDay() index ke hisaab se
// (0=Sunday)
const DAY_NAMES: string[] = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

// DayOption interface: ek single din ka option jo date-picker dropdown mein dikhega
export interface DayOption {
  value: string;      // "YYYY-MM-DD" (local date) - ye value backend ko bheji jaayegi
  label: string;      // "Aaj (Wed)" / "Friday" - ye user ko dikhega UI mein
  disabled: boolean;  // true ho to user is din ko select nahi kar sakta
}

// ================================================================
// HELPER FUNCTION: ymd
//
// Ek Date object ko "YYYY-MM-DD" string mein convert karta hai
// (local timezone).
//
// Directly .toISOString() use nahi karte kyunki wo UTC date deta hai.
// Agar user GMT+5:30 mein hai to raat ko date alag aa sakti hai.
// Is function se local date milti hai jo user ke screen pe dikhti hai.
// ================================================================
function ymd(d: Date): string {
  const y: number = d.getFullYear(); // 4-digit year, e.g. 2026

  const m: string = String(d.getMonth() + 1).padStart(
    2,
    "0"
  ); // getMonth() 0-indexed hai, +1 karo; "06"

  const day: string = String(d.getDate()).padStart(
    2,
    "0"
  ); // din ka number, zero-padded; "05"

  return `${y}-${m}-${day}`; // final string, e.g. "2026-06-05"
}

// ================================================================
// EXPORTED FUNCTION: weekDayOptions
//
// Kya karta hai:
//
// Current week ke saaton din (Monday se Sunday) ki ek array return
// karta hai.
//
// Har item mein date value, display label, aur disabled flag hoti hai.
//
// Parameters:
//
// now
//   current date/time (default: abhi, yani new Date()).
//   Testing ke liye custom date pass kar sakte ho.
//
// operatingDays
//   shop ke open rehne wale din, ISO format mein comma-separated,
//   e.g. "1,2,3,4,5" matlab Mon-Fri.
//   Default: saare din open.
//
// Disabled kyun hota hai ek din:
//
// 1. pastDay
//    ye din aaj se pehle hai (past mein booking nahi ho sakti)
//
// 2. closedDay
//    shop is din band hai (operatingDays mein nahi hai)
//
// operatingDays: "1,2,3,4,5,6,7" format
// (1=Mon...7=Sun) - non-operating days bhi disabled.
//
// operatingDays string ko Set mein convert karo - fast lookup ke liye
// e.g. "1,2,5" -> Set { "1", "2", "5" }
// ================================================================
export function weekDayOptions(
  now: Date = new Date(),
  operatingDays = "1,2,3,4,5,6,7"
): DayOption[] {
  // operatingDays string ko Set mein convert karo - fast lookup ke liye
  const allowedDows = new Set(
    operatingDays.split(",").map((s: string) => s.trim())
  );

  const todayDow: number = now.getDay(); // 0=Sun...6=Sat - JS format mein aaj ka weekday

  // Is week ka Monday dhundo (week ka pehla din)
  const monday = new Date(now);

  // Agar aaj Sunday (0) hai to pichle Monday ke liye -6 days,
  // warna (1 - todayDow) days
  //
  // e.g. aaj Wednesday (3) hai to offset = 1 - 3 = -2
  // (2 din peeche = Monday)
  const offsetToMonday: number =
    todayDow === 0 ? -6 : 1 - todayDow;

  monday.setDate(now.getDate() + offsetToMonday);
  // monday ab is week ka actual Monday hai

  const opts: DayOption[] = [];
  // result array - isme 7 DayOption objects aayenge

  // Monday se Sunday tak 7 din loop karo (i = 0 to 6)
  for (let i: number = 0; i < 7; i++) {
    const d = new Date(monday); // Monday ka copy banao

    d.setDate(monday.getDate() + i);
    // i din aage badho (0=Mon, 1=Tue, ... 6=Sun)

    const isToday: boolean = ymd(d) === ymd(now);
    // kya ye din aaj hai?

    // JS day-of-week (0=Sun) ko ISO day-of-week (1=Mon...7=Sun)
    // mein convert karo
    //
    // JS Sunday (0) -> ISO Sunday (7); baaki sab same rehte hain
    const isoDow: string = String(
      d.getDay() === 0 ? 7 : d.getDay()
    );

    // Past din check: kya ye date aaj ki midnight se pehle hai?
    // "T00:00:00" lagane se hum aaj ki shuruat ka exact moment banate hain
    const pastDay: boolean =
      d < new Date(ymd(now) + "T00:00:00");

    // Closed din check: kya ye din allowedDows Set mein nahi hai?
    const closedDay: boolean = !allowedDows.has(isoDow);

    opts.push({
      value: ymd(d), // "YYYY-MM-DD" format mein date

      // Agar aaj hai to "Aaj (Wed)" dikhao,
      // warna pura naam jaise "Friday"
      label: isToday
        ? `Aaj (${DAY_NAMES[d.getDay()].slice(0, 3)})`
        : DAY_NAMES[d.getDay()],

      disabled: pastDay || closedDay,
      // dono mein se koi bhi true ho to disable karo
    });
  }

  return opts;
  // 7 DayOption objects wali array return karo
}

// ================================================================
// EXPORTED FUNCTION: toIsoInstant
//
// Kya karta hai:
//
// Ek local date string ("YYYY-MM-DD") aur time string ("HH:MM") ko
// milaakar UTC ISO instant string return karta hai.
//
// e.g. ("2026-06-12", "14:30")
// -> "2026-06-12T09:00:00.000Z" (agar GMT+5:30 mein)
//
// Ye kyun zaroori hai:
//
// Backend hamesha UTC timestamps expect karta hai.
// User ka input local time mein hota hai.
//
// new Date("2026-06-12T14:30") browser ki local timezone use karke
// Date banata hai, aur .toISOString() use UTC mein convert karta hai.
// ================================================================

/** "YYYY-MM-DD" + "HH:MM" (local) -> ISO instant string (UTC). */
export function toIsoInstant(
  date: string,
  time: string
): string {
  // local date-time -> Date -> ISO (UTC)

  // Template literal se "2026-06-12T14:30" jaisi string banti hai
  const dt = new Date(`${date}T${time}`);
  // browser is string ko local timezone mein parse karta hai

  return dt.toISOString();
  // UTC mein convert karke
  // "2026-06-12T09:00:00.000Z" return karta hai
}

// ================================================================
// EXPORTED FUNCTION: defaultTime
//
// Kya karta hai:
//
// Aaj ki current time se ek ghanta aage ka time "HH:00" format mein
// return karta hai.
//
// Ye booking form mein default pre-filled time ke liye use hota hai
// taaki user ko manually time type na karna pade.
//
// e.g. Abhi 14:45 hai to -> "15:00" return karega.
//
// Edge case:
//
// Agar abhi 23:xx hai to (23+1) % 24 = 0
// -> "00:00" (midnight wrap-around).
// ================================================================

/** Default time slot - abhi se thoda aage (round to next hour). */
export function defaultTime(
  now: Date = new Date()
): string {
  // getHours() current hour deta hai (0-23),
  // +1 karo aur % 24 se midnight wrap handle karo
  const h: string = String(
    (now.getHours() + 1) % 24
  ).padStart(2, "0");
  // zero-padded hour string

  return `${h}:00`;
  // minutes hamesha "00" - next hour ki shuruaat
}
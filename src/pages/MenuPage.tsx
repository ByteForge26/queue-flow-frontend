import {
  useCallback,
  useEffect,
  useState,
  type ChangeEvent,
  type KeyboardEvent,
  type JSX,
} from "react";
import { Link, useParams } from "react-router-dom";

import { Card, Button, Spinner } from "../components/ui";
import { useT } from "../i18n/LanguageContext";

// FIX: getServiceSection → getServiceSections (api.ts mein yahi naam hai)
import {
  getMenu,
  addMenuItem,
  updateMenuItem,
  setMenuItemActive,
  deleteMenuItem,
  getServiceSections,
  addServiceSection,
  deleteServiceSection,
  moveItemsToSection,
  getShopDetails,
} from "../lib/api";

import type { MenuItemDto, ServiceSectionDto } from "../lib/types";

export default function MenuPage(): JSX.Element {
  // URL se shopCode aur sectionCode nikal rahe hain.
  // shopCode: admin dashboard pe wapas jaane ke liye link mein use hoga.
  // sectionCode: is section ke menu items fetch karne ke liye API call mein use hoga.
  const { shopCode = "", sectionCode = "" } = useParams();

  // t() function translation ke liye — koi bhi text display karna ho to t("key") use karo
  // FIX: UseT → useT (import ka naam case-sensitive hai)
  const t = useT();

  // items: server se fetch kiye gaye is section ke saare MenuItemDto objects ki list
  const [items, setItems] = useState<MenuItemDto[]>([]);

  // loading: true jab tak pehli baar data fetch nahi ho jaata — is waqt Spinner dikhta hai
  const [loading, setLoading] = useState<boolean>(true);

  // error: koi bhi API fail ho to error message yahan store hota hai, UI mein red box mein dikhta hai
  const [error, setError] = useState<string | null>(null);

  // ---- Service section state ----
  const [serviceSections, setServiceSections] = useState<ServiceSectionDto[]>([]);
  const [newSectionName, setNewSectionName] = useState<string>("");

  // FIX: pehle addingSectionId number|null tha aur usme object set ho raha tha.
  // Ab sirf boolean chahiye: section add ho raha hai ya nahi.
  const [addingSection, setAddingSection] = useState<boolean>(false);

  const [selectedSectionId, setSelectedSectionId] = useState<number | null>(null);
  const [sectionSearch, setSectionSearch] = useState<string>("");

  // Plan limit state : BASIC (Free) plan mein 5 sections ka limit hai,
  // aur PRO plan mein unlimited sections allowed hain.
  const [planLimit, setPlanLimit] = useState<number | null>(null);

  // Plan details ek baar fetch karo — BASIC ho to limit 5, warna null (unlimited)
  useEffect(() => {
    getShopDetails()
      .then((d) => setPlanLimit(d.plan === "BASIC" ? 5 : null))
      .catch(() => setPlanLimit(null));
  }, []);

  // --- "Naya Item Add" form ke liye state variables ---

  // name: naye item ka naam (required field)
  const [name, setName] = useState<string>("");

  // price: naye item ki price (rupees mein, 0 ya usse zyada honi chahiye)
  const [price, setPrice] = useState<string>("");

  // mins: naye item ko banane mein kitne minutes lagte hain (minimum 1)
  const [mins, setMins] = useState<string>("");

  // desc: naye item ki optional description (customer ko kya dikhna chahiye)
  const [desc, setDesc] = useState<string>("");

  // cat: naye item ki optional category (e.g. "Starters", "Beverages")
  const [cat, setCat] = useState<string>("");

  // --- "Item Edit" form ke liye state variables ---

  // Jab koi item edit mode mein hota hai to uski original values yahan copy hoti hain

  // editId: jo item abhi edit ho raha hai uska database ID;
  // null matlab koi edit nahi chal raha
  const [editId, setEditId] = useState<number | null>(null);

  // eName: edit form mein item ka naam
  const [eName, setEName] = useState<string>("");

  // ePrice: edit form mein item ki price
  const [ePrice, setEPrice] = useState<string>("");

  // eMins: edit form mein estimated minutes
  const [eMins, setEMins] = useState<string>("");

  // eDesc: edit form mein item ki description
  const [eDesc, setEDesc] = useState<string>("");

  // eCat: edit form mein item ki category
  const [eCat, setECat] = useState<string>("");

  // loadServiceSections: service sections fetch karta hai
  // FIX: pehle ye function define tha lekin kabhi call nahi hota tha,
  // isliye sections page load pe nahi aate the. Ab useEffect se call hota hai.
  const loadServiceSections = useCallback(async (): Promise<void> => {
    try {
      const sections = await getServiceSections(sectionCode);
      setServiceSections(sections);
    } catch (err) {
      console.error("Failed to load service sections:", err);
    }
  }, [sectionCode]);

  useEffect(() => {
    loadServiceSections();
  }, [loadServiceSections]);

  // refresh: ye function API se latest menu items fetch karta hai aur state update karta hai.
  // useCallback use kiya hai taaki ye function tab hi re-create ho jab sectionCode badle —
  // warna useEffect baar-baar loop mein fire hota rehta.
  const refresh = useCallback((): void => {
    getMenu(sectionCode)
      .then(setItems)
      .catch(() => setError(t("menu.loadFailed")))
      .finally(() => setLoading(false));
  }, [sectionCode, t]);

  // Component mount hone pe ya sectionCode badalne pe menu data fetch karo.
  // refresh function dependency mein hai kyunki wo sectionCode pe depend karta hai.
  useEffect(() => {
    refresh();
  }, [refresh]);

  // addValid: "Add" button tab hi enable hoga jab naam diya ho,
  // price 0 ya zyada ho, aur estimated minutes kam se kam 1 ho.
  // Negative ya empty values block karta hai.
  const addValid: boolean =
    name.trim() !== "" && Number(price) >= 0 && Number(mins) >= 1;

  // editValid: "Save" button edit form mein tab hi enable hoga
  // jab naam, price aur mins valid ho
  const editValid: boolean =
    eName.trim() !== "" && Number(ePrice) >= 0 && Number(eMins) >= 1;

  // Sidebar search: lowercase trimmed query, section filter ke liye
  const search: string = sectionSearch.trim().toLowerCase();

  // filteredSections: search query se match karne wale sections
  const filteredSections: ServiceSectionDto[] = serviceSections.filter(
    (s: ServiceSectionDto): boolean => s.name.toLowerCase().includes(search)
  );

  // currentItems: left sidebar mein jo section abhi selected hai, sirf uske items.
  // (selectedSectionId null hai to "Uncategorized" wale items — jinki serviceSectionId set nahi hai)
  const currentItems: MenuItemDto[] = items.filter(
    (it: MenuItemDto): boolean => (it.serviceSectionId ?? null) === selectedSectionId
  );

  // atPlanLimit: free plan mein sections ki limit cross ho gayi ya nahi
  const atPlanLimit: boolean =
    planLimit !== null && serviceSections.length >= planLimit;

  // addSection(): naya service section add karta hai
  // FIX: setX({ value: ... }) hata diya, state ab simple types mein hai
  async function addSection(): Promise<void> {
    if (!newSectionName.trim() || addingSection) return;
    setAddingSection(true); // loading state
    try {
      const newSection: ServiceSectionDto = await addServiceSection(sectionCode, {
        name: newSectionName.trim(),
      });
      setServiceSections((prev: ServiceSectionDto[]) => [...prev, newSection]);
      setNewSectionName("");
    } catch (err) {
      setError("Section add nahi ho paaya");
      console.error(err);
    } finally {
      setAddingSection(false);
    }
  }

  // deleteSectionHandler(): service section delete karta hai
  // FIX: confirm() ko string chahiye, object nahi
  async function deleteSectionHandler(sectionId: number): Promise<void> {
    if (!confirm("Ye section delete karna hai?")) return;
    try {
      await deleteServiceSection(sectionId);
      setServiceSections((prev: ServiceSectionDto[]) =>
        prev.filter((s: ServiceSectionDto): boolean => s.id !== sectionId)
      );
      // Agar delete hua section hi selected tha to Uncategorized pe wapas jao
      if (selectedSectionId === sectionId) setSelectedSectionId(null);
    } catch (err) {
      setError("Section delete nahi ho paaya");
      console.error(err);
    }
  }

  // moveItem(): existing item ko ek section se doosre section mein (ya Uncategorized mein) move karta hai
  async function moveItem(it: MenuItemDto, newSectionId: number | null): Promise<void> {
    try {
      await moveItemsToSection(sectionCode, [it.id], newSectionId);
      // Local state turant update karo — refresh() ka wait nahi karna
      setItems((prev: MenuItemDto[]) =>
        prev.map((x: MenuItemDto): MenuItemDto =>
          x.id === it.id ? { ...x, serviceSectionId: newSectionId } : x
        )
      );
    } catch (err) {
      setError("Item move nahi ho paaya");
      console.error(err);
    }
  }

  // add(): "Add Item" button press karne par naya menu item server pe create karta hai.
  // Success hone par form clear ho jaata hai aur list refresh hoti hai.
  // Failure par error message set hota hai.
  async function add(): Promise<void> {
    setError(null);

    try {
      await addMenuItem(sectionCode, {
        name: name.trim(),
        price: Number(price),
        avgMinutes: Number(mins),

        // description ya category empty string ho to null bhejo —
        // backend blank strings nahi chahta
        description: desc.trim() || null,
        category: cat.trim() || null,
        serviceSectionId: selectedSectionId, // selected section mein add karo
      });

      // Item successfully add hua - form ke saare fields reset karo
      setName("");
      setPrice("");
      setMins("");
      setDesc("");
      setCat("");
      refresh();
    } catch {
      setError(t("menu.addFailed"));
    }
  }

  // startEdit(): user jab kisi item ka "Edit" button click kare
  // to is function se edit form open hota hai aur item ki current values
  // edit fields mein fill ho jaati hain
  function startEdit(it: MenuItemDto): void {
    setEditId(it.id);
    setEName(it.name);
    setEPrice(String(it.price));
    setEMins(String(it.avgMinutes));

    // description ya category null ho sakti hai -
    // ?? "" se empty string fallback dete hain
    setEDesc(it.description ?? "");
    setECat(it.category ?? "");
  }

  // saveEdit(): edit form ka "Save" button press karne par
  // changed data server pe update karte hain.
  //
  // editId null check safety ke liye hai (kabhi nahi hoga normal flow mein,
  // par defensive coding).
  // Success hone par edit mode band hota hai aur list refresh hoti hai.
  async function saveEdit(): Promise<void> {
    if (editId == null) return;

    setError(null);

    try {
      await updateMenuItem(editId, {
        name: eName.trim(),
        price: Number(ePrice),
        avgMinutes: Number(eMins),

        // empty string ko null mein convert karo server ke liye
        description: eDesc.trim() || null,
        category: eCat.trim() || null,
      });

      // Edit band karo — list mein wapas normal view aayega
      setEditId(null);

      refresh();
    } catch {
      setError(t("menu.updateFailed"));
    }
  }

  // toggle(): item ke "Enable" / "Disable" button se call hota hai.
  //
  // !it.active use kiya hai - agar abhi active hai to false bheje,
  // agar inactive hai to true bheje.
  //
  // Error handling nahi ki kyunki ye ek simple toggle hai -
  // failure silently ignore hoti hai, refresh() se UI wapas sahi state pe aa jaayega.
  async function toggle(it: MenuItemDto): Promise<void> {
    await setMenuItemActive(it.id, !it.active);
    refresh();
  }

  // remove(): item ka "Delete" button press karne par server se permanently delete karta hai.
  //
  // Agar item kisi existing order mein use hua hai to backend error return karta hai
  // aur hum user ko meaningful error message dikhate hain
  // (item ka naam bhi include karte hain).
  async function remove(it: MenuItemDto): Promise<void> {
    setError(null);

    try {
      await deleteMenuItem(it.id);
      refresh();
    } catch {
      // t("menu.deleteUsed", { name: it.name }) —
      // error message mein item ka naam inject hota hai
      setError(t("menu.deleteUsed", { name: it.name }));
    }
  }

  // Agar data abhi load ho raha hai to sirf loading spinner dikhao,
  // baaki kuch nahi
  if (loading) return <Spinner />;

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      {/* --- Page Header Block ---
          Admin dashboard ka back link + page title + subtitle dikhate hai.
          shopCode se admin dashboard ka URL banta hai wapas jaane ke liye.
      */}
      <div className="mb-5">
        <Link to={`/admin/${shopCode}`} className="text-sm text-brand hover:underline">
          {t("common.backDashboard")}
        </Link>

        {/* sectionCode title mein inject hota hai taaki admin ko pata chale
            kaunse section ka menu hai */}
        <h1 className="text-2xl font-bold mt-1">
          {t("menu.title", { section: sectionCode })}
        </h1>

        <p className="text-gray-500 text-sm">{t("menu.subtitle")}</p>
      </div>

      {/* --- Error Message Block ---
          Koi bhi API operation fail ho to yahan red background mein
          error message dikhte hai.
          error null ho to ye block render hi nahi hota.
      */}
      {error && (
        <div className="mb-4 rounded-lg bg-red-50 border border-red-200 px-4 py-2 text-sm text-red-600">
          {error}
        </div>
      )}

      {/* Main Layout: Sidebar + Content */}
      <div className="flex gap-4 mb-5">
        {/* LEFT SIDEBAR: Service Sections List */}
        <div className="w-48 flex-shrink-0">
          <Card className="bg-blue-50 border-2 border-blue-200">
            <h3 className="font-bold text-lg mb-1 text-blue-900">📋 Services</h3>

            {/* planLimit null = PAID/unlimited plan, warna BASIC plan ka 5-section cap dikhao */}
            <p className="text-xs text-blue-600 mb-3">
              {planLimit === null
                ? `${serviceSections.length} sections · Unlimited (Paid)`
                : `${serviceSections.length}/${planLimit} sections (Free)`}
            </p>

            {/* Add Section Input — limit cross hone par disable ho jaata hai */}
            <div className="mb-2 flex items-center gap-1">
              <input
                type="text"
                placeholder="New..."
                value={newSectionName}
                onChange={(e: ChangeEvent<HTMLInputElement>): void =>
                  setNewSectionName(e.target.value)
                }
                onKeyDown={(e: KeyboardEvent<HTMLInputElement>): void => {
                  // FIX: onKeyPress deprecated hai, onKeyDown use kiya hai
                  if (e.key === "Enter") void addSection();
                }}
                disabled={atPlanLimit}
                className="min-w-0 flex-1 h-9 border border-blue-300 rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-1
                  focus:ring-blue-400 disabled:bg-gray-100 disabled:cursor-not-allowed"
              />
              <Button
                onClick={addSection}
                disabled={!newSectionName.trim() || addingSection || atPlanLimit}
                className="!h-9 !w-9 !p-0 shrink-0 inline-flex items-center justify-center bg-blue-600 hover:bg-blue-700 text-white text-xs"
              >
                +
              </Button>
            </div>

            {/* Free plan limit hit ho gaya to upgrade hint dikhao */}
            {atPlanLimit && (
              <p className="text-xs text-amber-600 mb-2">
                Limit poora ho gaya — zyada sections ke liye upgrade karo
              </p>
            )}

            {/* Search box — jab sections list lambi ho jaaye to naam se dhundo */}
            {serviceSections.length > 5 && (
              <input
                type="text"
                placeholder="🔍 Search sections..."
                value={sectionSearch}
                onChange={(e: ChangeEvent<HTMLInputElement>): void =>
                  setSectionSearch(e.target.value)
                }
                className="w-full mb-2 border border-blue-200 rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-400"
              />
            )}

            {/* Services List — fixed height + scroll, taaki 15-20 sections hone par
                page neeche tak nahi badhta rahe, isi box ke andar scroll ho jaaye */}
            <div className="space-y-1 max-h-80 overflow-y-auto pr-1">
              {/* "No Section" option — search active ho to ye bhi hide ho sakta hai, isliye search blank hone par hi dikhao */}
              {search === "" && (
                <button
                  onClick={(): void => setSelectedSectionId(null)}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-all ${
                    selectedSectionId === null
                      ? "bg-blue-600 text-white font-semibold"
                      : "bg-white text-gray-700 hover:bg-blue-100"
                  }`}
                >
                  📁 Uncategorized
                </button>
              )}

              {/* Actual Sections — search filter se match karne wale hi dikhte hain */}
              {filteredSections.map((section: ServiceSectionDto): JSX.Element => (
                <div key={section.id} className="flex items-center gap-1 group">
                  <button
                    onClick={(): void =>
                      setSelectedSectionId(selectedSectionId === section.id ? null : section.id)
                    }
                    className={`flex-1 text-left px-3 py-2 rounded-lg text-sm transition-all truncate ${
                      selectedSectionId === section.id
                        ? "bg-blue-600 text-white font-semibold"
                        : "bg-white text-gray-700 hover:bg-blue-100"
                    }`}
                  >
                    📝 {section.name}
                  </button>
                  <button
                    onClick={(): void => void deleteSectionHandler(section.id)}
                    className="opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-700 text-xs font-bold px-1"
                  >
                    ×
                  </button>
                </div>
              ))}

              {/* Search se kuch match nahi hua */}
              {search !== "" && filteredSections.length === 0 && (
                <p className="text-xs text-gray-400 px-1">Koi section nahi mila</p>
              )}
            </div>
          </Card>
        </div>

        {/* RIGHT CONTENT: Add Item Form + Items list */}
        <div className="flex-1">
          {/* --- "Add New Item" Form Block ---
              Naya menu item add karne ka form.
              Name, price, estimated minutes, description aur category ke inputs hain.
              Sab valid ho tabhi Add button enable hoga.
          */}
          <Card className="mb-5">
            <h2 className="font-semibold mb-3">{t("menu.newItem")}</h2>

            {/* Pehli row: naam (2 columns wide), price, estimated minutes */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
              <input
                value={name}
                placeholder={t("menu.name")}
                onChange={(e: ChangeEvent<HTMLInputElement>): void => setName(e.target.value)}
                className="sm:col-span-2 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/40"
              />

              <input
                type="number"
                min="0"
                value={price}
                placeholder={t("menu.price")}
                onChange={(e: ChangeEvent<HTMLInputElement>): void => setPrice(e.target.value)}
                className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/40"
              />

              {/* min="1" — estimated time kam se kam 1 minute hona chahiye */}
              <input
                type="number"
                min="1"
                value={mins}
                placeholder={t("menu.min")}
                onChange={(e: ChangeEvent<HTMLInputElement>): void => setMins(e.target.value)}
                className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/40"
              />
            </div>

            {/* Doosri row: description aur category (dono optional fields hain) */}
            <div className="grid grid-cols-2 gap-2 mt-2">
              <input
                value={desc}
                placeholder={t("menu.descPlaceholder")}
                onChange={(e: ChangeEvent<HTMLInputElement>): void => setDesc(e.target.value)}
                className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/40"
              />

              <input
                value={cat}
                placeholder="Category (e.g. Starters)"
                onChange={(e: ChangeEvent<HTMLInputElement>): void => setCat(e.target.value)}
                className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/40"
              />
            </div>

            {/* Add button - addValid false ho to disabled rehta hai */}
            <Button onClick={add} disabled={!addValid} className="mt-3 w-full">
              {t("menu.addBtn")}
            </Button>

            {/* Hint message: sirf tab dikhao jab user ne kuch type kiya ho
                lekin form abhi valid nahi hai.
                Agar teenon fields empty hain to hint dikhane ki zarurat nahi -
                user ne abhi kuch likha hi nahi. */}
            {!addValid && (name !== "" || price !== "" || mins !== "") && (
              <p className="text-xs text-gray-400 mt-1">{t("menu.addHint")}</p>
            )}
          </Card>

          {/* --- Menu Items List Block ---
              currentItems = jo section abhi left sidebar mein selected hai, uske items.
              Section badalne par list automatically badal jaati hai. */}
          <div className="space-y-2">
            <h3 className="font-semibold text-gray-700 mb-2">
              {selectedSectionId === null
                ? "📁 Uncategorized"
                : `📝 ${
                    serviceSections.find(
                      (s: ServiceSectionDto): boolean => s.id === selectedSectionId
                    )?.name ?? ""
                  }`}{" "}
              ({currentItems.length})
            </h3>

            {currentItems.map((it: MenuItemDto): JSX.Element => (
              // Inactive item ka card 60% opacity pe dikhta hai — visually "disabled" lagta hai
              <Card key={it.id} className={it.active ? "" : "opacity-60"}>
                {/* Agar ye item currently edit mode mein hai (editId match karta hai) to edit form dikhao */}
                {editId === it.id ? (
                  // --- Inline Edit Form ---
                  // Same grid layout as add form: naam (2 cols), price, mins, desc, cat, buttons
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 items-center">
                    <input
                      value={eName}
                      onChange={(e: ChangeEvent<HTMLInputElement>): void => setEName(e.target.value)}
                      className="sm:col-span-2 border border-gray-200 rounded-xl px-3 py-2 text-sm"
                    />
                    <input
                      type="number"
                      min="0"
                      value={ePrice}
                      onChange={(e: ChangeEvent<HTMLInputElement>): void => setEPrice(e.target.value)}
                      className="border border-gray-200 rounded-xl px-3 py-2 text-sm"
                    />
                    <input
                      type="number"
                      min="1"
                      value={eMins}
                      onChange={(e: ChangeEvent<HTMLInputElement>): void => setEMins(e.target.value)}
                      className="border border-gray-200 rounded-xl px-3 py-2 text-sm"
                    />
                    <input
                      value={eDesc}
                      placeholder="Description (optional)"
                      onChange={(e: ChangeEvent<HTMLInputElement>): void => setEDesc(e.target.value)}
                      className="sm:col-span-2 border border-gray-200 rounded-xl px-3 py-2 text-sm"
                    />
                    <input
                      value={eCat}
                      placeholder="Category (optional)"
                      onChange={(e: ChangeEvent<HTMLInputElement>): void => setECat(e.target.value)}
                      className="sm:col-span-2 border border-gray-200 rounded-xl px-3 py-2 text-sm"
                    />

                    {/* Edit form ke action buttons: Cancel (edit band karo) aur Save (changes save karo) */}
                    <div className="sm:col-span-4 flex gap-2 justify-end">
                      {/* Cancel: editId null kar do — form close ho jaata hai bina save kiye */}
                      <Button variant="ghost" onClick={(): void => setEditId(null)}>
                        {t("common.cancel")}
                      </Button>
                      {/* Save: editValid false ho to disabled rehta hai */}
                      <Button onClick={(): Promise<void> => saveEdit()} disabled={!editValid}>
                        {t("common.save")}
                      </Button>
                    </div>
                  </div>
                ) : (
                  // --- Normal Item View (Read Mode) ---
                  // Item ka naam, price, estimated time, category badge, description dikhata hai
                  // aur right side mein Edit / Enable-Disable / Delete buttons hain
                  <div className="flex items-center justify-between">
                    {/* Left side: item ki details */}
                    <div>
                      <div className="font-medium">
                        {it.name}
                        {/* Agar item inactive hai to "(Disabled)" jaisa tag naam ke saath dikhao */}
                        {!it.active && (
                          <span className="text-xs text-gray-400 ml-2">{t("admin.disabledTag")}</span>
                        )}
                      </div>

                      {/* Price aur estimated time, aur agar category ho to colored badge */}
                      <div className="text-xs text-gray-400 flex items-center gap-2">
                        <span>₹{it.price} · ~{it.avgMinutes} min</span>
                        {/* Category sirf tab dikhao jab set ho — optional field hai */}
                        {it.category && (
                          <span className="bg-brand/10 text-brand px-1.5 py-0.5 rounded-full text-xs">
                            {it.category}
                          </span>
                        )}
                      </div>

                      {/* Description sirf tab dikhao jab set ho — optional field hai */}
                      {it.description && (
                        <div className="text-xs text-gray-500 mt-0.5">{it.description}</div>
                      )}
                    </div>

                    {/* Right side: action buttons */}
                    <div className="flex items-center gap-3 text-sm">
                      {/* Move to section: isi item ko kisi doosre section (ya Uncategorized) mein shift karo */}
                      <select
                        value={it.serviceSectionId ?? ""}
                        onChange={(e: ChangeEvent<HTMLSelectElement>): void =>
                          void moveItem(it, e.target.value === "" ? null : Number(e.target.value))
                        }
                        className="text-xs border border-gray-200 rounded-lg px-1.5 py-1 text-gray-600 bg-white focus:outline-none focus:ring-1 focus:ring-brand/40"
                      >
                        <option value="">📁 Uncategorized</option>
                        {serviceSections.map((s: ServiceSectionDto): JSX.Element => (
                          <option key={s.id} value={s.id}>
                            📝 {s.name}
                          </option>
                        ))}
                      </select>

                      {/* Edit button: is item ka data edit fields mein fill karke edit mode open karo */}
                      <button onClick={(): void => startEdit(it)} className="text-brand hover:underline">
                        {t("common.edit")}
                      </button>

                      {/* Toggle button: agar item active hai to "Disable" dikhao, agar inactive hai to "Enable" */}
                      <button onClick={(): void => void toggle(it)} className="text-gray-500 hover:underline">
                        {it.active ? t("common.disable") : t("common.enable")}
                      </button>

                      {/* Delete button: red color se warn karte hai — permanently delete hoga */}
                      <button onClick={(): void => void remove(it)} className="text-red-400 hover:text-red-600">
                        {t("common.delete")}
                      </button>
                    </div>
                  </div>
                )}
              </Card>
            ))}

            {/* Agar is section mein koi item nahi hai to empty state message dikhao */}
            {currentItems.length === 0 && (
              <Card className="text-center text-gray-400 py-6">{t("menu.empty")}</Card>
            )}
          </div>
        </div>
        {/* end flex-1 right content */}
      </div>
      {/* end sidebar + content flex row */}
    </div>
  );
}
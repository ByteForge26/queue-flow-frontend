import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  addSection,
  assignStaffSections,
  changeOwnPassword,
  createStaff,
  deleteSection,
  deleteStaff,
  deletePaymentQr,
  exportOrdersCsv,
  exportOrdersExcel,
  getAdminHistory,
  getAdminOverview,
  getAdminQrBlob,
  getAdminQrUrl,
  getPaymentQrBlob,
  getPlatformConfig,
  getShopDetails,
  getStaffAnalytics,
  getStaffUsers,
  login,
  resetStaffPassword,
  selectBasicServices,
  setShopOpen as apiSetShopOpen,
  setSectionActive,
  updateShopDetails,
  uploadPaymentQr,
} from "../lib/api";
import type { AdminOverviewDto, HistoryDto, SectionStatsDto, ShopDetailDto, StaffStatsDto, StaffUserDto } from "../lib/types";
import CountryTypeahead from "../components/CountryTypeahead";
import { Card, Spinner, StatusBadge } from "../components/ui";
import { Button } from "../components/ui";
import { clearAuth, getAuth } from "../lib/auth";
import { OrderExtras } from "./StaffPage";
import { useT } from "../i18n/LanguageContext";
import LanguageToggle from "../components/LanguageToggle";

// Section industryType -> left border color class
const SECTION_BORDER: Record<string, string> = {
  SALON: "border-l-4 border-l-pink-400",
  FOOD: "border-l-4 border-l-orange-400",
  CLINIC: "border-l-4 border-l-blue-400",
  GROCERY: "border-l-4 border-l-green-400",
  ROOMS: "border-l-4 border-l-purple-400",
  GENERAL: "border-l-4 border-l-gray-400",
  OTHER: "border-l-4 border-l-slate-400",
};

export default function AdminPage() {
  const { shopCode = "" } = useParams();
  const navigate = useNavigate();
  const auth = getAuth();
  const t = useT();

  const [overview, setOverview] = useState<AdminOverviewDto | null>(null);
  const [history, setHistory] = useState<HistoryDto | null>(null);
  const [staff, setStaff] = useState<StaffUserDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [newType, setNewType] = useState("");
  const [sectionMsg, setSectionMsg] = useState<string | null>(null);
  const [sectionInfoOpen, setSectionInfoOpen] = useState<string | null>(null); // sectionCode
  const [deleteTarget, setDeleteTarget] = useState<SectionStatsDto | null>(null);
  const [removeTarget, setRemoveTarget] = useState<SectionStatsDto | null>(null);
  const [disableBlocked, setDisableBlocked] = useState<{ name: string; liveCount: number } | null>(null);

  // shop live/offline
  const [shopOpen, setShopOpen] = useState(true);
  const [shopOpenToggling, setShopOpenToggling] = useState(false);

  // QR code modal
  const [qrModal, setQrModal] = useState<{ blobUrl: string; shopUrl: string } | null>(null);


  // Payment QR (UPI etc,) - admin apna QR upload karta hai , preview blobUrl state mein hota hai
  const [paymentQrPreview, setPaymentQrPreview] = useState<string | null>(null);
  const [paymentQrUploading, setPaymentQrUploading] = useState(false);
  const [paymentQrMsg, setPaymentQrMsg] = useState<string | null>(null);

  // force service select (BASIC downgrade)
  const [basicServiceKeep, setBasicServiceKeep] = useState<string[]>([]);
  const [basicSelectMsg, setBasicSelectMsg] = useState<string | null>(null);
  const [basicSelectSaving, setBasicSelectSaving] = useState(false);

  // plan info
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [platformConfig, setPlatformConfig] = useState<{ showPlanInfoIcon: boolean; showPlanBadge: boolean;
    paidPrice: string; paidCurrency: string; bannedServiceTypes: string[]; paymentQrEnabled: boolean; }>({ showPlanInfoIcon: false,
    showPlanBadge: false, paidPrice: "", paidCurrency: "INR", bannedServiceTypes: [], paymentQrEnabled: false });

  // shop details edit
  const [shopDetail, setShopDetail] = useState<ShopDetailDto | null>(null);
  const [editName, setEditName] = useState("");
  const [editCountry, setEditCountry] = useState("");
  const [editState, setEditState] = useState("");
  const [editCity, setEditCity] = useState("");
  const [editPincode, setEditPincode] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editAddress, setEditAddress] = useState("");
  const [editOpenTime, setEditOpenTime] = useState("");
  const [editCloseTime, setEditCloseTime] = useState("");
  const [editOperatingDays, setEditOperatingDays] = useState("");
  const [shopDetailMsg, setShopDetailMsg] = useState<string | null>(null);
  const [shopDetailSaving, setShopDetailSaving] = useState(false);
  const [shopDetailsOpen, setShopDetailsOpen] = useState(false);

  // request modal
  const [requestModal, setRequestModal] = useState<string | null>(null);

  // staff analytics
  const [staffAnalytics, setStaffAnalytics] = useState<StaffStatsDto[]>([]);
  const [showStaffAnalytics, setShowStaffAnalytics] = useState(false);

  // order search
  const [historySearch, setHistorySearch] = useState("");

  // recovery code reveal
  const [showRecoveryModal, setShowRecoveryModal] = useState(false);
  const [recoveryConfirmUser, setRecoveryConfirmUser] = useState("");
  const [recoveryConfirmPw, setRecoveryConfirmPw] = useState("");
  const [recoveryConfirmErr, setRecoveryConfirmErr] = useState("");
  const [recoveryCodeVisible, setRecoveryCodeVisible] = useState(false);

  // own password
  const [curPw, setCurPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [pwMsg, setPwMsg] = useState<string | null>(null);
  // staff password reset
  const [staffUser, setStaffUser] = useState("");
  const [staffNewPw, setStaffNewPw] = useState("");
  const [staffPwMsg, setStaffPwMsg] = useState<string | null>(null);
  // staff section assignment
  const [assignUser, setAssignUser] = useState("");
  const [assignCodes, setAssignCodes] = useState<string[]>([]);
  const [assignMsg, setAssignMsg] = useState<string | null>(null);
  // add staff
  const [newStaffUser, setNewStaffUser] = useState("");
  const [newStaffPw, setNewStaffPw] = useState("");
  const [newStaffSections, setNewStaffSections] = useState<string[]>([]);
  const [addStaffMsg, setAddStaffMsg] = useState<string | null>(null);
  const [addStaffSubmitting, setAddStaffSubmitting] = useState(false);
  // delete staff
  const [deleteStaffMsg, setDeleteStaffMsg] = useState<string | null>(null);

  // Tab navigation
  const [adminTab, setAdminTab] = useState<"overview" | "services" | "staff" | "settings" | "history" | "support">("overview");

//   const refresh = useCallback(() => {
//     Promise.all([getAdminOverview(), getAdminHistory(), getStaffUsers(), getShopDetails(), getPlatformConfig()])
//       .then(([o, h, st, sd, cfg]) => {
//         setOverview(o);
//         setHistory(h);
//         setStaff(st);
//         setShopDetail(sd);
//         setShopOpen(sd.open);
//         setPlatformConfig({
//                   showPlanInfoIcon: cfg.showPlanInfoIcon,
//                   showPlanBadge: cfg.showPlanBadge,
//                   paidPrice: cfg.paidPrice,
//                   paidCurrency: cfg.paidCurrency,
//                   bannedServiceTypes: cfg.bannedServiceTypes ?? [],
//                   paymentQrEnabled: cfg.paymentQrEnabled,
//                 });
//         setPlatformConfig({ showPlanInfoIcon: cfg.showPlanInfoIcon, showPlanBadge: cfg.showPlanBadge,
//           paidPrice: cfg.paidPrice, paidCurrency: cfg.paidCurrency, bannedServiceTypes: cfg.bannedServiceTypes ?? [] });
//         setEditName(sd.name ?? "");
//         setEditCountry(sd.country ?? "");
//         setEditState(sd.state ?? "");
//         setEditCity(sd.city ?? "");
//         setEditPincode(sd.pincode ?? "");
//         setEditPhone(sd.phone ?? "");
//         setEditAddress(sd.address ?? "");
//         setEditOpenTime(sd.openTime ?? "");
//         setEditCloseTime(sd.closeTime ?? "");
//         setEditOperatingDays(sd.operatingDays ?? "");
//       })
//       .finally(() => setLoading(false));
//   }, []);


  const refresh = useCallback(() => {
    // Platform config alag call mein, taaki kisi aur API ke fail hone se ye na ruke
    getPlatformConfig()
      .then((cfg) => {
        setPlatformConfig({
          showPlanInfoIcon: cfg.showPlanInfoIcon,
          showPlanBadge: cfg.showPlanBadge,
          paidPrice: cfg.paidPrice,
          paidCurrency: cfg.paidCurrency,
          bannedServiceTypes: cfg.bannedServiceTypes ?? [],
          paymentQrEnabled: cfg.paymentQrEnabled,
        });
      })
      .catch(() => {});

    Promise.all([getAdminOverview(), getAdminHistory(), getStaffUsers(), getShopDetails()])
      .then(([o, h, st, sd]) => {
        setOverview(o);
        setHistory(h);
        setStaff(st);
        setShopDetail(sd);
        setShopOpen(sd.open);
        setEditName(sd.name ?? "");
        setEditCountry(sd.country ?? "");
        setEditState(sd.state ?? "");
        setEditCity(sd.city ?? "");
        setEditPincode(sd.pincode ?? "");
        setEditPhone(sd.phone ?? "");
        setEditAddress(sd.address ?? "");
        setEditOpenTime(sd.openTime ?? "");
        setEditCloseTime(sd.closeTime ?? "");
        setEditOperatingDays(sd.operatingDays ?? "");
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  //Shop ke paas pehle se uploaded payment QR hai toh preview load karo (ek baar)
  useEffect(() => {
    if (shopDetail?.hasPaymentQr && !paymentQrPreview) {
      getPaymentQrBlob()
        .then((blob) => setPaymentQrPreview(URL.createObjectURL(blob)))
        .catch(() => {});
    }
  }, [shopDetail?.code]);

  async function toggleShopOpen() {
    setShopOpenToggling(true);
    try {
      await apiSetShopOpen(!shopOpen);
      setShopOpen((v) => !v);
    } finally {
      setShopOpenToggling(false);
    }
  }

  async function confirmRecoveryReveal() {
    setRecoveryConfirmErr("");
    try {
      await login({ username: recoveryConfirmUser, password: recoveryConfirmPw });
      setRecoveryCodeVisible(true);
      setShowRecoveryModal(false);
      setRecoveryConfirmUser("");
      setRecoveryConfirmPw("");
    } catch {
      setRecoveryConfirmErr(t("auth.badCreds"));
    }
  }

  async function saveShopDetails() {
    setShopDetailMsg(null);
    setShopDetailSaving(true);
    try {
      await updateShopDetails({
        name: editName, country: editCountry, state: editState,
        city: editCity, pincode: editPincode, phone: editPhone, address: editAddress,
        openTime: editOpenTime, closeTime: editCloseTime, operatingDays: editOperatingDays,
      });
      setShopDetailMsg(t("admin.shopDetailsSaved"));
      setShopDetailSaving(false);
      setTimeout(() => {
        clearAuth();
        navigate("/shop");
      }, 2000);
    } catch {
      setShopDetailMsg(t("admin.shopDetailsFailed"));
      setShopDetailSaving(false);
    }
  }

  async function handleExportCsv() {
    try {
      const blob = await exportOrdersCsv();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = "orders.csv"; a.click();
      URL.revokeObjectURL(url);
    } catch { /* silent */ }
  }

    // Multi-sheet Excel report — Summary sheet + har service ka apna sheet
    // (section-wise tables aur totals ke saath)
    async function handleExportExcel(): Promise<void> {
      try {
        const blob: Blob = await exportOrdersExcel();
        const url: string = URL.createObjectURL(blob);
        const a: HTMLAnchorElement = document.createElement("a");
        a.href = url; a.download = "orders.xlsx"; a.click();
        URL.revokeObjectURL(url);
      } catch { /* silent */ }
    }

  async function loadStaffAnalytics() {
    const data = await getStaffAnalytics();
    setStaffAnalytics(data);
    setShowStaffAnalytics(true);
  }

  function logout() {
    clearAuth();
    navigate("/shop");
  }
  async function openQrModal() {
    try {
      const [blob, shopUrl] = await Promise.all([getAdminQrBlob(), getAdminQrUrl()]);
      const blobUrl = URL.createObjectURL(blob);
      setQrModal({ blobUrl, shopUrl });
    } catch { /* silent */ }
  }

  // Payment QR - naya image upload karo (file input se)
  async function handlePaymentQrUpload(file: File | undefined): Promise<void> {
    if (!file) return;
    setPaymentQrUploading(true);
    setPaymentQrMsg(null);
    try {
      await uploadPaymentQr(file);
      const blob = await getPaymentQrBlob();
      if (paymentQrPreview) URL.revokeObjectURL(paymentQrPreview);
      setPaymentQrPreview(URL.createObjectURL(blob));
      setShopDetail((prev) => prev ? { ...prev, hasPaymentQr: true } : prev);
      setPaymentQrMsg(null);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: string } })?.response?.data;
      setPaymentQrMsg(typeof msg === "string" ? msg : "QR upload nahi ho paaya");
    } finally {
      setPaymentQrUploading(false);
    }
  }

  // Payment QR - uploaded QR hatao
  async function handlePaymentQrDelete(): Promise<void> {
    try {
      await deletePaymentQr();
      if (paymentQrPreview) URL.revokeObjectURL(paymentQrPreview);
      setPaymentQrPreview(null);
      setShopDetail((prev) => prev ? { ...prev, hasPaymentQr: false } : prev);
    } catch { /* silent */ }
  }


  async function handleBasicServiceSelect() {
    if (basicServiceKeep.length < 1 || basicServiceKeep.length > 2) return;
    setBasicSelectMsg(null);
    setBasicSelectSaving(true);
    try {
      const updated = await selectBasicServices(basicServiceKeep);
      setShopDetail(updated);
      setBasicServiceKeep([]);
      await refresh();
    } catch {
      setBasicSelectMsg("Kuch galat hua. Dobara try karo.");
    } finally {
      setBasicSelectSaving(false);
    }
  }

  async function addNewService() {
    if (!newType) return;
    setSectionMsg(null);
    try {
      const o = await addSection(newType);
      setOverview(o);
      setNewType("");
    } catch (e: unknown) {
      const err = e as { response?: { status?: number; data?: { message?: string; error?: string } } };
      const status = err.response?.status;
      const serverMsg = err.response?.data?.message || err.response?.data?.error;
      if (status === 403 && serverMsg?.toLowerCase().includes("ban")) {
        setSectionMsg(t("admin.serviceTypeBanned"));
      } else if (status === 409) {
        setSectionMsg(t("admin.dupService"));
      } else {
        setSectionMsg(t("admin.serviceAddFailed"));
      }
    }
  }

  async function toggleSection(sectionCode: string, active: boolean) {
    setSectionMsg(null);
    if (!active) {
      // disabling — check live orders first
      const section = overview?.sections.find((s) => s.sectionCode === sectionCode);
      const liveCount = section ? section.waiting + section.inProgress + section.ready : 0;
      if (liveCount > 0) {
        setDisableBlocked({ name: section!.displayName, liveCount });
        return;
      }
    }
    try {
      const o = await setSectionActive(sectionCode, active);
      setOverview(o);
    } catch (e: unknown) {
      const err = e as { response?: { status?: number; data?: { error?: string; message?: string } } };
      const serverMsg = err.response?.data?.message || err.response?.data?.error;
      setSectionMsg(
        err.response?.status === 409
          ? serverMsg || t("admin.disableFailed")
          : t("admin.changeFailed")
      );
    }
  }

  // no live orders: show remove confirm modal
  function removeSection(s: SectionStatsDto) {
    setSectionMsg(null);
    setRemoveTarget(s);
  }

  async function doRemove(sectionCode: string) {
    setRemoveTarget(null);
    setSectionMsg(null);
    try {
      const o = await deleteSection(sectionCode);
      setOverview(o);
    } catch (e: unknown) {
      const status = (e as { response?: { status?: number } })?.response?.status;
      setSectionMsg(status === 409 ? t("admin.atLeastOneService") : t("admin.deleteFailed"));
    }
  }

  async function doDelete(sectionCode: string) {
    setSectionMsg(null);
    setDeleteTarget(null);
    try {
      const o = await deleteSection(sectionCode);
      setOverview(o);
    } catch (e: unknown) {
      const status = (e as { response?: { status?: number } })?.response?.status;
      setSectionMsg(status === 409 ? t("admin.atLeastOneService") : t("admin.deleteFailed"));
    }
  }

  // delete button click: block if live orders present
  function handleDeleteClick(s: SectionStatsDto) {
    setSectionMsg(null);
    const liveCount = s.waiting + s.inProgress + s.ready;
    if (liveCount > 0) {
      setDisableBlocked({ name: s.displayName, liveCount });
      return;
    }
    setDeleteTarget(s);
  }

  async function submitOwnPassword() {
    setPwMsg(null);
    try {
      await changeOwnPassword(curPw, newPw);
      setCurPw("");
      setNewPw("");
      setPwMsg(t("admin.pwUpdated"));
    } catch (e: unknown) {
      const status = (e as { response?: { status?: number } })?.response?.status;
      setPwMsg(status === 401 ? t("admin.pwWrongCurrent") : t("admin.pwFailed"));
    }
  }

  async function submitStaffPassword() {
    setStaffPwMsg(null);
    if (!staffUser) {
      setStaffPwMsg(t("admin.pickStaffFirst"));
      return;
    }
    try {
      await resetStaffPassword(staffUser, staffNewPw);
      setStaffNewPw("");
      setStaffPwMsg(t("admin.staffPwReset", { user: staffUser }));
    } catch {
      setStaffPwMsg(t("admin.staffPwFailed"));
    }
  }

  // staff chuno -> uske current sections pre-select
  function pickAssignUser(username: string) {
    setAssignUser(username);
    setAssignMsg(null);
    const s = staff.find((x) => x.username === username);
    setAssignCodes(s ? [...s.sectionCodes] : []);
  }

  async function saveAssign() {
    setAssignMsg(null);
    if (!assignUser) {
      setAssignMsg(t("admin.pickStaffFirst"));
      return;
    }
    try {
      await assignStaffSections(assignUser, assignCodes);
      setAssignMsg(t("admin.servicesUpdated", { user: assignUser }));
      const st = await getStaffUsers();
      setStaff(st);
    } catch {
      setAssignMsg(t("admin.servicesFailed"));
    }
  }

  async function submitAddStaff() {
    setAddStaffMsg(null);
    if (!newStaffUser.trim()) return;
    if (newStaffSections.length === 0) {
      setAddStaffMsg(t("admin.staffAddPickSection"));
      return;
    }
    setAddStaffSubmitting(true);
    try {
      await createStaff({ username: newStaffUser.trim(), password: newStaffPw, sectionCodes: newStaffSections });
      setAddStaffMsg(t("admin.staffAdded", { user: newStaffUser.trim() }));
      setNewStaffUser("");
      setNewStaffPw("");
      setNewStaffSections([]);
      const st = await getStaffUsers();
      setStaff(st);
    } catch {
      setAddStaffMsg(t("admin.staffAddFailed"));
    } finally {
      setAddStaffSubmitting(false);
    }
  }

  async function removeStaff(username: string) {
    setDeleteStaffMsg(null);
    if (!window.confirm(t("admin.confirmDeleteStaff", { user: username }))) return;
    try {
      await deleteStaff(username);
      setDeleteStaffMsg(t("admin.staffDeleted", { user: username }));
      const st = await getStaffUsers();
      setStaff(st);
    } catch {
      setDeleteStaffMsg(t("admin.staffDeleteFailed"));
    }
  }

  if (loading) return <Spinner />;

  // Force service select screen — BASIC downgrade ke baad, jab tak admin services choose nahi karta
  if (shopDetail?.forceServiceSelect && shopDetail?.tierSystemEnabled && shopDetail?.plan === "BASIC") {
    const allSections = overview?.sections ?? [];
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="bg-white rounded-2xl shadow border border-gray-100 p-8 w-full max-w-sm">
          <div className="text-center mb-5">
            <div className="text-3xl mb-2">⚠️</div>
            <h1 className="text-xl font-bold mb-1">{t("admin.forceSelectTitle")}</h1>
            <p className="text-sm text-gray-500">{t("admin.forceSelectDesc")}</p>
          </div>
          <div className="space-y-2 mb-4">
            {allSections.length === 0 && (
              <p className="text-sm text-gray-400 text-center">{t("admin.forceSelectLoading")}</p>
            )}
            {allSections.map((s) => (
              <label key={s.sectionCode} className="flex items-center gap-3 cursor-pointer p-3 rounded-xl border border-gray-200 hover:border-brand transition">
                <input
                  type="checkbox"
                  checked={basicServiceKeep.includes(s.sectionCode)}
                  onChange={() =>
                    setBasicServiceKeep((prev) =>
                      prev.includes(s.sectionCode)
                        ? prev.filter((c) => c !== s.sectionCode)
                        : prev.length < 2 ? [...prev, s.sectionCode] : prev
                    )
                  }
                  className="rounded accent-brand"
                />
                <span className="text-sm font-medium">{s.displayName}</span>
                <span className="text-xs text-gray-400 ml-auto">{s.industryType}</span>
              </label>
            ))}
          </div>
          <p className="text-xs text-gray-400 mb-3 text-center">{basicServiceKeep.length}/2 {t("admin.forceSelectCount")}</p>
          {basicSelectMsg && <p className="text-xs text-red-500 mb-2 text-center">{basicSelectMsg}</p>}
          <Button
            onClick={handleBasicServiceSelect}
            disabled={basicServiceKeep.length === 0 || basicSelectSaving}
            className="w-full"
          >
            {basicSelectSaving ? t("common.saving") : t("admin.forceSelectConfirm")}
          </Button>
          <button onClick={logout} className="w-full mt-3 text-sm text-gray-400 hover:underline">
            Logout
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-4 sm:px-6 lg:px-8">
      {/* Save success toast */}
      {shopDetailMsg && shopDetailMsg.includes("✓") && (
        <div className="fixed top-4 left-1/2 z-50 flex -translate-x-1/2 items-center gap-2 rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-medium text-white shadow-lg">
          <span>{shopDetailMsg}</span>
          <span className="text-xs text-emerald-200">{t("admin.shopDetailsRelogin")}</span>
        </div>
      )}

      {/* Gradient header — always visible */}
      <div className="rounded-[28px] bg-gradient-to-r from-brand via-indigo-600 to-violet-600 px-5 pb-4 pt-5 text-white shadow-[0_18px_45px_rgba(79,70,229,0.22)]">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-indigo-100">Admin Workspace</p>
            <h1 className="mt-2 text-3xl font-bold">{overview?.shopName ?? shopCode}</h1>
            <p className="mt-1 text-sm text-indigo-100">{t("admin.adminRole")}</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" onClick={refresh} className="border-white/20 bg-white/10 text-white hover:bg-white/15">
              {t("common.refresh")}
            </Button>
            {auth && (
              <Button variant="ghost" onClick={logout} className="border-white/20 bg-white/10 text-white hover:bg-white/15">
                {t("common.logout")}
              </Button>
            )}
            <LanguageToggle />
          </div>
        </div>
      </div>

      {/* Tab content — padded bottom for sticky nav */}
      <div className="pb-20 pt-4">

        {/* ── OVERVIEW TAB ── */}
        {adminTab === "overview" && (
          <>
            <TabInfo icon="🏠" title={t("admin.tabInfoOverviewTitle")}
              color="indigo" bullets={[t("admin.tabInfoOverview1"), t("admin.tabInfoOverview2"),
                t("admin.tabInfoOverview3"), t("admin.tabInfoOverview4")]} />
            {/* Shop code + Live/Offline toggle + QR */}
            <Card className="mb-4 border border-indigo-100 bg-gradient-to-br from-white to-indigo-50/60">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <div className="text-xs text-gray-400 uppercase tracking-wide">{t("admin.shopCode")}</div>
                  <div className="flex items-center gap-2">
                    <div className="text-lg font-bold text-brand">{shopCode}</div>
                    {shopDetail && platformConfig.showPlanBadge && (
                      <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${shopDetail.plan === "PAID"
                        ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
                        {shopDetail.plan === "PAID" ? t("admin.planBadgePaid") : t("admin.planBadgeBasic")}
                      </span>
                    )}
                    {platformConfig.showPlanInfoIcon && (
                      <button onClick={() => setShowPlanModal(true)} className="text-gray-400 hover:text-gray-600 text-base leading-none" title="Plan info">ℹ️</button>
                    )}
                    {shopDetail?.plan === "BASIC" && (
                      <button onClick={() => setShowUpgradeModal(true)}
                        className="text-xs bg-gradient-to-r from-brand to-indigo-500 text-white px-2.5 py-1 rounded-full font-semibold hover:opacity-90 transition">
                        {t("admin.upgradeToPaid")} ✨
                      </button>
                    )}
                  </div>
                  <div className="text-xs text-gray-400 mt-0.5">{t("admin.shopCodeNote")}</div>
                </div>
                <Button
                  variant="ghost"
                  onClick={() => {
                    navigator.clipboard?.writeText(shopCode);
                    setCopied(true);
                  }}
                >
                  {copied ? t("common.copied") : t("common.copy")}
                </Button>
              </div>
              {/* Live / Offline toggle */}
              <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                <div className="flex items-center gap-2">
                  <span className={`w-2.5 h-2.5 rounded-full ${shopOpen ? "bg-emerald-500" : "bg-red-400"}`} />
                  <span className="text-sm font-medium">
                    {shopOpen ? t("admin.shopLiveToggle") : t("admin.shopOfflineToggle")}
                  </span>
                </div>
                <Button
                  variant={shopOpen ? "ghost" : "success"}
                  onClick={toggleShopOpen}
                  disabled={shopOpenToggling}
                  className="text-sm"
                >
                  {shopOpen ? t("admin.goOffline") : t("admin.goLive")}
                </Button>
              </div>
              {/* QR Code */}
              <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                <div>
                  <p className="text-sm font-medium">{t("admin.qrCodeTitle")}</p>
                  <p className="text-xs text-gray-400">{t("admin.qrCodeDesc")}</p>
                </div>
                <Button variant="ghost" onClick={openQrModal} className="text-sm">{t("admin.qrCodeView")}</Button>
              </div>
            </Card>

            {/* Payment QR (UPI etc.) — sirf PAID plan mein aur jab superadmin ne feature ban nahi kiya ho */}
            <div className="border-t border-slate-200 pt-3">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <p className="text-sm font-medium">💳 Payment QR</p>
                  <p className="text-xs text-gray-400">Apna UPI/payment QR upload karo — customer order place karne ke baad isse scan karega</p>
                </div>
              </div>

              {!platformConfig.paymentQrEnabled ? (
                <p className="text-xs text-amber-600 italic">Ye feature abhi platform par disable hai</p>
              ) : shopDetail?.plan !== "PAID" ? (
                <p className="text-xs text-gray-400 italic">Sirf PAID plan mein available hai — pehle upgrade karo</p>
              ) : (
                <div className="flex items-center gap-3">
                  {paymentQrPreview && (
                    <img src={paymentQrPreview} alt="Payment QR" className="w-16 h-16 rounded-lg border border-gray-200 object-contain" />
                  )}
                  <div className="flex-1">
                    <label className="inline-block">
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        onChange={(e) => handlePaymentQrUpload(e.target.files?.[0])}
                        disabled={paymentQrUploading}
                        className="hidden"
                      />
                      <span className="text-xs bg-brand text-white px-3 py-1.5 rounded-lg cursor-pointer hover:opacity-90 inline-block">
                        {paymentQrUploading ? "Uploading..." : paymentQrPreview ? "Replace QR" : "Upload QR"}
                      </span>
                    </label>
                    {paymentQrPreview && (
                      <button onClick={handlePaymentQrDelete} className="text-xs text-red-500 hover:text-red-600 ml-2">
                        Remove
                      </button>
                    )}
                    {paymentQrMsg && <p className="text-xs text-red-500 mt-1">{paymentQrMsg}</p>}
                  </div>
                </div>
              )}
            </div>

            {/* Aggregate history counts */}
            {history && (
              <div className="grid grid-cols-2 gap-3 mb-4">
                <Stat label={t("admin.todayShop")} value={history.today} />
                <Stat label={t("admin.monthShop")} value={history.month} />
              </div>
            )}

            {/* Sales / amount stats */}
            {overview?.sales && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                <Stat label={t("admin.salesToday")} value={overview.sales.dayCount} />
                <Stat label={t("admin.salesMonth")} value={overview.sales.monthCount} />
                <StatText label={t("admin.amountToday")} text={`₹${overview.sales.dayAmount}`} />
                <StatText label={t("admin.amountMonth")} text={`₹${overview.sales.monthAmount}`} />
              </div>
            )}

            {/* BASIC upgrade CTA */}
            {shopDetail?.plan === "BASIC" && shopDetail?.tierSystemEnabled && (
              <Card className="mb-4 border border-amber-200 bg-gradient-to-br from-amber-50 to-white py-4 text-center">
                <p className="text-sm font-semibold text-amber-700 mb-2">✨ {t("admin.upgradeToPaid")}</p>
                <button onClick={() => setShowUpgradeModal(true)}
                  className="text-sm bg-gradient-to-r from-brand to-indigo-500
                    text-white px-4 py-2 rounded-full font-semibold hover:opacity-90 transition">
                  {t("admin.basicUpgradeLink")}
                </button>
              </Card>
            )}
          </>
        )}

        {/* ── SERVICES TAB ── */}
        {adminTab === "services" && (
          <>
            <TabInfo icon="⚙️" title={t("admin.tabInfoServicesTitle")} color="indigo"
              bullets={[t("admin.tabInfoServices1"), t("admin.tabInfoServices2"),
                t("admin.tabInfoServices3"), t("admin.tabInfoServices4")]} />
            {/* Add service card */}
            {(() => {
              const isBasicLimited = shopDetail?.plan === "BASIC" && shopDetail?.tierSystemEnabled;
              const activeCount = overview?.sections.filter((s) => s.active).length ?? 0;
              const basicMaxReached = isBasicLimited && activeCount >= 2;
              const taken = new Set(overview?.sections.map((s) => s.industryType) ?? []);
              const globallyBannedTypes = new Set(platformConfig.bannedServiceTypes);
              const available: string[] = ["FOOD", "SALON", "CLINIC", "GROCERY", "ROOMS", "GENERAL"].filter(
                (ty) => !taken.has(ty) && !globallyBannedTypes.has(ty)
              );
              return (
                <Card className="mb-4 border-t-4 border-t-indigo-300">
                  {basicMaxReached ? (
                    <p className="text-sm text-amber-600">{t("admin.basicMaxServices")}
                      <button onClick={() => setShowUpgradeModal(true)}
                        className="underline font-medium">{t("admin.basicUpgradeLink")}</button>
                      {t("admin.basicMaxServicesUpgradeSuffix")} {t("admin.basicDisableFirst")}</p>
                  ) : available.length === 0 ? (
                    <p className="text-sm text-gray-400">{t("admin.allServicesAdded")}</p>
                  ) : (
                    <div className="flex items-end gap-2">
                      <div className="flex-1">
                        <label className="block text-sm text-gray-600 mb-1">{t("admin.addService")}</label>
                        <select
                          value={newType}
                          onChange={(e) => setNewType(e.target.value)}
                          className="w-full border border-gray-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-brand/40"
                        >
                          <option value="">{t("admin.pickService")}</option>
                          {available.map((ty) => (
                            <option key={ty} value={ty}>{ty}</option>
                          ))}
                        </select>
                      </div>
                      <Button onClick={addNewService} disabled={!newType}>{t("common.add")}</Button>
                    </div>
                  )}
                  {sectionMsg && <p className={`text-xs mt-2 ${sectionMsg === t("admin.serviceTypeBanned")
                    ? "text-red-500 font-medium" : "text-gray-500"}`}>{sectionMsg}</p>}
                </Card>
              );
            })()}

            {/* Services list */}
            {(() => {
              const activeCount = overview?.sections.filter((s) => s.active).length ?? 0;
              const isBasicLimited = shopDetail?.plan === "BASIC" && shopDetail?.tierSystemEnabled;
              return (
                <div className={`space-y-3 ${(overview?.sections.length ?? 0) > 3 ? "max-h-[560px] overflow-y-auto pr-1" : ""}`}>
                  {overview?.sections.map((s) => {
                    const enableBlocked = (isBasicLimited && !s.active && activeCount >= 2) || s.globallyBanned;
                    const deletionDate: string | null = s.deletionScheduledAt ? new Date(s.deletionScheduledAt).toLocaleDateString() : null;
                    return (
                      <Card key={s.sectionCode} className={`${SECTION_BORDER[s.industryType] ?? SECTION_BORDER.OTHER} ${s.active ? "" : "opacity-60"}`}>
                        {s.globallyBanned && (
                          <div className="mb-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                            <p className="text-sm font-semibold text-red-700 mb-1">⚠️ {t("admin.serviceBannedTitle")}</p>
                            <p className="text-xs text-red-600 mb-2">
                              {t("admin.serviceBannedDesc")}
                              {deletionDate && <>{t("admin.serviceBannedDeleteDate")} <b>{deletionDate}</b>.</>}
                            </p>
                            {shopDetail?.plan === "PAID" ? (
                              <button onClick={handleExportCsv}
                                className="text-xs bg-red-600 text-white px-3 py-1.5 rounded-lg hover:bg-red-700 font-medium">
                                {t("admin.serviceBannedExport")}
                              </button>
                            ) : (
                              <p className="text-xs text-red-500 italic">{t("admin.serviceBannedBasicNote")}</p>
                            )}
                          </div>
                        )}
                        <div className="flex items-center justify-between mb-3">
                          <div className="font-semibold">
                            {s.displayName}
                            {!s.active && !s.globallyBanned && (
                              <span className="text-xs font-normal text-gray-400 ml-2">{t("admin.disabledTag")}</span>
                            )}
                            {s.globallyBanned && (
                              <span className="text-xs font-normal text-red-500 ml-2">{t("admin.serviceBannedTag")}</span>
                            )}
                          </div>
                          <div className="flex items-center gap-3 text-sm">
                            {!s.globallyBanned && (
                              <Link to={`/staff/${s.sectionCode}`} className="text-brand hover:underline">
                                {t("admin.liveOrders")}
                              </Link>
                            )}
                            <Link to={`/admin/${shopCode}/menu/${s.sectionCode}`} className="text-brand hover:underline">
                              {t("admin.menuLink")}
                            </Link>
                            <Link to={`/admin/${shopCode}/fields/${s.sectionCode}`} className="text-brand hover:underline">
                              {t("admin.fieldsLink")}
                            </Link>
                            <button
                              onClick={() => !enableBlocked && toggleSection(s.sectionCode, !s.active)}
                              disabled={enableBlocked}
                              className={`${enableBlocked ? "text-gray-300 cursor-not-allowed" : "text-gray-500 hover:underline"}`}
                            >
                              {s.active ? t("common.disable") : t("common.enable")}
                            </button>
                            {s.hasOrders ? (
                              <button onClick={() => handleDeleteClick(s)} className="text-red-400 hover:text-red-600">
                                {t("common.delete")}
                              </button>
                            ) : (
                              <button onClick={() => removeSection(s)} className="text-red-400 hover:text-red-600">
                                {t("common.remove")}
                              </button>
                            )}
                            <button
                              onClick={() => setSectionInfoOpen(sectionInfoOpen === s.sectionCode ? null : s.sectionCode)}
                              className="text-gray-300 hover:text-gray-500 text-base leading-none ml-1"
                            >
                              ℹ️
                            </button>
                          </div>
                        </div>
                        {sectionInfoOpen === s.sectionCode && (
                          <div className="mb-3 bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-xs text-gray-600 space-y-1.5">
                            {!s.globallyBanned && <p><span className="font-semibold text-brand">Live orders →</span>
                              {" "}– {t("admin.liveOrdersTooltip")}</p>}
                            <p><span className="font-semibold text-brand">Menu →</span>
                              {" "}– {t("admin.menuLinkTooltip")}</p>
                            <p><span className="font-semibold text-brand">Fields →</span>
                              {" "}– {t("admin.fieldsLinkTooltip")}</p>
                            <p><span className="font-semibold">{t(s.active ? "common.disable" : "common.enable")}</span>
                              {" "}– {t(s.active ? "admin.disableTooltip" : "admin.enableTooltip")}</p>
                            <p><span className="font-semibold text-red-400">{t(s.hasOrders ? "common.delete"
                              : "common.remove")}</span> – {t(s.hasOrders ? "admin.deleteTooltip" : "admin.removeTooltip")}</p>
                          </div>
                        )}
                        <div className="grid grid-cols-4 gap-2 text-center">
                          <MiniStat label={t("admin.waiting")} value={s.waiting} valueClass="text-amber-600" />
                          <MiniStat label={t("admin.inProgress")} value={s.inProgress} valueClass="text-blue-600" />
                          <MiniStat label={t("admin.ready")} value={s.ready} valueClass="text-emerald-600" />
                          <MiniStat label={t("admin.today")} value={s.totalToday} valueClass="text-indigo-600" />
                        </div>
                        <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-gray-100 text-xs">
                          <div className="text-gray-500">
                            {t("admin.salesToday")}:{" "}
                            <span className="font-semibold text-emerald-700">
                              {s.sales.dayCount} · ₹{s.sales.dayAmount}
                            </span>
                          </div>
                          <div className="text-gray-500 text-right">
                            {t("admin.salesMonth")}:{" "}
                            <span className="font-semibold text-emerald-700">
                              {s.sales.monthCount} · ₹{s.sales.monthAmount}
                            </span>
                          </div>
                          <div className="text-gray-500">
                            {t("admin.cancelsToday")}:{" "}
                            <span className="font-semibold text-red-500">{s.sales.dayCancelCount}</span>
                          </div>
                          <div className="text-gray-500 text-right">
                            {t("admin.cancelsMonth")}:{" "}
                            <span className="font-semibold text-red-500">{s.sales.monthCancelCount}</span>
                          </div>
                        </div>
                      </Card>
                    );
                  })}
                </div>
              );
            })()}
          </>
        )}
    {/* ── STAFF TAB ── */}
            {adminTab === "staff" && (
              <>
                <TabInfo icon="🧑‍🤝‍🧑" title={t("admin.tabInfoStaffTitle")} color="teal" bullets={[t("admin.tabInfoStaff1"),
                  t("admin.tabInfoStaff2"), t("admin.tabInfoStaff3"), t("admin.tabInfoStaff4")]} />
                {/* Add staff card */}
                <Card className="mb-4 border-t-4 border-t-teal-400">
                  <div className="space-y-3">
                    <input
                      value={newStaffUser}
                      onChange={(e) => setNewStaffUser(e.target.value)}
                      placeholder={t("admin.newStaffUsername")}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/40"
                    />
                    <input
                      type="password"
                      value={newStaffPw}
                      onChange={(e) => setNewStaffPw(e.target.value)}
                      placeholder={t("admin.newStaffPassword")}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/40"
                    />
                    <div>
                      <p className="text-xs text-gray-500 mb-1">{t("admin.newStaffSections")}</p>
                      <div className="flex flex-wrap gap-2">
                        {overview?.sections.map((s) => {
                          const on: boolean = newStaffSections.includes(s.sectionCode);
                          return (
                            <button
                              key={s.sectionCode}
                              type="button"
                              onClick={() =>
                                setNewStaffSections((l: string[]) =>
                                  on ? l.filter((c) => c !== s.sectionCode) : [...l, s.sectionCode]
                                )
                              }
                              className={`py-1.5 px-3 rounded-xl text-sm border ${on ? "bg-brand text-white border-brand" :
                                "bg-white text-gray-600 border-gray-200"}`}
                            >
                              {s.displayName}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                    <Button
                      onClick={submitAddStaff}
                      disabled={!newStaffUser.trim() || !newStaffPw || addStaffSubmitting}
                      className="w-full"
                    >
                      {addStaffSubmitting ? t("auth.doing") : t("admin.addStaff")}
                    </Button>
                    {addStaffMsg && <p className="text-xs text-gray-500">{addStaffMsg}</p>}
                  </div>
                </Card>

                {/* Existing staff list */}
                {staff.length > 0 && (
                  <Card className="mb-4 border-t-4 border-t-teal-300">
                    <h3 className="font-medium mb-2">{t("admin.deleteStaff")}</h3>
                    <div className={`space-y-2 ${staff.length > 5 ? "max-h-64 overflow-y-auto pr-1" : ""}`}>
                      {staff.map((s) => (
                        <div key={s.username} className="flex items-center justify-between text-sm">
                          <div>
                            <span className="font-medium">{s.username}</span>
                            <span className="text-gray-400 ml-2 text-xs">
                              {s.sectionCodes.join(", ") || "—"}
                            </span>
                          </div>
                          <button
                            onClick={() => removeStaff(s.username)}
                            className="text-red-400 hover:text-red-600 text-xs"
                          >
                            {t("common.remove")}
                          </button>
                        </div>
                      ))}
                    </div>
                    {deleteStaffMsg && <p className="text-xs text-gray-500">{deleteStaffMsg}</p>}
                  </Card>
                )}

                {/* Assign sections card */}
                <div className="mb-2">
                  <p className="font-medium text-sm text-cyan-700">{t("admin.tabInfoAssignTitle")}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{t("admin.tabInfoAssign1")}. {t("admin.tabInfoAssign2")}.</p>
                </div>
                <Card className="mb-4 border-t-4 border-t-cyan-400">
                  {staff.length === 0 ? (
                    <p className="text-xs text-gray-400">{t("admin.noStaff")}</p>
                  ) : (
                    <div className="space-y-3">
                      <select
                        value={assignUser}
                        onChange={(e) => pickAssignUser(e.target.value)}
                        className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/40"
                      >
                        <option value="">{t("admin.pickStaff")}</option>
                        {staff.map((s) => (
                          <option key={s.username} value={s.username}>{s.username}</option>
                        ))}
                      </select>
                      {assignUser && (
                        <>
                          <div className="flex flex-wrap gap-2">
                            {overview?.sections.map((s) => {
                              const on: boolean = assignCodes.includes(s.sectionCode);
                              return (
                                <button
                                  key={s.sectionCode}
                                  type="button"
                                  onClick={() =>
                                    setAssignCodes((l: string[]) =>
                                      on ? l.filter((c) => c !== s.sectionCode) : [...l, s.sectionCode]
                                    )
                                  }
                                  className={`py-1.5 px-3 rounded-xl text-sm border ${
                                    on ? "bg-brand text-white border-brand" : "bg-white text-gray-600 border-gray-200"
                                  }`}
                                >
                                  {s.displayName}
                                </button>
                              );
                            })}
                          </div>
                          <Button onClick={saveAssign} className="w-full">{t("admin.saveServices")}</Button>
                        </>
                      )}
                      {assignMsg && <p className="text-xs text-gray-500">{assignMsg}</p>}
                    </div>
                  )}
                </Card>
              </>
            )}

            {/* ── SETTINGS TAB ── */}
            {adminTab === "settings" && (
              <>
                <TabInfo icon="🔧" title={t("admin.tabInfoSettingsTitle")} color="slate"
                  bullets={[t("admin.tabInfoSettings1"), t("admin.tabInfoSettings2"),
                    t("admin.tabInfoSettings3"), t("admin.tabInfoSettings4"), t("admin.tabInfoSettings5")]} />
                {/* Shop details edit */}
                <Card className="mb-4 border-t-4 border-t-slate-400">
                  <button
                    className="w-full flex items-center justify-between text-left"
                    onClick={() => { setShopDetailsOpen((v) => !v); setShopDetailMsg(null); }}
                  >
                    <span className="font-semibold">{t("admin.shopDetailsTitle")}</span>
                    <span className="text-gray-400 text-sm">{shopDetailsOpen ? "▲" : "▼"}</span>
                  </button>
                  {shopDetailsOpen && (
                    <div className="mt-3 space-y-2">
                      <div>
                        <label className="block text-sm text-gray-600 mb-1">{t("admin.shopDetailsName")}</label>
                        <input value={editName} onChange={(e) => setEditName(e.target.value)}
                          className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/40" />
                      </div>
                      <CountryTypeahead value={editCountry} onChange={setEditCountry} label={t("auth.country")} />
                      <div>
                        <label className="block text-sm text-gray-600 mb-1">{t("auth.state")}</label>
                        <input value={editState} onChange={(e) => setEditState(e.target.value)}
                          className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/40" />
                      </div>
                      <div>
                        <label className="block text-sm text-gray-600 mb-1">{t("auth.city")}</label>
                        <input value={editCity} onChange={(e) => setEditCity(e.target.value)}
                          className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/40" />
                      </div>
                      <div>
                        <label className="block text-sm text-gray-600 mb-1">{t("auth.pincode")}</label>
                        <input value={editPincode} onChange={(e) => setEditPincode(e.target.value)}
                          className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/40" />
                      </div>
                      <div>
                        <label className="block text-sm text-gray-600 mb-1">{t("auth.shopPhone")}</label>
                        <input value={editPhone} onChange={(e) => setEditPhone(e.target.value)} type="tel"
                          className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/40" />
                      </div>
                      <div>
                        <label className="block text-sm text-gray-600 mb-1">{t("auth.shopAddress")}</label>
                        <input value={editAddress} onChange={(e) => setEditAddress(e.target.value)}
                          className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/40" />
                      </div>
                      <Button onClick={saveShopDetails} disabled={shopDetailSaving} className="w-full">
                        {shopDetailSaving ? t("auth.doing") : t("admin.shopDetailsSave")}
                      </Button>
                      {shopDetailMsg && (
                        <p className={`text-xs mt-1 ${shopDetailMsg.includes("✓")
                          ? "text-emerald-700" : shopDetailMsg.includes("code") ? "text-emerald-700" : "text-red-500"}`}>
                          {shopDetailMsg}
                        </p>
                      )}
                    </div>
                  )}
                </Card>

                {/* Operating Hours (PAID only) */}
                {shopDetail?.plan === "PAID" && (
                  <Card className="mb-4 border-t-4 border-t-sky-400">
                    <p className="font-semibold mb-0.5">{t("admin.operatingHoursTitle")}</p>
                    <p className="text-xs text-gray-400 mb-3">{t("admin.operatingHoursDesc")}</p>
                    <div className="grid grid-cols-2 gap-2 mb-2">
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">{t("admin.openTime")}</label>
                        <input type="time" value={editOpenTime} onChange={(e) => setEditOpenTime(e.target.value)}
                          className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/40" />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">{t("admin.closeTime")}</label>
                        <input type="time" value={editCloseTime} onChange={(e) => setEditCloseTime(e.target.value)}
                          className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/40" />
                      </div>
                    </div>
                    <div className="mb-3">
                      <label className="block text-xs text-gray-600 mb-1">{t("admin.operatingDays")}</label>
                      <input value={editOperatingDays} onChange={(e) => setEditOperatingDays(e.target.value)}
                        placeholder="e.g. 1,2,3,4,5,6"
                        className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/40" />
                      <p className="text-xs text-gray-400 mt-1">{t("admin.operatingDaysHint")}</p>
                    </div>
                    <Button onClick={saveShopDetails} disabled={shopDetailSaving} className="w-full">
                      {shopDetailSaving ? t("auth.doing") : t("admin.shopDetailsSave")}
                    </Button>
                    {shopDetailMsg && (
                      <p className={`text-xs mt-1 ${shopDetailMsg.includes("✓")
                        || shopDetailMsg.includes("code") ? "text-emerald-700" : "text-red-500"}`}>
                        {shopDetailMsg}
                      </p>
                    )}
                  </Card>
                )}

                {/* Recovery Code — separate card */}
                {shopDetail?.recoveryCode && (
                  <Card className="mb-4 border-t-4 border-t-rose-300">
                    <p className="font-semibold mb-0.5">{t("admin.recoveryCodeLabel")}</p>
                    <p className="text-xs text-gray-400 mb-3">{t("admin.recoveryCodeDesc")}</p>
                    <div className="flex items-center gap-2">
                      <span className={`flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm font-mono tracking-widest
                        ${recoveryCodeVisible ? "text-gray-800" : "text-gray-300 select-none"}`}>
                        {recoveryCodeVisible ? shopDetail.recoveryCode : "•".repeat(shopDetail.recoveryCode.length)}
                      </span>
                      <Button variant="ghost" onClick={() => {
                        if (recoveryCodeVisible) { setRecoveryCodeVisible(false); }
                        else { setShowRecoveryModal(true); setRecoveryConfirmErr(""); }
                      }}>
                        {recoveryCodeVisible ? t("admin.recoveryCodeHide") : t("admin.recoveryCodeReveal")}
                      </Button>
                    </div>
                  </Card>
                )}

                {/* CSV Export + Staff Analytics (PAID only) */}
                {shopDetail?.plan === "PAID" && (
                  <Card className="mb-4 border-t-4 border-t-violet-400">
                    <div className="flex gap-2">
                      <Button variant="ghost" onClick={handleExportExcel} className="flex-1 text-sm">
                        {t("admin.exportExcel")}
                      </Button>
                      <Button variant="ghost" onClick={loadStaffAnalytics} className="flex-1 text-sm">
                        {t("admin.staffAnalytics")}
                      </Button>
                    </div>
                    {showStaffAnalytics && staffAnalytics.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-gray-100 space-y-2">
                        {staffAnalytics.map((s) => (
                          <div key={s.username} className="flex items-center justify-between text-sm">
                            <span className="font-medium">{s.username}</span>
                            <span className="text-gray-500 text-xs">{t("admin.staffCompleted")}
                              : <b>{s.completed}</b> · {t("admin.staffAvgTime")}: <b>{Math.round(s.avgMinutes)}m</b></span>
                          </div>
                        ))}
                      </div>
                    )}
                    {showStaffAnalytics && staffAnalytics.length === 0 && (
                      <p className="text-xs text-gray-400 mt-2 text-center">{t("admin.noStaff")}</p>
                    )}
                  </Card>
                )}

                {/* Password management */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                  {/* Own password */}
                  <Card className="border-t-4 border-t-rose-400">
                    <h3 className="font-medium mb-2">{t("admin.changeOwnPw")}</h3>
                    <div className="space-y-2">
                      <input
                        type="password"
                        value={curPw}
                        placeholder={t("admin.currentPw")}
                        onChange={(e) => setCurPw(e.target.value)}
                        className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/40"
                      />
                      <input
                        type="password"
                        value={newPw}
                        placeholder={t("admin.newPw")}
                        onChange={(e) => setNewPw(e.target.value)}
                        className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/40"
                      />
                      <Button onClick={submitOwnPassword} disabled={!curPw || !newPw} className="w-full">
                        {t("admin.update")}
                      </Button>
                      {pwMsg && <p className="text-xs text-gray-500">{pwMsg}</p>}
                    </div>
                  </Card>

                  {/* Staff password reset */}
                  <Card className="border-t-4 border-t-rose-400">
                    <h3 className="font-medium mb-2">{t("admin.resetStaffPw")}</h3>
                    {staff.length === 0 ? (
                      <p className="text-xs text-gray-400">{t("admin.noStaff")}</p>
                    ) : (
                      <div className="space-y-2">
                        <select
                          value={staffUser}
                          onChange={(e) => setStaffUser(e.target.value)}
                          className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/40"
                        >
                          <option value="">{t("admin.pickStaff")}</option>
                          {staff.map((s) => (
                            <option key={s.username} value={s.username}>
                              {s.username} ({s.sectionCodes.join(", ") || "—"})
                            </option>
                          ))}
                        </select>
                        <input
                          type="password"
                          value={staffNewPw}
                          placeholder={t("admin.newPw")}
                          onChange={(e) => setStaffNewPw(e.target.value)}
                          className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/40"
                        />
                        <Button onClick={submitStaffPassword} disabled={!staffUser || !staffNewPw} className="w-full">
                          {t("admin.reset")}
                        </Button>
                        {staffPwMsg && <p className="text-xs text-gray-500">{staffPwMsg}</p>}
                      </div>
                    )}
                  </Card>
                </div>
              </>
            )}

            {/* ── HISTORY TAB ── */}
            {adminTab === "history" && (
              <>
                <TabInfo icon="🕐" title={t("admin.tabInfoHistoryTitle")}
                  color="gray" bullets={[t("admin.tabInfoHistory1"), t("admin.tabInfoHistory2"),
                    t("admin.tabInfoHistory3")]} />
                {history && history.orders.length > 0 ? (
                  <>
                    <input
                      value={historySearch}
                      onChange={(e) => setHistorySearch(e.target.value)}
                      placeholder="Search by name / phone / #id"
                      className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-brand/40"
                    />
                    <div className="space-y-2 overflow-y-auto pr-1 max-h-[60vh]">
                      {history.orders.filter((o) => !historySearch.trim()
                        || o.customerName?.toLowerCase().includes(historySearch.toLowerCase())
                        || o.customerPhone?.includes(historySearch)
                        || String(o.id).includes(historySearch)).map((ord) => (
                        <Card key={ord.id} className="flex items-center justify-between py-3">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-semibold">#{ord.id}</span>
                              <StatusBadge status={ord.status} />
                              <span className="text-xs text-gray-400">{ord.businessCode}</span>
                            </div>
                            <div className="text-sm text-gray-600 mt-1">
                              {ord.customerName}
                              {ord.customerPhone && <span className="text-gray-400 ml-2">{ord.customerPhone}</span>}
                            </div>
                            <div className="text-xs text-gray-400">
                              {ord.items.map((i) => `${i.itemName} x${i.quantity}`).join(", ") || "—"}
                            </div>
                            <OrderExtras ticket={ord} />
                          </div>
                          <div className="text-right">
                            {(ord.totalAmount ?? 0) > 0 && <div className="text-sm font-semibold text-gray-700">₹{ord.totalAmount}</div>}
                            {ord.placedDate && <div className="text-xs text-gray-500">{ord.placedDate}</div>}
                            <div className="text-xs text-gray-400">{ord.placedTime}</div>
                          </div>
                        </Card>
                      ))}
                    </div>
                  </>
                ) : (
                  <Card className="text-center text-gray-400 py-6">{t("admin.noCompleted")}</Card>
                )}
              </>
            )}

            {/* ── SUPPORT TAB ── */}
            {adminTab === "support" && (
              <div className="flex justify-center">
                <Card className="w-full max-w-sm border-t-4 border-t-amber-400 py-8 px-6 text-center">
                  <div className="w-14 h-14 bg-amber-50 rounded-full flex items-center justify-center mx-auto mb-4">
                    <span className="text-2xl">💬</span>
                  </div>
                  <p className="font-semibold text-lg mb-1">{t("admin.requestTitle")}</p>
                  <p className="text-xs text-gray-400 mb-5">{t("admin.requestSubtitle")}</p>
                  <Button onClick={() => setRequestModal("open")} className="w-full">
                    {t("admin.requestRaise")}
                  </Button>
                </Card>
              </div>
            )}
          </div>{/* end pb-20 content area */}

          {/* ── BOTTOM TAB BAR ── */}
          <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-200 shadow-lg">
            <div className="max-w-3xl mx-auto grid grid-cols-6">
              {(
                [
                  { key: "overview", emoji: "🏠", label: "Overview" },
                  { key: "services", emoji: "⚙️", label: "Services" },
                  { key: "staff", emoji: "👥", label: "Staff" },
                  { key: "settings", emoji: "📋", label: "Settings" },
                  { key: "history", emoji: "📜", label: "History" },
                  { key: "support", emoji: "💬", label: "Support" },
                ] as const
              ).map(({ key, emoji, label }) => (
                <button
                  key={key}
                  onClick={() => setAdminTab(key)}
                  className={`flex flex-col items-center justify-center py-2 px-1 text-xs font-medium transition-colors ${
                    adminTab === key
                      ? "bg-indigo-600 text-white rounded-xl mx-1 my-1"
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  <span className="text-base leading-none mb-0.5">{emoji}</span>
                  <span>{label}</span>
                </button>
              ))}
            </div>
          </nav>

          {/* Upgrade to PAID modal */}
          {showUpgradeModal && (
            <div className="fixed inset-0 bg-black/60 flex items-end sm:items-center justify-center px-4 z-50">
              <div className="bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl w-full max-w-sm">
                <div className="bg-gradient-to-br from-brand/10 to-indigo-50 rounded-t-3xl sm:rounded-t-2xl px-6 pt-6 pb-4 text-center border-b border-gray-100">
                  <div className="text-3xl mb-2">✨</div>
                  <h2 className="text-lg font-bold text-gray-800">{t("admin.upgradeTitle")}</h2>
                  {platformConfig.paidPrice && (
                    <div className="mt-2 inline-flex items-baseline gap-1">
                      <span className="text-3xl font-bold text-brand">
                        {platformConfig.paidCurrency === "INR" ? "₹" : "$"}{platformConfig.paidPrice}
                      </span>
                      <span className="text-gray-400 text-sm">/{platformConfig.paidCurrency === "INR" ? "month" : "mo"}</span>
                    </div>
                  )}
                </div>
                <div className="px-6 py-4">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">{t("admin.planInfoPaidBenefitsTitle")}</p>
                  <ul className="space-y-1 mb-4">
                    {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                      <li key={i} className="flex items-center gap-2 text-sm text-gray-700">
                        <span className="text-emerald-500 flex-shrink-0">✓</span>
                        {t(`admin.planInfoPaidBenefit${i}`)}
                      </li>
                    ))}
                  </ul>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">{t("admin.upgradeEmailLabel")}</p>
                  <div className="space-y-2 mb-4">
                    {[1, 2, 3, 4].map((i) => (
                      <div key={i} className="flex items-center gap-3">
                        <span className="w-5 h-5 bg-brand/10 text-brand rounded-full text-xs flex items-center justify-center font-bold flex-shrink-0">{i}</span>
                        <span className="text-sm text-gray-700">{t(`admin.upgradeDetail${i}`)}</span>
                      </div>
                    ))}
                  </div>
                  <a href={`mailto:${t("admin.upgradeEmail")}?subject=Upgrade to PAID - ${shopDetail?.name ?? shopCode}`}
                    className="flex items-center justify-between w-full bg-brand/5 hover:bg-brand/10 border border-brand/20 rounded-xl px-4 py-3 transition mb-3">
                    <div className="text-left">
                      <p className="text-xs text-gray-400">Email us</p>
                      <p className="text-sm font-bold text-brand">{t("admin.upgradeEmail")}</p>
                    </div>
                    <svg className="w-4 h-4 text-brand flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                    </svg>
                  </a>
                  <p className="text-xs text-gray-400 text-center mb-4">{t("admin.upgradeNote")}</p>
                  <Button onClick={() => setShowUpgradeModal(false)} className="w-full">{t("common.cancel")}</Button>
                </div>
              </div>
            </div>
          )}

          {/* Plan info modal */}
          {showPlanModal && shopDetail && (
            <div className="fixed inset-0 bg-black/40 flex items-center justify-center px-4 z-50">
              <Card className="max-w-sm w-full">
                <h2 className="text-lg font-bold mb-2">{t("admin.planInfoTitle")}</h2>
                <div className={`inline-block text-xs px-2 py-0.5 rounded-full font-semibold mb-3 ${shopDetail.plan === "PAID"
                  ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
                  {shopDetail.plan}
                </div>
                <p className="text-sm text-gray-600 mb-3">
                  {shopDetail.plan === "PAID" ? t("admin.planInfoCurrentPaid") : t("admin.planInfoCurrentBasic")}
                </p>
                {shopDetail.plan === "BASIC" && (
                  <>
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">{t("admin.planInfoBasicLimits")}</p>
                    <ul className="space-y-1 mb-3">
                      {[1, 2, 3, 4, 5].map((i) => (
                        <li key={i} className="flex items-center gap-2 text-sm text-gray-700">
                          <span className="text-red-400">×</span>
                          {t(`admin.planInfoLimit${i}`)}
                        </li>
                      ))}
                    </ul>
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">{t("admin.planInfoPaidBenefitsTitle")}</p>
                    <ul className="space-y-1 mb-3">
                      {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                        <li key={i} className="flex items-center gap-2 text-sm text-gray-700">
                          <span className="text-emerald-500">✓</span>
                          {t(`admin.planInfoPaidBenefit${i}`)}
                        </li>
                      ))}
                    </ul>
                  </>
                )}
                {shopDetail.plan === "PAID" && (
                  <>
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">{t("admin.planInfoPaidBenefitsTitle")}</p>
                    <ul className="space-y-1 mb-3">
                      {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                        <li key={i} className="flex items-center gap-2 text-sm text-gray-700">
                          <span className="text-emerald-500">✓</span>
                          {t(`admin.planInfoPaidBenefit${i}`)}
                        </li>
                      ))}
                    </ul>
                  </>
                )}
                <p className="text-xs text-gray-400 mb-4">{t("admin.planInfoUpgrade")}</p>
                <Button onClick={() => setShowPlanModal(false)} className="w-full">{t("common.cancel")}</Button>
              </Card>
            </div>
          )}

          {/* QR Code modal */}
          {qrModal && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center px-4 z-50">
              <div className="bg-white rounded-2xl p-6 max-w-xs w-full text-center">
                <h2 className="font-bold text-lg mb-1">{t("admin.qrCodeTitle")}</h2>
                <p className="text-xs text-gray-500 mb-3">{t("admin.qrCodeModalDesc")}</p>
                <img src={qrModal.blobUrl} alt="Shop QR" className="mx-auto mb-3 rounded-xl border border-gray-100 w-48 h-48 object-contain" />
                <p className="text-xs text-gray-400 mb-1">{t("admin.qrCodeScanHint")}</p>
                <p className="text-xs font-mono text-brand mb-4 break-all">{qrModal.shopUrl}</p>
                <div className="flex flex-col gap-2">
                  <a
                    href={qrModal.blobUrl}
                    download={`qr-${shopCode}.png`}
                    className="w-full bg-brand text-white py-2.5 rounded-xl font-medium text-sm text-center hover:opacity-90 transition"
                  >
                    {t("admin.qrCodeDownload")}
                  </a>
                  <button
                    onClick={() => { URL.revokeObjectURL(qrModal.blobUrl); setQrModal(null); }}
                    className="w-full bg-gray-100 hover:bg-gray-200 py-2.5 rounded-xl text-sm"
                  >
                    {t("common.cancel")}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Recovery code confirm modal */}
          {showRecoveryModal && (
            <div className="fixed inset-0 bg-black/40 flex items-center justify-center px-4 z-50">
              <Card className="max-w-sm w-full">
                <h2 className="text-lg font-bold mb-1">{t("admin.recoveryCodeConfirmTitle")}</h2>
                <p className="text-sm text-gray-500 mb-3">{t("admin.recoveryCodeConfirmBody")}</p>
                <div className="space-y-2 mb-3">
                  <input
                    value={recoveryConfirmUser}
                    onChange={(e) => setRecoveryConfirmUser(e.target.value)}
                    placeholder={t("auth.username")}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/40"
                  />
                  <input
                    type="password"
                    value={recoveryConfirmPw}
                    onChange={(e) => setRecoveryConfirmPw(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && confirmRecoveryReveal()}
                    placeholder={t("auth.password")}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/40"
                  />
                </div>
                {recoveryConfirmErr && <p className="text-xs text-red-500 mb-2">{recoveryConfirmErr}</p>}
                <div className="flex flex-col gap-2">
                  <Button onClick={confirmRecoveryReveal} disabled={!recoveryConfirmUser || !recoveryConfirmPw} className="w-full">
                    {t("admin.recoveryCodeConfirmBtn")}
                  </Button>
                  <Button variant="ghost" onClick={() => { setShowRecoveryModal(false); setRecoveryConfirmErr(""); }} className="w-full">
                    {t("common.cancel")}
                  </Button>
                </div>
              </Card>
            </div>
          )}

          {/* Request modal */}
          {requestModal && (
            <div className="fixed inset-0 bg-black/60 flex items-end sm:items-center justify-center px-4 z-50">
              <div className="bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl w-full max-w-sm">
                {/* Header */}
                <div className="bg-gradient-to-br from-brand/5 to-indigo-50 rounded-t-3xl sm:rounded-t-2xl px-6 pt-6 pb-4 border-b border-gray-100 text-center">
                  <div className="w-12 h-12 bg-brand/10 rounded-full flex items-center justify-center mx-auto mb-3">
                    <svg className="w-6 h-6 text-brand" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <h2 className="text-lg font-bold text-gray-800">{t("admin.requestModalTitle")}</h2>
                  <p className="text-xs text-gray-500 mt-1">{t("admin.requestModalSubtitle")}</p>
                </div>

                {/* Body */}
                <div className="px-6 py-4">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">{t("admin.requestModalDetails")}</p>
                  <div className="space-y-2 mb-4">
                    {[
                      t("admin.requestModalDetail1"),
                      t("admin.requestModalDetail2"),
                      t("admin.requestModalDetail3"),
                    ].map((item: string, i: number) => (
                      <div key={i} className="flex items-center gap-3">
                        <span className="w-5 h-5 bg-brand/10 text-brand rounded-full text-xs flex items-center justify-center font-bold flex-shrink-0">
                          {i + 1}
                        </span>
                        <span className="text-sm text-gray-700">{item}</span>
                      </div>
                    ))}
                  </div>

                  {/* Email CTA */}
                  <a
                    href={`mailto:${t("admin.requestModalEmail")}?subject=${encodeURIComponent(t("admin.requestModalEmailSubject"))}`}
                    className="flex items-center justify-between w-full bg-brand/5 hover:bg-brand/10 border border-brand/20 rounded-xl px-4 py-3 transition mb-4"
                  >
                    <div className="text-left">
                      <p className="text-xs text-gray-400">{t("admin.requestModalEmailLabel")}</p>
                      <p className="text-sm font-bold text-brand">{t("admin.requestModalEmail")}</p>
                    </div>
                    <svg className="w-4 h-4 text-brand flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                    </svg>
                  </a>

                  <Button onClick={() => setRequestModal(null)} className="w-full">
                    {t("admin.requestModalClose")}
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Modal 1: disable/delete blocked — live orders hain */}
          {disableBlocked && (
            <div className="fixed inset-0 bg-black/40 flex items-center justify-center px-4 z-50">
              <Card className="max-w-sm w-full">
                <h2 className="text-lg font-bold mb-1 text-amber-600">{t("admin.liveOrdersBlockTitle")}</h2>
                <p className="text-sm text-gray-600 mb-1">
                  {t("admin.liveOrdersBlockBody", { name: disableBlocked.name, count: disableBlocked.liveCount })}
                </p>
                <p className="text-xs text-gray-400 mb-4">{t("admin.liveOrdersBlockHint")}</p>
                <Button onClick={() => setDisableBlocked(null)} className="w-full">
                  {t("admin.liveOrdersBlockOk")}
                </Button>
              </Card>
            </div>
          )}

          {/* Modal 2: remove confirm (no orders) */}
          {removeTarget && (
            <div className="fixed inset-0 bg-black/40 flex items-center justify-center px-4 z-50">
              <Card className="max-w-sm w-full">
                <h2 className="text-lg font-bold mb-1">{t("admin.removeTitle")}</h2>
                <p className="text-sm text-gray-600 mb-4">
                  {t("admin.removeBody", { name: removeTarget.displayName })}
                </p>
                <div className="flex flex-col gap-2">
                  <Button onClick={() => doRemove(removeTarget.sectionCode)} className="w-full bg-red-500 hover:bg-red-600 text-white">
                    {t("admin.removeYes")}
                  </Button>
                  <Button variant="ghost" onClick={() => setRemoveTarget(null)} className="w-full">
                    {t("common.cancel")}
                  </Button>
                </div>
              </Card>
            </div>
          )}

          {/* Modal 3: delete confirm (has historical orders, no live orders) */}
          {deleteTarget && (
            <div className="fixed inset-0 bg-black/40 flex items-center justify-center px-4 z-50">
              <Card className="max-w-sm w-full">
                <h2 className="text-lg font-bold mb-1 text-red-600">{t("admin.deleteTitle")}</h2>
                <p className="text-sm text-gray-600 mb-2">
                  {t("admin.deleteBody", { name: deleteTarget.displayName })}
                </p>
                <div className="flex flex-col gap-2 mt-3">
                  <Button onClick={() => doDelete(deleteTarget.sectionCode)} className="w-full bg-red-500 hover:bg-red-600 text-white">
                    {t("admin.deleteYes")}
                  </Button>
                  <Button variant="ghost" onClick={() => setDeleteTarget(null)} className="w-full">
                    {t("admin.deleteNo")}
                  </Button>
                </div>
              </Card>
            </div>
          )}
        </div>
      );
    }

    function Stat({ label, value }: { label: string; value: number }) {
      return (
        <Card className="text-center py-3">
          <div className="text-2xl font-bold text-brand">{value}</div>
          <div className="text-xs text-gray-400">{label}</div>
        </Card>
      );
    }

    function StatText({ label, text }: { label: string; text: string }) {
      return (
        <Card className="text-center py-3">
          <div className="text-2xl font-bold text-emerald-700">{text}</div>
          <div className="text-xs text-gray-400">{label}</div>
        </Card>
      );
    }

    function MiniStat({ label, value, valueClass = "text-brand" }: { label: string; value: number; valueClass?: string }) {
      return (
        <div>
          <div className={`text-xl font-bold ${valueClass}`}>{value}</div>
          <div className="text-[11px] text-gray-400">{label}</div>
        </div>
      );
    }

    function TabInfo({ icon, title, bullets, color = "indigo" }: {
      icon: string; title: string; bullets: string[]; color?: string;
    }) {
      const bg: Record<string, string> = {
        indigo: "bg-indigo-50 border-indigo-100 text-indigo-800",
        teal: "bg-teal-50 border-teal-100 text-teal-800",
        slate: "bg-slate-50 border-slate-200 text-slate-700",
        amber: "bg-amber-50 border-amber-100 text-amber-800",
        violet: "bg-violet-50 border-violet-100 text-violet-800",
        gray: "bg-gray-50 border-gray-200 text-gray-600",
      };
      const cls: string = bg[color] ?? bg.indigo;
      return (
        <div className={`mb-4 rounded-2xl border px-4 py-3 ${cls}`}>
          <p className="font-semibold text-sm mb-1.5">{icon} {title}</p>
          <ul className="space-y-0.5">
            {bullets.map((b, i) => (
              <li key={i} className="text-xs opacity-80 flex gap-1.5"><span>·</span><span>{b}</span></li>
            ))}
          </ul>
        </div>
      );
    }
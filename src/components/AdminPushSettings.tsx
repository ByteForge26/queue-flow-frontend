import { useEffect, useState } from "react";
import { Card } from "./ui";
import {
  disableAdminPushNotifications,
  enableAdminPushNotifications,
  isAdminPushConfigured,
} from "../lib/pushNotifications";
import { getAuth } from "../lib/auth";

export default function AdminPushSettings() {
  const auth = getAuth();
  const preferenceKey = `queueflow.shop-push.${auth?.username ?? "unknown"}`;
  const [enabled, setEnabled] = useState(() =>
    typeof Notification !== "undefined"
    && Notification.permission === "granted"
    && localStorage.getItem(preferenceKey) !== "disabled",
  );
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled || !isAdminPushConfigured()) return;
    enableAdminPushNotifications().catch((error: unknown) => {
      setEnabled(false);
      localStorage.setItem(preferenceKey, "disabled");
      setMessage(error instanceof Error ? error.message : "Push notification setup failed.");
    });
  }, [enabled, preferenceKey]);

  async function toggleNotifications() {
    setBusy(true);
    setMessage(null);
    try {
      if (enabled) {
        await disableAdminPushNotifications();
        setEnabled(false);
        localStorage.setItem(preferenceKey, "disabled");
        setMessage("Notifications disabled on this browser.");
      } else {
        await enableAdminPushNotifications();
        setEnabled(true);
        localStorage.setItem(preferenceKey, "enabled");
        setMessage("Notifications enabled for this browser.");
      }
    } catch (error: unknown) {
      setMessage(error instanceof Error ? error.message : "Could not update notification settings.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="mb-4 border-t-4 border-t-indigo-400">
      <h3 className="font-semibold text-slate-800">Order notifications</h3>
      <p className="mt-1 text-sm text-slate-500">
        Get browser notifications for new orders and every order status update, even when this tab is in the background.
      </p>
      {!isAdminPushConfigured() && (
        <p className="mt-3 text-sm text-amber-700">
          Firebase web config and the VAPID key are needed in the frontend environment before enabling push.
        </p>
      )}
      <button
        type="button"
        onClick={toggleNotifications}
        disabled={busy || !isAdminPushConfigured()}
        className="mt-3 rounded-xl bg-brand px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
      >
        {busy ? "Please wait..." : enabled ? "Disable notifications" : "Enable notifications"}
      </button>
      {message && <p className="mt-2 text-sm text-slate-600" role="status">{message}</p>}
    </Card>
  );
}

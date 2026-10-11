import { getApp, getApps, initializeApp } from "firebase/app";
import {
  deleteToken,
  getMessaging,
  getToken,
  isSupported,
  onMessage,
  type MessagePayload,
  type Unsubscribe,
} from "firebase/messaging";
import { removeAdminPushToken, saveAdminPushToken } from "./api";

const appName = "queueflow-web-push";

function readFirebaseConfig() {
  return {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
  };
}

export function isAdminPushConfigured(): boolean {
  return Object.values(readFirebaseConfig()).every((value) => Boolean(value))
    && Boolean(import.meta.env.VITE_FIREBASE_VAPID_KEY);
}

async function messagingContext() {
  if (!isAdminPushConfigured()) {
    throw new Error("Firebase web settings are missing from the frontend environment.");
  }
  if (!("serviceWorker" in navigator) || !("Notification" in window)) {
    throw new Error("This browser does not support web push notifications.");
  }
  if (!(await isSupported())) {
    throw new Error("Firebase messaging is not supported by this browser.");
  }

  const app = getApps().some((existing) => existing.name === appName)
    ? getApp(appName)
    : initializeApp(readFirebaseConfig(), appName);

  const config = readFirebaseConfig();
  const workerUrl = new URL("/firebase-messaging-sw.js", window.location.origin);
  Object.entries(config).forEach(([key, value]) => workerUrl.searchParams.set(key, value));
  const serviceWorkerRegistration = await navigator.serviceWorker.register(workerUrl);

  return { messaging: getMessaging(app), serviceWorkerRegistration };
}

export async function enableAdminPushNotifications(): Promise<void> {
  const { messaging, serviceWorkerRegistration } = await messagingContext();
  const permission = Notification.permission === "default"
    ? await Notification.requestPermission()
    : Notification.permission;
  if (permission !== "granted") {
    throw new Error("Browser notification permission was not granted.");
  }

  const token = await getToken(messaging, {
    vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY,
    serviceWorkerRegistration,
  });
  if (!token) {
    throw new Error("Firebase did not return a browser registration token.");
  }
  await saveAdminPushToken(token);
}

export async function disableAdminPushNotifications(): Promise<void> {
  const { messaging, serviceWorkerRegistration } = await messagingContext();
  const token = await getToken(messaging, {
    vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY,
    serviceWorkerRegistration,
  });
  if (token) {
    await removeAdminPushToken(token);
    await deleteToken(messaging);
  }
}

export async function listenForAdminPushNotifications(): Promise<Unsubscribe | null> {
  if (!isAdminPushConfigured() || Notification.permission !== "granted") return null;

  const { messaging } = await messagingContext();
  return onMessage(messaging, (payload: MessagePayload) => {
    if (!payload.notification || Notification.permission !== "granted") return;

    const notification = new Notification(payload.notification.title ?? "QueueFlow", {
      body: payload.notification.body,
      icon: "/favicon.svg",
    });
    notification.onclick = () => {
      window.focus();
      const target = payload.data?.url;
      if (target) window.location.assign(target);
      notification.close();
    };
  });
}

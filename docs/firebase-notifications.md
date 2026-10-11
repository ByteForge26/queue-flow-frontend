# QueueFlow admin push notifications

QueueFlow keeps its existing WebSocket updates for customers tracking an order and for live staff queues. Firebase Cloud Messaging sends browser push notifications to opted-in shop admins and staff for new orders and status changes. Customers can opt in on their order tracking page to receive order status updates, including picked up, being prepared, ready for pickup, completed, and cancelled, even when the tracking page is closed.

## Firebase web app settings

In Firebase Console:

1. Create or select the Firebase project and add a **Web app** under Project settings > General.
2. Copy the web app config values into the frontend deployment environment (Netlify site environment variables) or a local `queueflow-frontend/.env.local` file:
   - `VITE_FIREBASE_API_KEY`
   - `VITE_FIREBASE_AUTH_DOMAIN`
   - `VITE_FIREBASE_PROJECT_ID`
   - `VITE_FIREBASE_STORAGE_BUCKET`
   - `VITE_FIREBASE_MESSAGING_SENDER_ID`
   - `VITE_FIREBASE_APP_ID`
3. Under Project settings > Cloud Messaging > Web configuration, generate/select a Web Push certificate key pair and set its public key as `VITE_FIREBASE_VAPID_KEY`.
4. Deploy/rebuild the frontend after setting these values. The browser must use HTTPS (localhost is also allowed for development).

The web app config and VAPID public key are browser-visible settings; do not put a service-account private key in the frontend.

## Firebase server credentials

In Firebase Console, open Project settings > Service accounts and generate a **private key** for the Firebase Admin SDK. Keep the downloaded JSON private. Encode it on your own machine (Linux):

```sh
base64 -w 0 /path/to/firebase-service-account.json
```

Copy the resulting single-line value into the backend host's secret environment variable `FIREBASE_SERVICE_ACCOUNT_BASE64`. In Render, `render.yaml` declares this as a secret input when the Blueprint is synced; alternatively add it in the backend service's Environment settings. Do not commit the JSON or encoded value to Git, paste it into chat, or add it to frontend variables.

### Local backend

The local Spring Boot process needs the same server credential configured; it
does not read the frontend's `.env.local` file. Set `FIREBASE_SERVICE_ACCOUNT_BASE64`
in the backend's IntelliJ Run Configuration environment variables, or export it
in the terminal before starting the backend. On Linux, you can encode the JSON
locally without printing the encoded secret:

```sh
export FIREBASE_SERVICE_ACCOUNT_BASE64="$(base64 -w 0 /path/to/firebase-service-account.json)"
cd queueflow-backend
./mvnw spring-boot:run
```

Replace the example path with the private JSON file's actual path. Keep the JSON
and encoded value out of Git and do not put either in frontend environment
variables. Restart the backend after setting the variable. Without it, Firebase
push registration on the local backend returns HTTP 500, although the app and
existing WebSocket behavior can continue to work.

The backend creates push-token tables automatically with the existing Hibernate schema setting. Each shop admin should log in, open **Settings > Order notifications**, and enable notifications on each browser/device they want to receive them on. Each staff member must enable alerts from the staff page on their own browser/device. Customers opt in using the alerts button on their order tracking page. Browser notification permission must be allowed. Logging out unregisters the shop user's token.

Push delivery is best-effort and requires network access to Firebase. If the Firebase server credential is not configured, the backend still starts and existing WebSocket behavior continues, but push registration remains unavailable.

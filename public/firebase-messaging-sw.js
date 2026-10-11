importScripts("https://www.gstatic.com/firebasejs/11.10.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/11.10.0/firebase-messaging-compat.js");

const firebaseConfig = Object.fromEntries(new URLSearchParams(self.location.search));
firebase.initializeApp(firebaseConfig);
firebase.messaging();

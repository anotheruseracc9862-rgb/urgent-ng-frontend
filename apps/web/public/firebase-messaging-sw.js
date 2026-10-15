importScripts(
  'https://www.gstatic.com/firebasejs/12.0.0/firebase-app-compat.js',
  'https://www.gstatic.com/firebasejs/12.0.0/firebase-messaging-compat.js',
  '/firebase-messaging-config.js',
);

const config = self.URGENT_FIREBASE_CONFIG;
if (config && config.apiKey && config.projectId && config.messagingSenderId && config.appId) {
  firebase.initializeApp(config);
  const messaging = firebase.messaging();
  messaging.onBackgroundMessage((payload) => {
    if (payload.notification) return;
    const title = payload.data && payload.data.title ? payload.data.title : 'Urgent.ng update';
    const body = payload.data && payload.data.body ? payload.data.body : 'You have a new update.';
    const data = payload.data || {};
    const id = data.conversationId || data.assignmentId || data.errandId || data.offerId;
    let path = '/notifications';
    if (id) {
      const safeId = encodeURIComponent(id);
      if (data.type && data.type.startsWith('message.')) path = `/messages/${safeId}`;
      else if (data.type && data.type.startsWith('assignment.')) path = `/assignments/${safeId}`;
      else if (data.type && data.type.startsWith('offer.')) path = `/offers/${safeId}`;
      else path = `/errands/${safeId}`;
    }
    self.registration.showNotification(title, { body, data: { path } });
  });
}

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const path = event.notification.data && event.notification.data.path;
  if (typeof path !== 'string' || !path.startsWith('/') || path.startsWith('//')) return;
  event.waitUntil(self.clients.openWindow(new URL(path, self.location.origin).toString()));
});

const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');

let messaging = null;

try {
  // Path to the service account credentials JSON
  const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH || path.join(__dirname, '../../config/firebase-service-account.json');

  if (fs.existsSync(serviceAccountPath)) {
    const serviceAccount = require(serviceAccountPath);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
    messaging = admin.messaging();
    console.log('[Firebase Push] Admin SDK initialized successfully.');
  } else {
    console.warn('[Firebase Push] Service Account JSON not found. Falling back to local messaging & WebSocket delivery.');
  }
} catch (error) {
  console.error('[Firebase Push] Initialization failed, using local WebSockets fallback:', error.message);
}

/**
 * Verifies a Firebase ID token sent from the client.
 * If Firebase Admin SDK is not initialized, supports a developer fallback.
 * @param {string} idToken - The Firebase ID token to verify
 */
const verifyFirebaseIdToken = async (idToken) => {
  if (!idToken) {
    throw new Error('No ID token provided');
  }

  // Developer mock token extraction
  if (idToken.startsWith('mock_firebase_token:')) {
    try {
      const jsonStr = idToken.slice('mock_firebase_token:'.length);
      const payload = JSON.parse(jsonStr);
      console.log('[Firebase Auth Mock] Decoded mock token:', payload);
      return payload;
    } catch (e) {
      throw new Error('Invalid mock token format');
    }
  }

  const isFirebaseInitialized = admin.apps.length > 0;
  if (isFirebaseInitialized) {
    try {
      const decodedToken = await admin.auth().verifyIdToken(idToken);
      // Map Firebase claims to unified claims
      return {
        uid: decodedToken.uid,
        email: decodedToken.email,
        email_verified: decodedToken.email_verified || false,
        name: decodedToken.name || ''
      };
    } catch (error) {
      console.error('[Firebase Auth] Real token verification failed:', error.message);
      throw error;
    }
  } else {
    console.warn('[Firebase Auth] Admin SDK not initialized. Applying development fallback decoding.');
    // Simulated token parser (split JWT payload)
    try {
      const parts = idToken.split('.');
      if (parts.length === 3) {
        const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
        return {
          uid: payload.user_id || payload.sub || 'mock_uid_123',
          email: payload.email || 'mock@example.com',
          email_verified: payload.email_verified ?? true,
          name: payload.name || 'Mock User'
        };
      }
    } catch (e) {
      // Ignore parsing errors
    }

    return {
      uid: 'mock_uid_dev_' + Math.random().toString(36).slice(-6),
      email: 'mock_developer@raktsetu.org',
      email_verified: true,
      name: 'Developer Mock'
    };
  }
};

/**
 * Sends a real-time push notification via FCM
 * @param {string} token - FCM Device Token of the recipient
 * @param {object} payload - Notification data containing title, body, and meta
 */
const sendPushNotification = async (token, payload) => {
  if (!token) return { success: false, reason: 'No FCM token provided.' };

  const message = {
    token,
    notification: {
      title: payload.title,
      body: payload.body
    },
    data: payload.data || {}
  };

  if (messaging) {
    try {
      const response = await messaging.send(message);
      console.log('[Firebase Push] Notification sent successfully:', response);
      return { success: true, messageId: response };
    } catch (error) {
      console.error('[Firebase Push] Error sending FCM message:', error.message);
      return { success: false, error: error.message };
    }
  } else {
    console.log(`[Firebase Push Mock Delivery] Token: ${token} | Title: ${payload.title} | Body: ${payload.body}`);
    return { success: true, mocked: true };
  }
};

module.exports = { 
  admin, 
  verifyFirebaseIdToken, 
  sendPushNotification 
};

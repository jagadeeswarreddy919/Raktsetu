import { useEffect, useCallback } from 'react';
import { useSelector } from 'react-redux';
import { requestFcmToken, listenForForegroundMessages, saveFcmTokenToServer } from '../utils/firebase';
import { buildGreetingMessage } from '../utils/greeting';
import { playNotificationSound } from '../utils/sound';

export const usePushNotifications = (onNotification) => {
  const { token, user, isAuthenticated } = useSelector((state) => state.auth);

  const enablePush = useCallback(async () => {
    const fcmToken = await requestFcmToken();
    if (fcmToken && token) {
      await saveFcmTokenToServer(fcmToken, token);
    }
    return fcmToken;
  }, [token]);

  useEffect(() => {
    if (!isAuthenticated || !user) return;

    enablePush().catch(console.error);

    let unsubscribe = () => {};
    listenForForegroundMessages((payload) => {
      const title = payload.notification?.title || 'ONEDROP';
      const message = payload.notification?.body || '';
      const data = payload.data || {};
      
      onNotification?.({
        id: Date.now(),
        title,
        message,
        type: data.type === 'chat_message' ? 'chat' : data.emergencyMode === 'true' ? 'warning' : 'info',
        chatPartnerId: data.senderId || data.chatPartnerId,
        chatId: data.chatId,
        requestId: data.requestId
      });

      try {
        if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted' && document.hidden) {
          const localNotif = new Notification(title, { 
            body: message, 
            icon: '/logo.png', 
            tag: data.type || 'onedrop',
            data: data
          });

          localNotif.onclick = (e) => {
            e.preventDefault();
            window.focus();
            let targetUrl = '/';
            if (data.type === 'chat_message' && data.chatId) {
              targetUrl = `/chat?chatId=${data.chatId}`;
            } else if (data.type === 'new_request' || data.type === 'emergency_request') {
              targetUrl = '/donor';
            } else if (data.type === 'request_accepted') {
              targetUrl = '/recipient';
            } else if (data.chatPartnerId) {
              targetUrl = `/chat?partnerId=${data.chatPartnerId}`;
            }
            window.location.href = targetUrl;
            localNotif.close();
          };
        }
      } catch (notifErr) {
        console.warn('[Local Notification] Failed to display background notification:', notifErr.message);
      }
    }).then((unsub) => {
      unsubscribe = unsub || (() => {});
    });

    return () => unsubscribe();
  }, [isAuthenticated, user, token, enablePush, onNotification]);

  const showGreeting = useCallback(() => {
    if (!user) return;
    onNotification?.({
      id: `greeting-${Date.now()}`,
      title: buildGreetingMessage(user.fullName).split(',')[0],
      message: buildGreetingMessage(user.fullName),
      type: 'success'
    });
  }, [user, onNotification]);

  return { enablePush, showGreeting };
};

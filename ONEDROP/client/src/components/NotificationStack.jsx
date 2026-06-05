import React from 'react';
import { useNavigate } from 'react-router-dom';
import { MessageSquare, Bell, Sparkles, AlertTriangle, CheckCircle, X } from 'lucide-react';

const NotificationStack = ({ notifications, onRemove, onChat }) => {
  const navigate = useNavigate();

  const handleChat = (notif) => {
    if (notif.chatPartnerId) {
      onChat?.(notif.chatPartnerId, notif.chatId);
      navigate(notif.chatId ? `/chat?chatId=${notif.chatId}` : `/chat?partnerId=${notif.chatPartnerId}`);
      onRemove(notif.id);
    }
  };

  const getCardStyles = (type) => {
    switch (type) {
      case 'success':
        return {
          bg: 'bg-emerald-50/80 dark:bg-slate-900/90 border-emerald-500/30 dark:border-emerald-500/20',
          badgeBg: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
          text: 'text-slate-800 dark:text-slate-200',
          icon: <CheckCircle className="w-4 h-4 text-emerald-500" />
        };
      case 'warning':
        return {
          bg: 'bg-rose-50/80 dark:bg-slate-900/90 border-rose-500/30 dark:border-rose-500/20',
          badgeBg: 'bg-rose-500/10 text-rose-600 dark:text-rose-400',
          text: 'text-slate-800 dark:text-slate-200',
          icon: <AlertTriangle className="w-4 h-4 text-rose-500" />
        };
      case 'chat':
        return {
          bg: 'bg-indigo-50/85 dark:bg-slate-900/95 border-indigo-500/30 dark:border-indigo-500/20',
          badgeBg: 'bg-indigo-500/15 text-indigo-600 dark:text-indigo-400',
          text: 'text-slate-800 dark:text-slate-200',
          icon: <MessageSquare className="w-4 h-4 text-indigo-500" />
        };
      default:
        return {
          bg: 'bg-white/80 dark:bg-slate-900/90 border-slate-200/50 dark:border-slate-800/40',
          badgeBg: 'bg-slate-100 dark:bg-slate-800 text-slate-500',
          text: 'text-slate-800 dark:text-slate-200',
          icon: <Bell className="w-4 h-4 text-slate-500" />
        };
    }
  };

  return (
    <div className="fixed bottom-20 md:bottom-6 right-4 md:right-6 z-[60] space-y-3.5 w-80 max-w-[calc(100vw-2rem)] print:hidden">
      {notifications.map((notif) => {
        const styles = getCardStyles(notif.type);
        const titleText = notif.title ? String(notif.title) : '';
        const messageText = notif.message ? String(notif.message) : '';
        const initial = titleText ? titleText.replace(/💬\s*/, '').charAt(0) : '?';

        return (
          <div
            key={notif.id}
            className={`p-4 rounded-2xl border shadow-2xl backdrop-blur-lg flex gap-3.5 relative overflow-hidden transition-all duration-300 hover:shadow-indigo-500/5 hover:-translate-y-0.5 animate-notification-in ${styles.bg}`}
          >
            {/* Visual accent left line */}
            <div className={`absolute top-0 left-0 bottom-0 w-1.5 ${
              notif.type === 'success' ? 'bg-emerald-500' :
              notif.type === 'warning' ? 'bg-rose-500' :
              notif.type === 'chat' ? 'bg-indigo-500' : 'bg-slate-400'
            }`} />

            {/* Avatar or Icon Indicator */}
            <div className="flex-shrink-0">
              {notif.type === 'chat' ? (
                <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-indigo-500 to-violet-500 flex items-center justify-center font-bold text-white shadow-md text-sm uppercase ring-2 ring-indigo-400/20">
                  {initial}
                </div>
              ) : (
                <div className={`w-9 h-9 rounded-full flex items-center justify-center shadow-sm ${styles.badgeBg}`}>
                  {styles.icon}
                </div>
              )}
            </div>

            {/* Content Body */}
            <div className="flex-grow min-w-0 pr-2">
              <p className="font-extrabold text-[11px] tracking-wider uppercase text-slate-400 dark:text-slate-500 flex items-center gap-1">
                {notif.type === 'chat' && <Sparkles className="w-3 h-3 text-indigo-400 animate-pulse" />}
                {notif.type === 'chat' ? 'New Message' : notif.type === 'success' ? 'Success Alert' : notif.type === 'warning' ? 'Urgent Alert' : 'System Notification'}
              </p>
              <p className="font-bold text-xs mt-0.5 truncate text-slate-800 dark:text-slate-100">{titleText}</p>
              <p className="text-[11px] mt-1 leading-relaxed text-slate-500 dark:text-slate-300 break-words line-clamp-2">
                {messageText}
              </p>

              {(notif.chatPartnerId || notif.requesterId) && (
                <button
                  type="button"
                  onClick={() => handleChat({
                    ...notif,
                    chatPartnerId: notif.chatPartnerId || notif.requesterId
                  })}
                  className="mt-2.5 flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white rounded-lg text-[10px] font-extrabold shadow-md hover:shadow-lg transition-all transform active:scale-95"
                >
                  <MessageSquare className="w-3 h-3" /> Reply Now
                </button>
              )}
            </div>

            {/* Dismiss Cross */}
            <button
              type="button"
              onClick={() => onRemove(notif.id)}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors p-1 absolute top-2.5 right-2.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
};

export default NotificationStack;

// src/hooks/useNotifications.ts
export const useNotifications = () => {
  const getNotificationSettings = () => {
    const saved = localStorage.getItem('sfam-settings');
    if (saved) {
      return JSON.parse(saved).notifications;
    }
    return { alertesCritiques: true, alertesSeveres: true, rapportsQuotidiens: false };
  };

  return { getNotificationSettings };
};
const rawApiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export const API_URL = (() => {
  if (typeof window !== 'undefined' && window.location) {
    const hostname = window.location.hostname;
    // If the client is accessed from a remote device (like a phone) but the API is set to localhost,
    // dynamically resolve to the laptop's local network IP on the Wi-Fi network so the phone can connect!
    if (hostname !== 'localhost' && hostname !== '127.0.0.1' && rawApiUrl.includes('localhost')) {
      return rawApiUrl.replace('localhost', '192.168.1.36');
    }
  }
  return rawApiUrl;
})();


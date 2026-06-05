const rawApiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export const API_URL = (() => {
  if (typeof window !== 'undefined' && window.location) {
    const hostname = window.location.hostname;
    // If the frontend is accessed from a local network IP or localhost,
    // and the backend is also configured to a local IP or localhost,
    // dynamically swap the backend's IP to match the browser's address so mobile devices can connect!
    if (hostname !== 'localhost' && hostname !== '127.0.0.1') {
      try {
        const url = new URL(rawApiUrl);
        const isLocalHost = url.hostname === 'localhost' || 
                            url.hostname === '127.0.0.1' || 
                            url.hostname.startsWith('192.168.') || 
                            url.hostname.startsWith('10.') || 
                            url.hostname.startsWith('172.');
        if (isLocalHost) {
          url.hostname = hostname;
          return url.origin;
        }
      } catch (e) {
        if (rawApiUrl.includes('localhost')) {
          return rawApiUrl.replace('localhost', hostname);
        }
      }
    }
  }
  return rawApiUrl;
})();


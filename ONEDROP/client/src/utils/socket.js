import { io } from "socket.io-client";
import { API_URL } from "./api";

// Create a single shared socket instance, initially not auto-connected
// Using transports: ['websocket', 'polling'] to prioritize WebSockets and smoothly fall back to polling on mobile if needed,
// preventing continuous connect/disconnect loops on local network IPs.
export const socket = io(API_URL, {
  autoConnect: false,
  transports: ['polling', 'websocket'],
  upgrade: true,
  rememberUpgrade: true,
  reconnection: true,
  reconnectionAttempts: Infinity,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
  timeout: 20000,
});

// Configure diagnostic listeners
socket.on("connect", () => {
  console.log("[WebSocket] Connected:", socket.id);
});

socket.on("disconnect", (reason) => {
  console.log("[WebSocket] Disconnected:", reason);
});

socket.on("connect_error", (err) => {
  console.log("[WebSocket] Connect Error:", err.message);
});

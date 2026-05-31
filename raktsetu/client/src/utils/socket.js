import { io } from "socket.io-client";
import { API_URL } from "./api";

// Create a single shared socket instance, initially not auto-connected
export const socket = io(API_URL, {
  autoConnect: false,
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

/**
 * RaktSetu Premium Synthesized Notification Chime
 * Uses the Web Audio API to dynamically generate a clean, modern electronic
 * double-tone chime in real-time. No external audio assets required.
 */
export const playNotificationSound = () => {
  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) {
      console.warn('[Sound] Web Audio API is not supported in this browser.');
      return;
    }

    const audioCtx = new AudioContextClass();
    
    // Create twin oscillators for a harmonious double-tone chord
    const osc1 = audioCtx.createOscillator();
    const osc2 = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    
    // Tone 1: High crisp bell tone starting at C5 (523.25Hz) and ramping to A5 (880Hz)
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(523.25, audioCtx.currentTime);
    osc1.frequency.exponentialRampToValueAtTime(880.00, audioCtx.currentTime + 0.12);
    
    // Tone 2: Warm ambient tone starting at E5 (659.25Hz) and ramping to C6 (1046.50Hz)
    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(659.25, audioCtx.currentTime);
    osc2.frequency.exponentialRampToValueAtTime(1046.50, audioCtx.currentTime + 0.12);
    
    // Gain Envelope: Fast attack, smooth decay
    gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
    gainNode.gain.linearRampToValueAtTime(0.25, audioCtx.currentTime + 0.04);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.55);
    
    // Connections
    osc1.connect(gainNode);
    osc2.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    
    // Trigger
    osc1.start(audioCtx.currentTime);
    osc2.start(audioCtx.currentTime);
    
    // Schedule stop to release audio resources
    osc1.stop(audioCtx.currentTime + 0.6);
    osc2.stop(audioCtx.currentTime + 0.6);
  } catch (error) {
    console.warn('[Sound] Audio playback failed or blocked by browser autoplay policy:', error.message);
  }
};

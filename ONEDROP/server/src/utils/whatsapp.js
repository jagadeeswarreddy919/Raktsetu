/**
 * ONEDROP WhatsApp Alert & Gateway Utility
 * Supports CallMeBot (free hobbyist gateway), Twilio WhatsApp API, and
 * a premium Crimson Console Intercept fallback for local testing.
 */

const axios = require('axios');

// Twilio Configs
const twilioAccountSid = process.env.TWILIO_ACCOUNT_SID;
const twilioAuthToken = process.env.TWILIO_AUTH_TOKEN;
const twilioFromNumber = process.env.TWILIO_FROM_NUMBER || '+14155238886'; // Default Twilio Sandbox Number

// CallMeBot Configs (Free easy WhatsApp alerts to registered numbers)
const callmebotApiKey = process.env.WHATSAPP_CALLMEBOT_API_KEY;
const callmebotPhone = process.env.WHATSAPP_CALLMEBOT_PHONE; // registered number, e.g. +918500508940

let twilioClient = null;

if (twilioAccountSid && twilioAuthToken) {
  try {
    const twilio = require('twilio');
    twilioClient = twilio(twilioAccountSid, twilioAuthToken);
    console.log('[WhatsApp Config] Twilio WhatsApp client initialized.');
  } catch (err) {
    console.warn('[WhatsApp Config] Twilio module not loaded:', err.message);
  }
}

/**
 * Dispatches a WhatsApp notification / OTP.
 * Falls back to beautiful console interception if no API configs exist.
 * 
 * @param {Object} params
 * @param {string} params.to Recipient phone number (e.g., '8500508940')
 * @param {string} params.message Message content to send
 * @returns {Promise<Object>} Status response
 */
const sendWhatsApp = async ({ to, message }) => {
  try {
    if (!to || !message) {
      throw new Error('Recipient number and message contents are required.');
    }

    // Basic cleaning: remove whitespace and ensure country code (+91 by default for India if no '+' prefix exists)
    let cleanTo = to.trim().replace(/\s+/g, '');
    if (!cleanTo.startsWith('+')) {
      if (cleanTo.length === 10) {
        cleanTo = `+91${cleanTo}`;
      } else {
        cleanTo = `+${cleanTo}`;
      }
    }

    // 1. If CallMeBot is configured, make a GET request
    // CallMeBot is a free and reliable hobbyist bridge that matches this requirement perfectly.
    if (callmebotApiKey) {
      const recipientPhone = callmebotPhone || cleanTo;
      let finalMessage = message;
      
      // If sending to a standard user, route through the Admin's CallMeBot channel as a forwarding alert
      if (cleanTo !== recipientPhone && callmebotPhone) {
        finalMessage = `[ONEDROP Admin Forwarding Alert]\nForward this OTP to standard user (${cleanTo}):\n\n${message}`;
      }
      
      const url = `https://api.callmebot.com/whatsapp.php?phone=${encodeURIComponent(recipientPhone)}&text=${encodeURIComponent(finalMessage)}&apikey=${encodeURIComponent(callmebotApiKey)}`;
      
      console.log(`[WhatsApp Gateway] Dispatching via CallMeBot to ${recipientPhone}...`);
      await axios.get(url);
      console.log('[WhatsApp Gateway] CallMeBot API request sent successfully.');
      return { success: true, gateway: 'CallMeBot', recipient: recipientPhone };
    }

    // 2. If Twilio WhatsApp client is available, dispatch via Twilio
    if (twilioClient) {
      const response = await twilioClient.messages.create({
        body: message,
        from: `whatsapp:${twilioFromNumber}`,
        to: `whatsapp:${cleanTo}`
      });
      console.log(`[WhatsApp Gateway] Twilio successfully dispatched message: ${response.sid}`);
      return { success: true, gateway: 'Twilio', messageId: response.sid };
    }

    // 3. Fallback: Premium Crimson Console Intercept Simulation
    const timestamp = new Date().toLocaleString();
    const borderChar = '║';
    const separator = '╠' + '═'.repeat(68) + '╣';
    const topBorder = '╔' + '═'.repeat(68) + '╗';
    const bottomBorder = '╚' + '═'.repeat(68) + '╝';

    console.log('\n' + topBorder);
    console.log(`${borderChar}               🔥 WHATSAPP INTERCEPTED NOTIFICATION 🔥            ${borderChar}`);
    console.log(separator);
    console.log(`${borderChar}  SENDER   : ONEDROP WhatsApp Dispatcher (SIMULATED GATEWAY)       ${borderChar}`);
    console.log(`${borderChar}  RECIPIENT: ${cleanTo.padEnd(54, ' ')} ${borderChar}`);
    console.log(`${borderChar}  TIMESTAMP: ${timestamp.padEnd(54, ' ')} ${borderChar}`);
    console.log(separator);
    console.log(`${borderChar}  MESSAGE  :                                                         ${borderChar}`);

    const lines = message.match(/.{1,60}/g) || [message];
    lines.forEach(line => {
      console.log(`${borderChar}    ${line.padEnd(60, ' ')}   ${borderChar}`);
    });

    console.log(separator);
    console.log(`${borderChar}  STATUS   : DELIVERED TO WHATSAPP SIMULATOR (100% SUCCESS)         ${borderChar}`);
    console.log(bottomBorder + '\n');

    return {
      success: true,
      gateway: 'MockConsole',
      messageId: `mock-wa-${Date.now()}-${Math.floor(Math.random() * 1000)}`
    };
  } catch (error) {
    console.error(`[WhatsApp Gateway] Dispatch failed to ${to}:`, error.message);
    return { success: false, error: error.message };
  }
};

module.exports = { sendWhatsApp };

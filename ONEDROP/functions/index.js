const { onDocumentCreated } = require('firebase-functions/v2/firestore');
const admin = require('firebase-admin');
const { Resend } = require('resend');

// Initialize Firebase Admin SDK
if (!admin.apps.length) {
  admin.initializeApp();
}

// Initialize Resend with API Key from environmental variables
const resendApiKey = process.env.RESEND_API_KEY;
const resend = resendApiKey ? new Resend(resendApiKey) : null;

/**
 * Cloud Function Trigger: sendEmergencyAlert
 * Triggers when a new document is created in the 'emergencyRequests/{requestId}' collection in Firestore.
 */
exports.sendEmergencyAlert = onDocumentCreated('emergencyRequests/{requestId}', async (event) => {
  try {
    const snap = event.data;
    if (!snap) {
      console.warn('[Alert Trigger] Triggered, but event has no document snapshot.');
      return;
    }

    const requestData = snap.data();
    if (!requestData) {
      console.warn('[Alert Trigger] Document data is empty.');
      return;
    }

    const { bloodGroup, district, hospital, patientName, contactNumber } = requestData;

    // Validate presence of required properties
    if (!bloodGroup || !district || !hospital || !patientName || !contactNumber) {
      console.error('[Alert Trigger] Missing required blood request fields in document:', requestData);
      return;
    }

    // Verify if email service can be initialized
    if (!resend) {
      console.error('[Alert Trigger] RESEND_API_KEY environment variable is not configured. Email dispatch aborted.');
      return;
    }

    console.log(`[Alert Trigger] Processing emergency request for ${patientName} (${bloodGroup}) in ${district}...`);

    // Fetch nearby matching donors from Firestore
    const donorsSnapshot = await admin.firestore()
      .collection('donors')
      .where('bloodGroup', '==', bloodGroup)
      .where('district', '==', district)
      .get();

    if (donorsSnapshot.empty) {
      console.log(`[Alert Trigger] No matching ${bloodGroup} donors found in district: ${district}`);
      return;
    }

    console.log(`[Alert Trigger] Found ${donorsSnapshot.size} matching donors. Initiating parallel email dispatches...`);

    // Map through donors to construct parallel email dispatches
    const emailPromises = donorsSnapshot.docs.map(async (doc) => {
      const donor = doc.data();
      const email = donor.email;
      const donorName = donor.fullName || 'Valued Donor';

      if (!email) {
        console.warn(`[Alert Trigger] Donor document ${doc.id} is missing an email address. Skipping.`);
        return;
      }

      const subject = `🚨 URGENT: ${bloodGroup} Blood Required for ${patientName}`;
      
      const emailHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
              background-color: #f8fafc;
              margin: 0;
              padding: 20px;
              color: #1e293b;
            }
            .wrapper {
              max-width: 600px;
              margin: 0 auto;
              background-color: #ffffff;
              border-radius: 12px;
              overflow: hidden;
              box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1);
              border: 1px solid #e2e8f0;
            }
            .header {
              background: linear-gradient(135deg, #ef4444 0%, #b91c1c 100%);
              padding: 30px;
              text-align: center;
              color: #ffffff;
            }
            .header h1 {
              margin: 0;
              font-size: 24px;
              font-weight: 800;
              text-transform: uppercase;
              letter-spacing: 1px;
            }
            .content {
              padding: 30px;
            }
            .greeting {
              font-size: 16px;
              font-weight: 600;
              margin-bottom: 16px;
            }
            .message {
              line-height: 1.6;
              font-size: 15px;
              color: #475569;
              margin-bottom: 24px;
            }
            .details-box {
              background-color: #fef2f2;
              border: 1px solid #fecaca;
              border-radius: 8px;
              padding: 20px;
              margin-bottom: 24px;
            }
            .details-row {
              margin-bottom: 10px;
              font-size: 15px;
            }
            .details-row:last-child {
              margin-bottom: 0;
            }
            .label {
              font-weight: 700;
              color: #991b1b;
              width: 150px;
              display: inline-block;
            }
            .value {
              color: #1e293b;
            }
            .cta-container {
              text-align: center;
              margin: 30px 0 10px 0;
            }
            .cta-button {
              display: inline-block;
              background-color: #ef4444;
              color: #ffffff !important;
              text-decoration: none;
              padding: 12px 24px;
              font-size: 15px;
              font-weight: 600;
              border-radius: 8px;
              box-shadow: 0 4px 6px -1px rgba(239, 68, 68, 0.2);
            }
            .footer {
              background-color: #f1f5f9;
              padding: 20px;
              text-align: center;
              font-size: 12px;
              color: #64748b;
              border-top: 1px solid #e2e8f0;
            }
          </style>
        </head>
        <body>
          <div class="wrapper">
            <div class="header">
              <h1>🚨 EMERGENCY BLOOD ALERT</h1>
            </div>
            <div class="content">
              <div class="greeting">Dear ${donorName},</div>
              <div class="message">
                A critical, emergency blood request matching your blood group (<strong>${bloodGroup}</strong>) has just been created in your district. If you are eligible and available to donate, lives are depending on your swift response.
              </div>
              
              <div class="details-box">
                <div class="details-row"><span class="label">Patient Name:</span><span class="value">${patientName}</span></div>
                <div class="details-row"><span class="label">Blood Group:</span><span class="value"><strong>${bloodGroup}</strong></span></div>
                <div class="details-row"><span class="label">Hospital:</span><span class="value">${hospital}</span></div>
                <div class="details-row"><span class="label">District:</span><span class="value">${district}</span></div>
                <div class="details-row"><span class="label">Contact Phone:</span><span class="value">${contactNumber}</span></div>
              </div>

              <div class="message">
                Please contact the coordinator/recipient family directly at the number listed above, or access your ONEDROP dashboard to coordinate assistance.
              </div>

              <div class="cta-container">
                <a href="https://onedrop-portal.web.app/donor-dashboard" class="cta-button" target="_blank">Pledge Your Support Now</a>
              </div>
            </div>
            <div class="footer">
              <p style="margin: 0 0 5px 0;">&copy; ${new Date().getFullYear()} Team ONEDROP. All rights reserved.</p>
              <p style="margin: 0;">You are receiving this critical notification because you are a registered blood donor in the ONEDROP Emergency Network.</p>
            </div>
          </div>
        </body>
        </html>
      `.trim();

      try {
        // Send email using Resend
        await resend.emails.send({
          from: 'ONEDROP Alerts <alerts@onedrop.org>',
          to: [email],
          subject: subject,
          html: emailHtml
        });
        console.log(`[Alert Trigger] Notification email sent successfully to ${email}`);
      } catch (err) {
        console.error(`[Alert Trigger] Error sending to ${email}:`, err.message);
      }
    });

    // Await all parallel dispatches to complete, keeping the function process alive
    await Promise.all(emailPromises);
    console.log('[Alert Trigger] Completed emergency broadcast.');
  } catch (error) {
    console.error('[Alert Trigger] Uncaught error during execution flow:', error);
  }
});

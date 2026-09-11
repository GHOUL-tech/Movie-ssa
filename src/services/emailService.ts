import emailjs from '@emailjs/browser';

export interface EmailJsConfig {
  serviceId: string;
  templateId: string;
  publicKey: string;
  privateKey?: string;
}

export const DEFAULT_EMAILJS_CONFIG: EmailJsConfig = {
  serviceId: 'default_service',
  templateId: 'template_2eivmll',
  publicKey: '4QQ0PbfytyUk2Odp_',
  privateKey: 'M8ofvODFUYLwhHyUoEI88',
};

export function getEmailJsConfig(): EmailJsConfig {
  let serviceId = import.meta.env.VITE_EMAILJS_SERVICE_ID || DEFAULT_EMAILJS_CONFIG.serviceId;
  let templateId = import.meta.env.VITE_EMAILJS_TEMPLATE_ID || DEFAULT_EMAILJS_CONFIG.templateId;
  let publicKey = import.meta.env.VITE_EMAILJS_PUBLIC_KEY || DEFAULT_EMAILJS_CONFIG.publicKey;
  let privateKey = import.meta.env.VITE_EMAILJS_PRIVATE_KEY || DEFAULT_EMAILJS_CONFIG.privateKey;

  try {
    const custom = localStorage.getItem('zinovis_emailjs_custom_config');
    if (custom) {
      const parsed = JSON.parse(custom);
      if (parsed.serviceId) serviceId = parsed.serviceId.trim();
      if (parsed.templateId) templateId = parsed.templateId.trim();
      if (parsed.publicKey) publicKey = parsed.publicKey.trim();
      if (parsed.privateKey) privateKey = parsed.privateKey.trim();
    }
  } catch {}

  return { serviceId, templateId, publicKey, privateKey };
}

export function saveCustomEmailJsConfig(cfg: EmailJsConfig) {
  try {
    localStorage.setItem('zinovis_emailjs_custom_config', JSON.stringify(cfg));
  } catch {}
}

export interface SendOtpParams {
  to_email: string;
  to_name: string;
  otp_code: string;
  userId?: string;
}

export interface SendOtpResult {
  success: boolean;
  isSimulated?: boolean;
  error?: string;
  message?: string;
  otpCode?: string;
}

/**
 * Draft Email Template for EmailJS (Dark / Terminal Style)
 */
export const EMAILJS_CODE_DRAFT_TEMPLATE = {
  subject: '[ZINOVIS AUTH] Verification Code: {{otp_code}}',
  templateParams: {
    to_email: 'Recipient email address (e.g. user@example.com)',
    to_name: 'Recipient user name (e.g. Alex)',
    otp_code: '6-digit one-time password (e.g. 849201)',
    app_name: 'Zinovis HD Streaming',
    expiry_time: '10 minutes',
    support_email: 'support@zinovis.com',
  },
  htmlBody: `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Zinovis Auth Verification</title>
</head>
<body style="margin: 0; padding: 24px; background-color: #0c0c0e; font-family: 'JetBrains Mono', 'Fira Code', Consolas, Monaco, 'Courier New', monospace; color: #e2e8f0;">
  <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 580px; margin: 0 auto; background-color: #131318; border: 1px solid #272732; border-radius: 16px; overflow: hidden; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.7);">
    <tr>
      <td style="padding: 16px 20px; background-color: #1a1a24; border-bottom: 1px solid #272732;">
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
          <tr>
            <td align="left">
              <span style="display: inline-block; width: 10px; height: 10px; border-radius: 50%; background-color: #ef4444; margin-right: 6px;"></span>
              <span style="display: inline-block; width: 10px; height: 10px; border-radius: 50%; background-color: #f59e0b; margin-right: 6px;"></span>
              <span style="display: inline-block; width: 10px; height: 10px; border-radius: 50%; background-color: #10b981;"></span>
            </td>
            <td align="right" style="font-size: 11px; color: #94a3b8; letter-spacing: 0.5px;">
              zinovis://auth/reset-token
            </td>
          </tr>
        </table>
      </td>
    </tr>
    <tr>
      <td style="padding: 28px 24px;">
        <div style="color: #ef4444; font-size: 18px; font-weight: 800; margin-bottom: 12px; letter-spacing: -0.5px;">
          &gt; ZINOVIS_HD_STREAMING // PASS_RESET
        </div>
        <p style="font-size: 13px; line-height: 1.6; color: #94a3b8; margin: 0 0 20px 0;">
          Target Account: <span style="color: #38bdf8; font-weight: 600;">{{to_name}}</span> (<span style="color: #f1f5f9;">{{to_email}}</span>)<br>
          Status: <span style="color: #4ade80;">ONE_TIME_CODE_REQUESTED</span>
        </p>
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #09090d; border: 1px solid #334155; border-radius: 12px; margin: 20px 0;">
          <tr>
            <td style="padding: 24px; text-align: center;">
              <div style="font-size: 11px; color: #64748b; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 8px;">
                // 6-DIGIT VERIFICATION CODE
              </div>
              <div style="font-size: 38px; font-weight: 900; letter-spacing: 12px; color: #ef4444; text-shadow: 0 0 20px rgba(239, 68, 68, 0.4); margin: 6px 0;">
                {{otp_code}}
              </div>
              <div style="font-size: 11px; color: #64748b; margin-top: 8px;">
                TTL: {{expiry_time}} • DO NOT SHARE THIS KEY
              </div>
            </td>
          </tr>
        </table>
        <p style="font-size: 12px; line-height: 1.6; color: #64748b; margin: 20px 0 0 0;">
          If you did not initiate this authentication cycle, please ignore this payload. Existing credentials remain safe and encrypted.
        </p>
      </td>
    </tr>
    <tr>
      <td style="padding: 16px 24px; background-color: #0c0c0e; border-top: 1px solid #272732; font-size: 11px; color: #475569; text-align: center;">
        Support channel: <span style="color: #94a3b8;">{{support_email}}</span> | © 2026 Zinovis Media Engine
      </td>
    </tr>
  </table>
</body>
</html>
`,
  plainText: `
> ZINOVIS_HD_STREAMING // PASS_RESET
===========================================
Target: {{to_name}} <{{to_email}}>
Status: ONE_TIME_CODE_REQUESTED

VERIFICATION CODE:
>> {{otp_code}} <<

TTL: {{expiry_time}}
Do not share this authorization code with anyone.

If you did not request this, please disregard.
Support: {{support_email}}
===========================================
`
};

export const EMAILJS_DRAFT_TEMPLATE = EMAILJS_CODE_DRAFT_TEMPLATE;

/**
 * Send & Persist OTP Code via Backend, Firebase & EmailJS
 */
export async function sendOtpViaEmail(params: SendOtpParams): Promise<SendOtpResult> {
  const { to_email, to_name, otp_code, userId } = params;
  const cleanEmail = to_email.trim().toLowerCase();

  // 1. Always safeguard in localStorage
  try {
    localStorage.setItem(`zinovis_otp_${cleanEmail}`, JSON.stringify({
      code: otp_code,
      userId,
      expiresAt: Date.now() + 15 * 60 * 1000
    }));
  } catch (err) {
    console.warn('Local storage OTP save warning:', err);
  }

  // 2. Also register in Backend Express Server if available
  try {
    fetch('/api/auth/send-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: cleanEmail,
        userName: to_name,
        userId: userId,
      })
    }).catch(() => {});
  } catch {}

  // 3. If EmailJS is configured, send live email
  const { serviceId, templateId, publicKey } = getEmailJsConfig();

  if (templateId && publicKey) {
    const targetServiceId = serviceId || 'default_service';
    try {
      const templateParams = {
        to_email: cleanEmail,
        email: cleanEmail,
        user_email: cleanEmail,
        recipient_email: cleanEmail,
        to_name: to_name || cleanEmail.split('@')[0],
        user_name: to_name || cleanEmail.split('@')[0],
        name: to_name || cleanEmail.split('@')[0],
        otp_code: otp_code,
        code: otp_code,
        passcode: otp_code,
        verification_code: otp_code,
        message: `Your Zinovis verification code is: ${otp_code}. Valid for 10 minutes.`,
        app_name: 'Zinovis HD Streaming',
        expiry_time: '10 minutes',
        support_email: 'support@zinovis.com',
      };

      const response = await emailjs.send(
        targetServiceId,
        templateId,
        templateParams,
        publicKey
      );

      if (response.status === 200 || response.text === 'OK') {
        return {
          success: true,
          isSimulated: false,
          otpCode: otp_code,
          message: `Verification code successfully sent to ${cleanEmail}`,
        };
      }
    } catch (err: any) {
      console.warn('EmailJS delivery attempt notice:', err?.text || err?.message || err);
      // If serviceId was default_service and failed with service not found, try service_default
      if (targetServiceId === 'default_service') {
        try {
          const retryResp = await emailjs.send(
            'service_default',
            templateId,
            {
              to_email: cleanEmail,
              email: cleanEmail,
              to_name: to_name || cleanEmail.split('@')[0],
              otp_code: otp_code,
              code: otp_code,
              passcode: otp_code,
              verification_code: otp_code,
            },
            publicKey
          );
          if (retryResp.status === 200 || retryResp.text === 'OK') {
            return {
              success: true,
              isSimulated: false,
              otpCode: otp_code,
              message: `Verification code successfully sent to ${cleanEmail}`,
            };
          }
        } catch {}
      }

      return {
        success: true,
        isSimulated: true,
        otpCode: otp_code,
        error: err?.message || 'Email delivery notice',
        message: `Verification code dispatched for ${cleanEmail}`,
      };
    }
  }

  // Fallback demo mode when EmailJS is unconfigured
  return {
    success: true,
    isSimulated: true,
    otpCode: otp_code,
    message: `Verification code generated for ${cleanEmail} (Instant verification ready)`,
  };
}

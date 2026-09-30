"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.emailService = void 0;
/**
 * Pacific Admin — Transactional Email Service
 * Uses Resend API (primary) with nodemailer SMTP fallback.
 */
const nodemailer_1 = __importDefault(require("nodemailer"));
const env_1 = require("../../config/env");
/**
 * Send an email via Resend API (primary) or nodemailer SMTP (fallback).
 */
async function sendEmailViaResend(options) {
    const { Resend } = await Promise.resolve().then(() => __importStar(require('resend')));
    const resend = new Resend(env_1.env.resend.apiKey);
    const result = await resend.emails.send({
        from: options.from || env_1.env.resend.from,
        to: [options.to],
        subject: options.subject,
        html: options.html,
    });
    if (result.error) {
        throw new Error(`Resend error: ${result.error.message || JSON.stringify(result.error)}`);
    }
}
async function sendEmailViaSMTP(options) {
    const transporter = nodemailer_1.default.createTransport({
        host: env_1.env.smtp.host,
        port: env_1.env.smtp.port,
        secure: env_1.env.smtp.port === 465,
        auth: {
            user: env_1.env.smtp.user,
            pass: env_1.env.smtp.pass,
        },
    });
    await transporter.sendMail({
        from: env_1.env.smtp.from,
        to: options.to,
        subject: options.subject,
        html: options.html,
    });
}
async function sendEmail(options) {
    const hasResend = env_1.env.resend.apiKey && env_1.env.resend.apiKey.startsWith('re_');
    const hasSMTP = env_1.env.smtp.user && env_1.env.smtp.pass && !env_1.env.smtp.pass.includes('your-google-app-password');
    if (hasResend) {
        await sendEmailViaResend(options);
        return;
    }
    if (hasSMTP) {
        await sendEmailViaSMTP(options);
        return;
    }
    // Dev fallback: log to console instead of failing silently
    console.log('[EMAIL] No email provider configured. Would send:');
    console.log('  To:', options.to);
    console.log('  Subject:', options.subject);
}
// ────────────────────────────────────────────────────────────────────────────
exports.emailService = {
    /**
     * Send welcome email with temporary credentials to a newly created admin.
     */
    async sendWelcomeEmail(data) {
        const loginUrl = data.loginUrl || env_1.env.frontend.adminUrl || 'https://pacific-admin-one.vercel.app';
        const fullName = [data.firstName, data.lastName].filter(Boolean).join(' ');
        const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Welcome to Pacific Admin Console</title>
</head>
<body style="margin:0;padding:0;background-color:#030213;font-family:'Segoe UI',Arial,sans-serif;color:#e5e7eb;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#030213;padding:32px 16px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color:#0f0e2a;border:1px solid rgba(255,255,255,0.08);border-radius:16px;overflow:hidden;max-width:600px;width:100%;">
          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#0a0a1a 0%,#121226 100%);padding:32px 40px;border-bottom:1px solid rgba(127,183,6,0.2);">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    <div style="display:inline-block;background:rgba(127,183,6,0.1);border:1px solid rgba(127,183,6,0.3);border-radius:12px;padding:10px 18px;">
                      <span style="color:#7FB706;font-size:18px;font-weight:900;letter-spacing:2px;">PACIFIC CUBICLES</span>
                    </div>
                    <p style="color:#9ca3af;font-size:11px;letter-spacing:3px;text-transform:uppercase;margin:8px 0 0 0;">Enterprise Admin Console</p>
                  </td>
                  <td align="right">
                    <div style="background:rgba(127,183,6,0.15);border-radius:50%;width:48px;height:48px;display:inline-flex;align-items:center;justify-content:center;font-size:22px;">🔐</div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:40px 40px 32px;">
              <h2 style="color:#ffffff;font-size:22px;font-weight:800;margin:0 0 8px 0;">Welcome aboard, ${fullName}!</h2>
              <p style="color:#9ca3af;font-size:14px;line-height:1.6;margin:0 0 24px 0;">
                Your Pacific Restroom Cubicle Enterprise Admin account has been provisioned. 
                Use the temporary credentials below to complete your onboarding setup.
              </p>

              <!-- Credentials Box -->
              <div style="background:#0a0a1a;border:1px solid rgba(127,183,6,0.25);border-radius:12px;padding:24px;margin-bottom:24px;">
                <p style="color:#7FB706;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:2px;margin:0 0 16px 0;">Your Login Credentials</p>
                
                <table width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="padding:8px 0;border-bottom:1px solid rgba(255,255,255,0.05);">
                      <span style="color:#6b7280;font-size:12px;display:block;margin-bottom:2px;">Email Address</span>
                      <span style="color:#e5e7eb;font-size:15px;font-weight:600;font-family:monospace;">${data.to}</span>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:12px 0 0 0;">
                      <span style="color:#6b7280;font-size:12px;display:block;margin-bottom:2px;">Temporary Password</span>
                      <span style="color:#7FB706;font-size:18px;font-weight:900;font-family:monospace;letter-spacing:2px;background:rgba(127,183,6,0.08);padding:8px 14px;border-radius:8px;display:inline-block;">${data.temporaryPassword}</span>
                    </td>
                  </tr>
                </table>
              </div>

              <!-- Warning Box -->
              <div style="background:rgba(251,191,36,0.08);border:1px solid rgba(251,191,36,0.25);border-radius:10px;padding:14px 18px;margin-bottom:24px;">
                <p style="color:#fbbf24;font-size:12px;font-weight:700;margin:0 0 4px 0;">⚠️ Important Security Notice</p>
                <p style="color:#d97706;font-size:12px;line-height:1.5;margin:0;">
                  This is a <strong>one-time temporary password</strong>. On your first login, you will be required to:
                  <br/>1. Set a strong personal password
                  <br/>2. Configure Two-Factor Authentication (2FA)
                  <br/><br/>Do not share these credentials with anyone.
                </p>
              </div>

              <!-- CTA -->
              <div style="text-align:center;margin:32px 0;">
                <a href="${loginUrl}" 
                   style="display:inline-block;background:linear-gradient(135deg,#7FB706,#B5F823);color:#030213;font-weight:900;font-size:14px;text-decoration:none;padding:14px 36px;border-radius:12px;letter-spacing:0.5px;">
                  Sign In to Admin Console →
                </a>
              </div>

              <p style="color:#6b7280;font-size:12px;text-align:center;margin:0;">
                Login URL: <a href="${loginUrl}" style="color:#7FB706;">${loginUrl}</a>
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#0a0a1a;padding:20px 40px;border-top:1px solid rgba(255,255,255,0.05);">
              <p style="color:#4b5563;font-size:11px;text-align:center;margin:0;">
                This email was sent by Pacific Restroom Cubicle ERP System${data.resetByEmail ? ` by ${data.resetByEmail}` : ''}.<br/>
                If you did not expect this email, please contact your system administrator immediately.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `.trim();
        await sendEmail({
            to: data.to,
            subject: '🔐 Your Pacific Admin Console Account — Login Credentials',
            html,
        });
    },
    /**
     * Send a password reset notification with the new temporary password.
     */
    async sendPasswordResetEmail(data) {
        const loginUrl = data.loginUrl || env_1.env.frontend.adminUrl || 'https://pacific-admin-one.vercel.app';
        const fullName = [data.firstName].filter(Boolean).join(' ');
        const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Pacific Admin — Password Reset</title>
</head>
<body style="margin:0;padding:0;background-color:#030213;font-family:'Segoe UI',Arial,sans-serif;color:#e5e7eb;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#030213;padding:32px 16px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color:#0f0e2a;border:1px solid rgba(255,255,255,0.08);border-radius:16px;overflow:hidden;max-width:600px;width:100%;">
          <tr>
            <td style="background:linear-gradient(135deg,#0a0a1a 0%,#121226 100%);padding:32px 40px;border-bottom:1px solid rgba(239,68,68,0.2);">
              <span style="color:#7FB706;font-size:18px;font-weight:900;letter-spacing:2px;">PACIFIC CUBICLES</span>
              <p style="color:#9ca3af;font-size:11px;letter-spacing:3px;text-transform:uppercase;margin:8px 0 0 0;">Enterprise Admin Console</p>
            </td>
          </tr>
          <tr>
            <td style="padding:40px 40px 32px;">
              <h2 style="color:#ffffff;font-size:20px;font-weight:800;margin:0 0 12px 0;">Admin Password Reset</h2>
              <p style="color:#9ca3af;font-size:14px;line-height:1.6;margin:0 0 24px 0;">
                Hello ${fullName}, your Pacific Admin account password has been reset by a Super Admin.
                Use the temporary password below to sign in and set a new secure password.
              </p>

              <div style="background:#0a0a1a;border:1px solid rgba(127,183,6,0.25);border-radius:12px;padding:24px;margin-bottom:24px;">
                <p style="color:#7FB706;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:2px;margin:0 0 12px 0;">New Temporary Password</p>
                <span style="color:#7FB706;font-size:20px;font-weight:900;font-family:monospace;letter-spacing:3px;background:rgba(127,183,6,0.08);padding:10px 18px;border-radius:8px;display:inline-block;">${data.newPassword}</span>
              </div>

              <div style="background:rgba(251,191,36,0.08);border:1px solid rgba(251,191,36,0.25);border-radius:10px;padding:14px 18px;margin-bottom:24px;">
                <p style="color:#fbbf24;font-size:12px;font-weight:700;margin:0 0 4px 0;">⚠️ Action Required</p>
                <p style="color:#d97706;font-size:12px;line-height:1.5;margin:0;">
                  You will be prompted to set a new password on your next login.
                  If you did not request this reset, contact your Super Admin immediately.
                </p>
              </div>

              <div style="text-align:center;margin:24px 0;">
                <a href="${loginUrl}" style="display:inline-block;background:linear-gradient(135deg,#7FB706,#B5F823);color:#030213;font-weight:900;font-size:14px;text-decoration:none;padding:14px 36px;border-radius:12px;">
                  Sign In Now →
                </a>
              </div>
            </td>
          </tr>
          <tr>
            <td style="background:#0a0a1a;padding:20px 40px;border-top:1px solid rgba(255,255,255,0.05);">
              <p style="color:#4b5563;font-size:11px;text-align:center;margin:0;">
                Pacific Restroom Cubicle ERP System${data.resetByEmail ? ` — Reset by ${data.resetByEmail}` : ''}.
                Do not share this password with anyone.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `.trim();
        await sendEmail({
            to: data.to,
            subject: '🔑 Pacific Admin — Your Password Has Been Reset',
            html,
        });
    },
};
//# sourceMappingURL=email.service.js.map
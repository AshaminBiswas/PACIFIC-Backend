import crypto from 'crypto';
import QRCode from 'qrcode';

// Base32 Alphabet for RFC 4648
const BASE32_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

/**
 * Encodes a buffer into a Base32 string (without padding)
 */
export function base32Encode(buffer: Buffer): string {
  let bits = 0;
  let value = 0;
  let output = '';

  for (let i = 0; i < buffer.length; i++) {
    value = (value << 8) | buffer[i];
    bits += 8;

    while (bits >= 5) {
      output += BASE32_CHARS[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }

  if (bits > 0) {
    output += BASE32_CHARS[(value << (5 - bits)) & 31];
  }

  return output;
}

/**
 * Decodes a Base32 string into a Buffer
 */
export function base32Decode(input: string): Buffer {
  const cleanInput = input.toUpperCase().replace(/=+$/, '').replace(/\s+/g, '');
  let bits = 0;
  let value = 0;
  const bytes: number[] = [];

  for (let i = 0; i < cleanInput.length; i++) {
    const char = cleanInput[i];
    const val = BASE32_CHARS.indexOf(char);
    if (val === -1) continue;

    value = (value << 5) | val;
    bits += 5;

    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }

  return Buffer.from(bytes);
}

/**
 * Generates an RFC 6238 TOTP code for a given secret and counter
 */
export function generateTotp(secretBase32: string, counter: number): string {
  const key = base32Decode(secretBase32);

  // Counter as 8-byte big-endian integer
  const counterBuf = Buffer.alloc(8);
  counterBuf.writeBigUInt64BE(BigInt(counter));

  const hmac = crypto.createHmac('sha1', key);
  hmac.update(counterBuf);
  const hash = hmac.digest();

  // Dynamic truncation
  const offset = hash[hash.length - 1] & 0x0f;
  const binary =
    ((hash[offset] & 0x7f) << 24) |
    ((hash[offset + 1] & 0xff) << 16) |
    ((hash[offset + 2] & 0xff) << 8) |
    (hash[offset + 3] & 0xff);

  const otp = binary % 1000000;
  return otp.toString().padStart(6, '0');
}

export const totpService = {
  /**
   * Generates a random 20-byte Base32 secret string (160 bits entropy)
   */
  generateSecret(): string {
    const randomBytes = crypto.randomBytes(20);
    return base32Encode(randomBytes);
  },

  /**
   * Builds the standard otpauth URI for mobile authenticator apps
   */
  getOtpAuthUri(email: string, secret: string, issuer = 'Pacific Admin'): string {
    const cleanIssuer = issuer.replace(/:/g, '').trim();
    const cleanEmail = email.trim();
    const label = encodeURIComponent(`${cleanIssuer}:${cleanEmail}`);
    return `otpauth://totp/${label}?secret=${secret}&issuer=${encodeURIComponent(cleanIssuer)}&algorithm=SHA1&digits=6&period=30`;
  },

  /**
   * Generates a high-contrast Data URL QR code for easy scanning
   */
  async generateQrCodeDataUrl(otpAuthUri: string): Promise<string> {
    return QRCode.toDataURL(otpAuthUri, {
      errorCorrectionLevel: 'M',
      width: 280,
      margin: 2,
      color: {
        dark: '#030213',
        light: '#FFFFFF',
      },
    });
  },

  /**
   * Verifies a 6-digit TOTP code against the secret with ±2 time steps tolerance (±60 seconds drift)
   */
  verifyCode(secret: string, userCode: string, window = 2): boolean {
    if (!secret || !userCode) return false;
    const cleanCode = userCode.trim().replace(/\s+/g, '');
    if (cleanCode.length !== 6 || !/^\d{6}$/.test(cleanCode)) return false;

    const currentCounter = Math.floor(Date.now() / 1000 / 30);

    for (let i = -window; i <= window; i++) {
      const generated = generateTotp(secret, currentCounter + i);
      if (crypto.timingSafeEqual(Buffer.from(generated), Buffer.from(cleanCode))) {
        return true;
      }
    }

    return false;
  },

  /**
   * Generates 10 single-use emergency recovery backup codes (e.g., "ABCD-1234")
   */
  generateRecoveryCodes(count = 10): string[] {
    const codes: string[] = [];
    for (let i = 0; i < count; i++) {
      const part1 = crypto.randomBytes(2).toString('hex').toUpperCase();
      const part2 = crypto.randomBytes(2).toString('hex').toUpperCase();
      codes.push(`${part1}-${part2}`);
    }
    return codes;
  },

  /**
   * Normalizes a recovery code for matching (removes hyphens, uppercase)
   */
  normalizeRecoveryCode(code: string): string {
    return code.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
  },

  /**
   * Validates if input matches any stored recovery code (ignoring formatting)
   */
  matchesRecoveryCode(inputCode: string, storedCodes: string[]): { match: boolean; matchedIndex: number } {
    const normalizedInput = this.normalizeRecoveryCode(inputCode);
    if (!normalizedInput || normalizedInput.length < 8) return { match: false, matchedIndex: -1 };

    for (let i = 0; i < storedCodes.length; i++) {
      if (this.normalizeRecoveryCode(storedCodes[i]) === normalizedInput) {
        return { match: true, matchedIndex: i };
      }
    }

    return { match: false, matchedIndex: -1 };
  },

  generateTotp,
  base32Encode,
  base32Decode,
};

/**
 * Encodes a buffer into a Base32 string (without padding)
 */
export declare function base32Encode(buffer: Buffer): string;
/**
 * Decodes a Base32 string into a Buffer
 */
export declare function base32Decode(input: string): Buffer;
/**
 * Generates an RFC 6238 TOTP code for a given secret and counter
 */
export declare function generateTotp(secretBase32: string, counter: number): string;
export declare const totpService: {
    /**
     * Generates a random 20-byte Base32 secret string (160 bits entropy)
     */
    generateSecret(): string;
    /**
     * Builds the standard otpauth URI for mobile authenticator apps
     */
    getOtpAuthUri(email: string, secret: string, issuer?: string): string;
    /**
     * Generates a high-contrast Data URL QR code for easy scanning
     */
    generateQrCodeDataUrl(otpAuthUri: string): Promise<string>;
    /**
     * Verifies a 6-digit TOTP code against the secret with ±2 time steps tolerance (±60 seconds drift)
     */
    verifyCode(secret: string, userCode: string, window?: number): boolean;
    /**
     * Generates 10 single-use emergency recovery backup codes (e.g., "ABCD-1234")
     */
    generateRecoveryCodes(count?: number): string[];
    /**
     * Normalizes a recovery code for matching (removes hyphens, uppercase)
     */
    normalizeRecoveryCode(code: string): string;
    /**
     * Validates if input matches any stored recovery code (ignoring formatting)
     */
    matchesRecoveryCode(inputCode: string, storedCodes: string[]): {
        match: boolean;
        matchedIndex: number;
    };
    generateTotp: typeof generateTotp;
    base32Encode: typeof base32Encode;
    base32Decode: typeof base32Decode;
};
//# sourceMappingURL=totp.service.d.ts.map
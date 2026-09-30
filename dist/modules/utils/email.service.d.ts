interface WelcomeEmailData {
    to: string;
    firstName: string;
    lastName: string;
    temporaryPassword: string;
    loginUrl?: string;
    resetByEmail?: string;
}
interface PasswordResetEmailData {
    to: string;
    firstName: string;
    newPassword: string;
    resetByEmail?: string;
    loginUrl?: string;
}
export declare const emailService: {
    /**
     * Send welcome email with temporary credentials to a newly created admin.
     */
    sendWelcomeEmail(data: WelcomeEmailData): Promise<void>;
    /**
     * Send a password reset notification with the new temporary password.
     */
    sendPasswordResetEmail(data: PasswordResetEmailData): Promise<void>;
};
export {};
//# sourceMappingURL=email.service.d.ts.map
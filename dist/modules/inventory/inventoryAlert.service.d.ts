export declare const LOW_STOCK_ALERT_EMAILS: string[];
export declare class InventoryAlertService {
    /**
     * Check if an item hit its reorder level, and trigger an automated multi-recipient alert email.
     * Sends EVERY TIME the threshold is breached or touched (no artificial delay).
     */
    checkAndTriggerLowStockAlert(itemId: string, triggerReason?: string): Promise<{
        success: boolean;
        id: string | undefined;
        recipients: string[];
        error?: undefined;
    } | {
        success: boolean;
        error: any;
        id?: undefined;
        recipients?: undefined;
    } | undefined>;
}
export declare const inventoryAlertService: InventoryAlertService;
//# sourceMappingURL=inventoryAlert.service.d.ts.map
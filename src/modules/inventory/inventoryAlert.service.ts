import { prisma } from '../../config/database';
import { emailService } from '../../utils/email.service';

export const LOW_STOCK_ALERT_EMAILS = [
  'ashaminbiswas1@gmail.com',
  'ejaj@pacificproduct.in',
  'info@pacificproduct.in',
  'info.kolkata@pacificproduct.in',
  'info.pacificproduct@gmail.com',
];

export class InventoryAlertService {
  /**
   * Temporary pause flag: Automated low-stock email alerts are paused per admin instruction.
   * Defaults to TRUE (paused). Can be enabled if process.env.ENABLE_STOCK_EMAIL_ALERTS === 'true'.
   */
  public isPaused: boolean = process.env.ENABLE_STOCK_EMAIL_ALERTS === 'true' ? false : true;

  setPaused(paused: boolean) {
    this.isPaused = paused;
  }

  isAlertPaused(): boolean {
    return this.isPaused;
  }

  /**
   * Check if an item hit its reorder level, and trigger an automated multi-recipient alert email.
   * Sends EVERY TIME the threshold is breached or touched (no artificial delay).
   */
  async checkAndTriggerLowStockAlert(itemId: string, triggerReason?: string) {
    // Check if stock automated mailing system is temporarily paused
    if (this.isPaused) {
      console.log(
        `⏸️ [InventoryAlert] Stock mailing system is temporarily PAUSED. Skipping email dispatch for item ID: ${itemId}.`
      );
      return { success: true, paused: true, message: 'Stock alert email system is temporarily paused.' };
    }

    try {
      const item = await prisma.boardInventoryItem.findUnique({
        where: { id: itemId },
        include: {
          vendor: {
            include: { party: true },
          },
        },
      });

      if (!item) return;

      const currentStock = Number(item.currentStock);
      const reorderLevel = Number(item.reorderLevel);

      // Only trigger if at or below reorder level
      if (currentStock > reorderLevel) {
        return;
      }

      const warehouseName =
        item.warehouse.toUpperCase() === 'KOLKATA'
          ? 'Kolkata Depot (East India)'
          : item.warehouse.toUpperCase() === 'DELHI'
          ? 'Delhi Central Depot (Mandoli)'
          : `${item.warehouse} Facility`;

      const supplierName =
        item.vendorName ||
        item.vendor?.party?.tradeName ||
        item.vendor?.party?.legalName ||
        'Approved Supplier';

      const deficit = Math.max(0, reorderLevel - currentStock);
      const recommendedOrder = Math.max(deficit + 20, 25);
      const reasonText = triggerReason || 'Stock Deduction / Reorder Level Reached';

      const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Low Stock Alert</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; margin: 0; padding: 0; background-color: #0c0a1d; color: #ffffff; }
    .container { max-width: 620px; margin: 20px auto; background-color: #121029; border: 1px solid #2d2a4a; border-radius: 16px; overflow: hidden; }
    .header { background: linear-gradient(135deg, #b91c1c 0%, #dc2626 100%); padding: 24px; text-align: center; }
    .header h1 { margin: 0; font-size: 20px; color: #ffffff; text-transform: uppercase; letter-spacing: 1px; font-weight: 800; }
    .header p { margin: 6px 0 0 0; font-size: 13px; color: #fecaca; }
    .content { padding: 28px 24px; }
    .badge { display: inline-block; padding: 6px 14px; border-radius: 999px; background: rgba(220, 38, 38, 0.2); border: 1px solid #ef4444; color: #f87171; font-size: 12px; font-weight: bold; margin-bottom: 20px; }
    .warehouse-badge { display: inline-block; padding: 6px 14px; border-radius: 999px; background: rgba(127, 183, 6, 0.15); border: 1px solid #7FB706; color: #B5F823; font-size: 12px; font-weight: bold; margin-left: 8px; }
    .stats-table { width: 100%; border-collapse: collapse; margin: 20px 0; background: #080718; border-radius: 12px; overflow: hidden; border: 1px solid #262343; }
    .stats-table th { text-align: left; padding: 12px 16px; font-size: 11px; text-transform: uppercase; color: #94a3b8; background: #161334; border-bottom: 1px solid #262343; }
    .stats-table td { padding: 12px 16px; font-size: 13px; color: #e2e8f0; border-bottom: 1px solid #1a1738; }
    .highlight-low { color: #f87171; font-weight: bold; font-size: 16px; }
    .action-box { background: #1a1638; border: 1px solid #3b3570; border-radius: 12px; padding: 16px; margin-top: 24px; }
    .action-box h3 { margin: 0 0 8px 0; font-size: 14px; color: #B5F823; }
    .action-box p { margin: 0; font-size: 12px; color: #cbd5e1; line-height: 1.5; }
    .footer { padding: 16px 24px; background: #080718; text-align: center; font-size: 11px; color: #64748b; border-top: 1px solid #1f1b3d; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>CRITICAL LOW STOCK ALERT</h1>
      <p>Pacific Restroom Cubicle Enterprise Inventory Monitoring</p>
    </div>
    <div class="content">
      <div style="margin-bottom: 16px;">
        <span class="badge">&#9888; REORDER LEVEL BREACHED</span>
        <span class="warehouse-badge">&#127970; ${warehouseName}</span>
      </div>

      <p style="font-size: 14px; line-height: 1.6; color: #e2e8f0; margin-top: 0;">
        Stock balance for Board SKU <strong>${item.designNo}</strong> (${item.designName || item.boardType}) has dropped to or below the mandatory reorder threshold.
      </p>

      <table class="stats-table">
        <tr>
          <th>Specification</th>
          <th>Inventory Metric</th>
        </tr>
        <tr>
          <td><strong>Trigger Event</strong></td>
          <td style="color: #f59e0b; font-weight: bold;">${reasonText}</td>
        </tr>
        <tr>
          <td><strong>Warehouse Location</strong></td>
          <td style="color: #B5F823; font-weight: bold;">${warehouseName}</td>
        </tr>
        <tr>
          <td><strong>Design / Shade No</strong></td>
          <td><strong style="color: #ffffff;">${item.designNo}</strong> ${item.designName ? `(${item.designName})` : ''}</td>
        </tr>
        <tr>
          <td><strong>Board Category & Type</strong></td>
          <td>${item.category} &bull; ${item.boardType}</td>
        </tr>
        <tr>
          <td><strong>Dimensions & Thickness</strong></td>
          <td>${item.size} &bull; ${item.thickness}</td>
        </tr>
        <tr>
          <td><strong>Supplier / Brand</strong></td>
          <td>${supplierName}</td>
        </tr>
        <tr>
          <td><strong>Current Stock in Hand</strong></td>
          <td class="highlight-low">${currentStock} ${item.unit}</td>
        </tr>
        <tr>
          <td><strong>Reorder Threshold Level</strong></td>
          <td>${reorderLevel} ${item.unit}</td>
        </tr>
        <tr>
          <td><strong>Warehouse Rack / Bay</strong></td>
          <td>${item.locationRack || 'Unassigned'}</td>
        </tr>
        <tr>
          <td><strong>Recommended Procurement</strong></td>
          <td style="color: #38bdf8; font-weight: bold;">+${recommendedOrder} ${item.unit} Minimum</td>
        </tr>
      </table>

      <div class="action-box">
        <h3>Action Required: Immediate Purchase Order</h3>
        <p>
          Please issue a Purchase Order to <strong>${supplierName}</strong> for <strong>${recommendedOrder} sheets</strong> to ensure ongoing factory panel fabrication and site dispatch deadlines are met.
        </p>
      </div>
    </div>
    <div class="footer">
      This is an automated operational alert generated by Pacific Admin Enterprise ERP.<br>
      Dispatched to: ${LOW_STOCK_ALERT_EMAILS.join(', ')}<br>
      Generated at: ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} IST
    </div>
  </div>
</body>
</html>
      `;

      console.log(
        `🚨 [InventoryAlert] Sending Low Stock Alert for SKU ${item.designNo} in ${item.warehouse} (Reason: ${reasonText}) to 5 recipients...`
      );

      const sendResult = await emailService.sendEmail({
        to: LOW_STOCK_ALERT_EMAILS,
        subject: `[CRITICAL LOW STOCK ALERT] Design ${item.designNo} (${item.warehouse} Depot) - Current Stock: ${currentStock} ${item.unit} (Reorder: ${reorderLevel})`,
        html,
      });

      // Update timestamp to log alert history
      await prisma.boardInventoryItem.update({
        where: { id: item.id },
        data: { lastAlertSentAt: new Date() },
      });

      console.log(`✅ [InventoryAlert] Low stock alert successfully emailed to all 5 recipients (Resend ID: ${sendResult?.id}).`);
      return { success: true, id: sendResult?.id, recipients: LOW_STOCK_ALERT_EMAILS };
    } catch (err: any) {
      console.error(`[InventoryAlert] Failed to dispatch low-stock email alert:`, err.message);
      return { success: false, error: err.message };
    }
  }
}

export const inventoryAlertService = new InventoryAlertService();

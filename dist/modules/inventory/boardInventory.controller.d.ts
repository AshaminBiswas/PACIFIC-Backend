import { Request, Response } from 'express';
export declare class BoardInventoryController {
    listBoards(req: Request, res: Response): Promise<void>;
    getBoardById(req: Request, res: Response): Promise<void>;
    createBoard(req: Request, res: Response): Promise<void>;
    updateBoard(req: Request, res: Response): Promise<void>;
    deleteBoard(req: Request, res: Response): Promise<void>;
    addStockInward(req: Request, res: Response): Promise<void>;
    issueStockManual(req: Request, res: Response): Promise<void>;
    autoDeductForIssueList(req: Request, res: Response): Promise<void>;
    adjustDeductionMovement(req: Request, res: Response): Promise<void>;
    listSuppliers(_req: Request, res: Response): Promise<void>;
    getMovements(req: Request, res: Response): Promise<void>;
    getAnalytics(req: Request, res: Response): Promise<void>;
    triggerLowStockAlert(req: Request, res: Response): Promise<void>;
}
export declare const boardInventoryController: BoardInventoryController;
//# sourceMappingURL=boardInventory.controller.d.ts.map
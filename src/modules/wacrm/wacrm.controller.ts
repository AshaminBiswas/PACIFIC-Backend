import { Request, Response, NextFunction } from 'express';
import { AuthRequest } from '../../middleware/auth.middleware';
import { sendSuccess } from '../../utils/response';
import * as wacrmService from './wacrm.service';

// ─── 1. Dashboard ─────────────────────────────────────────────────────────────
export const getDashboard = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const data = await wacrmService.getDashboardStats();
    sendSuccess(res, data, 'WACRM dashboard metrics retrieved successfully');
  } catch (err) {
    next(err);
  }
};

// ─── 2. Conversations & Inbox ──────────────────────────────────────────────────
export const listConversations = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const status = req.query.status as string | undefined;
    const search = req.query.search as string | undefined;
    const data = await wacrmService.listConversations(status, search);
    sendSuccess(res, data, 'Conversations retrieved successfully');
  } catch (err) {
    next(err);
  }
};

export const getConversation = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const data = await wacrmService.getConversation(req.params.id);
    sendSuccess(res, data, 'Conversation details retrieved successfully');
  } catch (err) {
    next(err);
  }
};

export const sendMessage = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const operatorName = (req.user as any)?.firstName
      ? `${(req.user as any).firstName} ${(req.user as any).lastName || ''}`.trim()
      : req.user?.email || 'Pacific Sales';
    const data = await wacrmService.sendMessage(operatorName, req.body);
    sendSuccess(res, data, 'Message sent successfully', 201);
  } catch (err) {
    next(err);
  }
};

export const updateConversation = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const data = await wacrmService.updateConversation(req.params.id, req.body);
    sendSuccess(res, data, 'Conversation updated successfully');
  } catch (err) {
    next(err);
  }
};

// ─── 3. Contacts & Leads ───────────────────────────────────────────────────────
export const listContacts = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const search = req.query.search as string | undefined;
    const tag = req.query.tag as string | undefined;
    const data = await wacrmService.listContacts(search, tag);
    sendSuccess(res, data, 'Contacts retrieved successfully');
  } catch (err) {
    next(err);
  }
};

export const createContact = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const data = await wacrmService.createContact(req.body);
    sendSuccess(res, data, 'Contact created successfully', 201);
  } catch (err) {
    next(err);
  }
};

export const updateContact = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const data = await wacrmService.updateContact(req.params.id, req.body);
    sendSuccess(res, data, 'Contact updated successfully');
  } catch (err) {
    next(err);
  }
};

export const deleteContact = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const data = await wacrmService.deleteContact(req.params.id);
    sendSuccess(res, data, 'Contact deleted successfully');
  } catch (err) {
    next(err);
  }
};

// ─── 4. Pipelines & Deals ─────────────────────────────────────────────────────
export const getPipelineWithDeals = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const data = await wacrmService.getPipelineWithDeals();
    sendSuccess(res, data, 'Pipeline and deals retrieved successfully');
  } catch (err) {
    next(err);
  }
};

export const createDeal = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const data = await wacrmService.createDeal(req.body);
    sendSuccess(res, data, 'Deal created successfully', 201);
  } catch (err) {
    next(err);
  }
};

export const updateDeal = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const data = await wacrmService.updateDeal(req.params.id, req.body);
    sendSuccess(res, data, 'Deal updated successfully');
  } catch (err) {
    next(err);
  }
};

export const deleteDeal = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const data = await wacrmService.deleteDeal(req.params.id);
    sendSuccess(res, data, 'Deal deleted successfully');
  } catch (err) {
    next(err);
  }
};

// ─── 5. Broadcasts & Campaigns ────────────────────────────────────────────────
export const listBroadcasts = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const data = await wacrmService.listBroadcasts();
    sendSuccess(res, data, 'Broadcasts retrieved successfully');
  } catch (err) {
    next(err);
  }
};

export const createBroadcast = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const data = await wacrmService.createBroadcast(req.body);
    sendSuccess(res, data, 'Broadcast campaign launched successfully', 201);
  } catch (err) {
    next(err);
  }
};

// ─── 6. Templates & Tags ──────────────────────────────────────────────────────
export const listTemplates = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const data = await wacrmService.listTemplates();
    sendSuccess(res, data, 'Templates retrieved successfully');
  } catch (err) {
    next(err);
  }
};

export const listTags = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const data = await wacrmService.listTags();
    sendSuccess(res, data, 'Tags retrieved successfully');
  } catch (err) {
    next(err);
  }
};

// ─── 7. Meta WhatsApp Cloud Config ─────────────────────────────────────────────
export const getConfig = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const data = await wacrmService.getWhatsAppConfig();
    sendSuccess(res, data, 'WhatsApp Cloud config retrieved successfully');
  } catch (err) {
    next(err);
  }
};

export const saveConfig = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const data = await wacrmService.saveWhatsAppConfig(req.body);
    sendSuccess(res, data, 'WhatsApp Cloud settings saved successfully');
  } catch (err) {
    next(err);
  }
};

// ─── 8. Inbound Meta Webhook ───────────────────────────────────────────────────
export const verifyWebhook = (req: Request, res: Response) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === 'pacific_wacrm_verify_secret') {
    res.status(200).send(challenge);
  } else {
    res.status(403).send('Forbidden');
  }
};

export const handleWebhook = async (req: Request, res: Response) => {
  // Acknowledge Meta immediately with 200 OK
  res.status(200).json({ status: 'received' });
};

// ─── 9. Automations Engine ────────────────────────────────────────────────────
export const listAutomations = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const data = await wacrmService.listAutomations();
    sendSuccess(res, data, 'Automations retrieved successfully');
  } catch (err) {
    next(err);
  }
};

export const createAutomation = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const data = await wacrmService.createAutomation(req.body);
    sendSuccess(res, data, 'Automation created successfully', 201);
  } catch (err) {
    next(err);
  }
};

export const updateAutomation = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const data = await wacrmService.updateAutomation(req.params.id, req.body);
    sendSuccess(res, data, 'Automation updated successfully');
  } catch (err) {
    next(err);
  }
};

export const deleteAutomation = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const data = await wacrmService.deleteAutomation(req.params.id);
    sendSuccess(res, data, 'Automation deleted successfully');
  } catch (err) {
    next(err);
  }
};

export const listAutomationLogs = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const automationId = req.query.automationId as string | undefined;
    const data = await wacrmService.listAutomationLogs(automationId);
    sendSuccess(res, data, 'Automation execution logs retrieved successfully');
  } catch (err) {
    next(err);
  }
};

// ─── 10. Interactive Visual Flows ─────────────────────────────────────────────
export const listFlows = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const data = await wacrmService.listFlows();
    sendSuccess(res, data, 'Visual flows retrieved successfully');
  } catch (err) {
    next(err);
  }
};

export const getFlow = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const data = await wacrmService.getFlow(req.params.id);
    sendSuccess(res, data, 'Flow details retrieved successfully');
  } catch (err) {
    next(err);
  }
};

export const saveFlow = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const data = await wacrmService.saveFlow(req.body);
    sendSuccess(res, data, 'Flow saved successfully');
  } catch (err) {
    next(err);
  }
};

export const deleteFlow = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const data = await wacrmService.deleteFlow(req.params.id);
    sendSuccess(res, data, 'Flow deleted successfully');
  } catch (err) {
    next(err);
  }
};

// ─── 11. Quick Replies ─────────────────────────────────────────────────────────
export const listQuickReplies = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const data = await wacrmService.listQuickReplies();
    sendSuccess(res, data, 'Quick replies retrieved successfully');
  } catch (err) {
    next(err);
  }
};

export const createQuickReply = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const data = await wacrmService.createQuickReply(req.body);
    sendSuccess(res, data, 'Quick reply saved successfully', 201);
  } catch (err) {
    next(err);
  }
};

export const deleteQuickReply = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const data = await wacrmService.deleteQuickReply(req.params.id);
    sendSuccess(res, data, 'Quick reply removed successfully');
  } catch (err) {
    next(err);
  }
};

// ─── 12. AI Reply Assistant & Knowledge Base ───────────────────────────────────
export const getAiConfig = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const data = await wacrmService.getAiConfig();
    sendSuccess(res, data, 'AI Assistant configuration retrieved successfully');
  } catch (err) {
    next(err);
  }
};

export const saveAiConfig = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const data = await wacrmService.saveAiConfig(req.body);
    sendSuccess(res, data, 'AI Assistant configuration updated successfully');
  } catch (err) {
    next(err);
  }
};

export const generateAiDraftReply = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const conversationId = req.body.conversationId || req.params.conversationId;
    const data = await wacrmService.generateAiDraftReply(conversationId);
    sendSuccess(res, data, 'AI draft reply generated successfully');
  } catch (err) {
    next(err);
  }
};

// ─── 13. Message Reactions ────────────────────────────────────────────────────
export const toggleMessageReaction = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const messageId = req.params.id;
    const emoji = req.body.emoji;
    const data = await wacrmService.toggleMessageReaction(messageId, emoji);
    sendSuccess(res, data, 'Message reaction updated successfully');
  } catch (err) {
    next(err);
  }
};

// ─── 14. Meta WhatsApp Cloud Test & Sync ──────────────────────────────────────
export const testConnection = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const data = await wacrmService.testWhatsAppConnection();
    sendSuccess(res, data, 'WhatsApp Cloud connection verified successfully');
  } catch (err) {
    next(err);
  }
};

export const createTemplate = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const data = await wacrmService.createTemplate(req.body);
    sendSuccess(res, data, 'Template saved successfully', 201);
  } catch (err) {
    next(err);
  }
};

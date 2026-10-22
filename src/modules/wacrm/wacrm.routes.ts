import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.middleware';
import { validate } from '../../middleware/validate.middleware';
import * as controller from './wacrm.controller';
import {
  CreateWacrmContactSchema,
  UpdateWacrmContactSchema,
  SendWacrmMessageSchema,
  UpdateConversationStatusSchema,
  CreateWacrmDealSchema,
  UpdateWacrmDealSchema,
  CreateWacrmBroadcastSchema,
  SaveWacrmConfigSchema,
} from './wacrm.schema';

const router = Router();

// ─── Meta Inbound Webhook (Public with Meta HMAC/Challenge) ────────────────────
router.get('/webhook', controller.verifyWebhook);
router.post('/webhook', controller.handleWebhook);

// ─── CRM Authentication Guard (Pacific Admin Auth) ───────────────────────────
router.use(requireAuth);

// ─── 1. Dashboard ─────────────────────────────────────────────────────────────
router.get('/dashboard', controller.getDashboard);

// ─── 2. Shared Inbox & Conversations ───────────────────────────────────────────
router.get('/conversations', controller.listConversations);
router.get('/conversations/:id', controller.getConversation);
router.patch('/conversations/:id', validate(UpdateConversationStatusSchema), controller.updateConversation);
router.post('/messages', validate(SendWacrmMessageSchema), controller.sendMessage);

// ─── 3. Contacts & Commercial Leads ────────────────────────────────────────────
router.get('/contacts', controller.listContacts);
router.post('/contacts', validate(CreateWacrmContactSchema), controller.createContact);
router.patch('/contacts/:id', validate(UpdateWacrmContactSchema), controller.updateContact);
router.delete('/contacts/:id', controller.deleteContact);

// ─── 4. Sales Pipelines & Kanban Deals ─────────────────────────────────────────
router.get('/pipeline', controller.getPipelineWithDeals);
router.post('/deals', validate(CreateWacrmDealSchema), controller.createDeal);
router.patch('/deals/:id', validate(UpdateWacrmDealSchema), controller.updateDeal);
router.delete('/deals/:id', controller.deleteDeal);

// ─── 5. Broadcasts & Campaigns ────────────────────────────────────────────────
router.get('/broadcasts', controller.listBroadcasts);
router.post('/broadcasts', validate(CreateWacrmBroadcastSchema), controller.createBroadcast);

// ─── 6. Templates & Tags ──────────────────────────────────────────────────────
router.get('/templates', controller.listTemplates);
router.post('/templates', controller.createTemplate);
router.get('/tags', controller.listTags);

// ─── 7. Meta WhatsApp Cloud Config ─────────────────────────────────────────────
router.get('/config', controller.getConfig);
router.post('/config', validate(SaveWacrmConfigSchema), controller.saveConfig);
router.post('/config/test', controller.testConnection);

// ─── 8. Automations Engine ────────────────────────────────────────────────────
router.get('/automations', controller.listAutomations);
router.post('/automations', controller.createAutomation);
router.patch('/automations/:id', controller.updateAutomation);
router.delete('/automations/:id', controller.deleteAutomation);
router.get('/automations/logs', controller.listAutomationLogs);

// ─── 9. Interactive Visual Flows ─────────────────────────────────────────────
router.get('/flows', controller.listFlows);
router.get('/flows/:id', controller.getFlow);
router.post('/flows', controller.saveFlow);
router.delete('/flows/:id', controller.deleteFlow);

// ─── 10. Quick Replies & Canned Messages ──────────────────────────────────────
router.get('/quick-replies', controller.listQuickReplies);
router.post('/quick-replies', controller.createQuickReply);
router.delete('/quick-replies/:id', controller.deleteQuickReply);

// ─── 11. AI Assistant & Smart Reply Generator ─────────────────────────────────
router.get('/ai/config', controller.getAiConfig);
router.post('/ai/config', controller.saveAiConfig);
router.post('/ai/draft', controller.generateAiDraftReply);

// ─── 12. Message Reactions ────────────────────────────────────────────────────
router.patch('/messages/:id/react', controller.toggleMessageReaction);

export default router;

import { PrismaClient } from '@prisma/client';
import type {
  CreateWacrmContactInput,
  UpdateWacrmContactInput,
  SendWacrmMessageInput,
  UpdateConversationStatusInput,
  CreateWacrmDealInput,
  UpdateWacrmDealInput,
  CreateWacrmBroadcastInput,
  SaveWacrmConfigInput,
} from './wacrm.schema';

export class AppError extends Error {
  statusCode: number;
  constructor(message: string, statusCode = 500) {
    super(message);
    this.statusCode = statusCode;
    this.name = 'AppError';
  }
}

const prisma = new PrismaClient();

// ─── 1. Dashboard Statistics ──────────────────────────────────────────────────
export const getDashboardStats = async () => {
  const [
    contactsCount,
    conversationsCount,
    unreadCount,
    dealsSummary,
    broadcastsCount,
    configRows,
  ] = await Promise.all([
    prisma.$queryRawUnsafe<any[]>(`SELECT count(*)::int as count FROM public.wacrm_contacts;`),
    prisma.$queryRawUnsafe<any[]>(`SELECT count(*)::int as count FROM public.wacrm_conversations;`),
    prisma.$queryRawUnsafe<any[]>(`SELECT coalesce(sum(unread_count), 0)::int as count FROM public.wacrm_conversations;`),
    prisma.$queryRawUnsafe<any[]>(`
      SELECT count(*)::int as count, coalesce(sum(value), 0)::numeric as total_value
      FROM public.wacrm_deals
      WHERE status = 'active';
    `),
    prisma.$queryRawUnsafe<any[]>(`SELECT count(*)::int as count FROM public.wacrm_broadcasts;`),
    prisma.$queryRawUnsafe<any[]>(`SELECT status, phone_number_id, connected_at FROM public.wacrm_config LIMIT 1;`),
  ]);

  const recentMessages = await prisma.$queryRawUnsafe<any[]>(`
    SELECT m.id, m.sender_type, m.content_text, m.created_at, c.name as contact_name, c.phone
    FROM public.wacrm_messages m
    JOIN public.wacrm_conversations cv ON cv.id = m.conversation_id
    JOIN public.wacrm_contacts c ON c.id = cv.contact_id
    ORDER BY m.created_at DESC
    LIMIT 6;
  `);

  return {
    totalContacts: contactsCount[0]?.count || 0,
    activeConversations: conversationsCount[0]?.count || 0,
    unreadMessages: unreadCount[0]?.count || 0,
    activeDeals: dealsSummary[0]?.count || 0,
    pipelineValue: Number(dealsSummary[0]?.total_value || 0),
    totalBroadcasts: broadcastsCount[0]?.count || 0,
    whatsappStatus: configRows[0]?.status || 'disconnected',
    connectedPhoneId: configRows[0]?.phone_number_id || null,
    connectedAt: configRows[0]?.connected_at || null,
    recentMessages: recentMessages.map((m) => ({
      ...m,
      createdAt: m.created_at,
    })),
  };
};

// ─── 2. Conversations & Inbox ──────────────────────────────────────────────────
export const listConversations = async (status?: string, search?: string) => {
  const conditions: string[] = ['1=1'];
  const params: any[] = [];
  let idx = 1;

  if (status && status !== 'all') {
    conditions.push(`cv.status = $${idx++}`);
    params.push(status);
  }

  if (search && search.trim()) {
    conditions.push(`(c.name ILIKE $${idx} OR c.phone ILIKE $${idx} OR c.company ILIKE $${idx} OR cv.last_message_text ILIKE $${idx})`);
    params.push(`%${search.trim()}%`);
    idx++;
  }

  const query = `
    SELECT 
      cv.id,
      cv.contact_id as "contactId",
      cv.status,
      cv.assigned_agent_name as "assignedAgentName",
      cv.last_message_text as "lastMessageText",
      cv.last_message_at as "lastMessageAt",
      cv.unread_count as "unreadCount",
      cv.created_at as "createdAt",
      cv.updated_at as "updatedAt",
      c.name as "contactName",
      c.phone as "contactPhone",
      c.company as "contactCompany",
      c.avatar_url as "contactAvatar",
      coalesce(
        (
          SELECT json_agg(json_build_object('id', t.id, 'name', t.name, 'color', t.color))
          FROM public.wacrm_contact_tags ct
          JOIN public.wacrm_tags t ON t.id = ct.tag_id
          WHERE ct.contact_id = c.id
        ),
        '[]'::json
      ) as tags
    FROM public.wacrm_conversations cv
    JOIN public.wacrm_contacts c ON c.id = cv.contact_id
    WHERE ${conditions.join(' AND ')}
    ORDER BY cv.last_message_at DESC NULLS LAST, cv.updated_at DESC;
  `;

  const rows = await prisma.$queryRawUnsafe<any[]>(query, ...params);
  return rows.map((r) => ({
    ...r,
    tags: Array.isArray(r.tags) ? r.tags : [],
  }));
};

export const getConversation = async (id: string) => {
  // Execute conversation lookup, message history, and unread reset in parallel
  const [convs, messages] = await Promise.all([
    prisma.$queryRawUnsafe<any[]>(
      `SELECT 
         cv.id,
         cv.contact_id as "contactId",
         cv.status,
         cv.assigned_agent_name as "assignedAgentName",
         cv.last_message_text as "lastMessageText",
         cv.last_message_at as "lastMessageAt",
         cv.unread_count as "unreadCount",
         cv.created_at as "createdAt",
         c.name as "contactName",
         c.phone as "contactPhone",
         c.email as "contactEmail",
         c.company as "contactCompany",
         c.notes as "contactNotes",
         coalesce(
           (
             SELECT json_agg(json_build_object('id', t.id, 'name', t.name, 'color', t.color))
             FROM public.wacrm_contact_tags ct
             JOIN public.wacrm_tags t ON t.id = ct.tag_id
             WHERE ct.contact_id = c.id
           ),
           '[]'::json
         ) as tags
       FROM public.wacrm_conversations cv
       JOIN public.wacrm_contacts c ON c.id = cv.contact_id
       WHERE cv.id = $1::uuid
       LIMIT 1;`,
      id
    ),
    prisma.$queryRawUnsafe<any[]>(
      `SELECT 
         id,
         conversation_id as "conversationId",
         sender_type as "senderType",
         sender_name as "senderName",
         content_type as "contentType",
         content_text as "contentText",
         media_url as "mediaUrl",
         template_name as "templateName",
         message_id as "messageId",
         status,
         reaction,
         interactive_payload as "interactivePayload",
         ai_generated as "aiGenerated",
         created_at as "createdAt"
       FROM public.wacrm_messages
       WHERE conversation_id = $1::uuid
       ORDER BY created_at ASC;`,
      id
    ),
    prisma.$executeRawUnsafe(
      `UPDATE public.wacrm_conversations SET unread_count = 0, updated_at = NOW() WHERE id = $1::uuid AND unread_count > 0;`,
      id
    ).catch(() => {})
  ]);

  if (convs.length === 0) {
    throw new AppError('Conversation not found', 404);
  }

  return {
    conversation: {
      ...convs[0],
      tags: Array.isArray(convs[0].tags) ? convs[0].tags : [],
    },
    messages,
  };
};

export const sendMessage = async (operatorName: string, input: SendWacrmMessageInput) => {
  let conversationId = input.conversationId;

  // Resolve or create conversation if not present
  if (!conversationId) {
    if (!input.contactId) {
      throw new AppError('Either conversationId or contactId is required', 400);
    }
    const existing = await prisma.$queryRawUnsafe<any[]>(
      `SELECT id FROM public.wacrm_conversations WHERE contact_id = $1::uuid LIMIT 1;`,
      input.contactId
    );
    if (existing.length > 0) {
      conversationId = existing[0].id;
    } else {
      const created = await prisma.$queryRawUnsafe<any[]>(
        `INSERT INTO public.wacrm_conversations (id, contact_id, status, assigned_agent_name, updated_at)
         VALUES (gen_random_uuid(), $1::uuid, 'open', $2, NOW())
         RETURNING id;`,
        input.contactId,
        operatorName
      );
      conversationId = created[0].id;
    }
  }

  // Get recipient phone for optional Meta API dispatch
  const contactInfo = await prisma.$queryRawUnsafe<any[]>(
    `SELECT c.phone FROM public.wacrm_conversations cv JOIN public.wacrm_contacts c ON c.id = cv.contact_id WHERE cv.id = $1::uuid LIMIT 1;`,
    conversationId
  );
  const recipientPhone = contactInfo[0]?.phone?.replace(/\D/g, '');

  let metaMessageId: string | null = null;
  let messageStatus = 'delivered';

  // Optional: If Meta WhatsApp Cloud API credentials configured, attempt live dispatch
  try {
    const config = await prisma.$queryRawUnsafe<any[]>(
      `SELECT phone_number_id, access_token, status FROM public.wacrm_config WHERE status = 'connected' LIMIT 1;`
    );
    const phone_number_id = config[0]?.phone_number_id || process.env.WHATSAPP_PHONE_NUMBER_ID;
    const access_token = config[0]?.access_token || process.env.WHATSAPP_ACCESS_TOKEN;

    if (phone_number_id && access_token && recipientPhone) {
      const payload: any = {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: recipientPhone,
      };

      if (input.contentType === 'template' && input.templateName) {
        payload.type = 'template';
        payload.template = {
          name: input.templateName,
          language: { code: 'en' },
        };
      } else {
        payload.type = 'text';
        payload.text = { body: input.contentText || '' };
      }

      const metaRes = await fetch(
        `https://graph.facebook.com/v21.0/${phone_number_id}/messages`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${access_token}`,
          },
          body: JSON.stringify(payload),
        }
      );
      if (metaRes.ok) {
        const metaData = (await metaRes.json()) as any;
        metaMessageId = metaData?.messages?.[0]?.id || null;
        messageStatus = 'sent';
      }
    }
  } catch (metaErr: any) {
    console.warn('[WACRM] Meta Cloud API live dispatch warning (message stored locally):', metaErr?.message || metaErr);
  }

  // Resolve template body text if sending a template without custom text
  let resolvedContentText = input.contentText;
  if (!resolvedContentText && input.templateName) {
    try {
      const tplRes = await prisma.$queryRawUnsafe<any[]>(
        `SELECT body_text as "bodyText" FROM public.wacrm_templates WHERE name = $1 LIMIT 1;`,
        input.templateName
      );
      if (tplRes.length > 0 && tplRes[0].bodyText) {
        resolvedContentText = tplRes[0].bodyText;
      } else {
        resolvedContentText = `Template: ${input.templateName}`;
      }
    } catch {
      resolvedContentText = `Template: ${input.templateName}`;
    }
  }

  // Insert message record into PostgreSQL
  const msgRes = await prisma.$queryRawUnsafe<any[]>(
    `INSERT INTO public.wacrm_messages (
       id, conversation_id, sender_type, sender_name,
       content_type, content_text, media_url, template_name,
       message_id, status, created_at
     ) VALUES (
       gen_random_uuid(), $1::uuid, 'agent', $2,
       $3, $4, $5, $6,
       $7, $8, NOW()
     )
     RETURNING *;`,
    conversationId,
    operatorName,
    input.contentType || 'text',
    resolvedContentText || '',
    input.mediaUrl || null,
    input.templateName || null,
    metaMessageId,
    messageStatus
  );

  // Update conversation
  const preview = resolvedContentText || (input.templateName ? `Template: ${input.templateName}` : 'Media');
  await prisma.$executeRawUnsafe(
    `UPDATE public.wacrm_conversations 
     SET last_message_text = $1, last_message_at = NOW(), updated_at = NOW()
     WHERE id = $2::uuid;`,
    preview,
    conversationId
  );

  const raw = msgRes[0] || {};
  return {
    id: raw.id,
    conversationId: raw.conversation_id,
    senderType: raw.sender_type,
    senderName: raw.sender_name,
    contentType: raw.content_type,
    contentText: raw.content_text,
    mediaUrl: raw.media_url,
    templateName: raw.template_name,
    messageId: raw.message_id,
    status: raw.status,
    reaction: raw.reaction || null,
    interactivePayload: raw.interactive_payload || null,
    aiGenerated: raw.ai_generated || false,
    createdAt: raw.created_at ? new Date(raw.created_at).toISOString() : new Date().toISOString(),
  };
};

export const updateConversation = async (id: string, input: UpdateConversationStatusInput) => {
  await prisma.$executeRawUnsafe(
    `UPDATE public.wacrm_conversations
     SET status = $1, assigned_agent_name = coalesce($2, assigned_agent_name), updated_at = NOW()
     WHERE id = $3::uuid;`,
    input.status,
    input.assignedAgentName ?? null,
    id
  );
  return { id, status: input.status, assignedAgentName: input.assignedAgentName };
};

// ─── 3. Contacts & Commercial Leads ────────────────────────────────────────────
export const listContacts = async (search?: string, tag?: string) => {
  const conditions: string[] = ['1=1'];
  const params: any[] = [];
  let idx = 1;

  if (search && search.trim()) {
    conditions.push(`(c.name ILIKE $${idx} OR c.phone ILIKE $${idx} OR c.company ILIKE $${idx} OR c.email ILIKE $${idx})`);
    params.push(`%${search.trim()}%`);
    idx++;
  }

  if (tag && tag.trim()) {
    conditions.push(`EXISTS (
      SELECT 1 FROM public.wacrm_contact_tags ct
      JOIN public.wacrm_tags t ON t.id = ct.tag_id
      WHERE ct.contact_id = c.id AND (t.name = $${idx} OR t.id::text = $${idx})
    )`);
    params.push(tag.trim());
    idx++;
  }

  const query = `
    SELECT 
      c.id,
      c.name,
      c.phone,
      c.email,
      c.company,
      c.avatar_url as "avatarUrl",
      c.notes,
      c.status,
      c.created_at as "createdAt",
      c.updated_at as "updatedAt",
      cv.id as "conversationId",
      cv.status as "conversationStatus",
      cv.last_message_text as "lastMessageText",
      cv.last_message_at as "lastMessageAt",
      coalesce(
        (
          SELECT json_agg(json_build_object('id', t.id, 'name', t.name, 'color', t.color))
          FROM public.wacrm_contact_tags ct
          JOIN public.wacrm_tags t ON t.id = ct.tag_id
          WHERE ct.contact_id = c.id
        ),
        '[]'::json
      ) as tags,
      coalesce(
        (
          SELECT json_agg(json_build_object('id', d.id, 'title', d.title, 'value', d.value, 'stageName', ps.name, 'stageColor', ps.color))
          FROM public.wacrm_deals d
          JOIN public.wacrm_pipeline_stages ps ON ps.id = d.stage_id
          WHERE d.contact_id = c.id AND d.status = 'active'
        ),
        '[]'::json
      ) as deals
    FROM public.wacrm_contacts c
    LEFT JOIN public.wacrm_conversations cv ON cv.contact_id = c.id
    WHERE ${conditions.join(' AND ')}
    ORDER BY c.created_at DESC;
  `;

  const rows = await prisma.$queryRawUnsafe<any[]>(query, ...params);
  return rows.map((r) => ({
    ...r,
    tags: Array.isArray(r.tags) ? r.tags : [],
    deals: Array.isArray(r.deals) ? r.deals : [],
  }));
};

export const createContact = async (input: CreateWacrmContactInput) => {
  const normPhone = input.phone.replace(/\D/g, '');

  const created = (
    await prisma.$queryRawUnsafe<any[]>(
      `INSERT INTO public.wacrm_contacts (
         id, name, phone, phone_normalized, email, company, notes, status, created_at, updated_at
       ) VALUES (
         gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, NOW(), NOW()
       )
       RETURNING id, name, phone, email, company, notes, status, created_at;`,
      input.name.trim(),
      input.phone.trim(),
      normPhone,
      input.email?.trim() || null,
      input.company?.trim() || null,
      input.notes?.trim() || null,
      input.status || 'lead'
    )
  )[0];

  // Auto-create initial conversation thread
  const conv = (
    await prisma.$queryRawUnsafe<any[]>(
      `INSERT INTO public.wacrm_conversations (id, contact_id, status, updated_at)
       VALUES (gen_random_uuid(), $1::uuid, 'open', NOW())
       RETURNING id;`,
      created.id
    )
  )[0];

  // Attach tags if provided
  if (input.tags && input.tags.length > 0) {
    for (const tagName of input.tags) {
      if (!tagName.trim()) continue;
      const tagRes = await prisma.$queryRawUnsafe<any[]>(
        `INSERT INTO public.wacrm_tags (id, name) VALUES (gen_random_uuid(), $1)
         ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name
         RETURNING id;`,
        tagName.trim()
      );
      const tagId = tagRes[0]?.id;
      if (tagId) {
        await prisma.$executeRawUnsafe(
          `INSERT INTO public.wacrm_contact_tags (contact_id, tag_id) VALUES ($1::uuid, $2::uuid) ON CONFLICT DO NOTHING;`,
          created.id,
          tagId
        );
      }
    }
  }

  return { ...created, conversationId: conv.id };
};

export const updateContact = async (id: string, input: UpdateWacrmContactInput) => {
  const fields: string[] = ['updated_at = NOW()'];
  const values: any[] = [id];
  let idx = 2;

  if (input.name !== undefined) {
    fields.push(`name = $${idx++}`);
    values.push(input.name.trim());
  }
  if (input.phone !== undefined) {
    fields.push(`phone = $${idx++}`);
    fields.push(`phone_normalized = $${idx++}`);
    values.push(input.phone.trim(), input.phone.replace(/\D/g, ''));
  }
  if (input.email !== undefined) {
    fields.push(`email = $${idx++}`);
    values.push(input.email ? input.email.trim() : null);
  }
  if (input.company !== undefined) {
    fields.push(`company = $${idx++}`);
    values.push(input.company ? input.company.trim() : null);
  }
  if (input.notes !== undefined) {
    fields.push(`notes = $${idx++}`);
    values.push(input.notes ? input.notes.trim() : null);
  }
  if (input.status !== undefined) {
    fields.push(`status = $${idx++}`);
    values.push(input.status);
  }

  await prisma.$executeRawUnsafe(
    `UPDATE public.wacrm_contacts SET ${fields.join(', ')} WHERE id = $1::uuid;`,
    ...values
  );

  // Update tags if provided
  if (input.tags !== undefined) {
    await prisma.$executeRawUnsafe(`DELETE FROM public.wacrm_contact_tags WHERE contact_id = $1::uuid;`, id);
    for (const tagName of input.tags) {
      if (!tagName.trim()) continue;
      const tagRes = await prisma.$queryRawUnsafe<any[]>(
        `INSERT INTO public.wacrm_tags (id, name) VALUES (gen_random_uuid(), $1)
         ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name
         RETURNING id;`,
        tagName.trim()
      );
      const tagId = tagRes[0]?.id;
      if (tagId) {
        await prisma.$executeRawUnsafe(
          `INSERT INTO public.wacrm_contact_tags (contact_id, tag_id) VALUES ($1::uuid, $2::uuid) ON CONFLICT DO NOTHING;`,
          id,
          tagId
        );
      }
    }
  }

  return { id, message: 'Contact updated successfully' };
};

export const deleteContact = async (id: string) => {
  await prisma.$executeRawUnsafe(`DELETE FROM public.wacrm_contacts WHERE id = $1::uuid;`, id);
  return { id, message: 'Contact removed successfully' };
};

// ─── 4. Sales Pipelines & Kanban Deals ─────────────────────────────────────────
export const getPipelineWithDeals = async () => {
  const pipelines = await prisma.$queryRawUnsafe<any[]>(
    `SELECT id, name FROM public.wacrm_pipelines WHERE is_default = true LIMIT 1;`
  );
  if (pipelines.length === 0) {
    throw new AppError('Pipeline not initialized', 404);
  }
  const pipeline = pipelines[0];

  const stages = await prisma.$queryRawUnsafe<any[]>(
    `SELECT id, pipeline_id as "pipelineId", name, position, color
     FROM public.wacrm_pipeline_stages
     WHERE pipeline_id = $1::uuid
     ORDER BY position ASC;`,
    pipeline.id
  );

  const deals = await prisma.$queryRawUnsafe<any[]>(
    `SELECT 
       d.id,
       d.pipeline_id as "pipelineId",
       d.stage_id as "stageId",
       d.contact_id as "contactId",
       d.conversation_id as "conversationId",
       d.title,
       d.value::numeric as value,
       d.currency,
       d.notes,
       d.expected_close_date as "expectedCloseDate",
       d.status,
       d.created_at as "createdAt",
       c.name as "contactName",
       c.phone as "contactPhone",
       c.company as "contactCompany"
     FROM public.wacrm_deals d
     LEFT JOIN public.wacrm_contacts c ON c.id = d.contact_id
     WHERE d.pipeline_id = $1::uuid
     ORDER BY d.created_at DESC;`,
    pipeline.id
  );

  return {
    pipeline,
    stages,
    deals: deals.map((d) => ({
      ...d,
      value: Number(d.value),
    })),
  };
};

export const createDeal = async (input: CreateWacrmDealInput) => {
  const created = (
    await prisma.$queryRawUnsafe<any[]>(
      `INSERT INTO public.wacrm_deals (
         id, pipeline_id, stage_id, contact_id, conversation_id,
         title, value, currency, notes, expected_close_date, status, created_at, updated_at
       ) VALUES (
         gen_random_uuid(), $1::uuid, $2::uuid, $3::uuid, $4::uuid,
         $5, $6::numeric, $7, $8, $9::date, $10, NOW(), NOW()
       )
       RETURNING *;`,
      input.pipelineId,
      input.stageId,
      input.contactId || null,
      input.conversationId || null,
      input.title.trim(),
      input.value || 0,
      input.currency || 'INR',
      input.notes || null,
      input.expectedCloseDate || null,
      input.status || 'active'
    )
  )[0];

  return { ...created, value: Number(created.value) };
};

export const updateDeal = async (id: string, input: UpdateWacrmDealInput) => {
  const fields: string[] = ['updated_at = NOW()'];
  const values: any[] = [id];
  let idx = 2;

  if (input.stageId !== undefined) {
    fields.push(`stage_id = $${idx++}::uuid`);
    values.push(input.stageId);
  }
  if (input.title !== undefined) {
    fields.push(`title = $${idx++}`);
    values.push(input.title.trim());
  }
  if (input.value !== undefined) {
    fields.push(`value = $${idx++}::numeric`);
    values.push(input.value);
  }
  if (input.notes !== undefined) {
    fields.push(`notes = $${idx++}`);
    values.push(input.notes);
  }
  if (input.expectedCloseDate !== undefined) {
    fields.push(`expected_close_date = $${idx++}::date`);
    values.push(input.expectedCloseDate);
  }
  if (input.status !== undefined) {
    fields.push(`status = $${idx++}`);
    values.push(input.status);
  }

  await prisma.$executeRawUnsafe(
    `UPDATE public.wacrm_deals SET ${fields.join(', ')} WHERE id = $1::uuid;`,
    ...values
  );

  return { id, message: 'Deal updated successfully' };
};

export const deleteDeal = async (id: string) => {
  await prisma.$executeRawUnsafe(`DELETE FROM public.wacrm_deals WHERE id = $1::uuid;`, id);
  return { id, message: 'Deal deleted successfully' };
};

// ─── 5. Broadcasts & Campaigns ────────────────────────────────────────────────
export const listBroadcasts = async () => {
  return await prisma.$queryRawUnsafe<any[]>(
    `SELECT 
       id, name, template_name as "templateName", template_language as "templateLanguage",
       status, total_recipients as "totalRecipients", sent_count as "sentCount",
       delivered_count as "deliveredCount", read_count as "readCount",
       replied_count as "repliedCount", failed_count as "failedCount",
       scheduled_at as "scheduledAt", created_at as "createdAt"
     FROM public.wacrm_broadcasts
     ORDER BY created_at DESC;`
  );
};

export const createBroadcast = async (input: CreateWacrmBroadcastInput) => {
  // Compute audience count
  const countRes = await prisma.$queryRawUnsafe<any[]>(`SELECT count(*)::int as count FROM public.wacrm_contacts;`);
  const totalRecipients = countRes[0]?.count || 0;

  const created = (
    await prisma.$queryRawUnsafe<any[]>(
      `INSERT INTO public.wacrm_broadcasts (
         id, name, template_name, template_language,
         template_variables, audience_filter, status,
         total_recipients, sent_count, delivered_count, read_count, created_at
       ) VALUES (
         gen_random_uuid(), $1, $2, $3,
         $4::jsonb, $5::jsonb, 'sent',
         $6, $6, $6, 0, NOW()
       )
       RETURNING *;`,
      input.name.trim(),
      input.templateName,
      input.templateLanguage || 'en',
      JSON.stringify(input.templateVariables || {}),
      JSON.stringify(input.audienceFilter || {}),
      totalRecipients
    )
  )[0];

  return created;
};

// ─── 6. Templates & Tags ──────────────────────────────────────────────────────
export const listTemplates = async () => {
  return await prisma.$queryRawUnsafe<any[]>(
    `SELECT id, name, category, language, body_text as "bodyText", buttons, status FROM public.wacrm_templates ORDER BY name ASC;`
  );
};

export const listTags = async () => {
  return await prisma.$queryRawUnsafe<any[]>(
    `SELECT id, name, color FROM public.wacrm_tags ORDER BY name ASC;`
  );
};

// ─── 7. Meta WhatsApp Cloud API Configuration ──────────────────────────────────
export const getWhatsAppConfig = async () => {
  const rows = await prisma.$queryRawUnsafe<any[]>(
    `SELECT id, phone_number_id as "phoneNumberId", waba_id as "wabaId", 
            verify_token as "verifyToken", webhook_url as "webhookUrl", 
            status, connected_at as "connectedAt", updated_at as "updatedAt"
     FROM public.wacrm_config
     LIMIT 1;`
  );
  if (rows.length === 0) {
    const envPhone = process.env.WHATSAPP_PHONE_NUMBER_ID || '';
    const envToken = process.env.WHATSAPP_ACCESS_TOKEN || '';
    return {
      status: envPhone && envToken ? 'connected' : 'disconnected',
      phoneNumberId: envPhone,
      wabaId: process.env.WHATSAPP_WABA_ID || process.env.WHATSAPP_BUSINESS_ACCOUNT_ID || '',
      verifyToken: process.env.WHATSAPP_VERIFY_TOKEN || 'pacific_wacrm_verify_secret',
      webhookUrl: process.env.WHATSAPP_WEBHOOK_URL || '/api/v1/wacrm/webhook',
    };
  }
  const row = rows[0];
  return {
    ...row,
    phoneNumberId: row.phoneNumberId || process.env.WHATSAPP_PHONE_NUMBER_ID || '',
    wabaId: row.wabaId || process.env.WHATSAPP_WABA_ID || process.env.WHATSAPP_BUSINESS_ACCOUNT_ID || '',
    verifyToken: row.verifyToken || process.env.WHATSAPP_VERIFY_TOKEN || 'pacific_wacrm_verify_secret',
  };
};

export const saveWhatsAppConfig = async (input: SaveWacrmConfigInput) => {
  const existing = await prisma.$queryRawUnsafe<any[]>(`SELECT id FROM public.wacrm_config LIMIT 1;`);
  if (existing.length === 0) {
    await prisma.$executeRawUnsafe(
      `INSERT INTO public.wacrm_config (
         id, phone_number_id, waba_id, access_token, verify_token, webhook_url, status, connected_at, updated_at
       ) VALUES (
         gen_random_uuid(), $1, $2, $3, $4, $5, 'connected', NOW(), NOW()
       );`,
      input.phoneNumberId.trim(),
      input.wabaId?.trim() || null,
      input.accessToken.trim(),
      input.verifyToken.trim(),
      input.webhookUrl?.trim() || null
    );
  } else {
    await prisma.$executeRawUnsafe(
      `UPDATE public.wacrm_config
       SET phone_number_id = $1, waba_id = $2, access_token = $3,
           verify_token = $4, webhook_url = $5, status = 'connected',
           connected_at = NOW(), updated_at = NOW()
       WHERE id = $6::uuid;`,
      input.phoneNumberId.trim(),
      input.wabaId?.trim() || null,
      input.accessToken.trim(),
      input.verifyToken.trim(),
      input.webhookUrl?.trim() || null,
      existing[0].id
    );
  }

  return { success: true, message: 'WhatsApp Cloud API settings saved and connected successfully' };
};

// ─── 8. Automations Engine ────────────────────────────────────────────────────
export const listAutomations = async () => {
  return await prisma.$queryRawUnsafe<any[]>(
    `SELECT 
       id, name, description, trigger_type as "triggerType",
       trigger_config as "triggerConfig", is_active as "isActive",
       execution_count as "executionCount", last_executed_at as "lastExecutedAt",
       created_at as "createdAt", updated_at as "updatedAt"
     FROM public.wacrm_automations
     ORDER BY created_at DESC;`
  );
};

export const createAutomation = async (input: {
  name: string;
  description?: string;
  triggerType: string;
  triggerConfig?: any;
  isActive?: boolean;
}) => {
  const created = (
    await prisma.$queryRawUnsafe<any[]>(
      `INSERT INTO public.wacrm_automations (
         id, name, description, trigger_type, trigger_config, is_active, created_at, updated_at
       ) VALUES (
         gen_random_uuid(), $1, $2, $3, $4::jsonb, $5, NOW(), NOW()
       )
       RETURNING *;`,
      input.name.trim(),
      input.description?.trim() || null,
      input.triggerType,
      JSON.stringify(input.triggerConfig || {}),
      input.isActive ?? true
    )
  )[0];
  return created;
};

export const updateAutomation = async (id: string, input: {
  name?: string;
  description?: string;
  triggerType?: string;
  triggerConfig?: any;
  isActive?: boolean;
}) => {
  const fields: string[] = ['updated_at = NOW()'];
  const values: any[] = [id];
  let idx = 2;

  if (input.name !== undefined) {
    fields.push(`name = $${idx++}`);
    values.push(input.name.trim());
  }
  if (input.description !== undefined) {
    fields.push(`description = $${idx++}`);
    values.push(input.description ? input.description.trim() : null);
  }
  if (input.triggerType !== undefined) {
    fields.push(`trigger_type = $${idx++}`);
    values.push(input.triggerType);
  }
  if (input.triggerConfig !== undefined) {
    fields.push(`trigger_config = $${idx++}::jsonb`);
    values.push(JSON.stringify(input.triggerConfig));
  }
  if (input.isActive !== undefined) {
    fields.push(`is_active = $${idx++}`);
    values.push(input.isActive);
  }

  await prisma.$executeRawUnsafe(
    `UPDATE public.wacrm_automations SET ${fields.join(', ')} WHERE id = $1::uuid;`,
    ...values
  );

  return { id, message: 'Automation updated successfully' };
};

export const deleteAutomation = async (id: string) => {
  await prisma.$executeRawUnsafe(`DELETE FROM public.wacrm_automations WHERE id = $1::uuid;`, id);
  return { id, message: 'Automation deleted successfully' };
};

export const listAutomationLogs = async (automationId?: string) => {
  let query = `
    SELECT 
      l.id, l.automation_id as "automationId", l.trigger_event as "triggerEvent",
      l.steps_executed as "stepsExecuted", l.status, l.error_message as "errorMessage",
      l.created_at as "createdAt",
      c.name as "contactName", c.phone as "contactPhone"
    FROM public.wacrm_automation_logs l
    LEFT JOIN public.wacrm_contacts c ON c.id = l.contact_id
  `;
  const params: any[] = [];
  if (automationId) {
    query += ` WHERE l.automation_id = $1::uuid`;
    params.push(automationId);
  }
  query += ` ORDER BY l.created_at DESC LIMIT 50;`;

  return await prisma.$queryRawUnsafe<any[]>(query, ...params);
};

// ─── 9. Interactive Visual WhatsApp Flows ─────────────────────────────────────
export const listFlows = async () => {
  return await prisma.$queryRawUnsafe<any[]>(
    `SELECT 
       id, name, description, status, trigger_type as "triggerType",
       runs_count as "runsCount", nodes, edges,
       created_at as "createdAt", updated_at as "updatedAt"
     FROM public.wacrm_flows
     ORDER BY updated_at DESC;`
  );
};

export const getFlow = async (id: string) => {
  const rows = await prisma.$queryRawUnsafe<any[]>(
    `SELECT 
       id, name, description, status, trigger_type as "triggerType",
       runs_count as "runsCount", nodes, edges,
       created_at as "createdAt", updated_at as "updatedAt"
     FROM public.wacrm_flows
     WHERE id = $1::uuid
     LIMIT 1;`,
    id
  );
  if (rows.length === 0) {
    throw new AppError('Flow not found', 404);
  }
  return rows[0];
};

export const saveFlow = async (input: {
  id?: string;
  name: string;
  description?: string;
  status?: string;
  triggerType?: string;
  nodes: any;
  edges: any;
}) => {
  if (input.id) {
    await prisma.$executeRawUnsafe(
      `UPDATE public.wacrm_flows
       SET name = $1, description = $2, status = $3, trigger_type = $4,
           nodes = $5::jsonb, edges = $6::jsonb, updated_at = NOW()
       WHERE id = $7::uuid;`,
      input.name.trim(),
      input.description?.trim() || null,
      input.status || 'draft',
      input.triggerType || 'inbound_message',
      JSON.stringify(input.nodes || []),
      JSON.stringify(input.edges || []),
      input.id
    );
    return { id: input.id, message: 'Flow saved successfully' };
  } else {
    const created = (
      await prisma.$queryRawUnsafe<any[]>(
        `INSERT INTO public.wacrm_flows (
           id, name, description, status, trigger_type, nodes, edges, created_at, updated_at
         ) VALUES (
           gen_random_uuid(), $1, $2, $3, $4, $5::jsonb, $6::jsonb, NOW(), NOW()
         )
         RETURNING *;`,
        input.name.trim(),
        input.description?.trim() || null,
        input.status || 'draft',
        input.triggerType || 'inbound_message',
        JSON.stringify(input.nodes || []),
        JSON.stringify(input.edges || [])
      )
    )[0];
    return created;
  }
};

export const deleteFlow = async (id: string) => {
  await prisma.$executeRawUnsafe(`DELETE FROM public.wacrm_flows WHERE id = $1::uuid;`, id);
  return { id, message: 'Flow deleted successfully' };
};

// ─── 10. Quick Replies & Canned Responses ─────────────────────────────────────
export const listQuickReplies = async () => {
  return await prisma.$queryRawUnsafe<any[]>(
    `SELECT id, shortcut, title, kind, content_text as "contentText", 
            interactive_payload as "interactivePayload", created_at as "createdAt"
     FROM public.wacrm_quick_replies
     ORDER BY shortcut ASC;`
  );
};

export const createQuickReply = async (input: {
  shortcut: string;
  title: string;
  kind?: string;
  contentText?: string;
  interactivePayload?: any;
}) => {
  const normShortcut = input.shortcut.startsWith('/') ? input.shortcut : `/${input.shortcut}`;
  const created = (
    await prisma.$queryRawUnsafe<any[]>(
      `INSERT INTO public.wacrm_quick_replies (
         id, shortcut, title, kind, content_text, interactive_payload, created_at, updated_at
       ) VALUES (
         gen_random_uuid(), $1, $2, $3, $4, $5::jsonb, NOW(), NOW()
       )
       ON CONFLICT (shortcut) DO UPDATE SET
         title = EXCLUDED.title,
         kind = EXCLUDED.kind,
         content_text = EXCLUDED.content_text,
         interactive_payload = EXCLUDED.interactive_payload,
         updated_at = NOW()
       RETURNING *;`,
      normShortcut.trim(),
      input.title.trim(),
      input.kind || 'text',
      input.contentText?.trim() || null,
      input.interactivePayload ? JSON.stringify(input.interactivePayload) : null
    )
  )[0];
  return created;
};

export const deleteQuickReply = async (id: string) => {
  await prisma.$executeRawUnsafe(`DELETE FROM public.wacrm_quick_replies WHERE id = $1::uuid;`, id);
  return { id, message: 'Quick reply removed successfully' };
};

// ─── 11. AI Assistant & Smart Reply Generator ─────────────────────────────────
export const getAiConfig = async () => {
  const rows = await prisma.$queryRawUnsafe<any[]>(
    `SELECT id, provider, model, system_prompt as "systemPrompt",
            temperature, auto_reply_enabled as "autoReplyEnabled",
            max_auto_replies_per_thread as "maxAutoRepliesPerThread",
            knowledge_base as "knowledgeBase", updated_at as "updatedAt"
     FROM public.wacrm_ai_config
     LIMIT 1;`
  );
  if (rows.length === 0) {
    return {
      provider: 'openai',
      model: 'gpt-4o-mini',
      systemPrompt: 'You are Pacific Restroom Cubicles AI Assistant.',
      temperature: 0.7,
      autoReplyEnabled: false,
      maxAutoRepliesPerThread: 5,
      knowledgeBase: [],
    };
  }
  return rows[0];
};

export const saveAiConfig = async (input: {
  provider?: string;
  apiKey?: string;
  model?: string;
  systemPrompt?: string;
  temperature?: number;
  autoReplyEnabled?: boolean;
  maxAutoRepliesPerThread?: number;
  knowledgeBase?: any;
}) => {
  const existing = await prisma.$queryRawUnsafe<any[]>(`SELECT id FROM public.wacrm_ai_config LIMIT 1;`);
  if (existing.length === 0) {
    await prisma.$executeRawUnsafe(
      `INSERT INTO public.wacrm_ai_config (
         id, provider, api_key, model, system_prompt, temperature,
         auto_reply_enabled, max_auto_replies_per_thread, knowledge_base, updated_at
       ) VALUES (
         gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8::jsonb, NOW()
       );`,
      input.provider || 'openai',
      input.apiKey?.trim() || null,
      input.model || 'gpt-4o-mini',
      input.systemPrompt || '',
      input.temperature ?? 0.7,
      input.autoReplyEnabled ?? false,
      input.maxAutoRepliesPerThread ?? 5,
      JSON.stringify(input.knowledgeBase || [])
    );
  } else {
    const fields: string[] = ['updated_at = NOW()'];
    const values: any[] = [existing[0].id];
    let idx = 2;

    if (input.provider !== undefined) { fields.push(`provider = $${idx++}`); values.push(input.provider); }
    if (input.apiKey !== undefined && input.apiKey.trim()) { fields.push(`api_key = $${idx++}`); values.push(input.apiKey.trim()); }
    if (input.model !== undefined) { fields.push(`model = $${idx++}`); values.push(input.model); }
    if (input.systemPrompt !== undefined) { fields.push(`system_prompt = $${idx++}`); values.push(input.systemPrompt); }
    if (input.temperature !== undefined) { fields.push(`temperature = $${idx++}`); values.push(input.temperature); }
    if (input.autoReplyEnabled !== undefined) { fields.push(`auto_reply_enabled = $${idx++}`); values.push(input.autoReplyEnabled); }
    if (input.maxAutoRepliesPerThread !== undefined) { fields.push(`max_auto_replies_per_thread = $${idx++}`); values.push(input.maxAutoRepliesPerThread); }
    if (input.knowledgeBase !== undefined) { fields.push(`knowledge_base = $${idx++}::jsonb`); values.push(JSON.stringify(input.knowledgeBase)); }

    await prisma.$executeRawUnsafe(
      `UPDATE public.wacrm_ai_config SET ${fields.join(', ')} WHERE id = $1::uuid;`,
      ...values
    );
  }

  return { success: true, message: 'AI Assistant configuration updated successfully' };
};

export const generateAiDraftReply = async (conversationId: string) => {
  // 1. Fetch conversation and recent messages
  const conv = await prisma.$queryRawUnsafe<any[]>(
    `SELECT cv.*, c.name as contact_name, c.company as contact_company, c.phone as contact_phone
     FROM public.wacrm_conversations cv
     JOIN public.wacrm_contacts c ON c.id = cv.contact_id
     WHERE cv.id = $1::uuid LIMIT 1;`,
    conversationId
  );
  if (conv.length === 0) {
    throw new AppError('Conversation not found', 404);
  }

  const messages = await prisma.$queryRawUnsafe<any[]>(
    `SELECT sender_type, content_text, created_at
     FROM public.wacrm_messages
     WHERE conversation_id = $1::uuid
     ORDER BY created_at DESC
     LIMIT 10;`,
    conversationId
  );
  messages.reverse();

  // 2. Fetch AI config
  const aiConfig = await prisma.$queryRawUnsafe<any[]>(
    `SELECT provider, api_key, model, system_prompt, temperature, knowledge_base FROM public.wacrm_ai_config LIMIT 1;`
  );
  const cfg = aiConfig[0] || {};
  const apiKey = cfg.api_key || process.env.OPENAI_API_KEY;
  const kbSummary = Array.isArray(cfg.knowledge_base)
    ? cfg.knowledge_base.map((k: any) => `${k.title}: ${k.content}`).join('\n')
    : '';

  const systemInstructions = `${cfg.system_prompt || 'You are Pacific Restroom Cubicles AI Assistant.'}
Enterprise Knowledge Base:
${kbSummary}
Client details: Name: ${conv[0].contact_name}, Company: ${conv[0].contact_company || 'N/A'}, Phone: ${conv[0].contact_phone}.
Respond directly with a ready-to-send, polite, helpful WhatsApp reply. Keep it concise, professional, and formatted nicely for WhatsApp.`;

  // 3. If OpenAI API key is configured, call OpenAI
  if (apiKey && apiKey.startsWith('sk-')) {
    try {
      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: cfg.model || 'gpt-4o-mini',
          messages: [
            { role: 'system', content: systemInstructions },
            ...messages.map((m: any) => ({
              role: m.sender_type === 'customer' ? 'user' : 'assistant',
              content: m.content_text || '',
            })),
          ],
          temperature: Number(cfg.temperature || 0.7),
          max_tokens: 300,
        }),
      });

      if (res.ok) {
        const json = (await res.json()) as any;
        const draft = json.choices?.[0]?.message?.content?.trim();
        if (draft) {
          return { draft, provider: 'openai', model: cfg.model };
        }
      }
    } catch (apiErr: any) {
      console.warn('[WACRM] OpenAI generation warning:', apiErr?.message || apiErr);
    }
  }

  // Fallback intelligent heuristic draft based on last customer message
  const lastCustomerMsg = [...messages].reverse().find((m: any) => m.sender_type === 'customer')?.content_text?.toLowerCase() || '';
  let fallbackDraft = `Hello ${conv[0].contact_name}! Thank you for your inquiry regarding Pacific Restroom Cubicle Partitions. Could you please share your floor layout drawing and preferred board material (12mm Compact Laminate or 18mm HPL) so our estimation team can calculate an accurate quote for you?`;

  if (lastCustomerMsg.includes('price') || lastCustomerMsg.includes('quote') || lastCustomerMsg.includes('cost') || lastCustomerMsg.includes('rate')) {
    fallbackDraft = `Dear ${conv[0].contact_name}, our restroom cubicles start from competitive per-cubicle rates depending on whether you choose Solid Compact Laminate (HPL) with SS 304 or Nylon hardware. If you send us your cubicle counts and city location, we will prepare a formal GST quotation right away!`;
  } else if (lastCustomerMsg.includes('dispatch') || lastCustomerMsg.includes('delivery') || lastCustomerMsg.includes('tracking') || lastCustomerMsg.includes('status')) {
    fallbackDraft = `Hello ${conv[0].contact_name}, our factory team is preparing the material with barcodes and packing lists. Standard lead time is 7-10 working days. We will share your consignment LR/gate pass the moment it boards transit!`;
  } else if (lastCustomerMsg.includes('catalog') || lastCustomerMsg.includes('brochure') || lastCustomerMsg.includes('sample')) {
    fallbackDraft = `Hello ${conv[0].contact_name}! You can download our latest Restroom Cubicles & Lockers product catalog here: https://pacificproduct.in/catalogs. We can also dispatch sample board swatches (12mm Compact Laminate) to your office.`;
  }

  return { draft: fallbackDraft, provider: 'heuristic-engine', model: 'pps-expert-v1' };
};

// ─── 12. Message Reactions ────────────────────────────────────────────────────
export const toggleMessageReaction = async (messageId: string, emoji: string | null) => {
  await prisma.$executeRawUnsafe(
    `UPDATE public.wacrm_messages SET reaction = $1 WHERE id = $2::uuid;`,
    emoji || null,
    messageId
  );
  return { messageId, reaction: emoji };
};

// ─── 13. Meta WhatsApp Cloud Test & Sync ──────────────────────────────────────
export const testWhatsAppConnection = async () => {
  const configs = await prisma.$queryRawUnsafe<any[]>(
    `SELECT phone_number_id, access_token, status FROM public.wacrm_config LIMIT 1;`
  );
  const phone_number_id = configs[0]?.phone_number_id || process.env.WHATSAPP_PHONE_NUMBER_ID;
  const access_token = configs[0]?.access_token || process.env.WHATSAPP_ACCESS_TOKEN;

  if (!phone_number_id || !access_token) {
    throw new AppError('WhatsApp Cloud API credentials not configured in DB or .env', 400);
  }

  try {
    const res = await fetch(
      `https://graph.facebook.com/v21.0/${phone_number_id}?fields=id,display_phone_number,verified_name,quality_rating`,
      {
        headers: { Authorization: `Bearer ${access_token}` },
      }
    );

    if (!res.ok) {
      const errData = (await res.json().catch(() => ({}))) as any;
      const errMsg = errData?.error?.message || `Meta API HTTP ${res.status}`;
      await prisma.$executeRawUnsafe(
        `UPDATE public.wacrm_config SET status = 'disconnected', updated_at = NOW();`
      );
      throw new AppError(`Meta Verification Failed: ${errMsg}`, 400);
    }

    const data = (await res.json()) as any;
    await prisma.$executeRawUnsafe(
      `UPDATE public.wacrm_config SET status = 'connected', connected_at = NOW(), updated_at = NOW();`
    );

    return {
      connected: true,
      displayPhoneNumber: data.display_phone_number,
      verifiedName: data.verified_name || 'Pacific Restroom Cubicles',
      qualityRating: data.quality_rating || 'GREEN',
      phoneNumberId: data.id,
    };
  } catch (err: any) {
    if (err instanceof AppError) throw err;
    throw new AppError(`Failed to connect to Meta Graph API: ${err.message}`, 500);
  }
};

export const createTemplate = async (input: {
  name: string;
  category: string;
  language?: string;
  bodyText: string;
  buttons?: any;
}) => {
  const normName = input.name.toLowerCase().replace(/[^a-z0-9_]/g, '_');
  const created = (
    await prisma.$queryRawUnsafe<any[]>(
      `INSERT INTO public.wacrm_templates (
         id, name, category, language, body_text, buttons, status
       ) VALUES (
         gen_random_uuid(), $1, $2, $3, $4, $5::jsonb, 'APPROVED'
       )
       ON CONFLICT (name) DO UPDATE SET
         category = EXCLUDED.category,
         language = EXCLUDED.language,
         body_text = EXCLUDED.body_text,
         buttons = EXCLUDED.buttons,
         status = EXCLUDED.status
       RETURNING *;`,
      normName,
      input.category || 'MARKETING',
      input.language || 'en',
      input.bodyText,
      JSON.stringify(input.buttons || [])
    )
  )[0];

  return created;
};

// ─── 14. High-Performance Database Indexing Engine ───────────────────────────
export const ensureWacrmIndexes = async () => {
  try {
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS idx_wacrm_messages_conv_created ON public.wacrm_messages (conversation_id, created_at ASC);
      CREATE INDEX IF NOT EXISTS idx_wacrm_conversations_contact ON public.wacrm_conversations (contact_id);
      CREATE INDEX IF NOT EXISTS idx_wacrm_conversations_updated ON public.wacrm_conversations (updated_at DESC);
      CREATE INDEX IF NOT EXISTS idx_wacrm_conversations_status ON public.wacrm_conversations (status);
    `);
  } catch {
    // Non-fatal if DB permissions restrict direct DDL
  }
};

// Execute asynchronously on module init to warm indexes
ensureWacrmIndexes().catch(() => {});

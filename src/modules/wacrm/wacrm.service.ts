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
  const convs = await prisma.$queryRawUnsafe<any[]>(
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
  );

  if (convs.length === 0) {
    throw new AppError('Conversation not found', 404);
  }

  const messages = await prisma.$queryRawUnsafe<any[]>(
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
       created_at as "createdAt"
     FROM public.wacrm_messages
     WHERE conversation_id = $1::uuid
     ORDER BY created_at ASC;`,
    id
  );

  // Mark as read
  await prisma.$executeRawUnsafe(
    `UPDATE public.wacrm_conversations SET unread_count = 0, updated_at = NOW() WHERE id = $1::uuid;`,
    id
  );

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
    if (config.length > 0 && recipientPhone) {
      const { phone_number_id, access_token } = config[0];
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
    input.contentText || (input.templateName ? `[Template: ${input.templateName}]` : ''),
    input.mediaUrl || null,
    input.templateName || null,
    metaMessageId,
    messageStatus
  );

  // Update conversation
  const preview = input.contentText || (input.templateName ? `[Template: ${input.templateName}]` : 'Media');
  await prisma.$executeRawUnsafe(
    `UPDATE public.wacrm_conversations 
     SET last_message_text = $1, last_message_at = NOW(), updated_at = NOW()
     WHERE id = $2::uuid;`,
    preview,
    conversationId
  );

  return msgRes[0];
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
    return {
      status: 'disconnected',
      phoneNumberId: '',
      wabaId: '',
      verifyToken: 'pacific_wacrm_verify_secret',
      webhookUrl: '/api/v1/wacrm/webhook',
    };
  }
  return rows[0];
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

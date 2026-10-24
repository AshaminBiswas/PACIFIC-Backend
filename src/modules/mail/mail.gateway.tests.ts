// =============================================================================
// Pacific Mail — Gateway, Domain Management & Inbound Webhook Test Suite
// Verifies address lifecycle, aliases, quotas, gateway adapters, and DNS safety.
// =============================================================================

import assert from 'assert';
import {
  SandboxOutboundAdapter,
  SmtpOutboundAdapter,
  WebhookInboundAdapter,
  getGatewayStatus,
} from './mail.adapters';
import { addressRepository } from './mail.repository';
import { mailAdminService } from './mail.service';
import { prisma } from '../../config/database';

async function runGatewayTests() {
  console.log('\n=============================================================');
  console.log('   Pacific Mail — Full Gateway & Address Management Tests   ');
  console.log('=============================================================\n');

  let passed = 0;
  let failed = 0;

  async function test(name: string, fn: () => Promise<void>) {
    try {
      await fn();
      console.log(`  ✅  ${name}`);
      passed++;
    } catch (err: any) {
      console.error(`  ❌  ${name}`);
      console.error(`      ${err.message}`);
      failed++;
    }
  }

  // ─── Suite 1: Address Lifecycle & Quotas (@pacificproduct.in) ───────────────
  console.log('🏢 Suite 1: Domain Address Lifecycle & Quotas (@pacificproduct.in)');

  const testLocalPart = `test.desk.${Date.now().toString(36)}`;
  let createdAddressId = '';

  await test('creates an address under @pacificproduct.in with custom quotas', async () => {
    const addr = await addressRepository.createAddress({
      localPart: testLocalPart,
      domain: 'pacificproduct.in',
      displayName: 'Test Desk',
      maxStorageBytes: 1048576000, // 1 GB
      dailySendQuota: 250,
      isShared: true,
    });
    assert.ok(addr.id);
    assert.strictEqual(addr.localPart, testLocalPart);
    assert.strictEqual(addr.domain, 'pacificproduct.in');
    assert.strictEqual(addr.fullAddress, `${testLocalPart}@pacificproduct.in`);
    assert.strictEqual(addr.verificationStatus, 'INTERNAL_ONLY');
    assert.strictEqual(addr.maxStorageBytes, 1048576000);
    assert.strictEqual(addr.dailySendQuota, 250);
    assert.strictEqual(addr.isShared, true);
    createdAddressId = addr.id;
  });

  await test('enforces uniqueness across identical localPart and domain', async () => {
    let thrown = false;
    try {
      await addressRepository.createAddress({
        localPart: testLocalPart,
        domain: 'pacificproduct.in',
      });
    } catch {
      thrown = true;
    }
    assert.strictEqual(thrown, true, 'Duplicate address should be rejected');
  });

  await test('assigns address to a user and logs immutable assignment history', async () => {
    // Pick first user from database
    const user = await prisma.user.findFirst();
    assert.ok(user, 'A user must exist in the database');

    const updated = await addressRepository.assignUser(
      createdAddressId,
      user.id,
      user.id,
      'Assigning to employee for customer support'
    );
    assert.strictEqual(updated.userId, user.id);
    assert.ok(updated.assignedAt);

    const history = await addressRepository.getAssignmentHistory(createdAddressId);
    assert.ok(history.length >= 1);
    assert.strictEqual(history[0].userId, user.id);
    assert.strictEqual(history[0].reason, 'Assigning to employee for customer support');
  });

  await test('unassigns address cleanly while preserving mailbox separation', async () => {
    const user = await prisma.user.findFirst();
    assert.ok(user);

    const updated = await addressRepository.unassignUser(
      createdAddressId,
      user.id,
      'Employee role change'
    );
    assert.strictEqual(updated.userId, null);
    assert.strictEqual(updated.assignedAt, null);

    const history = await addressRepository.getAssignmentHistory(createdAddressId);
    assert.ok(history.length >= 1);
    assert.ok(history[0].unassignedAt);
    assert.strictEqual(history[0].reason, 'Employee role change');
  });

  await test('updates address storage and daily send quotas', async () => {
    const updated = await addressRepository.updateQuotas(createdAddressId, {
      maxStorageBytes: 2097152000, // 2 GB
      dailySendQuota: 500,
    });
    assert.strictEqual(updated.maxStorageBytes, 2097152000);
    assert.strictEqual(updated.dailySendQuota, 500);
  });

  // ─── Suite 2: Aliases Management ────────────────────────────────────────────
  console.log('\n🔀 Suite 2: Email Aliases Management');

  let createdAliasId = '';
  const aliasPart = `alias.${Date.now().toString(36)}`;

  await test('creates an alias linked to an existing address', async () => {
    const alias = await addressRepository.createAlias(
      createdAddressId,
      aliasPart,
      'pacificproduct.in',
      'Support Alias'
    );
    assert.ok(alias.id);
    assert.strictEqual(alias.alias_local_part, aliasPart);
    assert.strictEqual(alias.address_id, createdAddressId);
    createdAliasId = alias.id;
  });

  await test('lists active aliases for an address', async () => {
    const list = await addressRepository.listAliases(createdAddressId);
    assert.ok(list.some((a) => a.id === createdAliasId));
  });

  await test('resolves recipient sent to an alias successfully', async () => {
    const resolved = await addressRepository.resolveRecipientWithUserStatus(aliasPart, 'pacificproduct.in');
    assert.ok(resolved);
    assert.strictEqual(resolved.address.id, createdAddressId);
  });

  await test('deletes an alias safely', async () => {
    const ok = await addressRepository.deleteAlias(createdAliasId);
    assert.strictEqual(ok, true);
    const list = await addressRepository.listAliases(createdAddressId);
    assert.strictEqual(list.some((a) => a.id === createdAliasId), false);
  });

  // ─── Suite 3: Gateway Adapters & Sandbox Isolation ──────────────────────────
  console.log('\n🚪 Suite 3: Gateway Adapters & Outbound Sandbox');

  await test('Sandbox adapter blocks external sending when flag is false', async () => {
    const original = process.env.MAIL_EXTERNAL_SENDING_ENABLED;
    process.env.MAIL_EXTERNAL_SENDING_ENABLED = 'false';

    const adapter = new SandboxOutboundAdapter();
    const res = await adapter.send({
      message: {} as any,
      fromAddress: 'admin@pacificproduct.in',
      toRecipients: ['external.client@example.com'],
      ccRecipients: [],
      bccRecipients: [],
      subject: 'Quarterly Invoice',
      bodyText: 'Please review',
      bodyHtml: null,
      attachments: [],
    });

    assert.strictEqual(res.accepted, false);
    assert.strictEqual(res.status, 'DISABLED');
    assert.ok(res.error?.includes('MAIL_EXTERNAL_SENDING_ENABLED=false'));

    process.env.MAIL_EXTERNAL_SENDING_ENABLED = original;
  });

  await test('Sandbox adapter simulates mock dispatch when flag is enabled', async () => {
    const original = process.env.MAIL_EXTERNAL_SENDING_ENABLED;
    process.env.MAIL_EXTERNAL_SENDING_ENABLED = 'true';

    const adapter = new SandboxOutboundAdapter();
    const res = await adapter.send({
      message: {} as any,
      fromAddress: 'sales@pacificproduct.in',
      toRecipients: ['partner@domain.com'],
      ccRecipients: [],
      bccRecipients: [],
      subject: 'Contract Confirmation',
      bodyText: 'Signed',
      bodyHtml: null,
      attachments: [],
    });

    assert.strictEqual(res.accepted, true);
    assert.strictEqual(res.status, 'SENT');
    assert.ok(res.externalMessageId?.includes('@pacificproduct.in'));

    process.env.MAIL_EXTERNAL_SENDING_ENABLED = original;
  });

  await test('SMTP adapter gracefully reports failure when unconfigured', async () => {
    const adapter = new SmtpOutboundAdapter();
    const pingOk = await adapter.ping();
    assert.strictEqual(pingOk, false, 'Unconfigured SMTP ping should be false');
  });

  // ─── Suite 4: Inbound Webhook Processing & Normalization ────────────────────
  console.log('\n📥 Suite 4: Inbound Webhook Ingestion & Deduplication');

  await test('Webhook inbound adapter normalizes complex provider payload', async () => {
    const adapter = new WebhookInboundAdapter();
    const normalized = adapter.normalizePayload({
      id: 'msg-ext-99238',
      from: { email: 'vendor@supplier.com', name: 'Board Supplier' },
      to: ['sales@pacificproduct.in'],
      subject: 'Proforma Invoice Acceptance',
      text: 'Order approved.',
      html: '<p>Order approved.</p>',
      inReplyTo: '<orig-msg-123@pacificproduct.in>',
    });

    assert.strictEqual(normalized.providerMessageId, 'msg-ext-99238');
    assert.strictEqual(normalized.from.email, 'vendor@supplier.com');
    assert.strictEqual(normalized.to[0], 'sales@pacificproduct.in');
    assert.strictEqual(normalized.inReplyTo, '<orig-msg-123@pacificproduct.in>');
    assert.strictEqual(normalized.bodyText, 'Order approved.');
  });

  await test('Webhook inbound adapter verifies security signature / token', async () => {
    const adapter = new WebhookInboundAdapter();
    process.env.MAIL_INBOUND_WEBHOOK_SECRET = 'pacific-test-secret-key-123';

    const valid = adapter.verifySignature(
      { 'x-pacific-signature': 'pacific-test-secret-key-123' },
      '{}'
    );
    assert.strictEqual(valid, true);

    const invalid = adapter.verifySignature(
      { 'x-pacific-signature': 'wrong-signature' },
      '{}'
    );
    assert.strictEqual(invalid, false);
  });

  // ─── Suite 5: DNS Audit & Non-Destructive Readiness ─────────────────────────
  console.log('\n🌐 Suite 5: DNS Audit & Non-Destructive Readiness (PROPOSED NOT APPLIED)');

  await test('DNS readiness report audits current Google Workspace MX & SPF', async () => {
    const report = await mailAdminService.getDnsReadinessReport();
    assert.strictEqual(report.domain, 'pacificproduct.in');
    assert.strictEqual(report.hasMx, true);
    assert.ok(report.currentMx.some((m: any) => m.exchange?.includes('google')));
    assert.strictEqual(report.hasSpf, true);
    assert.ok(report.currentSpf?.includes('_spf.google.com'));
    assert.strictEqual(report.proposedChangesPlan.status, 'PROPOSED_NOT_APPLIED');
    assert.ok(report.proposedChangesPlan.notes.some((n: string) => n.includes('DO NOT replace or remove root MX')));
  });

  // Clean up created test address
  await prisma.$executeRawUnsafe(`DELETE FROM mail_addresses WHERE id = $1`, createdAddressId);

  console.log('\n────────────────────────────────────────────────────────────');
  console.log(`Gateway Test Results: ${passed} passed, ${failed} failed`);
  console.log('────────────────────────────────────────────────────────────\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runGatewayTests()
  .then(() => {
    console.log('🎉 All Pacific Mail Gateway & Address Management tests PASSED!\n');
    process.exit(0);
  })
  .catch((err) => {
    console.error('💥 Test suite crashed:', err);
    process.exit(1);
  });

const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function main() {
  // Show current sequences
  const seqs = await p.documentSequence.findMany({ where: { documentType: 'QUOTATION' } });
  console.log('Current sequences:', JSON.stringify(seqs, null, 2));

  // Update prefix from PPS/D/... to PPS/QT/...
  const result = await p.documentSequence.updateMany({
    where: { documentType: 'QUOTATION', prefix: { contains: 'PPS/D/' } },
    data: { prefix: seqs.length > 0 ? seqs[0].prefix.replace('PPS/D/', 'PPS/QT/') : undefined },
  });
  console.log('Updated rows:', result.count);

  // Show updated
  const updated = await p.documentSequence.findMany({ where: { documentType: 'QUOTATION' } });
  console.log('Updated sequences:', JSON.stringify(updated, null, 2));
}

main().catch(console.error).finally(() => p.$disconnect());

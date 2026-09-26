const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function main() {
  // Find all quotations with old PPS/D/ prefix
  const quotations = await p.salesQuotation.findMany({
    where: { referenceNumber: { contains: 'PPS/D/' } },
    select: { id: true, referenceNumber: true },
  });
  console.log(`Found ${quotations.length} quotations to update:`, quotations.map(q => q.referenceNumber));

  for (const q of quotations) {
    const newRef = q.referenceNumber.replace('PPS/D/', 'PPS/QT/');
    await p.salesQuotation.update({
      where: { id: q.id },
      data: { referenceNumber: newRef },
    });
    console.log(`  ${q.referenceNumber} → ${newRef}`);
  }

  console.log('Done.');
}

main().catch(console.error).finally(() => p.$disconnect());

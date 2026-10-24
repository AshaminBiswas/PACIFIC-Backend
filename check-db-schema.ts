import { prisma } from './src/config/database';

async function main() {
  const productCols = await prisma.$queryRawUnsafe(`
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_name = 'products'
  `);
  console.log('--- PRODUCTS TABLE COLUMNS ---');
  console.log(productCols);
}

main().finally(() => prisma.$disconnect());

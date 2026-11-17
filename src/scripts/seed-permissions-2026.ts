import dotenv from 'dotenv';
dotenv.config();

import { rolesService } from '../modules/roles/roles.service';

async function seed() {
  console.log('Starting Pacific Admin Permissions & Roles Seeder...');
  await rolesService.seedDefaultRolesAndPermissions();
  console.log('Finished successfully!');
  process.exit(0);
}

seed().catch((err) => {
  console.error('Seeding error:', err);
  process.exit(1);
});

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const bcrypt = require('bcryptjs');
const { pool } = require('../src/config/db');
const env = require('../src/config/env');

async function seedAdmin() {
  const username = env.admin.username;
  const passwordHash = await bcrypt.hash(env.admin.password, 10);

  const [existing] = await pool.query(
    'SELECT id FROM admins WHERE username = ?',
    [username]
  );

  if (existing.length > 0) {
    console.log(`Admin "${username}" already exists — skipping seed.`);
    return;
  }

  await pool.query(
    'INSERT INTO admins (username, password_hash, name) VALUES (?, ?, ?)',
    [username, passwordHash, env.admin.name]
  );

  console.log(`Admin seeded: username="${username}"`);
}

seedAdmin()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Seed failed:', err.message);
    process.exit(1);
  });

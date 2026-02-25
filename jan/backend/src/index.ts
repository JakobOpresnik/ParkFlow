import 'dotenv/config'
import bcrypt from 'bcryptjs'
import { pool } from './db/pool.js'
import { createApp } from './app.js'

const PORT = process.env.PORT ?? 3001

async function seedAdminIfNeeded(): Promise<void> {
  try {
    const { rows } = await pool.query('SELECT COUNT(*) FROM app_users')
    if (parseInt(rows[0].count) === 0) {
      const hash = await bcrypt.hash('admin', 10)
      await pool.query(
        `INSERT INTO app_users (username, password_hash, display_name, role)
         VALUES ($1, $2, $3, 'admin')`,
        ['admin', hash, 'Administrator'],
      )
      console.log('✓ Seeded admin user (admin / admin)')
    }
  } catch {
    // Table may not exist yet — migration needs to be run first
  }
}

const app = createApp()

app.listen(PORT, async () => {
  console.log(`ParkFlow backend listening on http://localhost:${PORT}`)
  await seedAdminIfNeeded()
})

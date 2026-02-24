import { neon } from '@neondatabase/serverless';

let sql;

function getDb() {
  if (!sql) {
    sql = neon(process.env.POSTGRES_URL);
  }
  return sql;
}

export async function initializeDatabase() {
  const sql = getDb();

  await sql`
    CREATE TABLE IF NOT EXISTS supplements (
      id SERIAL PRIMARY KEY,
      user_id VARCHAR(64) NOT NULL,
      name VARCHAR(200) NOT NULL,
      dosage VARCHAR(100),
      frequency VARCHAR(50) DEFAULT 'daily',
      time_of_day VARCHAR(20) DEFAULT 'morning',
      notes TEXT,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS check_ins (
      id SERIAL PRIMARY KEY,
      user_id VARCHAR(64) NOT NULL,
      supplement_id INTEGER REFERENCES supplements(id) ON DELETE CASCADE,
      checked_at TIMESTAMP DEFAULT NOW(),
      date DATE DEFAULT CURRENT_DATE
    )
  `;

  await sql`
    CREATE INDEX IF NOT EXISTS idx_supplements_user ON supplements(user_id)
  `;

  await sql`
    CREATE INDEX IF NOT EXISTS idx_checkins_user_date ON check_ins(user_id, date)
  `;

  return { success: true };
}

// Supplements CRUD
export async function getSupplements(userId) {
  const sql = getDb();
  const rows = await sql`
    SELECT * FROM supplements WHERE user_id = ${userId} ORDER BY time_of_day, name
  `;
  return rows;
}

export async function createSupplement(userId, data) {
  const sql = getDb();
  const rows = await sql`
    INSERT INTO supplements (user_id, name, dosage, frequency, time_of_day, notes)
    VALUES (${userId}, ${data.name}, ${data.dosage || null}, ${data.frequency || 'daily'}, ${data.time_of_day || 'morning'}, ${data.notes || null})
    RETURNING *
  `;
  return rows[0];
}

export async function updateSupplement(userId, id, data) {
  const sql = getDb();
  const rows = await sql`
    UPDATE supplements 
    SET name = ${data.name}, dosage = ${data.dosage || null}, 
        frequency = ${data.frequency || 'daily'}, time_of_day = ${data.time_of_day || 'morning'}, 
        notes = ${data.notes || null}, updated_at = NOW()
    WHERE id = ${id} AND user_id = ${userId}
    RETURNING *
  `;
  return rows[0];
}

export async function deleteSupplement(userId, id) {
  const sql = getDb();
  await sql`DELETE FROM supplements WHERE id = ${id} AND user_id = ${userId}`;
  return { success: true };
}

// Check-ins
export async function getCheckIns(userId, date) {
  const sql = getDb();
  const rows = await sql`
    SELECT ci.*, s.name as supplement_name, s.dosage, s.time_of_day
    FROM check_ins ci
    JOIN supplements s ON ci.supplement_id = s.id
    WHERE ci.user_id = ${userId} AND ci.date = ${date}
    ORDER BY ci.checked_at
  `;
  return rows;
}

export async function getCheckInHistory(userId, startDate, endDate) {
  const sql = getDb();
  const rows = await sql`
    SELECT ci.date, COUNT(ci.id) as check_count, 
           COUNT(DISTINCT ci.supplement_id) as supplements_taken
    FROM check_ins ci
    WHERE ci.user_id = ${userId} AND ci.date >= ${startDate} AND ci.date <= ${endDate}
    GROUP BY ci.date
    ORDER BY ci.date DESC
  `;
  return rows;
}

export async function createCheckIn(userId, supplementId) {
  const sql = getDb();
  // Check if already checked in today
  const existing = await sql`
    SELECT id FROM check_ins 
    WHERE user_id = ${userId} AND supplement_id = ${supplementId} AND date = CURRENT_DATE
  `;
  if (existing.length > 0) {
    return { already_checked: true };
  }
  const rows = await sql`
    INSERT INTO check_ins (user_id, supplement_id) VALUES (${userId}, ${supplementId})
    RETURNING *
  `;
  return rows[0];
}

export async function removeCheckIn(userId, supplementId, date) {
  const sql = getDb();
  await sql`
    DELETE FROM check_ins 
    WHERE user_id = ${userId} AND supplement_id = ${supplementId} AND date = ${date}
  `;
  return { success: true };
}

export async function getStreak(userId) {
  const sql = getDb();
  const rows = await sql`
    WITH dates AS (
      SELECT DISTINCT date FROM check_ins WHERE user_id = ${userId} ORDER BY date DESC
    ),
    numbered AS (
      SELECT date, date - (ROW_NUMBER() OVER (ORDER BY date DESC))::int * INTERVAL '1 day' AS grp
      FROM dates
    )
    SELECT COUNT(*) as streak
    FROM numbered
    WHERE grp = (SELECT grp FROM numbered ORDER BY date DESC LIMIT 1)
  `;
  return rows[0]?.streak || 0;
}

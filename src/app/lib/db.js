import { neon } from '@neondatabase/serverless';

// ============================================
// In-memory fallback for local dev (no DB)
// ============================================
const memoryStore = {
  supplements: [],
  checkIns: [],
  nextSupId: 1,
  nextCiId: 1,
};

function isLocalMode() {
  return !process.env.POSTGRES_URL;
}

function todayStr() {
  return new Date().toISOString().split('T')[0];
}

// --- Postgres mode ---
let sql;
function getDb() {
  if (!sql) {
    sql = neon(process.env.POSTGRES_URL);
  }
  return sql;
}

// ============================================
// initializeDatabase
// ============================================
export async function initializeDatabase() {
  if (isLocalMode()) {
    return { success: true, mode: 'memory' };
  }

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
  await sql`CREATE INDEX IF NOT EXISTS idx_supplements_user ON supplements(user_id)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_checkins_user_date ON check_ins(user_id, date)`;
  return { success: true, mode: 'postgres' };
}

// ============================================
// Supplements CRUD
// ============================================
export async function getSupplements(userId) {
  if (isLocalMode()) {
    return memoryStore.supplements.filter((s) => s.user_id === userId);
  }
  const sql = getDb();
  return await sql`SELECT * FROM supplements WHERE user_id = ${userId} ORDER BY time_of_day, name`;
}

export async function createSupplement(userId, data) {
  if (isLocalMode()) {
    const sup = {
      id: memoryStore.nextSupId++,
      user_id: userId,
      name: data.name,
      dosage: data.dosage || null,
      frequency: data.frequency || 'daily',
      time_of_day: data.time_of_day || 'morning',
      notes: data.notes || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    memoryStore.supplements.push(sup);
    return sup;
  }
  const sql = getDb();
  const rows = await sql`
    INSERT INTO supplements (user_id, name, dosage, frequency, time_of_day, notes)
    VALUES (${userId}, ${data.name}, ${data.dosage || null}, ${data.frequency || 'daily'}, ${data.time_of_day || 'morning'}, ${data.notes || null})
    RETURNING *
  `;
  return rows[0];
}

export async function updateSupplement(userId, id, data) {
  if (isLocalMode()) {
    const idx = memoryStore.supplements.findIndex((s) => s.id === id && s.user_id === userId);
    if (idx === -1) return null;
    memoryStore.supplements[idx] = {
      ...memoryStore.supplements[idx],
      name: data.name,
      dosage: data.dosage || null,
      frequency: data.frequency || 'daily',
      time_of_day: data.time_of_day || 'morning',
      notes: data.notes || null,
      updated_at: new Date().toISOString(),
    };
    return memoryStore.supplements[idx];
  }
  const sql = getDb();
  const rows = await sql`
    UPDATE supplements SET name = ${data.name}, dosage = ${data.dosage || null},
      frequency = ${data.frequency || 'daily'}, time_of_day = ${data.time_of_day || 'morning'},
      notes = ${data.notes || null}, updated_at = NOW()
    WHERE id = ${id} AND user_id = ${userId}
    RETURNING *
  `;
  return rows[0];
}

export async function deleteSupplement(userId, id) {
  if (isLocalMode()) {
    memoryStore.checkIns = memoryStore.checkIns.filter((ci) => ci.supplement_id !== id);
    memoryStore.supplements = memoryStore.supplements.filter((s) => !(s.id === id && s.user_id === userId));
    return { success: true };
  }
  const sql = getDb();
  await sql`DELETE FROM supplements WHERE id = ${id} AND user_id = ${userId}`;
  return { success: true };
}

// ============================================
// Check-ins
// ============================================
export async function getCheckIns(userId, date) {
  if (isLocalMode()) {
    const today = date || todayStr();
    return memoryStore.checkIns
      .filter((ci) => ci.user_id === userId && ci.date === today)
      .map((ci) => {
        const sup = memoryStore.supplements.find((s) => s.id === ci.supplement_id);
        return {
          ...ci,
          supplement_name: sup?.name || 'Unknown',
          dosage: sup?.dosage,
          time_of_day: sup?.time_of_day,
        };
      });
  }
  const sql = getDb();
  return await sql`
    SELECT ci.*, s.name as supplement_name, s.dosage, s.time_of_day
    FROM check_ins ci JOIN supplements s ON ci.supplement_id = s.id
    WHERE ci.user_id = ${userId} AND ci.date = ${date}
    ORDER BY ci.checked_at
  `;
}

export async function getCheckInHistory(userId, startDate, endDate) {
  if (isLocalMode()) {
    const grouped = {};
    memoryStore.checkIns
      .filter((ci) => ci.user_id === userId && ci.date >= startDate && ci.date <= endDate)
      .forEach((ci) => {
        if (!grouped[ci.date]) grouped[ci.date] = new Set();
        grouped[ci.date].add(ci.supplement_id);
      });
    return Object.entries(grouped)
      .map(([date, supSet]) => ({
        date,
        check_count: supSet.size,
        supplements_taken: supSet.size,
      }))
      .sort((a, b) => b.date.localeCompare(a.date));
  }
  const sql = getDb();
  return await sql`
    SELECT ci.date, COUNT(ci.id) as check_count, COUNT(DISTINCT ci.supplement_id) as supplements_taken
    FROM check_ins ci
    WHERE ci.user_id = ${userId} AND ci.date >= ${startDate} AND ci.date <= ${endDate}
    GROUP BY ci.date ORDER BY ci.date DESC
  `;
}

export async function createCheckIn(userId, supplementId) {
  if (isLocalMode()) {
    const today = todayStr();
    const existing = memoryStore.checkIns.find(
      (ci) => ci.user_id === userId && ci.supplement_id === supplementId && ci.date === today
    );
    if (existing) return { already_checked: true };
    const ci = {
      id: memoryStore.nextCiId++,
      user_id: userId,
      supplement_id: supplementId,
      checked_at: new Date().toISOString(),
      date: today,
    };
    memoryStore.checkIns.push(ci);
    return ci;
  }
  const sql = getDb();
  const existing = await sql`
    SELECT id FROM check_ins WHERE user_id = ${userId} AND supplement_id = ${supplementId} AND date = CURRENT_DATE
  `;
  if (existing.length > 0) return { already_checked: true };
  const rows = await sql`
    INSERT INTO check_ins (user_id, supplement_id) VALUES (${userId}, ${supplementId}) RETURNING *
  `;
  return rows[0];
}

export async function removeCheckIn(userId, supplementId, date) {
  if (isLocalMode()) {
    memoryStore.checkIns = memoryStore.checkIns.filter(
      (ci) => !(ci.user_id === userId && ci.supplement_id === supplementId && ci.date === date)
    );
    return { success: true };
  }
  const sql = getDb();
  await sql`DELETE FROM check_ins WHERE user_id = ${userId} AND supplement_id = ${supplementId} AND date = ${date}`;
  return { success: true };
}

export async function getStreak(userId) {
  if (isLocalMode()) {
    const dates = [...new Set(memoryStore.checkIns.filter((ci) => ci.user_id === userId).map((ci) => ci.date))].sort().reverse();
    if (dates.length === 0) return 0;
    let streak = 1;
    for (let i = 1; i < dates.length; i++) {
      const prev = new Date(dates[i - 1] + 'T00:00:00');
      const curr = new Date(dates[i] + 'T00:00:00');
      const diff = (prev - curr) / (1000 * 60 * 60 * 24);
      if (diff === 1) streak++;
      else break;
    }
    return streak;
  }
  const sql = getDb();
  const rows = await sql`
    WITH dates AS (
      SELECT DISTINCT date FROM check_ins WHERE user_id = ${userId} ORDER BY date DESC
    ),
    numbered AS (
      SELECT date, date - (ROW_NUMBER() OVER (ORDER BY date DESC))::int * INTERVAL '1 day' AS grp
      FROM dates
    )
    SELECT COUNT(*) as streak FROM numbered
    WHERE grp = (SELECT grp FROM numbered ORDER BY date DESC LIMIT 1)
  `;
  return rows[0]?.streak || 0;
}

import { neon } from '@neondatabase/serverless';

// ============================================
// In-memory fallback for local dev (no DB)
// ============================================
let memoryStore = globalThis.__memoryStore;

if (!memoryStore) {
  memoryStore = {
    supplements: [],
    checkIns: [],
    wounds: [],
    woundLogs: [],
    footAssessments: [],
    footImages: [],
    users: [], // Added explicitly to support user login
    nextSupId: 1,
    nextCiId: 1,
    nextWoundId: 1,
    nextWoundLogId: 1,
    nextFootAssessId: 1,
    nextFootImageId: 1,
  };
  globalThis.__memoryStore = memoryStore;
}


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
  await sql`
    CREATE TABLE IF NOT EXISTS wounds (
      id SERIAL PRIMARY KEY,
      user_id VARCHAR(64) NOT NULL,
      name VARCHAR(200),
      location VARCHAR(200),
      date_of_injury DATE,
      display_name VARCHAR(200),
      picture_url TEXT,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS wound_logs (
      id SERIAL PRIMARY KEY,
      wound_id INTEGER REFERENCES wounds(id) ON DELETE CASCADE,
      user_id VARCHAR(64) NOT NULL,
      image_data TEXT,
      nrs_pain_score INTEGER DEFAULT 0,
      symptoms TEXT, 
      ai_assessment_summary TEXT,
      ai_status_label VARCHAR(100),
      logged_at TIMESTAMP DEFAULT NOW(),
      date DATE DEFAULT CURRENT_DATE
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS users (
      id VARCHAR(64) PRIMARY KEY,
      email VARCHAR(200) UNIQUE,
      password_hash VARCHAR(200),
      display_name VARCHAR(200),
      picture_url TEXT,
      auth_provider VARCHAR(20) NOT NULL,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS foot_assessments (
      id SERIAL PRIMARY KEY,
      user_id VARCHAR(64) NOT NULL,
      pain_locations TEXT,
      nrs_pain_score INTEGER DEFAULT 0,
      steps_count INTEGER DEFAULT 0,
      standing_hours FLOAT DEFAULT 0,
      date DATE DEFAULT CURRENT_DATE
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS foot_images (
      id SERIAL PRIMARY KEY,
      user_id VARCHAR(64) NOT NULL,
      image_data TEXT,
      ai_severity VARCHAR(50),
      ai_summary TEXT,
      logged_at TIMESTAMP DEFAULT NOW()
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS idx_supplements_user ON supplements(user_id)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_checkins_user_date ON check_ins(user_id, date)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_wounds_user ON wounds(user_id)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_wound_logs_user_date ON wound_logs(user_id, date)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_foot_assessments_user_date ON foot_assessments(user_id, date)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_foot_images_user ON foot_images(user_id)`;

  // Migrations: add new columns if they don't exist yet
  try { await sql`ALTER TABLE wounds ADD COLUMN IF NOT EXISTS display_name VARCHAR(200)`; } catch (e) { }
  try { await sql`ALTER TABLE wounds ADD COLUMN IF NOT EXISTS picture_url TEXT`; } catch (e) { }
  // V2 migrations
  try { await sql`ALTER TABLE wounds ADD COLUMN IF NOT EXISTS wound_type VARCHAR(50)`; } catch (e) { }
  try { await sql`ALTER TABLE wounds ADD COLUMN IF NOT EXISTS body_location VARCHAR(100)`; } catch (e) { }
  try { await sql`ALTER TABLE wounds ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'active'`; } catch (e) { }

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

// ============================================
// Wounds CRUD
// ============================================
export async function getWounds(userId) {
  if (isLocalMode()) {
    return memoryStore.wounds.filter((w) => w.user_id === userId && (w.status === 'active' || !w.status));
  }
  const sql = getDb();
  return await sql`SELECT * FROM wounds WHERE user_id = ${userId} AND (status = 'active' OR status IS NULL) ORDER BY created_at DESC`;
}

export async function getWoundById(userId, woundId) {
  if (isLocalMode()) {
    return memoryStore.wounds.find((w) => Number(w.id) === Number(woundId) && String(w.user_id) === String(userId)) || null;
  }
  const sql = getDb();
  const rows = await sql`SELECT * FROM wounds WHERE id = ${woundId} AND user_id = ${userId}`;
  return rows[0] || null;
}

export async function archiveWound(userId, woundId) {
  if (isLocalMode()) {
    const w = memoryStore.wounds.find((w) => w.id === woundId && w.user_id === userId);
    if (w) w.status = 'archived';
    return w;
  }
  const sql = getDb();
  const rows = await sql`UPDATE wounds SET status = 'archived' WHERE id = ${woundId} AND user_id = ${userId} RETURNING *`;
  return rows[0];
}

export async function getAllWoundsAdmin() {
  if (isLocalMode()) {
    return memoryStore.wounds.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  }
  const sql = getDb();
  return await sql`SELECT * FROM wounds ORDER BY created_at DESC LIMIT 50`;
}

export async function updateWound(woundId, userId, updates) {
  if (isLocalMode()) {
    const w = memoryStore.wounds.find((w) => w.id === woundId && w.user_id === userId);
    if (w) Object.assign(w, updates);
    return w;
  }
  const sql = getDb();
  // Build dynamic update — only set provided fields
  const rows = await sql`
    UPDATE wounds SET
      name = COALESCE(${updates.name || null}, name),
      wound_type = COALESCE(${updates.wound_type || null}, wound_type),
      body_location = COALESCE(${updates.body_location || null}, body_location),
      date_of_injury = COALESCE(${updates.date_of_injury ? updates.date_of_injury : null}, date_of_injury)
    WHERE id = ${woundId} AND user_id = ${userId}
    RETURNING *
  `;
  return rows[0];
}

// Legacy alias
export async function updateWoundName(woundId, name) {
  if (isLocalMode()) {
    const w = memoryStore.wounds.find((w) => w.id === woundId);
    if (w) w.name = name;
    return w;
  }
  const sql = getDb();
  const rows = await sql`UPDATE wounds SET name = ${name} WHERE id = ${woundId} RETURNING *`;
  return rows[0];
}

export async function createWound(userId, data) {
  if (isLocalMode()) {
    const w = {
      id: memoryStore.nextWoundId++,
      user_id: userId,
      name: data.name || '未命名傷口',
      location: data.location || null,
      date_of_injury: data.date_of_injury || todayStr(),
      display_name: data.display_name || null,
      picture_url: data.picture_url || null,
      wound_type: data.wound_type || null,
      body_location: data.body_location || null,
      status: 'active',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    memoryStore.wounds.push(w);
    return w;
  }
  const sql = getDb();
  const rows = await sql`
    INSERT INTO wounds (user_id, name, location, date_of_injury, display_name, picture_url, wound_type, body_location, status)
    VALUES (${userId}, ${data.name || '未命名傷口'}, ${data.location || null}, ${data.date_of_injury || todayStr()}, ${data.display_name || null}, ${data.picture_url || null}, ${data.wound_type || null}, ${data.body_location || null}, 'active')
    RETURNING *
  `;
  return rows[0];
}

// ============================================
// Wound Logs (Check-ins for wounds)
// ============================================
export async function getWoundLogs(userId, woundId) {
  if (isLocalMode()) {
    return memoryStore.woundLogs
      .filter((lg) => lg.user_id === userId && lg.wound_id === woundId)
      .sort((a, b) => new Date(b.logged_at) - new Date(a.logged_at));
  }
  const sql = getDb();
  return await sql`
    SELECT * FROM wound_logs 
    WHERE user_id = ${userId} AND wound_id = ${woundId} 
    ORDER BY logged_at DESC
  `;
}

export async function getWoundLogsAdmin(woundId) {
  if (isLocalMode()) {
    return memoryStore.woundLogs
      .filter((lg) => lg.wound_id === woundId)
      .sort((a, b) => new Date(b.logged_at) - new Date(a.logged_at));
  }
  const sql = getDb();
  return await sql`
    SELECT * FROM wound_logs 
    WHERE wound_id = ${woundId} 
    ORDER BY logged_at DESC
  `;
}

export async function createWoundLog(userId, woundId, data) {
  if (isLocalMode()) {
    const lg = {
      id: memoryStore.nextWoundLogId++,
      user_id: userId,
      wound_id: woundId,
      image_data: data.image_data || null,
      nrs_pain_score: data.nrs_pain_score || 0,
      symptoms: data.symptoms || null,
      ai_assessment_summary: data.ai_assessment_summary || null,
      ai_status_label: data.ai_status_label || null,
      date: todayStr(),
      logged_at: new Date().toISOString(),
    };
    memoryStore.woundLogs.push(lg);
    return lg;
  }
  const sql = getDb();
  const rows = await sql`
    INSERT INTO wound_logs (user_id, wound_id, image_data, nrs_pain_score, symptoms, ai_assessment_summary, ai_status_label)
    VALUES (${userId}, ${woundId}, ${data.image_data || null}, ${data.nrs_pain_score || 0}, ${data.symptoms || null}, ${data.ai_assessment_summary || null}, ${data.ai_status_label || null})
    RETURNING *
  `;
  return rows[0];
}

// ============================================
// User Auth
// ============================================
export async function findUserByEmail(email) {
  if (isLocalMode()) {
    return (memoryStore.users || []).find((u) => u.email === email) || null;
  }
  const sql = getDb();
  const rows = await sql`SELECT * FROM users WHERE email = ${email}`;
  return rows[0] || null;
}

export async function createEmailUser(id, email, passwordHash, displayName) {
  if (isLocalMode()) {
    if (!memoryStore.users) memoryStore.users = [];
    const user = { id, email, password_hash: passwordHash, display_name: displayName, picture_url: null, auth_provider: 'email', created_at: new Date().toISOString() };
    memoryStore.users.push(user);
    return user;
  }
  const sql = getDb();
  const rows = await sql`
    INSERT INTO users (id, email, password_hash, display_name, auth_provider)
    VALUES (${id}, ${email}, ${passwordHash}, ${displayName}, 'email')
    RETURNING *
  `;
  return rows[0];
}

export async function findOrCreateLineUser(lineUserId, displayName, pictureUrl) {
  if (isLocalMode()) {
    if (!memoryStore.users) memoryStore.users = [];
    let user = memoryStore.users.find((u) => u.id === lineUserId);
    if (!user) {
      user = { id: lineUserId, email: null, password_hash: null, display_name: displayName, picture_url: pictureUrl, auth_provider: 'line', created_at: new Date().toISOString() };
      memoryStore.users.push(user);
    }
    return user;
  }
  const sql = getDb();
  const existing = await sql`SELECT * FROM users WHERE id = ${lineUserId}`;
  if (existing.length > 0) {
    // Update display name and picture on each login
    await sql`UPDATE users SET display_name = ${displayName}, picture_url = ${pictureUrl} WHERE id = ${lineUserId}`;
    return { ...existing[0], display_name: displayName, picture_url: pictureUrl };
  }
  const rows = await sql`
    INSERT INTO users (id, display_name, picture_url, auth_provider)
    VALUES (${lineUserId}, ${displayName}, ${pictureUrl}, 'line')
    RETURNING *
  `;
  return rows[0];
}

export async function findUserById(userId) {
  if (isLocalMode()) {
    return (memoryStore.users || []).find((u) => u.id === userId) || null;
  }
  const sql = getDb();
  const rows = await sql`SELECT * FROM users WHERE id = ${userId}`;
  return rows[0] || null;
}

// ============================================
// Foot Care (Bones)
// ============================================
export async function getFootAssessments(userId) {
  if (isLocalMode()) {
    return memoryStore.footAssessments
      .filter((a) => a.user_id === userId)
      .sort((a, b) => new Date(b.date) - new Date(a.date));
  }
  const sql = getDb();
  return await sql`SELECT * FROM foot_assessments WHERE user_id = ${userId} ORDER BY date DESC`;
}

export async function createFootAssessment(userId, data) {
  if (isLocalMode()) {
    const assessment = {
      id: memoryStore.nextFootAssessId++,
      user_id: userId,
      pain_locations: data.pain_locations || null,
      nrs_pain_score: data.nrs_pain_score || 0,
      steps_count: data.steps_count || 0,
      standing_hours: data.standing_hours || 0,
      date: data.date || todayStr(),
    };
    memoryStore.footAssessments.push(assessment);
    return assessment;
  }
  const sql = getDb();
  const rows = await sql`
    INSERT INTO foot_assessments (user_id, pain_locations, nrs_pain_score, steps_count, standing_hours, date)
    VALUES (${userId}, ${data.pain_locations || null}, ${data.nrs_pain_score || 0}, ${data.steps_count || 0}, ${data.standing_hours || 0}, ${data.date || todayStr()})
    RETURNING *
  `;
  return rows[0];
}

export async function getFootImages(userId) {
  if (isLocalMode()) {
    return memoryStore.footImages
      .filter((img) => img.user_id === userId)
      .sort((a, b) => new Date(b.logged_at) - new Date(a.logged_at));
  }
  const sql = getDb();
  return await sql`SELECT * FROM foot_images WHERE user_id = ${userId} ORDER BY logged_at DESC`;
}

export async function createFootImage(userId, data) {
  if (isLocalMode()) {
    const img = {
      id: memoryStore.nextFootImageId++,
      user_id: userId,
      image_data: data.image_data || null,
      ai_severity: data.ai_severity || null,
      ai_summary: data.ai_summary || null,
      logged_at: new Date().toISOString(),
    };
    memoryStore.footImages.push(img);
    return img;
  }
  const sql = getDb();
  const rows = await sql`
    INSERT INTO foot_images (user_id, image_data, ai_severity, ai_summary)
    VALUES (${userId}, ${data.image_data || null}, ${data.ai_severity || null}, ${data.ai_summary || null})
    RETURNING *
  `;
  return rows[0];
}


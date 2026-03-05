import { Hono } from 'hono';
import { softAuthMiddleware } from '../middleware/authMiddleware.js';
import { getIntimacyAssessments, createIntimacyAssessment } from '../lib/db.js';

const intimacy = new Hono();
intimacy.use('*', softAuthMiddleware);

// GET /api/intimacy/assessments
intimacy.get('/assessments', async (c) => {
  try {
    const userId = c.get('userId');
    const assessments = await getIntimacyAssessments(userId);
    return c.json({ success: true, assessments });
  } catch (error) {
    return c.json({ error: error.message || 'Failed to fetch assessments' }, 500);
  }
});

// POST /api/intimacy/assessments
intimacy.post('/assessments', async (c) => {
  try {
    const userId = c.get('userId');
    const body = await c.req.json();
    const assessment = await createIntimacyAssessment(userId, body);
    return c.json({ success: true, assessment });
  } catch (error) {
    return c.json({ error: error.message || 'Failed to create assessment' }, 500);
  }
});

export default intimacy;

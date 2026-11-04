const { getDB } = require('../config/db');
const db = () => getDB();
const safeJson = s => { try { return JSON.parse(s || '[]'); } catch { return []; } };
const {
  callPythonAI,
  callPythonThreat
} = require('../services/aiService');
async function listConversations(req, res) {
  res.json(await db().all('SELECT * FROM conversations ORDER BY updated_at DESC, id DESC'));
}
async function createConversation(req, res) {
  const title = String(req.body?.title || 'New conversation').slice(0, 200);
  const r = await db().run('INSERT INTO conversations(title) VALUES(?)', [title]);
  res.status(201).json({ id: r.lastID, title });
}
async function renameConversation(req, res) {
  const title = String(req.body?.title || '').trim().slice(0, 200);
  if (!title) return res.status(400).json({ error: 'title is required' });
  const r = await db().run('UPDATE conversations SET title=?,updated_at=CURRENT_TIMESTAMP WHERE id=?', [title, req.params.id]);
  if (!r.changes) return res.status(404).json({ error: 'Conversation not found' });
  res.json({ ok: true });
}
async function deleteConversation(req, res) {
  const r = await db().run('DELETE FROM conversations WHERE id=?', [req.params.id]);
  if (!r.changes) return res.status(404).json({ error: 'Conversation not found' });
  res.json({ ok: true });
}
async function getMessages(req, res) {
  const rows = await db().all('SELECT * FROM messages WHERE conversation_id=? ORDER BY id ASC', [req.params.conversation_id]);
  res.json(rows.map(r => ({ ...r, sources: safeJson(r.sources) })));
}
async function saveMessage(req, res) {
  const { conversation_id, sender, content, skill = 'general' } = req.body || {};
  if (!conversation_id || !sender || typeof content !== 'string' || !content.trim())
    return res.status(400).json({ error: 'conversation_id, sender and content are required' });
  const convo = await db().get('SELECT id FROM conversations WHERE id=?', [conversation_id]);
  if (!convo) return res.status(404).json({ error: 'Conversation not found' });
  const user = await db().run('INSERT INTO messages(conversation_id,sender,content) VALUES(?,?,?)',
    [conversation_id, sender, content.trim()]);
  let aiResponse = null, sources = [];
  if (sender === 'user' || sender === 'human') {
    const result = await callPythonAI(conversation_id, content.trim(), skill);
    aiResponse = String(result?.answer ?? '');
    sources = Array.isArray(result?.sources) ? result.sources : [];
    await db().run('INSERT INTO messages(conversation_id,sender,content,sources) VALUES(?,?,?,?)',
      [conversation_id, 'assistant', aiResponse, JSON.stringify(sources)]);
  }
  await db().run('UPDATE conversations SET updated_at=CURRENT_TIMESTAMP WHERE id=?', [conversation_id]);
  res.status(201).json({ id: user.lastID, aiResponse, sources });
}

// api attact ip 

async function getBruteForce(req, res) {
  try {
    const window_minutes = Number(req.query.window_minutes ?? 5);
    const threshold = Number(req.query.threshold ?? 5);
    const limit = Number(req.query.limit ?? 1000);

    if (
      !Number.isInteger(window_minutes) ||
      window_minutes < 1 ||
      window_minutes > 1440
    ) {
      return res.status(400).json({
        error: 'window_minutes must be between 1 and 1440'
      });
    }

    if (
      !Number.isInteger(threshold) ||
      threshold < 2 ||
      threshold > 10000
    ) {
      return res.status(400).json({
        error: 'threshold must be between 2 and 10000'
      });
    }

    if (
      !Number.isInteger(limit) ||
      limit < 1 ||
      limit > 10000
    ) {
      return res.status(400).json({
        error: 'limit must be between 1 and 10000'
      });
    }

    const result = await callPythonThreat({
      window_minutes,
      threshold,
      limit
    });

    return res.json({
      errCode: 0,
      data: result
    });

  } catch (error) {
    console.error(
      'Brute Force Detection Error:',
      error.message
    );

    return res.status(502).json({
      errCode: 1,
      message: 'Cannot get brute force detection data',
      detail: error.message
    });
  }
}

module.exports = {
  listConversations,
  createConversation,
  renameConversation,
  deleteConversation,
  getMessages,
  saveMessage,
  getBruteForce
};
const path = require('path');
const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
let db;
async function initDB() {
  if (db) return db;
  db = await open({ filename: path.join(__dirname, 'database.sqlite'), driver: sqlite3.Database });
  await db.exec('PRAGMA foreign_keys = ON');
  await db.exec(`CREATE TABLE IF NOT EXISTS conversations (
    id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT NOT NULL DEFAULT 'New conversation',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT, conversation_id INTEGER NOT NULL,
    sender TEXT NOT NULL, content TEXT NOT NULL, sources TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
  );`);
  return db;
}
function getDB() { if (!db) throw new Error('Database not initialized'); return db; }
module.exports = { initDB, getDB };

import Database from 'better-sqlite3';
import path from 'path';
import { app } from 'electron';

const dbPath = path.join(app.getPath('userData'), 'serper.db');
const db = new Database(dbPath);

// Initialize tables
db.exec(`
  CREATE TABLE IF NOT EXISTS scans (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    keyword TEXT,
    device TEXT,
    country TEXT,
    language TEXT,
    target_domain TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS results (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    scan_id INTEGER,
    rank INTEGER,
    title TEXT,
    link TEXT,
    snippet TEXT,
    domain TEXT,
    FOREIGN KEY(scan_id) REFERENCES scans(id)
  );

  -- NEW: Keyword Explorer Table
  CREATE TABLE IF NOT EXISTS explorer_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    keyword TEXT,
    suggestions TEXT, -- JSON string of suggestions array
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  -- NEW: PAA Miner Table
  CREATE TABLE IF NOT EXISTS paa_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    keyword TEXT,
    questions TEXT, -- JSON string of questions/answers array
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  -- NEW: Site Auditor Table
  CREATE TABLE IF NOT EXISTS audit_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    url TEXT,
    data TEXT, -- JSON string of audit results (title, desc, headers, etc)
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

// --- SERP Tracker Functions ---

export function saveScan(scanData, results) {
  const insertScan = db.prepare(`
    INSERT INTO scans (keyword, device, country, language, target_domain)
    VALUES (?, ?, ?, ?, ?)
  `);

  const insertResult = db.prepare(`
    INSERT INTO results (scan_id, rank, title, link, snippet, domain)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  const transaction = db.transaction((data, items) => {
    const info = insertScan.run(data.keyword, data.device, data.country, data.language, data.targetDomain);
    const scanId = info.lastInsertRowid;

    for (const item of items) {
      insertResult.run(scanId, item.rank, item.title, item.link, item.snippet, item.domain);
    }
    return scanId;
  });

  return transaction(scanData, results);
}

export function getHistory() {
  const stmt = db.prepare(`
    SELECT s.*, 
    (SELECT rank FROM results r WHERE r.scan_id = s.id AND r.domain LIKE '%' || s.target_domain || '%' LIMIT 1) as target_rank
    FROM scans s
    ORDER BY created_at DESC
    LIMIT 50
  `);
  return stmt.all();
}

export function getScanResults(scanId) {
  const stmt = db.prepare('SELECT * FROM results WHERE scan_id = ? ORDER BY rank ASC');
  return stmt.all(scanId);
}

export function deleteScan(scanId) {
  const deleteResults = db.prepare('DELETE FROM results WHERE scan_id = ?');
  const deleteScan = db.prepare('DELETE FROM scans WHERE id = ?');
  
  const transaction = db.transaction((id) => {
    deleteResults.run(id);
    deleteScan.run(id);
  });
  
  return transaction(scanId);
}

// --- Keyword Explorer Functions ---

export function saveExplorer(keyword, suggestions) {
  const stmt = db.prepare('INSERT INTO explorer_history (keyword, suggestions) VALUES (?, ?)');
  return stmt.run(keyword, JSON.stringify(suggestions));
}

export function getExplorerHistory() {
  const stmt = db.prepare('SELECT * FROM explorer_history ORDER BY created_at DESC LIMIT 50');
  return stmt.all();
}

// --- PAA Miner Functions ---

export function savePAA(keyword, questions) {
  const stmt = db.prepare('INSERT INTO paa_history (keyword, questions) VALUES (?, ?)');
  return stmt.run(keyword, JSON.stringify(questions));
}

export function getPAAHistory() {
  const stmt = db.prepare('SELECT * FROM paa_history ORDER BY created_at DESC LIMIT 50');
  return stmt.all();
}

// --- Site Auditor Functions ---

export function saveAudit(url, auditData) {
  const stmt = db.prepare('INSERT INTO audit_history (url, data) VALUES (?, ?)');
  return stmt.run(url, JSON.stringify(auditData));
}

export function getAuditHistory() {
  const stmt = db.prepare('SELECT * FROM audit_history ORDER BY created_at DESC LIMIT 50');
  return stmt.all();
}

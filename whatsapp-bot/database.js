const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'balaji_database.sqlite');
const db = new sqlite3.Database(dbPath);

db.serialize(() => {
  // Exams Queue Table
  db.run(`CREATE TABLE IF NOT EXISTS exams_queue (
    id TEXT PRIMARY KEY,
    name TEXT,
    post TEXT,
    vacancy TEXT,
    startDate TEXT,
    endDate TEXT,
    fees TEXT,
    qualification TEXT,
    link TEXT,
    category TEXT,
    status TEXT DEFAULT 'pending',
    verificationScore INTEGER,
    missingFields TEXT,
    createdAt TEXT,
    scheduledAt TEXT,
    broadcastedAt TEXT
  )`);

  // Config Table
  db.run(`CREATE TABLE IF NOT EXISTS config (
    key TEXT PRIMARY KEY,
    value TEXT
  )`);

  // Default Config
  db.run(`INSERT OR IGNORE INTO config (key, value) VALUES ('autoPilot', 'false')`);
});

module.exports = {
  // Exams
  getAllExams: () => {
    return new Promise((resolve, reject) => {
      db.all("SELECT * FROM exams_queue ORDER BY createdAt DESC", [], (err, rows) => {
        if (err) reject(err);
        else resolve(rows.map(r => ({ ...r, missingFields: JSON.parse(r.missingFields || '[]') })));
      });
    });
  },

  getPendingExams: () => {
    return new Promise((resolve, reject) => {
      db.all("SELECT * FROM exams_queue WHERE status = 'pending' ORDER BY createdAt DESC", [], (err, rows) => {
        if (err) reject(err);
        else resolve(rows.map(r => ({ ...r, missingFields: JSON.parse(r.missingFields || '[]') })));
      });
    });
  },

  addExam: (exam) => {
    return new Promise((resolve, reject) => {
      const { id, name, post, vacancy, startDate, endDate, fees, qualification, link, category, status, verificationScore, missingFields, createdAt } = exam;
      db.run(`INSERT OR IGNORE INTO exams_queue (id, name, post, vacancy, startDate, endDate, fees, qualification, link, category, status, verificationScore, missingFields, createdAt)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [id, name, post, vacancy, startDate, endDate, fees, qualification, link, category, status, verificationScore, JSON.stringify(missingFields), createdAt],
        (err) => {
          if (err) reject(err);
          else resolve();
        }
      );
    });
  },

  updateExamStatus: (id, status, broadcastedAt = null) => {
    return new Promise((resolve, reject) => {
      db.run("UPDATE exams_queue SET status = ?, broadcastedAt = ? WHERE id = ?", [status, broadcastedAt, id], (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  },

  updateExam: (id, data) => {
    return new Promise((resolve, reject) => {
      db.run("UPDATE exams_queue SET name = ?, post = ?, endDate = ?, qualification = ? WHERE id = ?", 
        [data.name, data.post, data.endDate, data.qualification, id], 
        (err) => {
          if (err) reject(err);
          else resolve();
        }
      );
    });
  },

  deleteExam: (id) => {
    return new Promise((resolve, reject) => {
      db.run("DELETE FROM exams_queue WHERE id = ?", [id], (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  },

  // Config
  getConfig: () => {
    return new Promise((resolve, reject) => {
      db.get("SELECT value FROM config WHERE key = 'autoPilot'", [], (err, row) => {
        if (err) reject(err);
        else resolve({ autoPilot: row?.value === 'true' });
      });
    });
  },

  setConfig: (autoPilot) => {
    return new Promise((resolve, reject) => {
      db.run("UPDATE config SET value = ? WHERE key = 'autoPilot'", [autoPilot ? 'true' : 'false'], (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }
};

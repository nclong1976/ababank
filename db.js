/**
 * FOR FUTURE POSTGRESQL MIGRATION:
 * Remove better-sqlite3 and use pg:
 * 
 * const { Pool } = require('pg');
 * const pool = new Pool({
 *   connectionString: process.env.DATABASE_URL,
 *   ssl: {
 *     rejectUnauthorized: false
 *   }
 * });
 * // ... then update query logic to use pool.query
 */

const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

let db;

const dbPath = path.resolve(__dirname, 'dev.db');
db = new Database(dbPath);

// Initialize schema if needed (Only for SQLite)
if (db) {
  const schemaPath = path.resolve(__dirname, 'schema.sql');
  if (fs.existsSync(schemaPath)) {
    const schema = fs.readFileSync(schemaPath, 'utf8');
    try {
      db.exec(schema);

      // Migration for existing tables
      try {
        const userColumns = db.prepare('PRAGMA table_info(users)').all();
        const hasPin = userColumns.some(c => c.name === 'pin');
        const hasRole = userColumns.some(c => c.name === 'role');
        const hasPhone = userColumns.some(c => c.name === 'phone');
        
        if (!hasPin) {
          db.prepare("ALTER TABLE users ADD COLUMN pin TEXT DEFAULT '111111'").run();
        }
        if (!hasRole) {
          db.prepare("ALTER TABLE users ADD COLUMN role TEXT DEFAULT 'user'").run();
        }
        if (!hasPhone) {
          db.prepare("ALTER TABLE users ADD COLUMN phone TEXT").run();
        }

        // Migration logic for adjustments
        const checkTx = (id) => db.prepare('SELECT count(*) as count FROM transactions WHERE id = ?').get(id).count;

        if (checkTx('request-update-5468-v2') === 0) {
          const user = db.prepare('SELECT id FROM users WHERE id = ?').get('user-1');
          if (user) {
            const account = db.prepare('SELECT balance FROM accounts WHERE user_id = ? AND currency = ?').get('user-1', 'USD');
            if (account) {
              const balanceBefore = parseFloat(account.balance);
              const balanceAfter = 5468.83;
              db.prepare('UPDATE accounts SET balance = ? WHERE user_id = ? AND currency = ?').run(balanceAfter, 'user-1', 'USD');
              db.prepare('UPDATE users SET pin = ?, name = ? WHERE id = ?').run('111111', 'So Dawin!', 'user-1');
              db.prepare('INSERT INTO transactions (id, user_id, amount, type, balance_before, balance_after, note, currency) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
                .run('request-update-5468-v2', 'user-1', balanceAfter - balanceBefore, 'plus', balanceBefore, balanceAfter, 'Balance adjusted to 5,468.83 USD', 'USD');
            }
          }
        }
        
        if (checkTx('admin-pin-update-8213') === 0) {
          db.prepare("UPDATE users SET pin = ? WHERE role = 'admin'").run('8213');
          const firstUser = db.prepare('SELECT id FROM users LIMIT 1').get();
          if (firstUser) {
             db.prepare('INSERT INTO transactions (id, user_id, amount, type, balance_before, balance_after, note, currency) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
                  .run('admin-pin-update-8213', firstUser.id, 0, 'plus', 0, 0, 'Updated Admin PIN to 8213', 'USD');
          }
        }

        const txColumns = db.prepare('PRAGMA table_info(transactions)').all();
        if (!txColumns.some(c => c.name === 'party_name')) db.prepare("ALTER TABLE transactions ADD COLUMN party_name TEXT").run();
        if (!txColumns.some(c => c.name === 'party_account_no')) db.prepare("ALTER TABLE transactions ADD COLUMN party_account_no TEXT").run();
        if (!txColumns.some(c => c.name === 'currency')) db.prepare("ALTER TABLE transactions ADD COLUMN currency TEXT DEFAULT 'USD'").run();

        const userMeta = db.prepare('PRAGMA table_info(users)').all();
        if (!userMeta.some(c => c.name === 'is_locked')) {
          db.prepare("ALTER TABLE users ADD COLUMN is_locked INTEGER DEFAULT 0").run();
        }
        if (!userMeta.some(c => c.name === 'is_topup_locked')) {
          db.prepare("ALTER TABLE users ADD COLUMN is_topup_locked INTEGER DEFAULT 0").run();
        }

        const accountMeta = db.prepare('PRAGMA table_info(accounts)').all();
        if (!accountMeta.some(c => c.name === 'account_no')) {
          db.prepare("ALTER TABLE accounts ADD COLUMN account_no TEXT").run();
        }

        if (checkTx('pin-4-digit-enforcement') === 0) {
          // Force all PINs to be 4 digits (truncate if longer)
          db.prepare("UPDATE users SET pin = substr(pin, 1, 4) WHERE length(pin) > 4").run();
          db.prepare("UPDATE users SET pin = '8213' WHERE role = 'admin'").run();
          const firstUser = db.prepare('SELECT id FROM users LIMIT 1').get();
          if (firstUser) {
            db.prepare('INSERT INTO transactions (id, user_id, amount, type, balance_before, balance_after, note, currency) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
                  .run('pin-4-digit-enforcement', firstUser.id, 0, 'plus', 0, 0, 'Enforced 4-digit PINs across system', 'USD');
          }
        }
      } catch (err) {
        console.error('Migration error:', err);
      }
      
      const userCount = db.prepare('SELECT count(*) as count FROM users').get().count;
      if (userCount === 0) {
        console.log('Seeding default users...');
        db.prepare('INSERT INTO users (id, name, email, pin, role) VALUES (?, ?, ?, ?, ?)').run('admin-1', 'System Admin', 'admin@bank.com', '8213', 'admin');
        db.prepare('INSERT INTO users (id, name, email, pin, role) VALUES (?, ?, ?, ?, ?)').run('user-1', 'So Dawin!', 'nclong1976@gmail.com', '1111', 'user');
        db.prepare('INSERT INTO accounts (user_id, currency, balance) VALUES (?, ?, ?)').run('admin-1', 'USD', 0);
        db.prepare('INSERT INTO accounts (user_id, currency, balance) VALUES (?, ?, ?)').run('user-1', 'USD', 6250.75);
        db.prepare('INSERT INTO accounts (user_id, currency, balance) VALUES (?, ?, ?)').run('user-1', 'KHR', 1500000);
        db.prepare('INSERT INTO transactions (id, user_id, amount, type, balance_before, balance_after, note, currency) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
          .run('initial-bonus-5000', 'user-1', 5000, 'plus', 1250.75, 6250.75, 'Bonus 5000 USD added by System', 'USD');
        console.log('Seed completed.');
      }
    } catch (err) {
      console.error('Database initialization error:', err);
    }
  }
}

/**
 * Universal Query Adapter
 */
module.exports = {
  query: async (text, params = []) => {
    
    if (!db) {
       throw new Error('Database not initialized');
    }

    let sql = text.replace(/\$(\d+)/g, '?').replace(/now\(\)/gi, 'CURRENT_TIMESTAMP');
    
    if (sql.trim().toUpperCase().startsWith('SELECT')) {
      try {
        const rows = db.prepare(sql).all(params);
        return { rows };
      } catch (err) {
        console.error('SQL SELECT error:', sql, params, err);
        throw err;
      }
    } else {
      try {
        const result = db.prepare(sql).run(params);
        return { 
          rows: result.changes > 0 ? [{ id: result.lastInsertRowid }] : [],
          rowCount: result.changes
        };
      } catch (err) {
        console.error('SQL EXEC error:', sql, params, err);
        throw err;
      }
    }
  },
  getClient: async () => {
    // Basic client simulation for SQLite
    return {
      query: async (text, params = []) => {
        let sql = text.replace(/\$(\d+)/g, '?').replace(/now\(\)/gi, 'CURRENT_TIMESTAMP');
        if (sql.trim().toUpperCase().startsWith('SELECT')) {
           return { rows: db.prepare(sql).all(params) };
        }
        const result = db.prepare(sql).run(params);
        return { rows: [{ id: result.lastInsertRowid }], rowCount: result.changes };
      },
      release: () => {},
      begin: () => db.prepare('BEGIN').run(),
      commit: () => db.prepare('COMMIT').run(),
      rollback: () => db.prepare('ROLLBACK').run()
    };
  }
};


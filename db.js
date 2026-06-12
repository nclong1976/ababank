const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

let db;
let pgPool;
let isPostgres = false;

const dbUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL;

if (dbUrl) {
  const { Pool } = require('pg');
  pgPool = new Pool({
    connectionString: dbUrl,
    ssl: {
      rejectUnauthorized: false
    }
  });
  isPostgres = true;
  console.log('Database: Using PostgreSQL');
} else {
  let dbPath = path.join(process.cwd(), 'dev.db');
  // Vercel serverless functions have a read-only filesystem except for /tmp
  if (process.env.VERCEL) {
    dbPath = '/tmp/dev.db';
    if (!fs.existsSync(dbPath)) {
      try {
        const srcDb = path.join(process.cwd(), 'dev.db');
        if (fs.existsSync(srcDb)) {
          fs.copyFileSync(srcDb, dbPath);
          console.log('Successfully copied dev.db to /tmp/dev.db');
        } else {
          console.log('dev.db not found in workspace root, SQLite will initialize via schema.sql');
        }
      } catch (err) {
        console.error('Failed to copy dev.db to /tmp', err);
      }
    }
  }
  db = new Database(dbPath);
  console.log('Database: Using SQLite at ' + dbPath);
}

// Function to initialize PostgreSQL tables & seed data
async function initPostgres() {
  try {
    const res = await pgPool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'users'
      )
    `);
    if (!res.rows[0].exists) {
      console.log('Initializing PostgreSQL schema...');
      const schemaPath = path.join(process.cwd(), 'schema.sql');
      const schema = fs.readFileSync(schemaPath, 'utf8');
      
      // Execute the schema
      await pgPool.query(schema);
      console.log('PostgreSQL schema initialized successfully.');
    } else {
      try { await pgPool.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS current_challenge TEXT"); } catch (e) {}
      try { 
        await pgPool.query(`CREATE TABLE IF NOT EXISTS webauthn_credentials (
          id TEXT PRIMARY KEY,
          user_id TEXT REFERENCES users(id),
          public_key TEXT NOT NULL,
          counter INTEGER NOT NULL,
          device_type TEXT,
          backed_up INTEGER,
          transports TEXT
        )`); 
      } catch (e) {}
    }
    
    // Seed default users if users table is empty
    const userCountRes = await pgPool.query('SELECT COUNT(*) as count FROM users');
    const userCount = parseInt(userCountRes.rows[0].count, 10);
    if (userCount === 0) {
      console.log('Seeding default users in PostgreSQL...');
      await pgPool.query("INSERT INTO users (id, name, email, pin, role, phone) VALUES ('admin-1', 'System Admin', 'admin@bank.com', '8213', 'admin', '099999999')");
      await pgPool.query("INSERT INTO users (id, name, email, pin, role, phone) VALUES ('user-1', 'So Dawin!', 'nclong1976@gmail.com', '1111', 'user', '099999991')");
      await pgPool.query("INSERT INTO accounts (user_id, currency, balance, account_no) VALUES ('admin-1', 'USD', 0, '123456789')");
      await pgPool.query("INSERT INTO accounts (user_id, currency, balance, account_no) VALUES ('user-1', 'USD', 6250.75, 'USD789632')");
      await pgPool.query("INSERT INTO accounts (user_id, currency, balance, account_no) VALUES ('user-1', 'KHR', 1500000, 'KHR789632')");
      await pgPool.query("INSERT INTO transactions (id, user_id, amount, type, balance_before, balance_after, note, currency) VALUES ('initial-bonus-5000', 'user-1', 5000, 'plus', 1250.75, 6250.75, 'Bonus 5000 USD added by System', 'USD')");
      console.log('PostgreSQL seed completed.');
    }
  } catch (err) {
    console.error('Error initializing PostgreSQL database:', err);
  }
}

// Initialize SQLite schema if active
if (!isPostgres && db) {
  const schemaPath = path.join(process.cwd(), 'schema.sql');
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
        const hasCurrentChallenge = userColumns.some(c => c.name === 'current_challenge');
        if (!hasCurrentChallenge) {
          db.prepare("ALTER TABLE users ADD COLUMN current_challenge TEXT").run();
        }
        db.prepare(`CREATE TABLE IF NOT EXISTS webauthn_credentials (
          id TEXT PRIMARY KEY,
          user_id TEXT REFERENCES users(id),
          public_key TEXT NOT NULL,
          counter INTEGER NOT NULL,
          device_type TEXT,
          backed_up INTEGER,
          transports TEXT
        )`).run();

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
        if (!accountMeta.some(c => c.name === 'updated_at')) {
          db.prepare("ALTER TABLE accounts ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP").run();
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

        if (checkTx('phone-and-pin-enforcement-v2') === 0) {
          db.prepare("UPDATE users SET phone = '099999999', pin = '8213' WHERE id = 'admin-1'").run();
          db.prepare("UPDATE users SET phone = '099999991', pin = '1111', name = 'So Dawin!' WHERE id = 'user-1'").run();
          db.prepare("UPDATE accounts SET account_no = '123456789' WHERE user_id = 'admin-1'").run();
          db.prepare("UPDATE accounts SET account_no = 'USD789632' WHERE user_id = 'user-1' AND currency = 'USD'").run();
          db.prepare("UPDATE accounts SET account_no = 'KHR789632' WHERE user_id = 'user-1' AND currency = 'KHR'").run();
          
          const firstUser = db.prepare('SELECT id FROM users LIMIT 1').get();
          if (firstUser) {
            db.prepare('INSERT INTO transactions (id, user_id, amount, type, balance_before, balance_after, note, currency) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
                  .run('phone-and-pin-enforcement-v2', firstUser.id, 0, 'plus', 0, 0, 'Enforced phone and pin seeds for admin and user-1', 'USD');
          }
        }
      } catch (err) {
        console.error('Migration error:', err);
      }
      
      const userCount = db.prepare('SELECT count(*) as count FROM users').get().count;
      if (userCount === 0) {
        console.log('Seeding default users...');
        db.prepare('INSERT INTO users (id, name, email, pin, role, phone) VALUES (?, ?, ?, ?, ?, ?)').run('admin-1', 'System Admin', 'admin@bank.com', '8213', 'admin', '099999999');
        db.prepare('INSERT INTO users (id, name, email, pin, role, phone) VALUES (?, ?, ?, ?, ?, ?)').run('user-1', 'So Dawin!', 'nclong1976@gmail.com', '1111', 'user', '099999991');
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

if (isPostgres) {
  initPostgres();
}

/**
 * Universal Database Reset Function
 */
async function resetDatabase() {
  const schemaPath = path.join(process.cwd(), 'schema.sql');
  const schema = fs.readFileSync(schemaPath, 'utf8');

  if (isPostgres) {
    await pgPool.query('DROP TABLE IF EXISTS transactions CASCADE');
    await pgPool.query('DROP TABLE IF EXISTS accounts CASCADE');
    await pgPool.query('DROP TABLE IF EXISTS users CASCADE');
    await pgPool.query(schema);
    
    // Seed default users in PostgreSQL
    await pgPool.query("INSERT INTO users (id, name, email, pin, role, phone) VALUES ('admin-1', 'System Admin', 'admin@bank.com', '8213', 'admin', '099999999')");
    await pgPool.query("INSERT INTO users (id, name, email, pin, role, phone) VALUES ('user-1', 'So Dawin!', 'nclong1976@gmail.com', '1111', 'user', '099999991')");
    await pgPool.query("INSERT INTO accounts (user_id, currency, balance, account_no) VALUES ('admin-1', 'USD', 0, '123456789')");
    await pgPool.query("INSERT INTO accounts (user_id, currency, balance, account_no) VALUES ('user-1', 'USD', 6250.75, 'USD789632')");
    await pgPool.query("INSERT INTO accounts (user_id, currency, balance, account_no) VALUES ('user-1', 'KHR', 1500000, 'KHR789632')");
    await pgPool.query("INSERT INTO transactions (id, user_id, amount, type, balance_before, balance_after, note, currency) VALUES ('initial-bonus-5000', 'user-1', 5000, 'plus', 1250.75, 6250.75, 'Bonus 5000 USD added by System', 'USD')");
  } else {
    if (!db) throw new Error('Database not initialized');
    db.exec('PRAGMA foreign_keys = OFF');
    const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
    tables.forEach(t => db.prepare(`DROP TABLE IF EXISTS ${t.name}`).run());
    db.exec(schema);
    
    // Seed default users in SQLite
    db.prepare('INSERT INTO users (id, name, email, pin, role, phone) VALUES (?, ?, ?, ?, ?, ?)').run('admin-1', 'System Admin', 'admin@bank.com', '8213', 'admin', '099999999');
    db.prepare('INSERT INTO users (id, name, email, pin, role, phone) VALUES (?, ?, ?, ?, ?, ?)').run('user-1', 'So Dawin!', 'nclong1976@gmail.com', '1111', 'user', '099999991');
    db.prepare('INSERT INTO accounts (user_id, currency, balance) VALUES (?, ?, ?)').run('admin-1', 'USD', 0);
    db.prepare('INSERT INTO accounts (user_id, currency, balance) VALUES (?, ?, ?)').run('user-1', 'USD', 6250.75);
    db.prepare('INSERT INTO accounts (user_id, currency, balance) VALUES (?, ?, ?)').run('user-1', 'KHR', 1500000);
    db.prepare('INSERT INTO transactions (id, user_id, amount, type, balance_before, balance_after, note, currency) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
      .run('initial-bonus-5000', 'user-1', 5000, 'plus', 1250.75, 6250.75, 'Bonus 5000 USD added by System', 'USD');
  }
}

/**
 * Universal Query Adapter
 */
module.exports = {
  query: async (text, params = []) => {
    if (isPostgres) {
      try {
        const res = await pgPool.query(text, params);
        return {
          rows: res.rows,
          rowCount: res.rowCount
        };
      } catch (err) {
        console.error('SQL PG error:', text, params, err);
        throw err;
      }
    }

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
    if (isPostgres) {
      const client = await pgPool.connect();
      return {
        query: async (text, params = []) => {
          const res = await client.query(text, params);
          return {
            rows: res.rows,
            rowCount: res.rowCount
          };
        },
        release: () => client.release(),
        begin: () => client.query('BEGIN'),
        commit: () => client.query('COMMIT'),
        rollback: () => client.query('ROLLBACK')
      };
    }

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
  },
  resetDatabase
};

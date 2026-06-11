-- SQL Schema for Finance Management System
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE,
    phone VARCHAR(20) UNIQUE,
    pin TEXT NOT NULL,
    role TEXT DEFAULT 'user',
    is_locked INTEGER DEFAULT 0,
    is_topup_locked INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS accounts (
    user_id TEXT REFERENCES users(id),
    currency VARCHAR(10) DEFAULT 'USD',
    balance DECIMAL(20, 2) DEFAULT 0.00,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, currency)
);

CREATE TABLE IF NOT EXISTS transactions (
    id TEXT PRIMARY KEY,
    user_id TEXT REFERENCES users(id),
    amount DECIMAL(20, 2) NOT NULL,
    type VARCHAR(20) NOT NULL, -- 'plus', 'minus', 'adjustment_plus', 'adjustment_minus'
    balance_before DECIMAL(20, 2) NOT NULL,
    balance_after DECIMAL(20, 2) NOT NULL,
    admin_id TEXT,
    currency TEXT DEFAULT 'USD',
    party_name TEXT,
    party_account_no TEXT,
    note TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

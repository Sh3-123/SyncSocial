const db = require('../config/db');

const createTables = async () => {
  const usersTable = `
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      email VARCHAR(255) UNIQUE NOT NULL,
      password VARCHAR(255) NOT NULL,
      is_verified BOOLEAN DEFAULT FALSE,
      verification_token VARCHAR(255),
      token_expires_at TIMESTAMP,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `;

  const connectedAccountsTable = `
    CREATE TABLE IF NOT EXISTS connected_accounts (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      platform VARCHAR(50) NOT NULL, -- e.g., 'threads', 'twitter'
      access_token TEXT NOT NULL,
      refresh_token TEXT,
      token_expires_at TIMESTAMP,
      platform_user_id VARCHAR(255),
      platform_username VARCHAR(255),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id, platform)
    );
  `;

  const postsTable = `
    CREATE TABLE IF NOT EXISTS posts (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      platform VARCHAR(50) NOT NULL,
      platform_post_id VARCHAR(255) NOT NULL,
      parent_post_id VARCHAR(255), -- ID of the parent thread if this is a reply
      platform_username VARCHAR(255), -- Handle of the author
      content TEXT,
      media_url TEXT,
      likes_count INTEGER DEFAULT 0,
      comments_count INTEGER DEFAULT 0,
      views_count INTEGER DEFAULT 0,
      post_type VARCHAR(20) DEFAULT 'POST', -- 'POST' or 'REPLY'
      published_at TIMESTAMP,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id, platform, platform_post_id)
    );
  `;

  const analyticsHistoryTable = `
    CREATE TABLE IF NOT EXISTS analytics_history (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      platform VARCHAR(50) NOT NULL,
      follower_count INTEGER DEFAULT 0,
      recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `;

  const intelligenceResultsTable = `
    CREATE TABLE IF NOT EXISTS intelligence_results (
      id SERIAL PRIMARY KEY,
      target_id VARCHAR(255) NOT NULL,
      target_type VARCHAR(20) NOT NULL, -- 'POST' or 'COMMENT'
      sentiment_label VARCHAR(50), 
      sentiment_score FLOAT,
      subclass_label VARCHAR(50), 
      subclass_score FLOAT,
      raw_results JSONB,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(target_id, target_type)
    );
  `;

  await db.query(usersTable);
  await db.query(connectedAccountsTable);
  await db.query(postsTable);
  await db.query(analyticsHistoryTable);
  await db.query(intelligenceResultsTable);

  // Migration for existing table
  try {
    await db.query('ALTER TABLE posts ADD COLUMN IF NOT EXISTS post_type VARCHAR(20) DEFAULT \'POST\'');
    await db.query('ALTER TABLE posts ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP');
    await db.query('ALTER TABLE posts ADD COLUMN IF NOT EXISTS parent_post_id VARCHAR(255)');
    await db.query('ALTER TABLE posts ADD COLUMN IF NOT EXISTS platform_username VARCHAR(255)');
  } catch (err) {
    console.log('Migration subtle error (likely columns already exist):', err.message);
  }
};

const initDB = async () => {
  try {
    // Check if db exists logic or assume it exists based on config
    await createTables();
  } catch (error) {
    console.error('Database initialization error:', error);
    throw error;
  }
};

module.exports = { initDB };

const { Client } = require('pg');
const db = require('./src/config/db');

async function check() {
    try {
        const res = await db.query("SELECT * FROM analytics_history WHERE platform = 'threads' ORDER BY recorded_at DESC LIMIT 5");
        console.log("Analytics History for Threads:", res.rows);
    } catch (e) {
        console.error("DB Error", e);
    } finally {
        process.exit(0);
    }
}
check();

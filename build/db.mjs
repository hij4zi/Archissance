/* Enquiry log — GoDaddy managed MySQL (see ~/.claude/skills/godaddy-nodejs-hosting/
   examples.md#managed-mysql). The platform injects DB_HOST/DB_PORT/DB_NAME/
   DB_USER/DB_PASSWORD as env vars once managed MySQL is enabled for this app
   in the Node.js Hosting UI — never hardcoded.

   This is a durable backup record of every enquiry, independent of email
   delivery: contact-handler.mjs writes here first (treated as the required,
   must-succeed step) and then best-effort attempts the email notification —
   so a submission is never lost even if email delivery has a problem. */
import mysql from "mysql2/promise";

let tableEnsured = false;

function requireConfig() {
  if (!process.env.DB_HOST) {
    throw new Error("database not configured (DB_HOST unset) — enable managed MySQL in the Node.js Hosting UI");
  }
}

async function getConnection() {
  return mysql.createConnection({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT || "3306"),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  });
}

async function ensureTable(conn) {
  if (tableEnsured) return;
  await conn.execute(`
    CREATE TABLE IF NOT EXISTS enquiries (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(200) NOT NULL,
      email VARCHAR(320) NOT NULL,
      project_type VARCHAR(120) NULL,
      message TEXT NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);
  tableEnsured = true;
}

export async function saveEnquiry({ name, email, projectType, message }) {
  requireConfig();
  const conn = await getConnection();
  try {
    await ensureTable(conn);
    await conn.execute(
      "INSERT INTO enquiries (name, email, project_type, message) VALUES (?, ?, ?, ?)",
      [name, email, projectType || null, message]
    );
  } finally {
    await conn.end();
  }
}

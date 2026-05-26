/**
 * Apply wilayah migration using Supabase Management API
 */
const https = require("https");
const fs = require("fs");

const token = "sbp_2d688f6c60d1c71a05130e3adf3b1688f947d344";
const projectRef = "wrfraskmawmciiutwcpx";

const sql = fs.readFileSync("supabase/migrations/058_wilayah.sql", "utf8");

// Escape SQL for JSON string: backslash, double-quote, newline, carriage return
const escaped = sql
  .replace(/\\/g, "\\\\")
  .replace(/"/g, '\\"')
  .replace(/\r\n/g, "\\n")
  .replace(/\n/g, "\\n");

const body = JSON.stringify({ query: escaped });

const opts = {
  hostname: "api.supabase.com",
  port: 443,
  path: `/v1/projects/${projectRef}/database/query`,
  method: "POST",
  headers: {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
    "Content-Length": Buffer.byteLength(body),
  },
};

console.log("Applying migration 058_wilayah.sql via Management API...");

const req = https.request(opts, (res) => {
  let data = "";
  res.on("data", (chunk) => (data += chunk));
  res.on("end", () => {
    if (res.statusCode >= 200 && res.statusCode < 300) {
      console.log("✅ Migration applied!");
      console.log(JSON.parse(data || "{}"));
    } else {
      console.error("❌ HTTP " + res.statusCode);
      console.error(data);
    }
  });
});

req.on("error", (e) => console.error("Network error:", e.message));
req.write(body);
req.end();

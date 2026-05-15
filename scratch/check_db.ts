import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.VITE_SUPABASE_URL || "https://jnarzbkddjdrethfkxtn.supabase.co";
const supabaseKey =
  process.env.VITE_SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpuYXJ6YmtkZGpkcmV0aGZreHRuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc5MjY1ODEsImV4cCI6MjA5MzUwMjU4MX0.nMTuQ4pICUUKp2HOH2PP5HxRt2yij_u0LTlCaRfhVQs";

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkData() {
  const { count, error } = await supabase.from("warga").select("*", { count: "exact", head: true });

  if (error) {
    console.error("Error fetching warga count:", error.message);
  } else {
    console.log(`\nWarga table count: ${count}`);
  }

  const { count: reqCount, error: reqError } = await supabase
    .from("surat_requests")
    .select("*", { count: "exact", head: true });

  if (reqError) {
    console.error("Error fetching surat_requests count:", reqError.message);
  } else {
    console.log(`Surat_requests table count: ${reqCount}\n`);
  }
}

checkData();

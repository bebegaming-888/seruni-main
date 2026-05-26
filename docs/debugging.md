# Troubleshooting & Common Issues

## Manual Testing Checklist

```bash
# 1. Start API server
bun run server
# → http://localhost:3001

# 2. Start frontend
bun run dev
# → http://localhost:5173 (dengan proxy /api/* ke :3001)

# Atau bersamaan:
bun run dev:all

# 3. Test health check
curl http://localhost:3001/api/health-check

# 4. Build test
bun run build && bun run preview

# 5. Type check + lint
tsc --noEmit && bun run lint

# 6. Test offline mode
# - DevTools → Network → Offline
# - Submit surat → harus masuk queue
# - Online lagi → queue harus auto-process
```

## Common Issues

### `window.$_TSR.router is undefined` saat production build

**Cause:** `postbuild.js` tidak berjalan atau `dist/client/index.html` tidak memiliki bootstrap script inline.
**Fix:** Pastikan `postbuild.js` finish tanpa error. Cek `dist/client/index.html` — harus punya `<script>window.$_TSR=...</script>` inline.

### Store kembali ke default setelah refresh

**Cause:** Settings Lock tidak aktif — HMR me-reset module state.
**Fix:** Cek `initSettingsLock()` dipanggil di `store-init.ts`. `isStoreLocked()` harus return `true`. Jika `false`, panggil `lockSettings()` setelah user save.

### API call `/api/*` returns 404

**Cause:** Local API server tidak berjalan.
**Fix:** Pastikan `bun run server` aktif di port 3001. Cek Vite proxy di `vite.config.ts` route `/api/*` → `http://localhost:3001`.

### Supabase sync gagal tapi tidak ada error

**Cause:** Env vars tidak ter-set dengan benar.
**Fix:** Cek `isSupabaseConfigured()` — jika `false`, `VITE_SUPABASE_URL` dan `VITE_SUPABASE_ANON_KEY` tidak ter-load. Pastikan `.env` / `.dev.vars` ada dan valid.

### HMR me-reset store state

**Cause:** Settings Lock System tidak aktif.
**Fix:** Lihat "Store kembali ke default setelah refresh" di atas.

### Tracking number surat tidak unik

**Cause:** Konflik counter di `nomor_surat_counter` (rare race condition).
**Fix:** Server endpoint `/api/generate-nomor-surat` sudah atomic — pastikan dipakai, bukan generate client-side.

---

_Dokumen troubleshooting — update saat ditemukan issue baru._

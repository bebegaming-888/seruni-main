# Pola Solusi per Tech Stack

Gunakan file ini di Fase 4 untuk merekomendasikan solusi yang tepat sesuai teknologi project.

---

## DETEKSI TECH STACK → SOLUSI

### NODE.JS / EXPRESS

**Security:**

```bash
npm install helmet cors express-rate-limit express-validator
```

```javascript
// Helmet untuk security headers
app.use(helmet());
// Rate limiting
const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 100 });
app.use("/api/", limiter);
// Input validation
const { body, validationResult } = require("express-validator");
```

**Authentication:**

```bash
npm install jsonwebtoken bcryptjs passport passport-jwt
```

Gunakan JWT dengan refresh token pattern. Hash password dengan bcryptjs (rounds: 12).

**Database ORM (Node.js):**

- Sequelize → gunakan `findAll({ include: ... })` untuk eager loading (cegah N+1)
- Prisma → gunakan `include` dan `select` untuk cegah over-fetching
- Mongoose → gunakan `.populate()` dan lean queries

**Performance:**

```bash
npm install compression node-cache
# Untuk Redis:
npm install ioredis
```

**Error handling pattern:**

```javascript
// Global error handler
app.use((err, req, res, next) => {
  const isDev = process.env.NODE_ENV === "development";
  res.status(err.status || 500).json({
    message: err.message,
    ...(isDev && { stack: err.stack }),
  });
});
```

---

### NEXT.JS

**Performance:**

- Gunakan `next/image` untuk otomatis optimasi gambar
- Gunakan `next/dynamic` untuk code splitting
- Aktifkan ISR (Incremental Static Regeneration) untuk halaman yang jarang berubah

```javascript
// Code splitting
const HeavyComponent = dynamic(() => import("../components/Heavy"), {
  loading: () => <p>Loading...</p>,
  ssr: false,
});

// Image optimization
import Image from "next/image";
<Image src="/hero.jpg" width={800} height={600} alt="Hero" priority />;
```

**Security di Next.js:**

- API Routes: selalu validasi method dan body
- Gunakan `next-auth` untuk authentication
- Set security headers di `next.config.js`

```javascript
// next.config.js
const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
];
```

---

### REACT (CRA / Vite)

**State Management — pilih berdasarkan kompleksitas:**

- Lokal UI state → `useState` + `useReducer`
- Shared state sederhana → `useContext` + `useReducer`
- Shared state kompleks → Zustand (ringan) atau Redux Toolkit
- Server state → React Query / SWR (jangan simpan di Redux)

```bash
# Pilih salah satu sesuai kebutuhan:
npm install zustand           # State management ringan
npm install @tanstack/react-query  # Server state
npm install @reduxjs/toolkit react-redux  # Kompleks
```

**Performance React:**

```javascript
// Cegah re-render berlebihan
const Component = React.memo(({ data }) => { ... })
const expensiveValue = useMemo(() => compute(data), [data])
const stableCallback = useCallback(() => handleClick(), [dep])

// Lazy loading
const LazyPage = lazy(() => import('./pages/Dashboard'))
```

**CSS Conflict — pilihan:**

- CSS Modules (zero config): `styles.module.css`
- Tailwind CSS (utility-first): konfigurasi purge untuk production
- Styled-components/Emotion: CSS-in-JS

---

### LARAVEL (PHP)

**Security:**

```php
// Selalu gunakan Eloquent atau Query Builder (parameterized)
$user = User::where('email', $request->email)->first(); // AMAN
// Bukan:
DB::select("SELECT * FROM users WHERE email = '{$request->email}'"); // BAHAYA

// Validasi
$validated = $request->validate([
    'email' => 'required|email|max:255',
    'password' => 'required|min:8',
]);

// CSRF sudah built-in, pastikan @csrf di form
```

**Performance:**

```php
// Eager loading untuk cegah N+1
$posts = Post::with(['author', 'comments'])->paginate(15);

// Caching
$data = Cache::remember('key', 3600, fn() => expensiveQuery());

// Queue untuk proses berat
SendEmailJob::dispatch($user)->onQueue('emails');
```

**Authentication:**

```bash
composer require laravel/sanctum  # API token
# atau
composer require laravel/fortify  # Full auth scaffolding
```

---

### DJANGO / PYTHON

**Security:**

```python
# settings.py security checklist
DEBUG = False  # production!
ALLOWED_HOSTS = ['yourdomain.com']
SECRET_KEY = os.environ['DJANGO_SECRET_KEY']
SECURE_SSL_REDIRECT = True
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
SECURE_HSTS_SECONDS = 31536000

# Parameterized query (Django ORM selalu parameterized)
User.objects.filter(email=request.POST['email'])  # AMAN
# Hindari raw query tanpa params:
User.objects.raw("SELECT * FROM auth_user WHERE email = %s", [email])
```

**Performance:**

```python
# select_related untuk ForeignKey (JOIN)
posts = Post.objects.select_related('author').all()
# prefetch_related untuk ManyToMany
posts = Post.objects.prefetch_related('tags').all()

# Caching dengan Django cache framework
from django.core.cache import cache
result = cache.get_or_set('key', expensive_fn, 3600)

# Pagination
from django.core.paginator import Paginator
paginator = Paginator(queryset, 25)
```

---

### FASTAPI / PYTHON

**Security:**

```python
from fastapi import Depends, HTTPException, Security
from fastapi.security import OAuth2PasswordBearer

# Input validation dengan Pydantic (built-in)
class UserCreate(BaseModel):
    email: EmailStr
    password: constr(min_length=8)

# JWT authentication
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")
```

**Performance:**

```python
# Gunakan async endpoints untuk I/O bound
@app.get("/items")
async def get_items(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Item))
    return result.scalars().all()

# Connection pooling
engine = create_async_engine(DATABASE_URL, pool_size=10, max_overflow=20)
```

---

### VUE.JS

**State Management:**

- Vue 2: Vuex
- Vue 3: Pinia (direkomendasikan)

```bash
npm install pinia
```

```javascript
// Pinia store
export const useUserStore = defineStore("user", {
  state: () => ({ user: null, token: null }),
  actions: {
    async login(credentials) {
      const { data } = await api.post("/auth/login", credentials);
      this.token = data.token;
    },
  },
});
```

**Performance Vue:**

```javascript
// Lazy loading routes
const routes = [{ path: "/dashboard", component: () => import("./views/Dashboard.vue") }];

// Computed vs method — gunakan computed untuk reactive value
const fullName = computed(() => `${firstName.value} ${lastName.value}`);
```

---

## SOLUSI UNIVERSAL (SEMUA STACK)

### Database Indexing

```sql
-- Index pada kolom yang sering di-query
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_orders_user_id ON orders(user_id);
CREATE INDEX idx_products_category_status ON products(category_id, status);

-- Compound index untuk query kombinasi
-- Gunakan EXPLAIN ANALYZE untuk identifikasi query lambat
EXPLAIN ANALYZE SELECT * FROM orders WHERE user_id = 1 AND status = 'pending';
```

### Environment Configuration

```bash
# .env.example (commit ini ke git)
DATABASE_URL=postgresql://user:pass@localhost:5432/dbname
REDIS_URL=redis://localhost:6379
JWT_SECRET=change-this-in-production
APP_URL=http://localhost:3000

# .gitignore (pastikan ini ada)
.env
.env.local
.env.production
*.pem
*.key
```

### Docker untuk Konsistensi Environment

```dockerfile
# Dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 3000
CMD ["node", "server.js"]
```

```yaml
# docker-compose.yml untuk development
version: "3.8"
services:
  app:
    build: .
    ports: ["3000:3000"]
    env_file: .env
    depends_on: [db, redis]
  db:
    image: postgres:15
    environment:
      POSTGRES_DB: myapp
  redis:
    image: redis:alpine
```

### Rate Limiting & Protection

```nginx
# nginx.conf
limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
server {
    location /api/ {
        limit_req zone=api burst=20 nodelay;
    }
}
```

### Logging Best Practice

```javascript
// Gunakan structured logging
const logger = require("pino")({
  level: process.env.LOG_LEVEL || "info",
  redact: ["password", "token", "secret"], // jangan log data sensitif
});

logger.info({ userId: user.id, action: "login" }, "User logged in");
// Bukan: console.log(`User ${user.password} logged in`)
```

---

## TRADEOFF GUIDE

| Kebutuhan     | Opsi Cepat             | Opsi Robust                   | Opsi Jangka Panjang         |
| ------------- | ---------------------- | ----------------------------- | --------------------------- |
| Auth          | JWT sederhana          | JWT + Refresh Token           | OAuth2 + NextAuth/Passport  |
| Cache         | In-memory (node-cache) | Redis                         | Redis Cluster               |
| Queue         | Bull (Redis-based)     | BullMQ                        | RabbitMQ / SQS              |
| File upload   | Local storage          | S3-compatible                 | CDN + S3                    |
| Search        | SQL LIKE               | Full-text search (PostgreSQL) | Elasticsearch / Meilisearch |
| State (React) | useState               | Zustand                       | Redux Toolkit               |
| Monitoring    | Console logs           | Winston + file                | Datadog / Sentry            |

# Bakery ERP Frontend - DB Only Flow

This build keeps the original UI/design/routes, but removes sample/demo fallback rows. The app hydrates data from the backend first, then every add/edit/delete is synced to MySQL through the backend.

## Run

```powershell
npm install
copy .env.local.example .env.local
npm run dev
```

`.env.local`:

```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:5000/api
```

Notes:
- Database empty = frontend empty.
- Supplier add -> saved to DB -> available in purchase supplier dropdown.
- Purchase Outside Product -> appears in Finished Stock and also in Materials Bought tab as requested.
- No sidebar/route/design was changed.

# Ascend Chan

Ascend Chan is an open-source textboard forum built with plain HTML, CSS, and JavaScript, with Supabase data storage facility and Vercel site hosting.

The goal was to keep it simple, minimal and comfy place to interact.

## What it does

- Multiple boards with thread and reply flows
- A thread view with replies and bookmarks
- Recent activity and a noticeboard
- A shared stream room with live chat
(Much more to add in future :) )

## Stack

- HTML
- CSS
- Vanilla JavaScript
- Supabase

## Running it locally

### 1. Create a Supabase project

Create a Supabase project, then run the SQL from `supabase_schema.sql`.

### 2. Review the public config

The site now uses `public-config.js` for safe frontend values like the Supabase project URL and anon key.

Those values are expected to be public in a browser app and should be protected by proper Supabase Row Level Security.

You can start by copying `public-config.example.js` to `public-config.js` and filling in your project values:

```js
window.AscendConfig = {
  supabaseUrl: "https://your-project-ref.supabase.co",
  supabaseAnonKey: "your-public-anon-key",
};
```

### 3. Create your admin account

Admin access now uses Supabase Auth plus the `profiles` table.

The basic flow is:

1. Create a user in Supabase Auth.
2. Make sure that user has a matching row in `profiles`.
3. Set `profiles.role` to `admin` for your account.

The frontend checks your signed-in account and only unlocks the admin panel when that stored role is `admin`.

`local-config.js` is optional. If you want a place for local-only notes or future machine-specific overrides, copy `local-config.example.js` to `local-config.js`. Keep that file private and uncommitted.

### 4. Serve the files

This is a static project, so any simple local server will do. For example:

```powershell
python -m http.server 8000
```

Then open `http://localhost:8000`.

## Project files

- `index.html`: landing page and entry point
- `board.html` / `board.js`: board browsing and thread creation
- `thread.html` / `thread.js`: thread page and replies
- `admin.html` / `admin.js`: local admin tools
- `noticeboard.html` / `noticeboard.js`: noticeboard page
- `stream-room.html` / `stream-room.js`: stream room and chat
- `supabase.js`: Supabase client setup
- `supabase-api.js`: client-side data layer
- `supabase_schema.sql`: database schema and policies

## Important note about security

This repo is safe to publish now, but it is still important to be honest about what this project is.

The old frontend password flow has been removed. Admin access now depends on Supabase Auth plus your `profiles.role` value.

Before deploying this publicly, review and harden the policies in `supabase_schema.sql`.

## Contributing

If you want to contribute, check `CONTRIBUTING.md` first.

## Reporting security issues

Please report security issues privately using the process in `SECURITY.md`.

## License

MIT. See `LICENSE`.

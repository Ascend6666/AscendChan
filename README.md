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

### 2. Add your local config

Copy `local-config.example.js` to `local-config.js` and fill in your own values:

```js
window.AscendConfig = {
  supabaseUrl: "https://your-project-ref.supabase.co",
  supabaseAnonKey: "your-public-anon-key",
  adminPasswords: {
    admin: "choose-a-local-admin-password",
  },
};
```

`local-config.js` is gitignored, so your local credentials stay out of the repo.

### 3. Serve the files

This is a static project, so any simple local server will do. Personally, I use :

```git bash
cd Project //Locate the project
npm install //Install the dependencies
npm run dev //Run the project locally
```

Then check on which port the site is hosted then open `http://localhost:port`.

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

The admin password flow is only a local browser-side convenience. It is not real authentication. If you want production-grade moderation or role enforcement, that needs to be handled properly on the backend and through stricter Supabase policies.

Also, the Supabase anon key is public by design, so the real protection comes from your Row Level Security rules. Before deploying this publicly, review and harden the policies in `supabase_schema.sql`.

## Contributing

If you want to contribute, check `CONTRIBUTING.md` first.

## Reporting security issues

Please report security issues privately using the process in `SECURITY.md`.

## License

MIT. See `LICENSE`.

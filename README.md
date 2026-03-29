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

### 3. Add your local-only config

Copy `local-config.example.js` to `local-config.js` and fill in your own local-only values:

```js
window.AscendLocalConfig = {
  adminPasswords: {
    admin: "choose-a-local-admin-password",
    developer: "choose-a-local-developer-password",
  },
};
```

`local-config.js` is gitignored, so it stays on your machine.

### 4. Serve the files

This is a static project, so any simple local server will do. Personally, I use git bash :

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

The admin password flow is only a local browser-side convenience. It is not real authentication. If you publish a `local-config.js` file on a public static site, anyone can fetch it. Real moderation needs backend or Supabase-auth-based authorization with stricter policies.

Before deploying this publicly, review and harden the policies in `supabase_schema.sql`.

## Contributing

If you want to contribute, check `CONTRIBUTING.md` first.

## Reporting security issues

Please report security issues privately using the process in `SECURITY.md`.

## License

MIT. See `LICENSE`.

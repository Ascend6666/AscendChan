# Security Policy

## Supported Use

This project is currently best treated as an experimental textboard forum website.

## Reporting a Vulnerability

Please report security issues privately to the maintainer instead of opening a public issue.

When reporting, include:

- A short description of the issue
- Steps to reapply
- Impact
- Anyother suggested

## Current Security Caveats

- `local-config.js` passwords only gate local UI paths in the browser. They are not a secure auth system.
- The app depends heavily on Supabase Row Level Security for protection.
- Some policies in `supabase_schema.sql` are permissive and should be hardened before public deployment.
- Browser-only moderation cannot reliably identify users by IP or securely enforce roles.

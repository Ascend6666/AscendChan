# Security Policy

## Supported Use

This project is currently best treated as an experimental or self-hosted textboard forum.

## Reporting a Vulnerability

Please report security issues privately to the maintainer instead of opening a public issue.

When reporting, include:

- A short description of the issue
- Steps to reproduce
- Impact
- Any suggested mitigation

## Current Security Caveats

- Admin access should be handled through Supabase Auth plus role checks, not frontend-only secrets.
- The app depends heavily on Supabase Row Level Security for protection.
- Some policies in `supabase_schema.sql` are permissive and should be hardened before public deployment.
- Browser-only moderation cannot reliably identify users by IP or securely enforce roles.

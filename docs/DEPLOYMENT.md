# Vercel Deployment Guide

## Deploy

1. Push the project to GitHub, GitLab, or Bitbucket.
2. Import the project in Vercel.
3. Select the Vite framework preset.
4. Use these settings:

```text
Build Command: npm run build
Output Directory: dist
Install Command: npm install
```

## Environment Variables

Add these to Vercel Project Settings > Environment Variables:

```text
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
```

Add them for Production, Preview, and Development as needed.

## Supabase Redirects

In Supabase Authentication > URL Configuration:

Set Site URL:

```text
https://your-vercel-domain.vercel.app
```

Add Redirect URLs:

```text
https://your-vercel-domain.vercel.app/settings
```

## SPA Routing

`vercel.json` rewrites all app routes to `index.html`, so direct visits to routes like `/reports` and `/settings` work after deployment.

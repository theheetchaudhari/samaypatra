# Skill: Multi-Entry SPA Architecture

## Purpose

Provides the engineering pattern for building **multiple independent single-page applications** (e.g., a public storefront and an admin panel) from a single shared codebase, using a single build tool with separate entry points, build outputs, and deployment configurations.

## When to Use

- You have two or more distinct user-facing applications that share components, styles, or utilities but have **completely separate routing trees and audiences** (e.g., customer site + admin dashboard, marketing site + internal tool).
- You want one repository, one `node_modules`, and one CI pipeline — but separate builds and deployments.
- You need different HTML entry points with different `<head>` metadata (PWA manifests, fonts, scripts).

## When NOT to Use

- The "admin" section is a few protected routes within the same SPA — use route-based code splitting instead.
- The applications share no code at all — use a monorepo with separate packages.
- You only have one audience and one routing tree.

## Prerequisites

- Familiarity with a module bundler that supports multi-entry builds (Vite, Webpack, Parcel).
- Understanding of SPA routing and server-side fallback rewrites.

## Core Principles

1. **One codebase, separate entry points.** Each application has its own HTML file and JavaScript entry, but they import from the same `src/` directory.
2. **Separate build outputs.** Each entry compiles to its own `dist` directory, enabling independent deployment.
3. **Shared dependencies, isolated routing.** Components, contexts, and utilities can be shared via imports, but routing trees must never cross boundaries.
4. **Dev server parity.** Each entry must be independently runnable in development with its own port.
5. **Deployment-aware builds.** The build process should handle any filename transformations needed by the hosting platform.

## General Pattern

### 1. Directory Structure

```
project-root/
├── index.html              # Entry A (e.g., public site)
├── admin.html              # Entry B (e.g., admin panel)
├── src/
│   ├── main.jsx            # JS entry for Entry A
│   ├── admin-main.jsx      # JS entry for Entry B
│   ├── App.jsx             # Root component for Entry A
│   ├── components/         # Shared components
│   ├── lib/                # Shared utilities (API client, etc.)
│   └── pages/
│       ├── public/         # Pages for Entry A
│       └── admin/          # Pages for Entry B
├── vite.config.js          # Build config for Entry A
└── vite.admin.config.js    # Build config for Entry B
```

### 2. Build Configuration

Each entry gets its own build configuration file:

```javascript
// vite.config.js — Entry A (default)
export default defineConfig({
  plugins: [/* shared plugins */],
  // No special input needed — uses index.html by default
})

// vite.admin.config.js — Entry B
export default defineConfig({
  plugins: [/* shared plugins */, adminDevEntryPlugin, buildRenamePlugin],
  server: { port: 5174 },  // Different port from Entry A
  build: {
    outDir: 'dist-admin',
    rollupOptions: {
      input: 'admin.html',
    },
  },
})
```

### 3. Dev Server Entry Redirect

For non-default entries, the dev server needs a middleware to redirect `/` to the correct HTML file:

```javascript
const adminDevEntry = {
  name: 'admin-dev-entry',
  configureServer(server) {
    server.middlewares.use((req, _res, next) => {
      if (req.url === '/' || req.url === '') {
        req.url = '/admin.html'
      }
      next()
    })
  },
}
```

### 4. Build Output Normalisation

Some hosting platforms (e.g., Vercel) expect `index.html` as the entry point. A build plugin can rename the output:

```javascript
const renamePlugin = {
  name: 'rename-entry-html',
  closeBundle() {
    const from = path.resolve('dist-admin', 'admin.html')
    const to = path.resolve('dist-admin', 'index.html')
    if (fs.existsSync(from)) fs.renameSync(from, to)
  },
}
```

### 5. NPM Scripts

```json
{
  "scripts": {
    "dev": "vite",
    "dev:admin": "vite --config vite.admin.config.js",
    "build": "vite build",
    "build:admin": "vite build --config vite.admin.config.js"
  }
}
```

### 6. Deployment Rewrites

For SPA routing, the hosting platform must rewrite all unmatched paths to the correct HTML entry:

```json
{
  "rewrites": [
    { "source": "/admin(.*)", "destination": "/admin.html" },
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

**Order matters** — more specific patterns must come before the catch-all.

## Recommended Workflow

1. **Start with a single entry.** Get the primary app working first.
2. **Add the second entry.** Create the new HTML file, JS entry, and build config.
3. **Write the dev server plugin.** Ensure `npm run dev:admin` serves the correct entry.
4. **Write the build rename plugin** (if your host requires `index.html`).
5. **Configure deployment rewrites.** Test that direct URL access works for both entries.
6. **Establish the boundary rule:** Admin routes **never** appear in the public router, and vice versa. Enforce this in code review.

## Decision Points

### Separate configs vs. single config with multi-entry rollupOptions?

- **Separate configs** (recommended): Cleaner, each entry is a self-contained build. Easier to add entry-specific plugins.
- **Single config**: Fewer files, but harder to manage diverging build requirements.

### Shared styles or separate?

- If both entries use the same design system (same `index.css`), share it via import.
- If they have radically different designs, consider separate CSS entry points.

### Shared contexts or separate?

- Contexts that manage app-wide state (auth, theme) should be entry-specific — each entry has its own provider tree.
- Utility functions and API clients should be shared.

## Common Mistakes

1. **Importing admin routes into the public entry** (or vice versa), creating a single bloated bundle.
2. **Forgetting the dev server middleware** — the admin entry shows a blank page because `/` loads `index.html`.
3. **Not testing direct URL access** — the app works when navigated from the home page but 404s when you paste `/admin/dashboard` directly.
4. **Rewrite order errors** — putting the catch-all `/(*)` before `/admin(*)` causes admin routes to be handled by the public entry.
5. **Sharing auth providers across entries** — the admin and public auth flows have different security requirements and should use separate providers.

## Security Considerations

- Each entry point may have different authentication requirements. Don't assume that if the admin entry is "hidden," it is secure. The admin HTML and JS bundle are publicly downloadable.
- The admin build output should still be protected by server-side authentication or at minimum client-side route guards that redirect unauthenticated users.
- Don't include admin-only API keys or secrets in client bundles. Use the same `VITE_` prefix convention and Supabase RLS to gate access.

## Debugging

| Symptom | Likely Cause |
|---------|-------------|
| Admin dev server shows blank page | Dev entry redirect middleware missing |
| Admin build works locally but 404s on host | Build rename plugin not converting `admin.html` → `index.html` |
| Direct URL to `/admin/dashboard` shows public site | Deployment rewrite order is wrong |
| Admin bundle includes public page code | Admin entry is importing from the public App component |

## Production Considerations

- **Independent deployments**: Each entry can theoretically be deployed independently if the hosting supports it.
- **Bundle size**: Verify each entry only includes the code it needs. Check the build output for unexpected shared chunks.
- **Cache invalidation**: Each build produces independent assets with hashed filenames. Separate `dist` directories prevent cross-contamination.

## Shivaay Example

Shivaay Enterprise uses this pattern to serve two completely separate applications:

- **Public storefront** (`index.html` → `main.jsx` → `App.jsx`): Customer-facing product catalogue, Google OAuth login, cart, contact pages. Runs on port 5173 in development, builds to `dist/`.
- **Admin panel** (`admin.html` → `admin-main.jsx`): Restricted dashboard with product CRUD, customer management, email/password authentication. Runs on port 5174, builds to `dist-admin/`.

Both entries import from the same `src/` directory — sharing `src/lib/supabase.js` (API client), `src/index.css` (Tailwind theme), and font loading. But they have completely separate routing trees, auth providers, and layout shells.

The `vite.admin.config.js` includes two custom plugins:
- `adminDevEntry`: Rewrites `/` → `/admin.html` during development.
- `renameAdminHtml`: Renames `dist-admin/admin.html` → `dist-admin/index.html` after build for Vercel compatibility.

The `vercel.json` routes `/admin(.*)` to `admin.html` and everything else to `index.html`.

## Anti-Patterns

- **"Admin tab" approach**: Adding admin routes as protected tabs within the main SPA. This bundles admin code into the public build, increases attack surface, and makes independent scaling impossible.
- **Micro-frontend over-engineering**: Using module federation or iframe-based composition when simple multi-entry builds suffice.
- **Copy-pasting the entire config**: Each entry's config should only contain its differences from the default, importing shared plugins from a common module if needed.

## Validation Checklist

- [ ] Each entry has its own HTML file with appropriate `<head>` metadata
- [ ] Each entry has its own JS entry point with its own router
- [ ] Each entry has its own build config and output directory
- [ ] `npm run dev` and `npm run dev:admin` (or equivalent) both work independently
- [ ] `npm run build` and `npm run build:admin` both produce correct output
- [ ] Direct URL access works for both entries in production (rewrites configured)
- [ ] No cross-contamination: admin code is not in the public bundle and vice versa
- [ ] Shared code (API client, styles) works correctly in both entries

## Related Skills

- [Authentication & Authorisation Architecture](../../security/authentication-authorization-architecture/SKILL.md) — Each entry typically has its own auth flow
- [React Data Fetching Patterns](../react-data-fetching-patterns/SKILL.md) — Shared patterns used across both entries

## Repository Evidence

- [`vite.config.js`](../../vite.config.js) — Public site build configuration
- [`vite.admin.config.js`](../../vite.admin.config.js) — Admin panel build configuration with custom plugins
- [`index.html`](../../index.html) — Public site HTML entry
- [`admin.html`](../../admin.html) — Admin panel HTML entry with PWA manifest
- [`src/main.jsx`](../../src/main.jsx) — Public site JS entry
- [`src/admin-main.jsx`](../../src/admin-main.jsx) — Admin panel JS entry
- [`vercel.json`](../../vercel.json) — Deployment rewrite rules
- [`package.json`](../../package.json) — NPM scripts for dual dev/build

## Limitations

- This skill was derived from a Vite-based project. The pattern is conceptually similar in Webpack or other bundlers, but the plugin API differs.
- The Shivaay project deploys both entries to the same Vercel project. Separate deployment (e.g., different subdomains) was not tested.
- The pattern was used with React Router; integration with file-system-based routing (Next.js, Remix) would require a different approach.

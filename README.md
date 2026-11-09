# Stride web

React, TypeScript and Vite web workspace, connected to the same Supabase backend as
Stride Android.

```sh
npm install
npm run dev
```

Set the public Supabase URL and anon/publishable key using `.env.example`. Never
add service-role or AI provider secrets to the browser environment.

The Android feature port includes verified authentication, deadline timing,
budget tracking, notebook study tools and a video studio, alongside a responsive
indigo UI refresh. Read [setup, parity and browser differences](docs/web-android-parity.md)
before connecting this update to a live backend.

```sh
npm run build
npm run lint
npm test
```

## Code formatting

Use the shared Prettier configuration for TypeScript, TSX, JavaScript, CSS, HTML,
JSON and Markdown files. It uses two-space indentation and a 100-character
preferred line width. Dependencies, generated builds and the package lockfile
are excluded. SQL migrations and TOML keep their existing native formatting.

```sh
npm run format
npm run format:check
```

Run the formatting check before submitting changes. Formatting does not replace
`npm run lint`, `npm run build` or `npm test`.

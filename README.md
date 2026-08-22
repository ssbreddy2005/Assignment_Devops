# Marginalia — a vivid, block-based note workspace

A Notion-style note-taking app built with plain HTML, CSS, and JavaScript —
no build step, no framework, no backend. It runs entirely in the browser,
stores notes privately in `localStorage`, and installs as a real app on
Android (and iOS/desktop) as a Progressive Web App (PWA).

## Features

- **Block-based editor** — paragraphs, headings (H1–H3), bulleted &
  numbered lists, to-dos, quotes, callouts, code blocks, and dividers.
- **Slash commands** — type `/` at the start of a block to turn it into
  any block type.
- **Inline formatting** — select text for a floating toolbar: bold,
  italic, strikethrough, inline code, links.
- **Drag to reorder** blocks with the grip handle (works with touch).
- **Pages & sub-pages** — a full sidebar workspace, with nested pages,
  emoji icons, and colour-coded "spine tabs" so you can spot a page at a
  glance.
- **Command palette** (`Ctrl/Cmd + K`) to jump to any page or search
  inside your notes.
- **Light / dark themes** ("day" and "night").
- **Export to Markdown** for any page, one click.
- **Fully offline-capable** via a service worker — once loaded, it works
  with no connection.
- **Installable on your phone's home screen**, running full-screen like
  a native app.
- No accounts, no tracking, no server — your notes never leave your
  device.

## Project structure

```
notionite/
├── index.html          # App shell / markup
├── manifest.json        # PWA manifest (name, icons, theme colour)
├── sw.js                 # Service worker (offline caching)
├── css/
│   └── style.css        # All styling & design tokens
├── js/
│   └── app.js            # All application logic
├── icons/                # Generated app icons (192/512/maskable/apple)
└── README.md
```

## Running it locally

Because it uses a service worker, it needs to be served over `http(s)`
(not opened directly as a `file://` URL). Any static file server works:

```bash
cd notionite
python3 -m http.server 8080
# then open http://localhost:8080 in your browser
```

or with Node:

```bash
npx serve .
```

## Deploying to GitHub Pages

1. Create a new GitHub repository and push this folder's contents to it
   (the repo root should contain `index.html`).

   ```bash
   git init
   git add .
   git commit -m "Marginalia: vivid note-taking PWA"
   git branch -M main
   git remote add origin https://github.com/<your-username>/<your-repo>.git
   git push -u origin main
   ```

2. In the repository on GitHub: **Settings → Pages → Build and
   deployment → Source: "Deploy from a branch"**, branch `main`, folder
   `/ (root)`. Save.

3. GitHub will publish it at:
   `https://<your-username>.github.io/<your-repo>/`

   Open that URL — the app, offline caching, and "Add to Home Screen"
   install prompt will all work from there.

   > If your repo isn't served from the domain root, double check
   > `manifest.json`'s `start_url`/`scope` (`"./"`) still resolve
   > correctly — relative paths are used throughout so this should work
   > unmodified from any subpath.

## Installing on Android

1. Open the deployed URL in **Chrome** on your Android phone.
2. Chrome may show an **"Install app"** / **"Add to Home screen"**
   banner automatically — tap it. If it doesn't appear:
3. Tap the **⋮** menu (top right) → **Add to Home screen** → **Install**.
4. Launch it from your home screen — it opens full-screen, with its own
   icon, no browser address bar, and keeps working without a connection.

The same manifest also supports installing on desktop Chrome/Edge (via
the install icon in the address bar) and adding to the home screen on
iOS Safari (Share → Add to Home Screen — offline caching support is more
limited on iOS, but the app itself works the same).

## Using it inside Claude

You can also drop these files into a **Claude Artifact** — open
`index.html` as an HTML artifact (or paste `css/style.css` and
`js/app.js` inline) to preview and edit it directly inside a
conversation. For sharing outside Claude, GitHub Pages (above) is the
simplest path, since Artifacts don't expose a public installable URL
with offline support.

## Notes on the data model

- All notes are stored under a single `localStorage` key
  (`marginalia_v1`) as JSON — nothing is sent anywhere.
- Because it's `localStorage`, notes are per-browser/per-device. There's
  no sync between devices in this version — see "Ideas for later" below.
- Clearing your browser's site data for this page will erase your notes,
  so use **Export → Markdown** on important pages if you want a backup.

## Ideas for later

- Cross-device sync (would need a small backend or a sync service).
- Image/file blocks.
- Nested block indentation within a page.
- Page templates.

## Credits

Fonts: [Fraunces](https://fonts.google.com/specimen/Fraunces) and
[Inter](https://fonts.google.com/specimen/Inter) and
[JetBrains Mono](https://fonts.google.com/specimen/JetBrains+Mono), via
Google Fonts. Everything else is hand-built, dependency-free JS/CSS.

MIT licensed — do whatever you'd like with it.

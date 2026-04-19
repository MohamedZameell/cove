<div align="center">

# Cove

**A pirate's cove for music — streaming, synced across devices.**

[Live App](https://mohamedzameell.github.io/cove/) · [Report Bug](https://github.com/MohamedZameell/cove/issues)

![Last Commit](https://img.shields.io/github/last-commit/MohamedZameell/cove?style=flat-square)
![Repo Size](https://img.shields.io/github/repo-size/MohamedZameell/cove?style=flat-square)
![Stack](https://img.shields.io/badge/stack-vanilla%20JS%20·%20PWA%20·%20Capacitor-blueviolet?style=flat-square)

</div>

---

## Why

I wanted a music player that felt like mine — warm, no ads, no "upgrade to premium," just the music. Built for myself and two friends. One HTML file, no build step, ships via GitHub Pages.

## Features

### Playback
- Streams via JioSaavn's unofficial API (proxied through a Cloudflare Worker)
- Dual-audio **equal-power crossfade** (sin/cos curve) — no gaps between tracks
- Hardware media controls via **MediaSession** — lock screen, headphones, car audio
- Synced, scrolling lyrics
- Sleep timer with live countdown
- Shuffle (Fisher-Yates), repeat (off / all / one)

### Library
- Favorites + custom playlists
- **Supabase cloud sync** — playlists and likes follow you across devices
- Offline downloads via IndexedDB blob storage
- Recently played, search history, browse by genre

### UI / UX
- Warm luxury palette — champagne gold `#c9a55c` on midnight velvet
- Sora (display) + Plus Jakarta Sans (body)
- Full-screen now playing with dominant-color gradients (canvas extraction)
- Drag-to-reorder queue, swipe-to-remove
- PWA installable · Android APK via Capacitor
- Haptic feedback · `prefers-reduced-motion` · safe-area aware

## Tech

Single `index.html`, ~5,100 lines of inline CSS + vanilla JS. No build tools, no framework.

| Piece | Choice |
|---|---|
| API proxy | Cloudflare Worker → JioSaavn unofficial API |
| Auth | SHA-256 hashed credentials (3 users, personal-use) |
| Sync | Supabase (playlists, favorites) |
| Offline | IndexedDB blobs |
| Shell | PWA manifest + Capacitor wrapper (Android) |

## What's Done

- [x] Full JioSaavn integration — search, albums, artists, playlists, suggestions, lyrics
- [x] Supabase multi-device sync
- [x] iOS lock-screen media controls (seek buttons suppressed, ±10 s hardware keys work)
- [x] Dead-album filtering — unplayable content is blacklisted in the background
- [x] Spotify-style art cross-dissolve + equal-power crossfade
- [x] Accessibility pass — form labels, WCAG AA contrast, 44 pt touch targets, mobile press feedback

## Still Improving

- [ ] Swap Unicode glyphs for proper SVG icons
- [ ] Sanitize lyrics HTML (XSS hardening)
- [ ] Virtualize long song lists
- [ ] Harmonize scattered z-index scale
- [ ] Desktop layout polish

## Run Locally

```bash
git clone https://github.com/MohamedZameell/cove.git
cd cove
# open index.html in a browser, or serve statically:
python -m http.server 8000
```

## Structure

```
cove/
├── index.html         # the entire app (inline CSS + JS)
└── spotify_import.json
```

---

<sub>Vibe-coded with Claude Code and Codex. Designed and maintained by <a href="https://github.com/MohamedZameell">@MohamedZameell</a>.</sub>

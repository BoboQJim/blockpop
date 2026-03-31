# BlockPop Web – Match & Blast Puzzle (Ad-Free PWA Edition)

A casual puzzle game combining **block placement** and **match-3 popping** mechanics. This is the **ad-free web edition** with PWA support and SEO optimization.

## How to Play

1. **Drag** block pieces from the tray onto the 10x10 grid
2. **Tap** a piece to **rotate** it 90 degrees before placing
3. **3+ same-color** blocks connected horizontally/vertically auto-pop (flood-fill detection)
4. **Fill a full row or column** to clear it
5. Both clearing mechanics work simultaneously with chain cascades
6. Use **power-ups** when you have enough coins

## Power-ups (Coins Only)

| Power-up | Cost | Effect |
|----------|------|--------|
| Hammer | 50 coins | Remove a single cell |
| Bomb | 100 coins | Clear a 3x3 area |
| Shuffle | 80 coins | Replace current pieces with new ones |

Power-ups are purchased exclusively with coins earned through gameplay.

## Coin System

- Earn coins based on your score: `coins = score / 10`
- Coins persist across sessions (localStorage)
- Spend coins on power-ups

## PWA Support

The game can be installed as a Progressive Web App for offline play:

- Service Worker caches all game assets for offline use
- `manifest.json` enables "Add to Home Screen" on mobile and desktop
- Install button appears automatically when the browser supports PWA installation

## SEO & Web Optimization

This version includes comprehensive SEO and discoverability optimizations:

- **Meta tags**: title, description, keywords, robots directives
- **Open Graph**: og:title, og:description, og:image, og:type for social sharing
- **Twitter Cards**: summary_large_image card type
- **Structured Data**: JSON-LD WebApplication + FAQPage schema
- **Canonical URL**: prevents duplicate content issues
- **Hreflang**: multi-language link hints
- **Noscript fallback**: semantic HTML content for crawlers
- **sitemap.xml**: standard XML sitemap
- **robots.txt**: crawler directives with sitemap reference
- **PWA manifest**: installability signals for search ranking

### Before Deployment

Replace `https://yourdomain.com` with your actual domain in these files:

- `index.html` — canonical, og:url, og:image, twitter:image, hreflang links
- `sitemap.xml` — loc URL
- `robots.txt` — sitemap URL

## Deployment

### Local
```bash
npx serve .
# or
python3 -m http.server 8080
```

### Web Server (HTTPS required for PWA)
Deploy all files to your web server root. HTTPS is required for:
- Service Worker registration
- PWA installation
- Secure localStorage

## Piece Generation

Pieces are validated at generation time to ensure no piece contains 3+ same-color adjacent cells internally. This prevents pieces from auto-clearing on placement.

## Tech Stack

- Vanilla HTML5, CSS3, JavaScript (no dependencies)
- Web Audio API for procedural sound effects
- CSS glassmorphism with backdrop-filter
- localStorage for persistence
- Pointer Events API for cross-platform input
- Service Worker for offline caching
- Web App Manifest for PWA installation

## Files

```
blockpop-web/
  index.html          - Game structure, SEO meta, PWA registration
  style.css           - Visual styling and animations
  game.js             - Game engine and logic (ad-free)
  manifest.json       - PWA manifest
  sw.js               - Service Worker for offline caching
  sitemap.xml         - XML sitemap for search engines
  robots.txt          - Crawler directives
  icons/
    icon-192.png      - PWA icon 192x192
    icon-512.png      - PWA icon 512x512
    apple-touch-icon.png - Apple touch icon 180x180
    og-image.png      - Open Graph social sharing image 1200x630
  README.md           - This file
```

## Differences from Ad Version (blockpop/)

| Feature | blockpop/ (Ad Version) | blockpop-web/ (This Version) |
|---------|----------------------|------------------------------|
| Ads | GameMonetize SDK integrated | No ads |
| Power-ups | Coins or watch ad | Coins only |
| Game Over | Watch ad for +50 coins | No ad option |
| PWA | No | Yes (offline + installable) |
| SEO | Basic | Full (meta, OG, schema, sitemap) |
| Android wrapper | Yes | No (PWA replaces native wrapper) |

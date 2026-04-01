# BlockPop Web v2 – Infinite + Level Mode (Ad-Free PWA)

A casual puzzle game combining **block placement** and **match-3 popping** mechanics. Features two game modes: **Infinite** and **100-Level Challenge**.

## Game Modes

### Infinite Mode
Play endlessly and aim for the highest score. Earn coins based on your final score when the game ends.

### Level Mode (100 Levels)
Progressive challenge with unique goals per level:
- **Color goals**: Clear a specific number of blocks of certain colors
- **Score goals**: Reach a target score
- Difficulty increases gradually from Level 1 to Level 100
- Earn coin rewards for completing each level
- Levels unlock sequentially — complete one to unlock the next

## How to Play

1. **Drag** block pieces from the tray onto the 10x10 grid
2. **Tap** a piece to **rotate** it 90 degrees
3. **3+ same-color** blocks connected horizontally/vertically auto-pop
4. **Fill a full row or column** to clear it
5. Both clearing mechanics work simultaneously with chain cascades
6. Use **power-ups** when you have enough coins

## Power-ups (Coins Only)

| Power-up | Cost | Effect |
|----------|------|--------|
| Hammer | 50 coins | Remove a single cell |
| Bomb | 100 coins | Clear a 3x3 area |
| Shuffle | 80 coins | Replace current pieces |

## Coin System

- **Infinite Mode**: Earn `score / 10` coins when game ends
- **Level Mode**: Earn fixed coin reward on level completion (increases with level)
- Coins persist across sessions (localStorage)

## Deployment

Replace `https://yourdomain.com` with your actual domain in: `index.html`, `sitemap.xml`, `robots.txt`.

```bash
npx serve .
# or
python3 -m http.server 8080
```

HTTPS is required for PWA features.

## Files

```
blockpop-web-v2/
  index.html       - Game structure, SEO meta, PWA registration
  style.css        - Visual styling and animations
  game.js          - Game engine with dual-mode support
  manifest.json    - PWA manifest
  sw.js            - Service Worker (v2 cache)
  sitemap.xml      - XML sitemap
  robots.txt       - Crawler directives
  icons/           - PWA icons + OG image
  README.md        - This file
```

## Version History

| Version | Folder | Features |
|---------|--------|----------|
| v1 (Ad) | `blockpop/` | GameMonetize SDK, ad-powered power-ups |
| v1 (Web) | `blockpop-web/` | Ad-free, coins-only, PWA, SEO |
| **v2 (Web)** | **`blockpop-web-v2/`** | **+ Infinite/Level dual mode, 100 levels, improved drag** |

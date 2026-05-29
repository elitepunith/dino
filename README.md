# Dino Command Center

A bold red redesign of the original dinosaur website with preserved field-guide content, advanced front-end interactions, and a professional Node.js backend.

## Highlights

- Solid red and crimson visual system with no glassmorphism
- Interactive dinosaur timeline for Triassic, Jurassic, and Cretaceous exploration
- Advanced search and filtering by text, era, diet, size, and speed
- Side-by-side dinosaur comparison
- Quiz game with scoring
- Local Three.js-powered 3D viewer
- Dark and light mode toggle
- Favorites and bookmarks stored in localStorage
- Comments and ratings with API or local fallback storage
- JSON export and print-to-PDF workflow
- Live statistics dashboard
- Express API with JWT authentication, Helmet, rate limiting, logging, and persistent storage
- PWA manifest and service worker support

## Tech stack

- HTML
- CSS
- JavaScript
- Node.js
- Express
- Three.js
- ESLint

## Getting started

```bash
npm install
npm start
```

Open `http://localhost:3000`.

## Quality checks

```bash
npm run check
npm run lint
```

## API overview

- `GET /api/health`
- `GET /api/dinosaurs`
- `GET /api/dinosaurs/:slug`
- `GET /api/stats`
- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/me`
- `GET /api/comments?slug=theropods`
- `POST /api/comments`

## Storage

- Dinosaur catalogue data is stored in `data/dinosaurs.json`
- User accounts and comments persist in JSON files by default
- If `MONGODB_URI` is configured, authentication and comments switch to MongoDB storage automatically

## Pages

- `index.html` for the command center experience
- `dino-voices.html` for dinosaur audio
- `dino-pics.html` for the gallery

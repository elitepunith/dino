const express = require("express");
const path = require("path");
const fs = require("fs/promises");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const rateLimit = require("express-rate-limit");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const mongoose = require("mongoose");

const app = express();
const rootDir = __dirname;
const dataDir = path.join(rootDir, "data");
const catalogueFile = path.join(dataDir, "dinosaurs.json");
const usersFile = path.join(dataDir, "users.json");
const commentsFile = path.join(dataDir, "comments.json");
const jwtSecret = process.env.JWT_SECRET || "dino-dev-secret";
const port = Number(process.env.PORT || 3000);

let storageMode = "file";
let mongoStore = null;

app.disable("x-powered-by");
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors());
app.use(morgan("dev"));
app.use(express.json({ limit: "1mb" }));
app.use("/api", rateLimit({ windowMs: 15 * 60 * 1000, max: 200, standardHeaders: true, legacyHeaders: false }));
app.use(express.static(rootDir, { extensions: ["html"] }));

function slugify(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

async function ensureJsonFile(filePath, fallbackValue) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });

  try {
    await fs.access(filePath);
  } catch {
    await fs.writeFile(filePath, JSON.stringify(fallbackValue, null, 2));
  }
}

async function readJsonFile(filePath, fallbackValue) {
  await ensureJsonFile(filePath, fallbackValue);
  const raw = await fs.readFile(filePath, "utf8");

  try {
    return JSON.parse(raw);
  } catch {
    return fallbackValue;
  }
}

async function writeJsonFile(filePath, payload) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, JSON.stringify(payload, null, 2));
}

async function getCatalogue() {
  const dinosaurs = await readJsonFile(catalogueFile, []);
  return dinosaurs.map((dino) => ({
    ...dino,
    slug: dino.slug || slugify(dino.name)
  }));
}

async function getUsers() {
  return readJsonFile(usersFile, []);
}

async function saveUsers(users) {
  await writeJsonFile(usersFile, users);
}

async function getComments() {
  return readJsonFile(commentsFile, []);
}

async function saveComments(comments) {
  await writeJsonFile(commentsFile, comments);
}

async function initializeMongo() {
  if (!process.env.MONGODB_URI) {
    return;
  }

  await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 5000 });

  const userSchema = new mongoose.Schema(
    {
      username: { type: String, unique: true, required: true, trim: true },
      passwordHash: { type: String, required: true }
    },
    { timestamps: true }
  );

  const commentSchema = new mongoose.Schema(
    {
      slug: { type: String, required: true, index: true },
      author: { type: String, required: true },
      message: { type: String, required: true },
      rating: { type: Number, required: true, min: 1, max: 5 }
    },
    { timestamps: true }
  );

  mongoStore = {
    User: mongoose.models.User || mongoose.model("User", userSchema),
    Comment: mongoose.models.Comment || mongoose.model("Comment", commentSchema)
  };
  storageMode = "mongo";
}

function createToken(username) {
  return jwt.sign({ username }, jwtSecret, { expiresIn: "7d" });
}

function readTokenPayload(request) {
  const header = request.headers.authorization || "";

  if (!header.startsWith("Bearer ")) {
    return null;
  }

  try {
    return jwt.verify(header.slice(7), jwtSecret);
  } catch {
    return null;
  }
}

function requireAuth(request, response, next) {
  const payload = readTokenPayload(request);

  if (!payload) {
    response.status(401).json({ error: "Authentication required" });
    return;
  }

  request.user = payload;
  next();
}

function filterDinosaurs(dinosaurs, query) {
  const search = String(query.search || "").trim().toLowerCase();
  const era = String(query.era || "").trim().toLowerCase();
  const diet = String(query.diet || "").trim().toLowerCase();
  const size = String(query.size || "").trim().toLowerCase();
  const minSpeed = Number(query.minSpeed || 0);

  return dinosaurs.filter((dino) => {
    const matchesSearch =
      !search ||
      dino.name.toLowerCase().includes(search) ||
      dino.summary.toLowerCase().includes(search) ||
      dino.group.toLowerCase().includes(search);
    const matchesEra = !era || dino.era.toLowerCase() === era;
    const matchesDiet = !diet || dino.diet.toLowerCase() === diet;
    const matchesSize = !size || dino.size.toLowerCase() === size;
    const matchesSpeed = Number(dino.speed || 0) >= minSpeed;

    return matchesSearch && matchesEra && matchesDiet && matchesSize && matchesSpeed;
  });
}

function summarizeCatalogue(dinosaurs, comments) {
  const eraTotals = dinosaurs.reduce((accumulator, dino) => {
    accumulator[dino.era] = (accumulator[dino.era] || 0) + 1;
    return accumulator;
  }, {});
  const dietTotals = dinosaurs.reduce((accumulator, dino) => {
    accumulator[dino.diet] = (accumulator[dino.diet] || 0) + 1;
    return accumulator;
  }, {});
  const totalSpeed = dinosaurs.reduce((sum, dino) => sum + Number(dino.speed || 0), 0);
  const averageRating = comments.length
    ? comments.reduce((sum, comment) => sum + Number(comment.rating || 0), 0) / comments.length
    : 0;

  return {
    totalDinosaurs: dinosaurs.length,
    averageSpeed: dinosaurs.length ? Number((totalSpeed / dinosaurs.length).toFixed(1)) : 0,
    favoritesReady: dinosaurs.filter((dino) => dino.bookmarkable !== false).length,
    averageRating: Number(averageRating.toFixed(1)),
    commentsCount: comments.length,
    eraTotals,
    dietTotals
  };
}

app.get("/api/health", async (_request, response) => {
  const dinosaurs = await getCatalogue();
  const comments = storageMode === "mongo" ? await mongoStore.Comment.find({}).lean() : await getComments();

  response.json({
    status: "ok",
    storageMode,
    dinosaurs: dinosaurs.length,
    comments: comments.length
  });
});

app.get("/api/dinosaurs", async (request, response) => {
  const catalogue = await getCatalogue();
  const data = filterDinosaurs(catalogue, request.query);

  response.json({ data, source: storageMode });
});

app.get("/api/dinosaurs/:slug", async (request, response) => {
  const catalogue = await getCatalogue();
  const dinosaur = catalogue.find((entry) => entry.slug === request.params.slug);

  if (!dinosaur) {
    response.status(404).json({ error: "Dinosaur not found" });
    return;
  }

  response.json({ data: dinosaur, source: storageMode });
});

app.get("/api/stats", async (request, response) => {
  const catalogue = filterDinosaurs(await getCatalogue(), request.query);
  const comments = storageMode === "mongo" ? await mongoStore.Comment.find({}).lean() : await getComments();

  response.json({ data: summarizeCatalogue(catalogue, comments), source: storageMode });
});

app.post("/api/auth/register", async (request, response) => {
  const username = String(request.body.username || "").trim();
  const password = String(request.body.password || "");

  if (username.length < 3 || password.length < 6) {
    response.status(400).json({ error: "Username must be at least 3 characters and password at least 6 characters" });
    return;
  }

  const passwordHash = await bcrypt.hash(password, 10);

  if (storageMode === "mongo") {
    const existingUser = await mongoStore.User.findOne({ username }).lean();

    if (existingUser) {
      response.status(409).json({ error: "Username already exists" });
      return;
    }

    await mongoStore.User.create({ username, passwordHash });
  } else {
    const users = await getUsers();

    if (users.some((user) => user.username === username)) {
      response.status(409).json({ error: "Username already exists" });
      return;
    }

    users.push({ username, passwordHash, createdAt: new Date().toISOString() });
    await saveUsers(users);
  }

  response.status(201).json({
    token: createToken(username),
    user: { username },
    source: storageMode
  });
});

app.post("/api/auth/login", async (request, response) => {
  const username = String(request.body.username || "").trim();
  const password = String(request.body.password || "");

  let userRecord = null;

  if (storageMode === "mongo") {
    userRecord = await mongoStore.User.findOne({ username }).lean();
  } else {
    const users = await getUsers();
    userRecord = users.find((user) => user.username === username) || null;
  }

  if (!userRecord) {
    response.status(401).json({ error: "Invalid credentials" });
    return;
  }

  const isValid = await bcrypt.compare(password, userRecord.passwordHash);

  if (!isValid) {
    response.status(401).json({ error: "Invalid credentials" });
    return;
  }

  response.json({
    token: createToken(username),
    user: { username },
    source: storageMode
  });
});

app.get("/api/auth/me", requireAuth, (request, response) => {
  response.json({ user: { username: request.user.username }, source: storageMode });
});

app.get("/api/comments", async (request, response) => {
  const slug = String(request.query.slug || "").trim();
  const comments = storageMode === "mongo" ? await mongoStore.Comment.find({}).sort({ createdAt: -1 }).lean() : await getComments();
  const filtered = slug ? comments.filter((comment) => comment.slug === slug) : comments;

  response.json({ data: filtered, source: storageMode });
});

app.post("/api/comments", async (request, response) => {
  const payload = readTokenPayload(request);
  const slug = String(request.body.slug || "").trim();
  const message = String(request.body.message || "").trim();
  const rating = Number(request.body.rating || 0);
  const author = payload?.username || String(request.body.author || "Explorer").trim() || "Explorer";

  if (!slug || !message || rating < 1 || rating > 5) {
    response.status(400).json({ error: "Slug, message, and a rating from 1 to 5 are required" });
    return;
  }

  const catalogue = await getCatalogue();

  if (!catalogue.some((entry) => entry.slug === slug)) {
    response.status(404).json({ error: "Dinosaur not found" });
    return;
  }

  const entry = {
    slug,
    author,
    message,
    rating,
    createdAt: new Date().toISOString()
  };

  if (storageMode === "mongo") {
    const saved = await mongoStore.Comment.create(entry);
    response.status(201).json({ data: saved.toObject(), source: storageMode });
    return;
  }

  const comments = await getComments();
  comments.unshift(entry);
  await saveComments(comments);
  response.status(201).json({ data: entry, source: storageMode });
});

app.use("/api", (_request, response) => {
  response.status(404).json({ error: "API route not found" });
});

app.use((error, _request, response, _next) => {
  response.status(500).json({
    error: "Unexpected server error",
    detail: process.env.NODE_ENV === "production" ? undefined : error.message
  });
});

async function prepareStorage() {
  await ensureJsonFile(usersFile, []);
  await ensureJsonFile(commentsFile, []);
}

async function startServer() {
  await prepareStorage();

  try {
    await initializeMongo();
  } catch (error) {
    console.error(`MongoDB unavailable, using file storage: ${error.message}`);
  }

  app.listen(port, () => {
    console.log(`Dino server running at http://localhost:${port}`);
  });
}

if (require.main === module) {
  startServer().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}

module.exports = app;

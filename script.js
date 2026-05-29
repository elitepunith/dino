const dinoInteractions = [
  { picId: "myPic", soundId: "clickSound" },
  { picId: "mimo1", soundId: "mimo" },
  { picId: "rara", soundId: "rara1" },
  { picId: "tim", soundId: "tim1" },
  { picId: "yop", soundId: "yop1" },
  { picId: "kimo", soundId: "kimo1" },
  { picId: "ll1", soundId: "ll2" },
  { picId: "mmi1", soundId: "mmi" },
  { picId: "mme1", soundId: "mme" },
  { picId: "smm1", soundId: "smm" },
  { picId: "sm1", soundId: "sm" },
  { picId: "yy", soundId: "yy1" }
];

const timelineMeta = [
  {
    era: "Triassic",
    description: "The Triassic opened the dinosaur story with early agile pioneers and the first experiments in dinosaur body plans."
  },
  {
    era: "Jurassic",
    description: "Towering plant-eaters and iconic plated herbivores shaped the Jurassic spotlight."
  },
  {
    era: "Cretaceous",
    description: "Late-era specialists exploded in diversity, from armored tanks and horned giants to clever feathered omnivores."
  }
];

const quizQuestions = [
  {
    question: "Which dinosaur group evolved into birds?",
    options: ["Sauropods", "Theropods", "Stegosaurs", "Ankylosaurs"],
    answer: "Theropods"
  },
  {
    question: "Which group is famous for massive horns and frills?",
    options: ["Ceratopsians", "Pterosaurs", "Spinosaurids", "Marine Reptiles"],
    answer: "Ceratopsians"
  },
  {
    question: "Which dinosaur family was highly adapted to rivers and swamps?",
    options: ["Ornithopods", "Pachycephalosaurs", "Spinosaurids", "Sauropods"],
    answer: "Spinosaurids"
  },
  {
    question: "What feature made ankylosaurs biological tanks?",
    options: ["Powered flight", "Body armor and tail clubs", "Huge sails", "Hollow bones"],
    answer: "Body armor and tail clubs"
  },
  {
    question: "Which group includes duck-billed herd herbivores with crest-based calls?",
    options: ["Therizinosaurs", "Pterosaurs", "Ornithopods", "Oviraptorosaurs"],
    answer: "Ornithopods"
  }
];

class DinoApi {
  constructor() {
    this.tokenKey = "dino-api-token";
    this.localCommentKey = "dino-local-comments";
  }

  getToken() {
    return localStorage.getItem(this.tokenKey) || "";
  }

  setToken(token) {
    if (token) {
      localStorage.setItem(this.tokenKey, token);
      return;
    }

    localStorage.removeItem(this.tokenKey);
  }

  async request(url, options = {}) {
    const response = await fetch(url, {
      headers: {
        "Content-Type": "application/json",
        ...(this.getToken() ? { Authorization: "Bearer " + this.getToken() } : {}),
        ...(options.headers || {})
      },
      ...options
    });

    if (!response.ok) {
      let message = `Request failed with ${response.status}`;

      try {
        const payload = await response.json();
        message = payload.error || message;
      } catch {
        message = response.statusText || message;
      }

      throw new Error(message);
    }

    return response.json();
  }

  async fetchCatalogue(filters) {
    const searchParams = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value) {
        searchParams.set(key, value);
      }
    });

    try {
      const payload = await this.request(`/api/dinosaurs?${searchParams.toString()}`);
      return { data: payload.data, source: `API online · ${payload.source} storage` };
    } catch {
      const response = await fetch("data/dinosaurs.json");
      const data = this.filterCatalogue(await response.json(), filters);
      return { data, source: "Static fallback" };
    }
  }

  async fetchComments(slug) {
    try {
      const payload = await this.request(`/api/comments?slug=${encodeURIComponent(slug)}`);
      return { data: payload.data, source: `Reviews via ${payload.source} storage` };
    } catch {
      const data = this.getLocalComments().filter((comment) => comment.slug === slug);
      return { data, source: "Reviews stored locally" };
    }
  }

  async saveComment(entry) {
    try {
      const payload = await this.request("/api/comments", {
        method: "POST",
        body: JSON.stringify(entry)
      });
      return { data: payload.data, source: `Review posted to ${payload.source} storage` };
    } catch {
      const comments = this.getLocalComments();
      comments.unshift({
        ...entry,
        author: entry.author || "Guest explorer",
        createdAt: new Date().toISOString()
      });
      localStorage.setItem(this.localCommentKey, JSON.stringify(comments));
      return { data: comments[0], source: "Review saved locally" };
    }
  }

  async authenticate(mode, username, password) {
    const payload = await this.request(`/api/auth/${mode}`, {
      method: "POST",
      body: JSON.stringify({ username, password })
    });
    this.setToken(payload.token);
    return payload;
  }

  async getProfile() {
    return this.request("/api/auth/me");
  }

  clearSession() {
    this.setToken("");
  }

  getLocalComments() {
    try {
      return JSON.parse(localStorage.getItem(this.localCommentKey) || "[]");
    } catch {
      return [];
    }
  }

  filterCatalogue(data, filters) {
    const search = String(filters.search || "").trim().toLowerCase();
    const era = String(filters.era || "").trim().toLowerCase();
    const diet = String(filters.diet || "").trim().toLowerCase();
    const size = String(filters.size || "").trim().toLowerCase();
    const minSpeed = Number(filters.minSpeed || 0);

    return data.filter((dino) => {
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
}

class DinoQuiz {
  constructor(questions, elements) {
    this.questions = questions;
    this.elements = elements;
    this.index = 0;
    this.score = 0;
    this.render();
  }

  restart() {
    this.index = 0;
    this.score = 0;
    this.render();
  }

  answer(selection) {
    if (selection === this.questions[this.index].answer) {
      this.score += 1;
    }

    this.index += 1;
    this.render();
  }

  render() {
    const { progress, question, options } = this.elements;

    if (this.index >= this.questions.length) {
      progress.textContent = `Final score: ${this.score} / ${this.questions.length}`;
      question.textContent = this.score === this.questions.length ? "Perfect run. You know your dinosaur history." : "Quiz complete. Restart to sharpen your instincts.";
      options.innerHTML = "";
      return;
    }

    const current = this.questions[this.index];
    progress.textContent = `Question ${this.index + 1} of ${this.questions.length}`;
    question.textContent = current.question;
    options.innerHTML = current.options
      .map(
        (option) =>
          `<button class="action-button quiz-option" type="button" data-answer="${option}">${option}</button>`
      )
      .join("");
    options.querySelectorAll("button").forEach((button) => {
      button.addEventListener("click", () => this.answer(button.dataset.answer));
    });
  }
}

class DinoViewer {
  constructor(container, status) {
    this.container = container;
    this.status = status;
    this.renderer = null;
    this.scene = null;
    this.camera = null;
    this.model = null;
    this.frame = null;
    this.ready = false;
  }

  init() {
    if (this.ready) {
      return;
    }

    if (!this.container || !window.THREE) {
      if (this.status) {
        this.status.textContent = "3D viewer unavailable in this browser context";
      }
      return;
    }

    const three = window.THREE;
    const width = this.container.clientWidth || 320;
    const height = this.container.clientHeight || 280;

    this.renderer = new three.WebGLRenderer({ antialias: true });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.container.innerHTML = "";
    this.container.appendChild(this.renderer.domElement);

    this.scene = new three.Scene();
    this.scene.background = new three.Color(0x2a0b10);
    this.camera = new three.PerspectiveCamera(45, width / height, 0.1, 100);
    this.camera.position.set(0, 2.6, 8);

    const ambient = new three.AmbientLight(0xffffff, 1.2);
    const directional = new three.DirectionalLight(0xffffff, 1.8);
    directional.position.set(6, 8, 10);

    this.scene.add(ambient, directional);
    this.ready = true;
    this.animate();
    window.addEventListener("resize", () => this.resize());
  }

  resize() {
    if (!this.ready) {
      return;
    }

    const width = this.container.clientWidth || 320;
    const height = this.container.clientHeight || 280;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  animate() {
    if (!this.ready) {
      return;
    }

    this.frame = window.requestAnimationFrame(() => this.animate());

    if (this.model) {
      this.model.rotation.y += 0.01;
    }

    this.renderer.render(this.scene, this.camera);
  }

  createLimb(three, color, position, scale) {
    const limb = new three.Mesh(
      new three.BoxGeometry(scale[0], scale[1], scale[2]),
      new three.MeshStandardMaterial({ color })
    );
    limb.position.set(position[0], position[1], position[2]);
    return limb;
  }

  renderModel(dino) {
    if (!this.ready || !dino) {
      return;
    }

    const three = window.THREE;

    if (this.model) {
      this.scene.remove(this.model);
    }

    const palette = {
      Carnivore: 0xff4d64,
      Herbivore: 0xc7ff8a,
      Omnivore: 0xffd05c
    };
    const color = palette[dino.diet] || 0xffffff;
    const group = new three.Group();
    const sizeScale = {
      Small: 0.75,
      Medium: 0.95,
      Large: 1.15,
      Giant: 1.35,
      Colossal: 1.6
    }[dino.size] || 1;

    const body = new three.Mesh(
      new three.BoxGeometry(2.5 * sizeScale, 1.2 * sizeScale, 1 * sizeScale),
      new three.MeshStandardMaterial({ color })
    );
    const head = new three.Mesh(
      new three.BoxGeometry(0.9 * sizeScale, 0.7 * sizeScale, 0.7 * sizeScale),
      new three.MeshStandardMaterial({ color: 0xfde9ea })
    );
    const tail = new three.Mesh(
      new three.ConeGeometry(0.35 * sizeScale, 2.4 * sizeScale, 8),
      new three.MeshStandardMaterial({ color })
    );

    body.position.set(0, 1.3, 0);
    head.position.set(1.7 * sizeScale, 1.75 * sizeScale, 0);
    tail.position.set(-2 * sizeScale, 1.3, 0);
    tail.rotation.z = -Math.PI / 2;

    group.add(body, head, tail);
    group.add(this.createLimb(three, color, [-0.75 * sizeScale, 0.35, 0.35], [0.35, 1.2, 0.35]));
    group.add(this.createLimb(three, color, [0.55 * sizeScale, 0.35, 0.35], [0.35, 1.2, 0.35]));
    group.add(this.createLimb(three, color, [-0.75 * sizeScale, 0.35, -0.35], [0.35, 1.2, 0.35]));
    group.add(this.createLimb(three, color, [0.55 * sizeScale, 0.35, -0.35], [0.35, 1.2, 0.35]));

    if (dino.group.includes("Flying")) {
      const wingGeometry = new three.BoxGeometry(2.6 * sizeScale, 0.1, 0.9);
      const wingMaterial = new three.MeshStandardMaterial({ color: 0xffb3bf });
      const wingA = new three.Mesh(wingGeometry, wingMaterial);
      const wingB = new three.Mesh(wingGeometry, wingMaterial);
      wingA.position.set(0, 1.8, 1.3);
      wingB.position.set(0, 1.8, -1.3);
      group.add(wingA, wingB);
    }

    if (dino.slug === "spinosaurids") {
      const sail = new three.Mesh(
        new three.BoxGeometry(0.25, 2.3 * sizeScale, 2.2 * sizeScale),
        new three.MeshStandardMaterial({ color: 0xffb3bf })
      );
      sail.position.set(-0.15, 2.4, 0);
      group.add(sail);
    }

    if (dino.slug === "stegosaurs") {
      for (let index = 0; index < 5; index += 1) {
        const plate = new three.Mesh(
          new three.BoxGeometry(0.15, 0.75 + index * 0.05, 0.7),
          new three.MeshStandardMaterial({ color: 0xffd05c })
        );
        plate.position.set(-0.8 + index * 0.45, 2.2 + index * 0.03, 0);
        group.add(plate);
      }
    }

    if (dino.slug === "ankylosaurs") {
      body.scale.set(1.2, 0.9, 1.3);
    }

    if (dino.slug === "sauropods") {
      const neck = new three.Mesh(
        new three.BoxGeometry(0.5, 2.8 * sizeScale, 0.5),
        new three.MeshStandardMaterial({ color })
      );
      neck.position.set(1.2 * sizeScale, 2.4 * sizeScale, 0);
      neck.rotation.z = -0.4;
      group.add(neck);
      head.position.set(2.3 * sizeScale, 3.9 * sizeScale, 0);
    }

    this.model = group;
    this.scene.add(group);
    this.status.textContent = `${dino.name} loaded into the 3D viewer`;
  }
}

class DinoApp {
  constructor() {
    this.api = new DinoApi();
    this.catalogue = [];
    this.currentComments = [];
    this.favorites = this.readStoredArray("dino-favorites");
    this.currentUser = null;
    this.elements = {
      dataSourceBadge: document.getElementById("dataSourceBadge"),
      searchInput: document.getElementById("searchInput"),
      eraFilter: document.getElementById("eraFilter"),
      dietFilter: document.getElementById("dietFilter"),
      sizeFilter: document.getElementById("sizeFilter"),
      speedFilter: document.getElementById("speedFilter"),
      speedFilterValue: document.getElementById("speedFilterValue"),
      dinoGrid: document.getElementById("dinoGrid"),
      compareA: document.getElementById("compareA"),
      compareB: document.getElementById("compareB"),
      comparisonOutput: document.getElementById("comparisonOutput"),
      timelineRange: document.getElementById("timelineRange"),
      timelineEra: document.getElementById("timelineEra"),
      timelineDescription: document.getElementById("timelineDescription"),
      timelineSpecies: document.getElementById("timelineSpecies"),
      statsCards: document.getElementById("statsCards"),
      eraStats: document.getElementById("eraStats"),
      dietStats: document.getElementById("dietStats"),
      heroTotalDinosaurs: document.getElementById("heroTotalDinosaurs"),
      heroAverageSpeed: document.getElementById("heroAverageSpeed"),
      heroFavorites: document.getElementById("heroFavorites"),
      heroComments: document.getElementById("heroComments"),
      viewerSelect: document.getElementById("viewerSelect"),
      viewerCanvas: document.getElementById("viewerCanvas"),
      viewerStatus: document.getElementById("viewerStatus"),
      commentDinosaur: document.getElementById("commentDinosaur"),
      commentRating: document.getElementById("commentRating"),
      commentMessage: document.getElementById("commentMessage"),
      commentSummary: document.getElementById("commentSummary"),
      commentsList: document.getElementById("commentsList"),
      favoritesList: document.getElementById("favoritesList"),
      authUsername: document.getElementById("authUsername"),
      authPassword: document.getElementById("authPassword"),
      authStatus: document.getElementById("authStatus"),
      themeToggle: document.getElementById("themeToggle")
    };
    this.viewer = new DinoViewer(this.elements.viewerCanvas, this.elements.viewerStatus);
    this.quiz = new DinoQuiz(quizQuestions, {
      progress: document.getElementById("quizProgress"),
      question: document.getElementById("quizQuestion"),
      options: document.getElementById("quizOptions")
    });
  }

  async init() {
    this.applySavedTheme();
    this.registerServiceWorker();
    this.setupAudioPlayers();
    this.setupAnimations();
    this.setupGalleryLightbox();
    this.viewer.init();
    window.addEventListener("three-ready", () => {
      this.viewer.init();
      this.syncViewer();
    });
    this.setupControls();
    await this.restoreSession();
    this.decorateFieldGuide();
    this.updateTimeline(Number(this.elements.timelineRange?.value || 1), false);
    await this.loadCatalogue();
  }

  setupControls() {
    this.elements.themeToggle?.addEventListener("click", () => this.toggleTheme());

    [this.elements.searchInput, this.elements.eraFilter, this.elements.dietFilter, this.elements.sizeFilter].forEach((element) => {
      element?.addEventListener("input", () => this.loadCatalogue());
      element?.addEventListener("change", () => this.loadCatalogue());
    });

    this.elements.speedFilter?.addEventListener("input", () => {
      this.elements.speedFilterValue.textContent = `${this.elements.speedFilter.value} km/h`;
      this.loadCatalogue();
    });

    this.elements.timelineRange?.addEventListener("input", () => {
      this.updateTimeline(Number(this.elements.timelineRange.value), true);
    });

    this.elements.compareA?.addEventListener("change", () => this.renderComparison());
    this.elements.compareB?.addEventListener("change", () => this.renderComparison());
    this.elements.viewerSelect?.addEventListener("change", () => this.syncViewer());
    this.elements.commentDinosaur?.addEventListener("change", () => this.refreshComments());

    document.getElementById("exportJson")?.addEventListener("click", () => this.exportJson());
    document.getElementById("exportPdf")?.addEventListener("click", () => window.print());
    document.getElementById("quizRestart")?.addEventListener("click", () => this.quiz.restart());
    document.getElementById("registerButton")?.addEventListener("click", () => this.handleAuth("register"));
    document.getElementById("loginButton")?.addEventListener("click", () => this.handleAuth("login"));
    document.getElementById("logoutButton")?.addEventListener("click", () => this.logout());
    document.getElementById("commentForm")?.addEventListener("submit", (event) => this.handleCommentSubmit(event));
  }

  applySavedTheme() {
    const theme = localStorage.getItem("dino-theme") || "light";
    document.body.dataset.theme = theme;
    if (this.elements.themeToggle) {
      this.elements.themeToggle.textContent = theme === "dark" ? "Light mode" : "Dark mode";
      this.elements.themeToggle.setAttribute("aria-pressed", String(theme === "dark"));
    }
  }

  toggleTheme() {
    const nextTheme = document.body.dataset.theme === "dark" ? "light" : "dark";
    document.body.dataset.theme = nextTheme;
    localStorage.setItem("dino-theme", nextTheme);
    if (this.elements.themeToggle) {
      this.elements.themeToggle.textContent = nextTheme === "dark" ? "Light mode" : "Dark mode";
      this.elements.themeToggle.setAttribute("aria-pressed", String(nextTheme === "dark"));
    }
  }

  registerServiceWorker() {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("sw.js").catch(() => null);
    }
  }

  setupAudioPlayers() {
    const allAudios = document.querySelectorAll("audio");

    function stopAllAudio() {
      allAudios.forEach((audio) => {
        audio.pause();
        audio.currentTime = 0;
      });
    }

    dinoInteractions.forEach((interaction) => {
      const pic = document.getElementById(interaction.picId);
      const sound = document.getElementById(interaction.soundId);

      if (pic && sound) {
        pic.addEventListener("click", () => {
          stopAllAudio();
          sound.play().catch(() => null);
        });
      }
    });

    allAudios.forEach((audio) => {
      audio.addEventListener("play", (event) => {
        allAudios.forEach((item) => {
          if (item !== event.target) {
            item.pause();
          }
        });
      });
    });
  }

  setupAnimations() {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("visible");
          }
        });
      },
      { threshold: 0.15 }
    );

    document.querySelectorAll(".panel, .card, .voice-card, .gallery-pic").forEach((element) => {
      element.classList.add("fade-in");
      observer.observe(element);
    });
  }

  setupGalleryLightbox() {
    const galleryPics = document.querySelectorAll(".gallery-pic");

    if (!galleryPics.length) {
      return;
    }

    const overlay = document.createElement("div");
    overlay.className = "lightbox-overlay";
    const image = document.createElement("img");
    overlay.appendChild(image);
    document.body.appendChild(overlay);

    galleryPics.forEach((picture) => {
      picture.addEventListener("click", () => {
        image.src = picture.src;
        image.alt = picture.alt;
        overlay.classList.add("active");
      });
    });

    overlay.addEventListener("click", () => {
      overlay.classList.remove("active");
    });
  }

  setupFieldGuideActions(slug, container) {
    const actionRow = document.createElement("div");
    actionRow.className = "entry-actions";
    actionRow.innerHTML = `
      <div class="pill-row">
        <span class="pill">Field guide</span>
        <button type="button" class="action-button" data-action="favorite">Bookmark</button>
        <button type="button" class="secondary-link" data-action="viewer">View in 3D</button>
      </div>
    `;

    actionRow.querySelector('[data-action="favorite"]').addEventListener("click", () => this.toggleFavorite(slug));
    actionRow.querySelector('[data-action="viewer"]').addEventListener("click", () => {
      this.elements.viewerSelect.value = slug;
      this.syncViewer();
      this.scrollToViewer();
    });
    container.appendChild(actionRow);
  }

  decorateFieldGuide() {
    document.querySelectorAll(".dino-entry").forEach((entry) => {
      if (entry.querySelector(".entry-actions")) {
        return;
      }

      this.setupFieldGuideActions(entry.dataset.slug, entry.querySelector(".entry-copy"));
    });
  }

  scrollToViewer() {
    document.getElementById("viewerCanvas")?.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  readStoredArray(key) {
    try {
      return JSON.parse(localStorage.getItem(key) || "[]");
    } catch {
      return [];
    }
  }

  getFilters() {
    return {
      search: this.elements.searchInput?.value.trim() || "",
      era: this.elements.eraFilter?.value || "",
      diet: this.elements.dietFilter?.value || "",
      size: this.elements.sizeFilter?.value || "",
      minSpeed: this.elements.speedFilter?.value || "0"
    };
  }

  async loadCatalogue() {
    const response = await this.api.fetchCatalogue(this.getFilters());
    this.catalogue = response.data;

    if (this.elements.dataSourceBadge) {
      this.elements.dataSourceBadge.textContent = response.source;
    }

    this.populateSelects();
    this.renderExplorerGrid();
    this.renderComparison();
    this.syncFieldGuideVisibility();
    this.syncViewer();
    this.renderFavorites();
    this.updateTimeline(Number(this.elements.timelineRange?.value || 1), false);
    await this.refreshComments();
    this.renderStatistics();
  }

  populateSelects() {
    const options = this.catalogue
      .map((dino) => `<option value="${dino.slug}">${dino.name}</option>`)
      .join("");

    [this.elements.compareA, this.elements.compareB, this.elements.viewerSelect, this.elements.commentDinosaur].forEach((select) => {
      if (!select) {
        return;
      }

      const current = select.value;
      select.innerHTML = options;
      if (this.catalogue.some((dino) => dino.slug === current)) {
        select.value = current;
      }
    });

    if (this.catalogue[0] && this.elements.compareA && !this.elements.compareA.value) {
      this.elements.compareA.value = this.catalogue[0].slug;
    }

    if (this.catalogue[1] && this.elements.compareB && !this.elements.compareB.value) {
      this.elements.compareB.value = this.catalogue[1].slug;
    }

    if (this.catalogue[0] && this.elements.viewerSelect && !this.elements.viewerSelect.value) {
      this.elements.viewerSelect.value = this.catalogue[0].slug;
    }

    if (this.catalogue[0] && this.elements.commentDinosaur && !this.elements.commentDinosaur.value) {
      this.elements.commentDinosaur.value = this.catalogue[0].slug;
    }
  }

  renderExplorerGrid() {
    if (!this.elements.dinoGrid) {
      return;
    }

    if (!this.catalogue.length) {
      this.elements.dinoGrid.innerHTML = '<p class="status-text">No dinosaurs match the current filter set.</p>';
      return;
    }

    this.elements.dinoGrid.innerHTML = this.catalogue
      .map((dino) => {
        const favorite = this.favorites.includes(dino.slug);
        return `
          <article class="dino-card">
            <img src="${dino.image}" alt="${dino.name}">
            <header>
              <h3>${dino.name}</h3>
              <p>${dino.summary}</p>
            </header>
            <div class="pill-row">
              <span class="pill">${dino.era}</span>
              <span class="pill">${dino.diet}</span>
              <span class="pill">${dino.size}</span>
              <span class="pill">${dino.speed} km/h</span>
            </div>
            <div class="button-row">
              <button class="action-button" type="button" data-action="favorite" data-slug="${dino.slug}">${favorite ? "Saved" : "Save favorite"}</button>
              <button class="secondary-link" type="button" data-action="viewer" data-slug="${dino.slug}">Open 3D</button>
            </div>
          </article>
        `;
      })
      .join("");

    this.elements.dinoGrid.querySelectorAll('[data-action="favorite"]').forEach((button) => {
      button.addEventListener("click", () => this.toggleFavorite(button.dataset.slug));
    });
    this.elements.dinoGrid.querySelectorAll('[data-action="viewer"]').forEach((button) => {
      button.addEventListener("click", () => {
        this.elements.viewerSelect.value = button.dataset.slug;
        this.syncViewer();
        this.scrollToViewer();
      });
    });
  }

  renderComparison() {
    const first = this.catalogue.find((dino) => dino.slug === this.elements.compareA?.value);
    const second = this.catalogue.find((dino) => dino.slug === this.elements.compareB?.value);

    if (!first || !second || !this.elements.comparisonOutput) {
      return;
    }

    const rows = [
      ["Era", first.era, second.era],
      ["Diet", first.diet, second.diet],
      ["Size", first.size, second.size],
      ["Speed", `${first.speed} km/h`, `${second.speed} km/h`],
      ["Length", `${first.length} m`, `${second.length} m`],
      ["Weight", `${first.weight} kg`, `${second.weight} kg`],
      ["Defense", first.defense, second.defense],
      ["Habitat", first.habitat, second.habitat]
    ];

    this.elements.comparisonOutput.innerHTML = `
      <table class="comparison-table">
        <thead>
          <tr>
            <th>Metric</th>
            <th>${first.name}</th>
            <th>${second.name}</th>
          </tr>
        </thead>
        <tbody>
          ${rows
            .map(
              ([label, valueA, valueB]) => `
                <tr>
                  <th scope="row">${label}</th>
                  <td>${valueA}</td>
                  <td>${valueB}</td>
                </tr>
              `
            )
            .join("")}
        </tbody>
      </table>
    `;
  }

  updateTimeline(index, syncFilter) {
    const stage = timelineMeta[index] || timelineMeta[0];

    if (this.elements.timelineEra) {
      this.elements.timelineEra.textContent = stage.era;
    }

    if (this.elements.timelineDescription) {
      this.elements.timelineDescription.textContent = stage.description;
    }

    const species = this.catalogue.filter((dino) => dino.era === stage.era);
    if (this.elements.timelineSpecies) {
      this.elements.timelineSpecies.innerHTML = species.length
        ? species.map((dino) => `<span class="chip">${dino.name}</span>`).join("")
        : '<span class="chip">No species available in the current filter set</span>';
    }

    if (syncFilter && this.elements.eraFilter) {
      this.elements.eraFilter.value = stage.era;
      this.loadCatalogue();
    }
  }

  syncViewer() {
    const dino = this.catalogue.find((entry) => entry.slug === this.elements.viewerSelect?.value) || this.catalogue[0];
    if (dino) {
      this.viewer.renderModel(dino);
    }
  }

  toggleFavorite(slug) {
    if (this.favorites.includes(slug)) {
      this.favorites = this.favorites.filter((item) => item !== slug);
    } else {
      this.favorites = [...this.favorites, slug];
    }

    localStorage.setItem("dino-favorites", JSON.stringify(this.favorites));
    this.renderExplorerGrid();
    this.renderFavorites();
    this.renderStatistics();
  }

  renderFavorites() {
    if (!this.elements.favoritesList) {
      return;
    }

    const favorites = this.favorites
      .map((slug) => this.catalogue.find((dino) => dino.slug === slug))
      .filter(Boolean);

    if (!favorites.length) {
      this.elements.favoritesList.innerHTML = '<p class="status-text">No favorites yet. Save dinosaurs from the explorer or field guide.</p>';
      return;
    }

    this.elements.favoritesList.innerHTML = favorites
      .map(
        (dino) => `
          <article class="favorite-item">
            <strong>${dino.name}</strong>
            <p>${dino.summary}</p>
            <div class="pill-row">
              <span class="pill">${dino.era}</span>
              <span class="pill">${dino.diet}</span>
            </div>
          </article>
        `
      )
      .join("");
  }

  syncFieldGuideVisibility() {
    const visible = new Set(this.catalogue.map((dino) => dino.slug));
    document.querySelectorAll(".dino-entry").forEach((entry) => {
      entry.classList.toggle("hidden", !visible.has(entry.dataset.slug));
    });
  }

  computeStatistics() {
    const totalSpeed = this.catalogue.reduce((sum, dino) => sum + Number(dino.speed || 0), 0);
    const eraTotals = this.catalogue.reduce((accumulator, dino) => {
      accumulator[dino.era] = (accumulator[dino.era] || 0) + 1;
      return accumulator;
    }, {});
    const dietTotals = this.catalogue.reduce((accumulator, dino) => {
      accumulator[dino.diet] = (accumulator[dino.diet] || 0) + 1;
      return accumulator;
    }, {});
    const averageRating = this.currentComments.length
      ? this.currentComments.reduce((sum, comment) => sum + Number(comment.rating || 0), 0) / this.currentComments.length
      : 0;

    return {
      totalDinosaurs: this.catalogue.length,
      averageSpeed: this.catalogue.length ? (totalSpeed / this.catalogue.length).toFixed(1) : "0.0",
      favorites: this.favorites.length,
      comments: this.currentComments.length,
      averageRating: averageRating.toFixed(1),
      eraTotals,
      dietTotals
    };
  }

  renderStatistics() {
    const stats = this.computeStatistics();

    if (this.elements.statsCards) {
      this.elements.statsCards.innerHTML = `
        <article class="stat-card"><strong>${stats.totalDinosaurs}</strong><div>Visible groups</div></article>
        <article class="stat-card"><strong>${stats.averageSpeed} km/h</strong><div>Average speed</div></article>
        <article class="stat-card"><strong>${stats.favorites}</strong><div>Saved favorites</div></article>
        <article class="stat-card"><strong>${stats.averageRating}</strong><div>Average rating</div></article>
      `;
    }

    this.renderBarChart(this.elements.eraStats, stats.eraTotals);
    this.renderBarChart(this.elements.dietStats, stats.dietTotals);

    if (this.elements.heroTotalDinosaurs) {
      this.elements.heroTotalDinosaurs.textContent = String(stats.totalDinosaurs);
    }

    if (this.elements.heroAverageSpeed) {
      this.elements.heroAverageSpeed.textContent = `${stats.averageSpeed} km/h`;
    }

    if (this.elements.heroFavorites) {
      this.elements.heroFavorites.textContent = String(stats.favorites);
    }

    if (this.elements.heroComments) {
      this.elements.heroComments.textContent = String(stats.comments);
    }
  }

  renderBarChart(container, totals) {
    if (!container) {
      return;
    }

    const values = Object.values(totals);
    const max = values.length ? Math.max(...values) : 1;

    container.innerHTML = Object.entries(totals)
      .map(
        ([label, total]) => `
          <div class="bar-row">
            <strong>${label} · ${total}</strong>
            <div class="bar-track">
              <div class="bar-fill" style="width: ${(total / max) * 100}%"></div>
            </div>
          </div>
        `
      )
      .join("");
  }

  async handleAuth(mode) {
    const username = this.elements.authUsername?.value.trim() || "";
    const password = this.elements.authPassword?.value || "";

    if (!username || !password) {
      this.setAuthStatus("Enter a username and password first");
      return;
    }

    try {
      const payload = await this.api.authenticate(mode, username, password);
      this.currentUser = payload.user;
      this.setAuthStatus(`${mode === "register" ? "Registered" : "Logged in"} as ${payload.user.username}`);
    } catch (error) {
      this.setAuthStatus(error.message);
    }
  }

  async restoreSession() {
    if (!this.api.getToken()) {
      this.setAuthStatus("Guest mode enabled");
      return;
    }

    try {
      const payload = await this.api.getProfile();
      this.currentUser = payload.user;
      this.setAuthStatus(`Signed in as ${payload.user.username}`);
    } catch {
      this.api.clearSession();
      this.currentUser = null;
      this.setAuthStatus("Guest mode enabled");
    }
  }

  logout() {
    this.api.clearSession();
    this.currentUser = null;
    this.setAuthStatus("Guest mode enabled");
  }

  setAuthStatus(message) {
    if (this.elements.authStatus) {
      this.elements.authStatus.textContent = message;
    }
  }

  async refreshComments() {
    const slug = this.elements.commentDinosaur?.value || this.catalogue[0]?.slug;

    if (!slug) {
      return;
    }

    const payload = await this.api.fetchComments(slug);
    this.currentComments = payload.data;

    const averageRating = this.currentComments.length
      ? (this.currentComments.reduce((sum, comment) => sum + Number(comment.rating), 0) / this.currentComments.length).toFixed(1)
      : "0.0";

    if (this.elements.commentSummary) {
      this.elements.commentSummary.textContent = `${payload.source} · ${this.currentComments.length} reviews · ${averageRating} average`;
    }

    if (this.elements.commentsList) {
      this.elements.commentsList.innerHTML = this.currentComments.length
        ? this.currentComments
            .map(
              (comment) => `
                <article class="comment-item">
                  <strong>${comment.author || "Guest explorer"} · ${"★".repeat(Number(comment.rating || 0))}</strong>
                  <p>${comment.message}</p>
                  <span class="status-text">${new Date(comment.createdAt || Date.now()).toLocaleString()}</span>
                </article>
              `
            )
            .join("")
        : '<p class="status-text">No reviews yet for this dinosaur. Be the first to add one.</p>';
    }

    this.renderStatistics();
  }

  async handleCommentSubmit(event) {
    event.preventDefault();

    const slug = this.elements.commentDinosaur?.value || "";
    const rating = Number(this.elements.commentRating?.value || 5);
    const message = this.elements.commentMessage?.value.trim() || "";

    if (!slug || !message) {
      this.elements.commentSummary.textContent = "Choose a dinosaur and enter a comment before posting";
      return;
    }

    const payload = await this.api.saveComment({
      slug,
      rating,
      message,
      author: this.currentUser?.username || "Guest explorer"
    });

    if (this.elements.commentMessage) {
      this.elements.commentMessage.value = "";
    }

    this.elements.commentSummary.textContent = payload.source;
    await this.refreshComments();
  }

  exportJson() {
    const payload = JSON.stringify(this.catalogue, null, 2);
    const blob = new Blob([payload], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "dino-command-center.json";
    link.click();
    URL.revokeObjectURL(url);
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const app = new DinoApp();
  app.init().catch((error) => {
    const badge = document.getElementById("dataSourceBadge");
    if (badge) {
      badge.textContent = error.message;
    }
  });
});

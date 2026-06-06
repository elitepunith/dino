const dinoInteractions = [
  { picId: 'myPic', soundId: 'clickSound' },
  { picId: 'mimo1', soundId: 'mimo' },
  { picId: 'rara', soundId: 'rara1' },
  { picId: 'tim', soundId: 'tim1' },
  { picId: 'yop', soundId: 'yop1' },
  { picId: 'kimo', soundId: 'kimo1' },
  { picId: 'll1', soundId: 'll2' },
  { picId: 'mmi1', soundId: 'mmi' },
  { picId: 'mme1', soundId: 'mme' },
  { picId: 'smm1', soundId: 'smm' },
  { picId: 'sm1', soundId: 'sm' },
  { picId: 'yy', soundId: 'yy1' }
];

const allAudios = document.querySelectorAll('audio');

function stopAllAudio() {
    allAudios.forEach(audio => {
        audio.pause();
        audio.currentTime = 0;
    });
}

dinoInteractions.forEach(interaction => {
  const pic = document.getElementById(interaction.picId);
  const sound = document.getElementById(interaction.soundId);

  if (pic && sound) {
    pic.addEventListener('click', () => {
      stopAllAudio();
      sound.play();
    });
  }
});

allAudios.forEach(audio => {
    audio.addEventListener('play', (e) => {
        allAudios.forEach(a => {
            if (a !== e.target) {
                a.pause();
            }
        });
    });
});

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('visible');
        }
    });
}, { threshold: 0.15 });

document.querySelectorAll('.card, .voice-card, .gallery-pic').forEach(el => {
    el.classList.add('fade-in');
    observer.observe(el);
});

const galleryPics = document.querySelectorAll('.gallery-pic');

if (galleryPics.length > 0) {
    const overlay = document.createElement('div');
    overlay.className = 'lightbox-overlay';
    
    const img = document.createElement('img');
    overlay.appendChild(img);
    document.body.appendChild(overlay);

    galleryPics.forEach(pic => {
        pic.addEventListener('click', () => {
            img.src = pic.src;
            overlay.classList.add('active');
        });
    });

    overlay.addEventListener('click', () => {
        overlay.classList.remove('active');
    });
}

/* ============================================================
   NEW FEATURES — added without changing original code above
   ============================================================ */

// --- Dark Mode Toggle ---
(function () {
    const btn = document.createElement('button');
    btn.id = 'dark-toggle';
    btn.setAttribute('aria-label', 'Toggle dark mode');
    btn.title = 'Toggle dark mode';
    btn.innerHTML = '🌙';
    document.body.appendChild(btn);

    const stored = localStorage.getItem('dino-dark');
    if (stored === '1') {
        document.body.classList.add('dark-mode');
        btn.innerHTML = '☀️';
    }

    btn.addEventListener('click', () => {
        const isDark = document.body.classList.toggle('dark-mode');
        btn.innerHTML = isDark ? '☀️' : '🌙';
        localStorage.setItem('dino-dark', isDark ? '1' : '0');
    });
})();

// --- Scroll Progress Bar ---
(function () {
    const bar = document.createElement('div');
    bar.id = 'progress-bar';
    document.body.prepend(bar);

    window.addEventListener('scroll', () => {
        const scrolled = window.scrollY;
        const total = document.documentElement.scrollHeight - window.innerHeight;
        bar.style.width = (total > 0 ? (scrolled / total) * 100 : 0) + '%';
    }, { passive: true });
})();

// --- Back to Top Button ---
(function () {
    const btn = document.createElement('button');
    btn.id = 'back-top';
    btn.setAttribute('aria-label', 'Back to top');
    btn.title = 'Back to top';
    btn.innerHTML = '↑';
    document.body.appendChild(btn);

    window.addEventListener('scroll', () => {
        btn.classList.toggle('show', window.scrollY > 400);
    }, { passive: true });

    btn.addEventListener('click', () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });
})();

// --- Dino Search / Filter (index.html only) ---
(function () {
    const entries = document.querySelectorAll('.dino-entry');
    if (entries.length === 0) return;

    const wrap = document.createElement('div');
    wrap.className = 'search-wrap';
    wrap.innerHTML = `
        <input type="search" id="dino-search" placeholder="Search dinosaurs…" autocomplete="off" spellcheck="false">
        <span class="search-icon">🔍</span>`;

    const noMsg = document.createElement('p');
    noMsg.className = 'no-results-msg';
    noMsg.textContent = 'No dinosaurs match your search.';

    const titleEl = document.querySelector('.title-center');
    if (titleEl) {
        titleEl.after(wrap);
        wrap.after(noMsg);
    }

    document.getElementById('dino-search').addEventListener('input', function () {
        const q = this.value.trim().toLowerCase();
        let visible = 0;
        entries.forEach(card => {
            const text = card.innerText.toLowerCase();
            const show = !q || text.includes(q);
            card.style.display = show ? '' : 'none';
            if (show) visible++;
        });
        noMsg.style.display = visible === 0 ? 'block' : 'none';
    });
})();

// --- Voice count badge (dino-voices.html only) ---
(function () {
    const container = document.querySelector('.voice-container');
    if (!container) return;
    const count = container.querySelectorAll('.voice-card').length;
    const badge = document.createElement('p');
    badge.className = 'dino-count';
    badge.textContent = count + ' dinosaur voices';
    container.before(badge);
})();
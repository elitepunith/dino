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
            observer.unobserve(entry.target);
        }
    });
}, { threshold: 0.15 });

document.querySelectorAll('.card, .voice-card, .gallery-tile').forEach(el => {
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
            img.alt = pic.alt;
            overlay.classList.add('active');
        });
    });

    overlay.addEventListener('click', () => {
        overlay.classList.remove('active');
    });
}

const surpriseButton = document.getElementById('surpriseButton');
const surpriseStatus = document.getElementById('surpriseStatus');
const dinoCards = document.querySelectorAll('.dino-entry');

if (surpriseButton && dinoCards.length > 0) {
    surpriseButton.addEventListener('click', () => {
        const randomCard = dinoCards[Math.floor(Math.random() * dinoCards.length)];
        const cardTitle = randomCard.querySelector('h3');

        randomCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
        randomCard.classList.add('surprise-highlight');
        window.setTimeout(() => randomCard.classList.remove('surprise-highlight'), 1200);

        if (surpriseStatus) {
            surpriseStatus.textContent = cardTitle
                ? `Try ${cardTitle.textContent.trim()}!`
                : 'Here is a random dinosaur group!';
        }
    });
}

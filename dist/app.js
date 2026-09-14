const gallery = document.querySelector('#gallery');
const loading = document.querySelector('#loading');
const enterButton = document.querySelector('#enterButton');
const soundButton = document.querySelector('#soundButton');
const soundLabel = document.querySelector('#soundLabel');
const audio = document.querySelector('#audio');
const lightbox = document.querySelector('#lightbox');
const lightboxImage = document.querySelector('#lightboxImage');
const lightboxName = document.querySelector('#lightboxName');
const lightboxDownload = document.querySelector('#lightboxDownload');
const lightboxClose = document.querySelector('#lightboxClose');
const downloadAll = document.querySelector('#downloadAll');

const notes = [
  'не постановочно. поэтому и красиво.',
  'та самая секунда, которую хотелось оставить.',
  'где-то между музыкой и “ещё одну фотку”.',
  'случайный кадр — любимый кадр.',
  'это точно стоило запомнить.',
  'если помнишь не всё — фотографии помогут.',
  'оставим этот момент здесь.'
];
const doodles = ['♡', '☆', 'ϟ', '☺', '♕', '♡  ♡'];
const captions = ['ламповые моменты ♡', 'на память', 'эта ночь', 'свои люди', 'оставить здесь', 'тот самый кадр'];

let content = { photos: [], music: null, zip: null };
let activePhoto = null;
let musicReady = false;

function hash(input) {
  let h = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h >>> 0);
}

function safeFilename(name) {
  return String(name || 'photo.jpg').replace(/[\\/:*?"<>|]+/g, '_');
}

async function saveFile(url, filename) {
  try {
    const response = await fetch(url, { cache: 'force-cache' });
    if (!response.ok) throw new Error('download failed');
    const blob = await response.blob();
    const href = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = href;
    a.download = safeFilename(filename);
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(href), 1500);
  } catch (error) {
    // Safari/iOS fallback: opening the original still lets the user save/share it.
    window.open(url, '_blank', 'noopener,noreferrer');
  }
}

function buildPhoto(photo, index) {
  const scene = document.createElement('article');
  const alignment = index % 7 === 3 ? 'center' : index % 2 === 0 ? 'left' : 'right';
  scene.className = `photo-scene ${alignment} reveal`;
  scene.dataset.doodle = doodles[index % doodles.length];

  const wrap = document.createElement('div');
  wrap.className = 'polaroid-wrap';
  const seed = hash(photo.name);
  const tilt = ((seed % 73) / 10 - 3.6).toFixed(1);
  const tapeTilt = (((seed >> 3) % 70) / 10 - 3.5).toFixed(1);
  wrap.style.setProperty('--tilt', `${tilt}deg`);
  wrap.style.setProperty('--tape', `${tapeTilt}deg`);

  const tape = document.createElement('span');
  tape.className = 'tape';
  tape.setAttribute('aria-hidden', 'true');

  const frame = document.createElement('div');
  frame.className = 'polaroid';

  const button = document.createElement('button');
  button.className = 'photo-button';
  button.type = 'button';
  button.setAttribute('aria-label', `Открыть ${photo.name}`);

  const img = document.createElement('img');
  img.src = photo.url;
  img.alt = '';
  img.loading = index < 2 ? 'eager' : 'lazy';
  img.decoding = 'async';
  button.append(img);

  const footer = document.createElement('div');
  footer.className = 'polaroid-footer';

  const caption = document.createElement('span');
  caption.className = 'photo-caption';
  caption.textContent = captions[index % captions.length];

  const download = document.createElement('button');
  download.className = 'photo-download';
  download.type = 'button';
  download.textContent = 'скачать ↓';
  download.setAttribute('aria-label', `Скачать оригинал ${photo.name}`);
  download.addEventListener('click', (event) => {
    event.stopPropagation();
    saveFile(photo.url, photo.name);
  });

  footer.append(caption, download);
  frame.append(button, footer);
  wrap.append(tape, frame);
  scene.append(wrap);

  if (index % 3 === 1 || index % 6 === 0) {
    const note = document.createElement('span');
    note.className = 'scene-note';
    note.textContent = notes[index % notes.length];
    scene.append(note);
  }

  button.addEventListener('click', () => openLightbox(photo));
  return scene;
}

function openLightbox(photo) {
  activePhoto = photo;
  lightboxImage.src = photo.url;
  lightboxImage.alt = photo.name;
  lightboxName.textContent = photo.name;
  lightbox.hidden = false;
  document.body.style.overflow = 'hidden';
}

function closeLightbox() {
  lightbox.hidden = true;
  lightboxImage.src = '';
  activePhoto = null;
  document.body.style.overflow = '';
}

async function loadContent() {
  try {
    const response = await fetch('/content.json', { cache: 'no-store' });
    if (!response.ok) throw new Error('content');
    content = await response.json();
    loading.remove();

    if (content.zip) {
      downloadAll.href = content.zip;
      downloadAll.hidden = false;
    }

    if (!content.photos?.length) {
      gallery.innerHTML = `
        <div class="empty-card ripped-card">
          <p>Сайт уже готов. Осталось положить фотографии в <code>public/photos</code> и заново опубликовать.</p>
        </div>`;
      return;
    }

    const fragment = document.createDocumentFragment();
    content.photos.forEach((photo, index) => fragment.append(buildPhoto(photo, index)));
    gallery.append(fragment);
    observeReveals();
  } catch (error) {
    loading.innerHTML = '<p>не получилось открыть коробку с фотографиями.</p>';
  }
}

function prepareMusic() {
  if (musicReady) return true;
  if (!content.music?.url) {
    soundLabel.textContent = 'без музыки';
    return false;
  }
  audio.src = content.music.url;
  audio.volume = 0;
  musicReady = true;
  return true;
}

async function fadeInMusic() {
  if (!prepareMusic()) return;
  try {
    await audio.play();
    soundButton.classList.add('playing');
    soundLabel.textContent = 'пауза';
    const start = performance.now();
    const duration = 1600;
    const tick = (now) => {
      const t = Math.min(1, (now - start) / duration);
      audio.volume = Math.min(.68, t * .68);
      if (t < 1 && !audio.paused) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  } catch (error) {
    soundLabel.textContent = 'включить';
  }
}

enterButton.addEventListener('click', () => {
  fadeInMusic();
  document.querySelector('#memoryStart').scrollIntoView({ behavior: 'smooth', block: 'center' });
});

soundButton.addEventListener('click', async () => {
  if (!musicReady && !prepareMusic()) return;
  if (audio.paused) {
    try {
      await audio.play();
      if (audio.volume === 0) audio.volume = .68;
      soundButton.classList.add('playing');
      soundLabel.textContent = 'пауза';
    } catch (error) {
      soundLabel.textContent = 'включить';
    }
  } else {
    audio.pause();
    soundButton.classList.remove('playing');
    soundLabel.textContent = 'включить';
  }
});

lightboxDownload.addEventListener('click', () => {
  if (activePhoto) saveFile(activePhoto.url, activePhoto.name);
});
lightboxClose.addEventListener('click', closeLightbox);
lightbox.addEventListener('click', (event) => {
  if (event.target === lightbox) closeLightbox();
});
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && !lightbox.hidden) closeLightbox();
});

function observeReveals() {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      }
    });
  }, { rootMargin: '0px 0px -8% 0px', threshold: .07 });
  document.querySelectorAll('.reveal').forEach((el) => observer.observe(el));
}

loadContent();

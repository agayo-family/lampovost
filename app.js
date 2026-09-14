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

const notes = [
  'не постановочно. поэтому и красиво.',
  'ещё один кадр, который нельзя было потерять.',
  'где-то между музыкой и утром.',
  'та самая секунда.',
  'оставим это здесь.',
  'чтобы потом вспомнить.',
  'мы правда были здесь.'
];

let musicReady = false;
let wantsMusic = false;

function hash(input) {
  let h = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h >>> 0);
}

function downloadUrl(path) {
  return `/api/download?path=${encodeURIComponent(path)}`;
}

function buildPhoto(photo, index) {
  const scene = document.createElement('article');
  const alignment = index % 6 === 2 ? 'center' : index % 2 === 0 ? 'left' : 'right';
  scene.className = `photo-scene ${alignment} reveal`;

  const frame = document.createElement('div');
  frame.className = 'polaroid';
  const tilt = ((hash(photo.name) % 75) / 10 - 3.7).toFixed(1);
  frame.style.setProperty('--tilt', `${tilt}deg`);

  const button = document.createElement('button');
  button.className = 'photo-button';
  button.type = 'button';
  button.setAttribute('aria-label', `Открыть ${photo.name}`);

  const img = document.createElement('img');
  img.src = photo.preview;
  img.alt = '';
  img.loading = index < 2 ? 'eager' : 'lazy';
  img.decoding = 'async';
  button.append(img);

  const footer = document.createElement('div');
  footer.className = 'polaroid-footer';

  const caption = document.createElement('span');
  caption.className = 'photo-caption';
  caption.textContent = index % 3 === 0 ? 'на память' : index % 3 === 1 ? 'эта ночь' : 'оставить здесь';

  const download = document.createElement('a');
  download.className = 'photo-download';
  download.href = downloadUrl(photo.path);
  download.textContent = 'скачать ↓';
  download.setAttribute('aria-label', `Скачать оригинал ${photo.name}`);

  footer.append(caption, download);
  frame.append(button, footer);
  scene.append(frame);

  if (index % 3 === 1 || index % 7 === 0) {
    const note = document.createElement('span');
    note.className = 'scene-note';
    note.textContent = notes[index % notes.length];
    scene.append(note);
  }

  button.addEventListener('click', () => openLightbox(photo));
  return scene;
}

function openLightbox(photo) {
  lightboxImage.src = photo.preview;
  lightboxImage.alt = photo.name;
  lightboxName.textContent = photo.name;
  lightboxDownload.href = downloadUrl(photo.path);
  lightbox.hidden = false;
  document.body.style.overflow = 'hidden';
}

function closeLightbox() {
  lightbox.hidden = true;
  lightboxImage.src = '';
  document.body.style.overflow = '';
}

async function loadPhotos() {
  try {
    const response = await fetch('/api/photos');
    if (!response.ok) throw new Error('photos');
    const data = await response.json();
    loading.remove();

    if (!data.photos?.length) {
      gallery.innerHTML = '<div class="loading"><p>в папке пока не нашлось фотографий.</p></div>';
      return;
    }

    const fragment = document.createDocumentFragment();
    data.photos.forEach((photo, index) => fragment.append(buildPhoto(photo, index)));
    gallery.append(fragment);
    observeReveals();
  } catch (error) {
    loading.innerHTML = '<p>не получилось загрузить фотографии. попробуй обновить страницу чуть позже.</p>';
  }
}

async function prepareMusic() {
  if (musicReady) return true;
  try {
    const response = await fetch('/api/audio');
    if (!response.ok) throw new Error('no audio');
    const data = await response.json();
    audio.src = data.href;
    audio.volume = 0;
    musicReady = true;
    return true;
  } catch (error) {
    soundLabel.textContent = 'без музыки';
    return false;
  }
}

async function fadeInMusic() {
  wantsMusic = true;
  const ready = await prepareMusic();
  if (!ready) return;
  try {
    await audio.play();
    soundButton.classList.add('playing');
    soundLabel.textContent = 'пауза';
    const start = performance.now();
    const duration = 1800;
    const tick = (now) => {
      const t = Math.min(1, (now - start) / duration);
      audio.volume = Math.min(.72, t * .72);
      if (t < 1 && !audio.paused) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  } catch (error) {
    soundLabel.textContent = 'включить';
  }
}

enterButton.addEventListener('click', async () => {
  fadeInMusic();
  document.querySelector('.intro-note').scrollIntoView({ behavior: 'smooth', block: 'start' });
});

soundButton.addEventListener('click', async () => {
  if (!musicReady) {
    fadeInMusic();
    return;
  }
  if (audio.paused) {
    wantsMusic = true;
    await audio.play();
    if (audio.volume === 0) audio.volume = .72;
    soundButton.classList.add('playing');
    soundLabel.textContent = 'пауза';
  } else {
    wantsMusic = false;
    audio.pause();
    soundButton.classList.remove('playing');
    soundLabel.textContent = 'включить';
  }
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
  }, { rootMargin: '0px 0px -8% 0px', threshold: .08 });
  document.querySelectorAll('.reveal').forEach((el) => observer.observe(el));
}

loadPhotos();

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
  'молодость — это когда фотографий больше, чем планов.',
  'свои люди делают любой вечер теплее.',
  'тот самый кадр, который потом становится любимым.',
  'не постановочно. поэтому и настоящее.',
  'молодость не перемотать — зато можно сохранить.',
  'пусть этот момент останется здесь.',
  'мы просто были рядом. и этого уже достаточно.',
  'вечер закончился, а ощущение осталось.',
  'для будущих нас — чтобы точно не забыть.',
  'если молодость можно сфотографировать, то примерно так.',
  'случайный кадр иногда помнит больше нас.',
  'ещё одна фотография — просто на память.',
  'хорошие люди. тёплый вечер. всё на своих местах.',
  'тот возраст, когда важнее всего — быть здесь.',
  'ничего идеального. зато всё настоящее.',
  'лучшие истории редко начинаются по плану.',
  'молодость — прямо сейчас. не потом.',
  'иногда одного кадра хватает, чтобы вернуться.'
];

const captions = [
  'ламповые моменты ♡', 'на память', 'молодость в кадре', 'свои люди',
  'тот самый кадр', 'ещё одна на память', 'вечер получился ♡', 'мы были здесь',
  'всё настоящее', 'потом будем вспоминать', 'молодость — сейчас', 'лучшие люди рядом',
  'просто хорошо', 'это точно сохранить', 'не удалять ♡', 'для будущих нас',
  'всё ещё здесь', 'тот самый момент', 'сохранить обязательно', 'молодость, привет ♡'
];

const imageScribbles = ['♡', 'свои', 'вечер ♡', 'на память', 'мы здесь', 'молодость', 'улыбнись', 'не удалять'];
const doodles = ['♡', '☆', 'ϟ', '☺', '✦', '☼'];
const scratchTexts = ['ВЫ + AGAYO = ♡', 'свои люди', 'ламповость', 'молодость здесь', 'сохранить этот вечер', 'для будущих нас', 'вернуться сюда', 'это точно на память'];
const graffitiWords = ['СВОИ', 'AGAYO', 'МОЛОДОСТЬ', 'ЛАМПОВОСТЬ'];
const attachments = ['tape-top', 'tape-corners', 'pin', 'paperclip', 'tape-side', 'double-tape', 'none'];
const revealStyles = ['rise', 'from-left', 'from-right', 'soft-spin', 'pop'];

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
  } catch {
    window.open(url, '_blank', 'noopener,noreferrer');
  }
}

function createAttachment(kind, seed) {
  const fragment = document.createDocumentFragment();
  if (kind === 'none') return fragment;

  if (kind === 'pin') {
    const pin = document.createElement('span');
    pin.className = 'attachment pin';
    pin.setAttribute('aria-hidden', 'true');
    fragment.append(pin);
    return fragment;
  }

  if (kind === 'paperclip') {
    const clip = document.createElement('span');
    clip.className = 'attachment paperclip';
    clip.setAttribute('aria-hidden', 'true');
    fragment.append(clip);
    return fragment;
  }

  const count = kind === 'double-tape' || kind === 'tape-corners' ? 2 : 1;
  for (let i = 0; i < count; i += 1) {
    const tape = document.createElement('span');
    tape.className = `attachment tape-piece ${kind} tape-${i + 1}`;
    tape.setAttribute('aria-hidden', 'true');
    tape.style.setProperty('--tape-tilt', `${(((seed >> (i + 2)) % 60) / 10 - 3).toFixed(1)}deg`);
    fragment.append(tape);
  }
  return fragment;
}

function buildPhotoScene(photo, index) {
  const scene = document.createElement('article');
  const alignment = index % 6 === 2 ? 'center' : index % 2 === 0 ? 'left' : 'right';
  const reveal = revealStyles[index % revealStyles.length];
  scene.className = `photo-scene ${alignment} reveal ${reveal}`;

  const frame = document.createElement('div');
  frame.className = 'polaroid';
  const seed = hash(photo.name);
  const tilt = ((seed % 75) / 10 - 3.7).toFixed(1);
  frame.style.setProperty('--tilt', `${tilt}deg`);

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
  caption.textContent = index % 3 === 0 ? 'на память' : index % 3 === 1 ? 'этот вечер' : 'оставить здесь';

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
        <div class="empty-card ripped-card reveal rise">
          <p>Сайт готов. Добавь фотографии в <code>public/photos</code> и опубликуй заново.</p>
        </div>`;
      observeReveals();
      return;
    }

    const groups = clusterPhotos(content.photos);
    let startIndex = 0;
    const fragment = document.createDocumentFragment();
    groups.forEach((group, index) => {
      fragment.append(buildCluster(group, index, startIndex));
      startIndex += group.length;
    });
    gallery.append(fragment);
    observeReveals();
  } catch {
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
    const duration = 1800;
    const tick = (now) => {
      const t = Math.min(1, (now - start) / duration);
      audio.volume = Math.min(.68, t * .68);
      if (t < 1 && !audio.paused) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  } catch {
    soundLabel.textContent = 'включить';
  }
}

function runTypewriter(element) {
  if (!element || element.dataset.typed === 'true') return;
  const fullText = element.textContent.trim();
  if (!fullText) return;

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    element.dataset.typed = 'true';
    return;
  }

  const speed = Number(element.dataset.typeSpeed || 26);
  element.dataset.typed = 'true';
  element.setAttribute('aria-label', fullText);
  element.textContent = '';
  element.classList.add('typing');
  let index = 0;
  const timer = window.setInterval(() => {
    element.textContent += fullText[index] || '';
    index += 1;
    if (index >= fullText.length) {
      window.clearInterval(timer);
      element.classList.remove('typing');
      element.classList.add('typed');
    }
  }, speed);
}

function observeReveals() {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('visible');
      entry.target.querySelectorAll('.type-target').forEach(runTypewriter);
      if (entry.target.classList.contains('type-target')) runTypewriter(entry.target);
      observer.unobserve(entry.target);
    });
  }, { rootMargin: '0px 0px -12% 0px', threshold: .1 });

  document.querySelectorAll('.reveal:not(.visible), .type-target').forEach((el) => observer.observe(el));
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
    } catch {
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

runTypewriter(document.querySelector('.hero-kicker'));
observeReveals();
loadContent();

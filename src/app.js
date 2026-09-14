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
  'молодость выглядит примерно так.',
  'вот ради таких вечеров всё и затевалось.',
  'свои люди — самый тёплый фильтр.',
  'не постановочно. поэтому и красиво.',
  'молодость не перемотать. зато можно сохранить.',
  'тот самый вечер, который потом вспоминают случайно.',
  'мы просто были здесь. и этого достаточно.',
  'случайный кадр — любимый кадр.',
  'музыка закончится, а фотография останется.',
  'ещё одну фотку — и точно идём.',
  'если молодость можно сфотографировать — то вот она.',
  'хорошие люди. классная атмосфера. ламповость в каждом.',
  'не идеальный кадр. идеальное воспоминание.',
  'тот возраст, когда воспоминания важнее планов.',
  'вечер, который оказался больше, чем просто вечер.',
  'лучшие истории начинаются без сценария.',
  'пусть этот момент полежит здесь.',
  'молодость — это когда «ещё пять минут» превращаются в воспоминание.'
];

const captions = [
  'ламповые моменты ♡',
  'на память',
  'молодость в кадре',
  'свои люди',
  'оставить здесь',
  'тот самый кадр',
  'ещё одна на память',
  'вечер получился ♡',
  'мы были здесь',
  'ничего не менять',
  'всё настоящее',
  'потом будем вспоминать',
  'молодость — сейчас',
  'лучшие люди рядом',
  'без повтора',
  'просто хорошо',
  'это точно сохранить',
  'один вечер — сотня историй',
  'не удалять ♡',
  'для будущих нас',
  'эта фотография пахнет молодостью',
  'всё ещё здесь',
  'сохранено в избранное',
  'тот самый момент'
];

const imageScribbles = [
  '♡',
  'молодость',
  'свои',
  'wow',
  'вечер ♡',
  'не удалять',
  'улыбнись',
  'на память',
  'ещё 5 минут',
  'мы здесь'
];

const doodles = ['♡', '☆', 'ϟ', '☺', '♕', '♡  ♡', '✦', '☼'];
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
  } catch (error) {
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

function buildPolaroid(photo, globalIndex, slotIndex, clusterSize) {
  const seed = hash(photo.name);
  const wrap = document.createElement('div');
  const attachment = attachments[seed % attachments.length];
  wrap.className = `polaroid-wrap slot-${slotIndex + 1} ${attachment}`;
  wrap.style.setProperty('--tilt', `${((seed % 91) / 10 - 4.5).toFixed(1)}deg`);
  wrap.style.setProperty('--lift', `${((seed >> 4) % 19) - 9}px`);
  wrap.dataset.size = clusterSize;

  const frame = document.createElement('div');
  frame.className = 'polaroid';

  const button = document.createElement('button');
  button.className = 'photo-button';
  button.type = 'button';
  button.setAttribute('aria-label', `Открыть ${photo.name}`);

  const img = document.createElement('img');
  img.src = photo.url;
  img.alt = '';
  img.loading = globalIndex < 3 ? 'eager' : 'lazy';
  img.decoding = 'async';
  button.append(img);

  if (globalIndex % 4 === 1 || globalIndex % 7 === 0) {
    const scribble = document.createElement('span');
    scribble.className = 'photo-scribble';
    scribble.textContent = imageScribbles[seed % imageScribbles.length];
    scribble.style.setProperty('--scribble-rot', `${((seed >> 7) % 17) - 8}deg`);
    button.append(scribble);
  }

  const footer = document.createElement('div');
  footer.className = 'polaroid-footer';

  const caption = document.createElement('span');
  caption.className = 'photo-caption';
  caption.textContent = captions[seed % captions.length];

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
  wrap.append(createAttachment(attachment, seed), frame);
  button.addEventListener('click', () => openLightbox(photo));
  return wrap;
}

function clusterPhotos(photos) {
  const groups = [];
  let cursor = 0;
  let patternIndex = 0;
  const pattern = [2, 3, 2, 1, 3, 2, 3];
  while (cursor < photos.length) {
    const remaining = photos.length - cursor;
    let size = Math.min(pattern[patternIndex % pattern.length], remaining);
    if (remaining === 4) size = 2;
    groups.push(photos.slice(cursor, cursor + size));
    cursor += size;
    patternIndex += 1;
  }
  return groups;
}

function buildCluster(photos, clusterIndex, startIndex) {
  const scene = document.createElement('article');
  const layout = `layout-${(clusterIndex % 6) + 1}`;
  const reveal = revealStyles[clusterIndex % revealStyles.length];
  scene.className = `photo-cluster count-${photos.length} ${layout} reveal ${reveal}`;
  scene.dataset.doodle = doodles[clusterIndex % doodles.length];

  const pile = document.createElement('div');
  pile.className = 'photo-pile';
  photos.forEach((photo, localIndex) => {
    pile.append(buildPolaroid(photo, startIndex + localIndex, localIndex, photos.length));
  });
  scene.append(pile);

  if (clusterIndex % 2 === 0 || photos.length === 1) {
    const note = document.createElement('span');
    note.className = 'scene-note type-target';
    note.dataset.typeSpeed = String(20 + (clusterIndex % 4) * 4);
    note.textContent = notes[clusterIndex % notes.length];
    scene.append(note);
  }

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
          <p>Сайт уже готов. Осталось добавить фотографии в <code>public/photos</code> и заново опубликовать.</p>
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

function runTypewriter(element) {
  if (!element || element.dataset.typed === 'true') return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const fullText = element.textContent.trim();
  if (!fullText) return;
  const speed = Number(element.dataset.typeSpeed || 28);
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
        entry.target.querySelectorAll('.type-target').forEach(runTypewriter);
        if (entry.target.classList.contains('type-target')) runTypewriter(entry.target);
        observer.unobserve(entry.target);
      }
    });
  }, { rootMargin: '0px 0px -8% 0px', threshold: .08 });
  document.querySelectorAll('.reveal:not(.visible), .type-target').forEach((el) => observer.observe(el));
}

runTypewriter(document.querySelector('.hero-kicker'));
observeReveals();
loadContent();

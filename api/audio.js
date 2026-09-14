const { PUBLIC_KEY, API_BASE } = require('./_config');

module.exports = async (req, res) => {
  try {
    const url = new URL(API_BASE);
    url.searchParams.set('public_key', PUBLIC_KEY);
    url.searchParams.set('limit', '1000');
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Yandex Disk responded ${response.status}`);
    const data = await response.json();
    const items = data?._embedded?.items || [];

    const audioItems = items.filter((item) => {
      const name = String(item.name || '').toLowerCase();
      return item.type === 'file' && (
        item.media_type === 'audio' ||
        String(item.mime_type || '').startsWith('audio/') ||
        /\.(mp3|m4a|aac|wav|ogg)$/i.test(name)
      );
    });

    const audio = audioItems.find((item) => /лагер|lager|saluki|friendly/.test(String(item.name || '').toLowerCase())) || audioItems[0];

    if (!audio) return res.status(404).json({ error: 'Аудиофайл пока не найден в папке' });

    const dl = new URL(`${API_BASE}/download`);
    dl.searchParams.set('public_key', PUBLIC_KEY);
    dl.searchParams.set('path', audio.path);
    const dlResponse = await fetch(dl);
    if (!dlResponse.ok) throw new Error(`Yandex Disk download endpoint responded ${dlResponse.status}`);
    const dlData = await dlResponse.json();

    res.setHeader('Cache-Control', 'no-store');
    res.status(200).json({ name: audio.name, href: dlData.href });
  } catch (error) {
    res.status(502).json({ error: 'Не удалось получить аудио', details: error.message });
  }
};

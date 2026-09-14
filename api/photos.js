const { PUBLIC_KEY, API_BASE } = require('./_config');

module.exports = async (req, res) => {
  try {
    const all = [];
    const pageSize = 1000;
    let offset = 0;

    while (true) {
      const url = new URL(API_BASE);
      url.searchParams.set('public_key', PUBLIC_KEY);
      url.searchParams.set('limit', String(pageSize));
      url.searchParams.set('offset', String(offset));
      url.searchParams.set('preview_size', 'XXXL');
      url.searchParams.set('preview_crop', 'false');

      const response = await fetch(url, { headers: { 'User-Agent': 'lampovost-gallery/1.0' } });
      if (!response.ok) throw new Error(`Yandex Disk responded ${response.status}`);
      const data = await response.json();
      const items = data?._embedded?.items || [];
      all.push(...items);
      if (items.length < pageSize) break;
      offset += items.length;
      if (offset > 10000) break;
    }

    const photos = all
      .filter((item) => item.type === 'file' && (item.media_type === 'image' || String(item.mime_type || '').startsWith('image/')))
      .map((item) => ({
        name: item.name,
        path: item.path,
        preview: item.preview,
        size: item.size || null,
        modified: item.modified || null,
      }))
      .sort((a, b) => String(a.name).localeCompare(String(b.name), 'ru', { numeric: true }));

    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=3600');
    res.status(200).json({ count: photos.length, photos });
  } catch (error) {
    res.status(502).json({ error: 'Не удалось получить фотографии с Яндекс Диска', details: error.message });
  }
};

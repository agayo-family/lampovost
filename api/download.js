const { PUBLIC_KEY, API_BASE } = require('./_config');

module.exports = async (req, res) => {
  try {
    const path = typeof req.query.path === 'string' ? req.query.path : '';
    if (!path) return res.status(400).send('Не указан путь к файлу');

    const url = new URL(`${API_BASE}/download`);
    url.searchParams.set('public_key', PUBLIC_KEY);
    url.searchParams.set('path', path);

    const response = await fetch(url);
    if (!response.ok) throw new Error(`Yandex Disk responded ${response.status}`);
    const data = await response.json();
    if (!data.href) throw new Error('Yandex Disk did not return a download URL');

    res.setHeader('Cache-Control', 'no-store');
    res.redirect(302, data.href);
  } catch (error) {
    res.status(502).send(`Не удалось скачать файл: ${error.message}`);
  }
};

const https = require('https');
https.get('https://backbencherscafeteria.in/', (res) => {
  let data = '';
  res.on('data', (chunk) => data += chunk);
  res.on('end', () => {
    const matches = data.match(/<img[^>]+src="([^"]+)"/ig);
    console.log(matches ? matches.slice(0, 10).join('\n') : 'No images found');
  });
});

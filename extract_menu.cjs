const fs = require('fs');

(async () => {
  console.log('1. Getting session cookie...');
  const res1 = await fetch('https://backbencherscafeteria.in/onlineorder/orders/menu');
  let sessionCookie = '';
  const setCookie = res1.headers.get('set-cookie');
  if (setCookie) {
     const cookies = setCookie.split(',');
     cookies.forEach(c => {
         if (c.includes('CAKEPHP')) sessionCookie = c.split(';')[0];
     });
  }
  if (!sessionCookie) sessionCookie = setCookie; // fallback
  
  // Extract CSRF token
  const html1 = await res1.text();
  const csrfMatch = html1.match(/name="_csrfToken"\s+autocomplete="off"\s+value="([^"]+)"/);
  const csrf = csrfMatch ? csrfMatch[1] : '';
  console.log('CSRF:', csrf);
  console.log('Session Cookie:', sessionCookie);

  console.log('2. Submitting location form...');
  const payload = '_method=POST&_csrfToken=' + encodeURIComponent(csrf) + '&is_location=0&city=mumbai&location=all&branch=2vg3bmkh&delivery_pref=homeDelivery';
  
  const res2 = await fetch('https://backbencherscafeteria.in/onlineorder/orders/process', {
    method: 'POST',
    headers: {
      'content-type': 'application/x-www-form-urlencoded',
      'x-csrf-token': csrf,
      'cookie': sessionCookie,
      'X-Requested-With': 'XMLHttpRequest',
      'Referer': 'https://backbencherscafeteria.in/onlineorder/orders/menu',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    },
    body: payload
  });
  console.log('Process response:', await res2.text());
  
  console.log('3. Fetching real menu...');
  const res3 = await fetch('https://backbencherscafeteria.in/onlineorder/orders/menu', {
    headers: { 
        'cookie': sessionCookie,
        'Referer': 'https://backbencherscafeteria.in/onlineorder/orders/menu',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    }
  });
  const html3 = await res3.text();
  fs.writeFileSync('menu_real.html', html3);
  console.log('Saved real menu: ' + html3.length + ' bytes');
})();

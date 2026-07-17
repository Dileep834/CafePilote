import fetch from 'node-fetch';
import fs from 'fs';

(async () => {
  console.log('1. Getting session cookie...');
  const res1 = await fetch('https://backbencherscafeteria.in/onlineorder/orders/menu');
  const cookies = res1.headers.raw()['set-cookie'] || [];
  let sessionCookie = '';
  cookies.forEach(c => { if (c.includes('CAKEPHP')) sessionCookie = c.split(';')[0]; });
  
  // Extract CSRF token
  const html1 = await res1.text();
  const csrfMatch = html1.match(/name="_csrfToken"\s+autocomplete="off"\s+value="([^"]+)"/);
  const csrf = csrfMatch ? csrfMatch[1] : '4268c86dfe51089a658709179d3639dbb42acfccf3e60e4bedfb327c1f10bd9492f6ff32384f38fdda70726415be2bc5415abbf729cd7f6be362e0a5606a1e3d';
  console.log('CSRF:', csrf);

  console.log('2. Submitting location form...');
  const res2 = await fetch('https://backbencherscafeteria.in/onlineorder/orders/process', {
    method: 'POST',
    headers: {
      'content-type': 'application/x-www-form-urlencoded',
      'x-csrf-token': csrf,
      'cookie': sessionCookie
    },
    body: 'is_location=0&city=mumbai&location=all&branch=2vg3bmkh&delivery_pref=homeDelivery&_method=POST'
  });
  console.log('Process response:', await res2.text());
  
  console.log('3. Fetching real menu...');
  const res3 = await fetch('https://backbencherscafeteria.in/onlineorder/orders/menu', {
    headers: { 'cookie': sessionCookie }
  });
  const html3 = await res3.text();
  fs.writeFileSync('menu_real.html', html3);
  console.log('Saved real menu: ' + html3.length + ' bytes');
})();

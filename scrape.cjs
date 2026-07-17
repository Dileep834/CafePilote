const puppeteer = require('puppeteer');
const fs = require('fs');

(async () => {
  console.log('Starting puppeteer...');
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  
  // Set viewport
  await page.setViewport({ width: 1280, height: 800 });

  // Go to the menu URL
  console.log('Navigating to menu...');
  await page.goto('https://backbencherscafeteria.in/onlineorder/orders/menu', { waitUntil: 'networkidle2' });

  // Check if there is a location modal and click it if it exists
  try {
    const modal = await page.$('.modal-dialog');
    if (modal) {
      console.log('Location modal detected. Attempting to select location...');
      // Try to find the location card or button and click it
      await page.evaluate(() => {
        const locationButtons = document.querySelectorAll('.restaurant-card, .btn-primary, .order-now-btn, a[href*="menu"]');
        if (locationButtons.length > 0) {
          locationButtons[0].click();
        }
      });
      await page.waitForTimeout(3000);
    }
  } catch (e) {
    console.log('No location modal blocking, or failed to bypass:', e.message);
  }

  console.log('Extracting menu data...');
  // Scrape categories and items
  const menuData = await page.evaluate(() => {
    const categories = [];
    // Petpooja typical structure
    document.querySelectorAll('.category-section, .cat-section, section.category').forEach(catEl => {
      const catName = catEl.querySelector('.category-name, h2, h3, .cat-title')?.innerText?.trim();
      if (!catName) return;

      const items = [];
      catEl.querySelectorAll('.item-card, .product-card, .menu-item').forEach(itemEl => {
        const itemName = itemEl.querySelector('.item-name, .product-title, h4')?.innerText?.trim();
        const priceStr = itemEl.querySelector('.item-price, .price')?.innerText?.trim() || '0';
        const price = parseFloat(priceStr.replace(/[^0-9.]/g, ''));
        
        if (itemName) {
          items.push({ name: itemName, price: price });
        }
      });
      
      if (items.length > 0) {
        categories.push({ category: catName, items: items });
      }
    });
    
    // Alternative scraping if above structure fails (based on screenshot)
    if (categories.length === 0) {
      // Look for side nav
      const sideNav = document.querySelectorAll('.nav-link, .category-list li');
      const sideNavNames = Array.from(sideNav).map(el => el.innerText.trim()).filter(Boolean);
      
      // Look for item cards in the main area
      // In the screenshot, there are blocks with green veg icons, titles, and "Add" buttons
      const itemBlocks = document.querySelectorAll('.card, .item_block, .menu-item-row');
      const items = [];
      itemBlocks.forEach(el => {
         const txt = el.innerText;
         if (txt.includes('Add') || txt.includes('Rs')) {
            const lines = txt.split('\n').map(l => l.trim()).filter(Boolean);
            if (lines.length >= 2) {
               items.push({ text: lines });
            }
         }
      });
      return { rawCategories: sideNavNames, rawItems: items, type: 'raw' };
    }

    return { data: categories, type: 'structured' };
  });

  console.log('Menu Data Extracted:', JSON.stringify(menuData, null, 2));
  fs.writeFileSync('menu_data.json', JSON.stringify(menuData, null, 2));
  
  await browser.close();
  console.log('Done.');
})();

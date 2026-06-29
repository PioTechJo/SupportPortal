const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  const page = await browser.newPage();
  
  page.on('console', msg => {
    console.log('BROWSER CONSOLE:', msg.text());
  });

  await page.goto('http://localhost:3000/login');
  
  // Wait for login fields
  await page.waitForSelector('input[type="email"]');
  await page.type('input[type="email"]', 'haitham.m.n@gmail.com');
  await page.type('input[type="password"]', 'password'); // or whatever
  
  await page.click('button[type="submit"]');
  
  // Wait for navigation
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  await browser.close();
})();

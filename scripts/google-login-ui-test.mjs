import assert from 'node:assert/strict';
import { chromium } from '@playwright/test';
const browser=await chromium.launch({channel:process.env.PLAYWRIGHT_CHANNEL || (process.platform==='win32'?'msedge':undefined),headless:true});
const page=await browser.newPage();
page.setDefaultTimeout(15000);
let submitted;
try {
  await page.route('**/api/auth/google/config',route=>route.fulfill({json:{enabled:true,clientId:'browser-test.apps.googleusercontent.com',nonce:'browser-nonce',challenge:'browser-challenge'}}));
  await page.route('https://accounts.google.com/gsi/client',route=>route.fulfill({contentType:'application/javascript',body:`window.google={accounts:{id:{initialize(options){this.options=options},renderButton(host){const button=document.createElement('button');button.textContent='Continue with Google';button.onclick=()=>this.options.callback({credential:'browser-fixture-token'});host.appendChild(button)},disableAutoSelect(){}}}};`}));
  await page.route('**/api/auth/google',route=>{
    submitted=route.request().postDataJSON();
    return route.fulfill({json:{ok:true,session:{token:'fixture-session-token',expiresAt:Date.now()+3600000,user:{id:'browser-google-user',name:'Google Tester',email:'browser@gmail.com',role:'traveler',createdAt:new Date().toISOString(),preferences:{preferredCurrency:'USD',travelStyle:'Culture',emailNotifications:true,smsAlerts:false}}}}});
  });
  await page.goto(`${process.env.VOYANA_URL || 'http://localhost:5173'}/#/login`);
  await page.getByRole('button',{name:'Continue with Google',exact:true}).click();
  await page.getByRole('button',{name:'Sign out',exact:true}).waitFor();
  assert.deepEqual(submitted,{credential:'browser-fixture-token',challenge:'browser-challenge'});
  assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('voyana.active_session')).user.role),'traveler');
  await page.getByRole('button',{name:'Sign out',exact:true}).click();
  assert.equal(await page.evaluate(()=>localStorage.getItem('voyana.active_session')),null);
  console.log('PASS: Google SDK callback exchanges credential+challenge, updates account context and signs out (provider/session mocked)');
} finally {await browser.close()}

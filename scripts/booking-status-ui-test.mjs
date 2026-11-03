import assert from 'node:assert/strict';
import { chromium, expect } from '@playwright/test';
const browser = await chromium.launch({channel:'msedge',headless:true});
const page = await browser.newPage({viewport:{width:390,height:700}});
page.setDefaultTimeout(30000);
const base='http://localhost:5173', api='http://localhost:3001';
try {
 const signup = await page.request.post(`${api}/api/auth/signup`, {data:{name:'Status Reviewer',email:`status-ui-${Date.now()}@voyana.test`,password:'StatusTest123!',role:'traveler'}});
 assert.equal(signup.status(),201); const {session}=await signup.json();
 const headers={Authorization:`Bearer ${session.token}`};
 const groupResponse=await page.request.post(`${api}/api/trips`,{headers,data:{title:'Friends planning a wonderful adventure together',destination:'Ahmedabad',travelMode:'group',startDate:'2027-01-10',endDate:'2027-01-12',currency:'INR',visibility:'private'}});
 assert.equal(groupResponse.status(),201); const {trip}=await groupResponse.json();
 await page.goto(base); await page.evaluate(async session=>{localStorage.setItem('voyana.active_session',JSON.stringify(session));const {selectPlanningDestination}=await import('/src/services/planningContext.ts');selectPlanningDestination('Ahmedabad');},session);
 await page.goto(`${base}/#/flight`);await page.reload();
 await page.getByRole('button',{name:/Group traveler/}).click();
 const dialog=page.getByRole('dialog',{name:'Who are you traveling with?'});
 await dialog.getByLabel('Group workspace').selectOption(trip.id);
 for(const viewport of [{width:320,height:568},{width:844,height:390},{width:1440,height:1000}]) {
  await page.setViewportSize(viewport); const continueButton=dialog.getByRole('button',{name:'Continue with group'});
  await continueButton.scrollIntoViewIfNeeded();await expect(continueButton).toBeEnabled();
  const box=await continueButton.boundingBox();assert.ok(box.y>=0&&box.y+box.height<=viewport.height);
  assert.ok(await dialog.evaluate(el=>el.scrollWidth<=el.clientWidth+1));
  assert.equal(await dialog.locator('h2').evaluate(el=>getComputedStyle(el).color),'rgb(15, 23, 42)');
 }
 await page.setViewportSize({width:390,height:700});await dialog.getByLabel('Group workspace').scrollIntoViewIfNeeded();
 await page.screenshot({path:'.artifacts/group-traveler-readable.png'});
 let booked=false;
 const fixtures=()=>['flight','train','bus'].map((kind,index)=>({id:`ui-${kind}`,userId:session.user.id,bookingReference:`VOY-UI-${kind}`,bookingType:kind==='flight'?'flight':'transport',status:booked?'confirmed':'pending',paymentStatus:booked?'paid':'unpaid',totalAmount:2300+index*500,currency:'INR',destination:'Ahmedabad',contactEmail:session.user.email,createdAt:new Date().toISOString(),updatedAt:new Date().toISOString(),...(kind==='flight'?{flightDetails:{airline:'Test Air',flightNumber:'TA101',originCity:'Delhi',destinationCity:'Ahmedabad',originAirport:'DEL',destinationAirport:'AMD',cabinClass:'economy',passengers:1}}:{transportDetails:{transportType:kind,providerName:`Test ${kind}`,originLocation:'Delhi',destinationLocation:'Ahmedabad',scheduledDeparture:'2027-01-10',vehicleClass:'Standard'}})}));
 await page.route('**/api/bookings?**',route=>route.fulfill({json:{ok:true,bookings:fixtures()}}));
 await page.goto(`${base}/#/bookings`); await page.reload();
 for(const kind of ['Flight','Train','Bus']) await expect(page.getByText(`${kind} booking: Pending payment`,{exact:true})).toBeVisible();
 assert.equal(await page.getByRole('button',{name:'Voucher',exact:true}).count(),0);
 await page.getByLabel('Booking status').selectOption('confirmed');await expect(page.getByText('Flight booking: Pending payment',{exact:true})).toHaveCount(0);
 await page.getByLabel('Booking status').selectOption('all');booked=true;await page.evaluate(()=>window.dispatchEvent(new CustomEvent('voyana:booking-changed')));
 for(const kind of ['Flight','Train','Bus']) await expect(page.getByText(`${kind} booking: Booked`,{exact:true})).toBeVisible();
 for (const button of await page.getByRole('button',{name:'Voucher',exact:true}).all()) {
  await button.scrollIntoViewIfNeeded();const box=await button.boundingBox();assert.ok(box.x>=0&&box.x+box.width<=390);
 }
 await page.screenshot({path:'.artifacts/booking-statuses.png'});
 await page.goto(`${base}/#/trips`);await page.reload();await page.getByRole('button').filter({hasText:trip.title}).click();
 await expect(page.getByRole('button',{name:'Trip dashboard',exact:true})).toBeVisible();
 await expect(page.getByRole('button',{name:'Invite / Share',exact:true})).toBeVisible();
 await page.screenshot({path:'.artifacts/group-workspace-mobile.png'});
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
 console.log('PASS: group selector readable and scrollable at mobile, landscape and desktop sizes; real group workspace opens on mobile; flight/train/bus pending and booked statuses, filters and voucher restrictions (booking display fixtures).');
} catch(error) {await page.screenshot({path:'.artifacts/booking-status-ui-failure.png'});throw error;}finally{await browser.close();}

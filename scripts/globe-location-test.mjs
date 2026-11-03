import assert from 'node:assert/strict';
import { chromium } from '@playwright/test';
const browser=await chromium.launch({channel:process.env.PLAYWRIGHT_CHANNEL || (process.platform==='win32'?'msedge':undefined),headless:true});
const page=await browser.newPage({viewport:{width:1440,height:1050}});
page.setDefaultTimeout(20000);
const errors=[];
page.on('pageerror',error=>errors.push(error.message));
try {
  await page.goto(process.env.VOYANA_URL || 'http://localhost:5173');
  const geometry=await page.evaluate(async()=>{
    const {Vector3}=await import('/node_modules/.vite/deps/three.js');
    const {latLngToVector3,vector3ToLatLng,makeFocusQuaternion}=await import('/src/components/Globe/globe.utils.ts');
    for(const [lat,lon] of [[-8.4095,115.1889],[23.0225,72.5714],[48.8566,2.3522],[40.7128,-74.006],[-33.8688,151.2093],[0,179.9],[0,-179.9]]) {
      const q=makeFocusQuaternion(lat,lon);
      const point=latLngToVector3(lat,lon,1);
      const north=latLngToVector3(lat+0.001,lon,1).sub(point).normalize().applyQuaternion(q);
      const inverse=vector3ToLatLng(point);
      if(point.clone().applyQuaternion(q).distanceTo(new Vector3(0,0,1))>1e-6||north.y<0.999999||Math.abs(north.x)>0.00001||Math.abs(inverse.latitude-lat)>1e-6||Math.abs(inverse.longitude-lon)>1e-6) return false;
    }
    return true;
  });
  assert.equal(geometry,true,'Every selected coordinate must face the camera with geographic north pointing up');
  const verifyBali=async()=>{
    await page.waitForFunction(()=>{
      const d=document.querySelector('.globe-canvas-mount')?.dataset;
      return d&&Number(d.latitude)===-8.4095&&Number(d.longitude)===115.1889&&d.focusLatitude===d.latitude&&d.focusLongitude===d.longitude&&Number(d.focusZ)>0.9999;
    });
    return page.locator('.globe-canvas-mount').evaluate(el=>({...el.dataset}));
  };
  await page.getByRole('textbox',{name:'Destination search'}).fill('Bali');
  await page.getByRole('button',{name:'Explore Destination'}).click();
  await verifyBali();
  await page.screenshot({path:'.artifacts/bali-globe.png'});
  await page.getByRole('button',{name:'Paris',exact:true}).click();
  await page.getByRole('button',{name:'Bali',exact:true}).click();
  await verifyBali();
  await page.getByRole('button',{name:'Ahmedabad',exact:true}).click();
  await page.getByRole('button',{name:'Bali Bali Indonesia Island Sanctuaries',exact:true}).click();
  const selected=await verifyBali();
  assert.deepEqual(errors,[]);
  console.log('PASS: Bali search, quick selection and destination card share exact coordinates and focus',selected);
  console.log('PASS: seven geographic positions remain north-up, including east/west hemispheres and date line');
} finally { await browser.close(); }

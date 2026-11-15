/* Service worker. TROUBLESHOOTING (also in app.js):
 * 1. Bump VERSION after every deploy or users keep old files.
 * 2. Must be served over HTTPS (GitHub Pages is) and sw.js must sit in the app root.
 * 3. Wrong paths on GitHub Pages? Keep every path relative (no leading "/").
 * 4. DevTools > Application > Service Workers > "Update on reload" while developing.
 */
importScripts('db.js');
const VERSION='v8',SHELL='shell-'+VERSION,RUNTIME='runtime-'+VERSION;
const ASSETS=['./','index.html','style.css','app.js','db.js','map.js','manifest.webmanifest','data/locations.json','vendor/leaflet.js','vendor/leaflet.css','vendor/images/marker-icon.png','vendor/images/marker-icon-2x.png','vendor/images/marker-shadow.png','vendor/images/layers.png','icons/icon-192.png','icons/icon-512.png','og-image.png'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(SHELL).then(c=>c.addAll(ASSETS)).then(()=>self.skipWaiting()))});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(n=>![SHELL,RUNTIME].includes(n)).map(n=>caches.delete(n)))).then(()=>self.clients.claim()))});
function swr(req,name){return caches.open(name).then(c=>c.match(req).then(hit=>{
  const net=fetch(req).then(r=>{if(r.ok||r.type==='opaque')c.put(req,r.clone());return r}).catch(()=>hit);
  return hit||net}))}
self.addEventListener('fetch',e=>{
  const u=new URL(e.request.url);if(e.request.method!=='GET')return;
  if(u.hostname.endsWith('tile.openstreetmap.org')||u.pathname.endsWith('locations.json')){
    e.respondWith(swr(e.request,RUNTIME).then(r=>r||new Response('',{status:504})));return}
  e.respondWith(caches.match(e.request,{ignoreSearch:true}).then(h=>h||fetch(e.request).catch(()=>e.request.mode==='navigate'?caches.match('index.html'):Response.error())));
});
self.addEventListener('message',e=>{
  if(e.data&&e.data.type==='CACHE_TILES')caches.open(RUNTIME).then(c=>Promise.allSettled(e.data.urls.map(u=>fetch(u).then(r=>c.put(u,r)))).then(()=>e.source.postMessage({type:'TILES_DONE',count:e.data.urls.length})))});

/* Background Sync: 'outbox' replays queued reports (needs LIPA_ENDPOINT in db.js); 'refresh-data' updates the places JSON. */
self.addEventListener('sync',e=>{
  if(e.tag==='outbox')e.waitUntil(DB.flush());
  if(e.tag==='refresh-data')e.waitUntil(caches.open(RUNTIME).then(async c=>{const u=new URL('data/locations.json',self.registration.scope).href;const r=await fetch(u,{cache:'no-store'});if(r.ok)await c.put(u,r)}));
});

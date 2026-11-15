if(location.protocol==='http:'&&!/^(localhost|127\.0\.0\.1)$/.test(location.hostname))location.replace(location.href.replace('http:','https:'));/* enforce HTTPS */
/* Lipa Tourism PWA – modular components.
 * DEPLOY (GitHub Pages: esp046-cyber.github.io/batangastour/):
 *  - Upload all files to the repo root of "batangastour", enable Pages on main branch.
 *  - Keep icons/ and vendor/ folders; manifest start_url/scope are relative ("./").
 * TROUBLESHOOTING:
 *  - No install prompt: needs HTTPS, manifest with 192+512 icons, and a registered sw.js.
 *  - Old content showing: change VERSION in sw.js, hard-reload, or unregister in DevTools.
 *  - Map blank offline: open Map online first, or press "Save map area" in Offline Status.
 *  - GPS denied: browser site settings > Location > Allow. GPS needs HTTPS.
 *  - Link preview missing: og-image.png must be at the absolute URL in index.html.
 */
'use strict';
const $=s=>document.querySelector(s);
const esc=t=>String(t).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const CENTER=[13.9411,121.1633];


/* OpenStreetMap sync: runs in the visitor's browser (online only), merges real OSM places up to 400 total.
 * Data (c) OpenStreetMap contributors, ODbL. Cached in localStorage so it works offline afterwards. */
const OSM={KEY:'osm-places-v1',LIMIT:400,
  Q:'[out:json][timeout:60];area["boundary"="administrative"]["name"~"^Lipa( City)?$"]["admin_level"~"^[5-6]$"]->.a;('
   +'nwr(area.a)["name"]["tourism"~"^(attraction|museum|gallery|viewpoint|theme_park|zoo|picnic_site|hotel|motel|guest_house|hostel|resort|apartment|chalet)$"];'
   +'nwr(area.a)["name"]["historic"];nwr(area.a)["name"]["leisure"~"^(park|garden|nature_reserve|water_park|resort|golf_course)$"];'
   +'nwr(area.a)["name"]["amenity"~"^(restaurant|cafe|fast_food|food_court|bar|ice_cream|marketplace)$"];nwr(area.a)["name"]["shop"~"^(bakery|mall|coffee|confectionery)$"];);out center tags;',
  cached(){try{return JSON.parse(localStorage.getItem(this.KEY)||'[]')}catch(e){return[]}},
  cat(t){if(['hotel','motel','guest_house','hostel','resort','apartment','chalet'].includes(t.tourism))return'Hotels';
    if(['restaurant','cafe','fast_food','food_court','bar','ice_cream'].includes(t.amenity)||['bakery','coffee','confectionery'].includes(t.shop))return'Restaurants';return'Tourist Spots'},
  async fetchAll(){const r=await fetch('https://overpass-api.de/api/interpreter',{method:'POST',body:'data='+encodeURIComponent(this.Q)});
    if(!r.ok)throw new Error('Overpass '+r.status);const j=await r.json();
    return j.elements.map(e=>{const t=e.tags||{},la=e.lat??(e.center&&e.center.lat),lo=e.lon??(e.center&&e.center.lon);if(!t.name||la==null)return null;
      const kind=(t.cuisine||t.tourism||t.historic||t.leisure||t.amenity||t.shop||'place').replace(/[_;]/g,' ');
      return{id:e.id+(e.type==='way'?1e12:e.type==='relation'?2e12:0),name:t.name,category:this.cat(t),latitude:+la.toFixed(6),longitude:+lo.toFixed(6),
        description:t.name+' is a '+kind+' in Lipa City, Batangas. Listing from OpenStreetMap: confirm hours before visiting.',
        address:[t['addr:housenumber'],t['addr:street'],t['addr:suburb']||t['addr:barangay'],'Lipa City, Batangas'].filter(Boolean).join(', '),
        contact:t.phone||t['contact:phone']||'',features:[kind],verified:true,source:'osm'}}).filter(Boolean)},
  async sync(){const list=await this.fetchAll();try{localStorage.setItem(this.KEY,JSON.stringify(list))}catch(e){}
    const before=Store.places.length;Store.merge(list);return{found:list.length,added:Store.places.length-before,total:Store.places.length}}};

const Store={places:[],plan:[],
  merge(list){const d=(p,q)=>Math.hypot((p.latitude-q.latitude)*111,(p.longitude-q.longitude)*111*Math.cos(p.latitude*Math.PI/180));
    for(const p of list){if(this.places.length>=OSM.LIMIT)break;if(this.places.some(q=>q.id===p.id||(q.name.toLowerCase()===p.name.toLowerCase()&&d(p,q)<0.15)))continue;this.places.push(p)}},
  async load(){try{this.places=await (await fetch('data/locations.json')).json()}catch(e){this.places=(await DB.get('places'))||[]}
    this.merge(OSM.cached());try{this.plan=JSON.parse(localStorage.getItem('plan')||'[]')}catch(e){this.plan=[]}
    if(!this.plan.length)this.plan=(await DB.get('plan'))||[];DB.set('places',this.places)},
  save(){try{localStorage.setItem('plan',JSON.stringify(this.plan))}catch(e){}DB.set('plan',this.plan)},
  toggle(id){const i=this.plan.indexOf(id);i<0?this.plan.push(id):this.plan.splice(i,1);this.save();Explore.render();Itinerary.render()},
  get(id){return this.places.find(p=>p.id===id)}};

const Tabs={order:['explore','map','itinerary','status'],cur:'explore',
  init(){document.documentElement.classList.toggle('vt',!!document.startViewTransition);document.querySelectorAll('.tab').forEach(t=>t.tabIndex=-1);document.querySelectorAll('[data-tab]').forEach(b=>b.onclick=()=>this.go(b.dataset.tab))},
  go(n){const apply=()=>{document.querySelectorAll('.tab').forEach(t=>t.classList.toggle('active',t.id==='tab-'+n));
      document.querySelectorAll('[data-tab]').forEach(b=>b.setAttribute('aria-selected',b.dataset.tab===n));
      const p=$('#tab-'+n);if(p&&n!==this.cur)p.focus({preventScroll:true});this.cur=n};
    const dir=this.order.indexOf(n)<this.order.indexOf(this.cur)?'back':'fwd';
    if(n!==this.cur&&document.startViewTransition&&!matchMedia('(prefers-reduced-motion:reduce)').matches){document.documentElement.dataset.dir=dir;document.startViewTransition(apply)}else apply();
    if(n==='map')MapView.load().then(()=>setTimeout(()=>MapView.ensure(),60))}};

const Explore={cat:'All',
  render(){const cats=['All',...new Set(Store.places.map(p=>p.category))];
    $('#filters').innerHTML=cats.map(c=>`<button class="chip" aria-pressed="${c===this.cat}" data-c="${esc(c)}">${esc(c)}</button>`).join('');
    $('#filters').querySelectorAll('.chip').forEach(b=>b.onclick=()=>{this.cat=b.dataset.c;this.render()});
    const rows=Store.places.filter(p=>this.cat==='All'||p.category===this.cat);
    $('#list').innerHTML=rows.length?rows.map(p=>`<li class="item">${p.image?`<img src="${esc(p.image)}" alt="" loading="lazy" decoding="async">`:''}<span class="tag">${esc(p.category)}</span>${p.verified?'':'<span class="unv">verify details</span>'}
      <h3>${esc(p.name)}</h3><p>${esc(p.description)}</p><p>${esc(p.address)}</p>
      <div class="row"><button class="btn" data-add="${p.id}">${Store.plan.includes(p.id)?'Remove from itinerary':'Add to itinerary'}</button>
      <button class="btn alt" data-show="${p.id}">Show on map</button><button class="btn alt" data-rep="${p.id}">Report issue</button></div></li>`).join(''):'<p class="empty">No places yet.</p>';
    $('#list').querySelectorAll('[data-add]').forEach(b=>b.onclick=()=>Store.toggle(+b.dataset.add));
    $('#list').querySelectorAll('[data-show]').forEach(b=>b.onclick=()=>{Tabs.go('map');MapView.load().then(()=>MapView.focus(+b.dataset.show))})}};

const Itinerary={render(){const rows=Store.plan.map(Store.get.bind(Store)).filter(Boolean);
  $('#plan').innerHTML=rows.length?rows.map(p=>`<li class="item"><h3>${esc(p.name)}</h3><p>${esc(p.category)}</p>
    <div class="row"><button class="btn alt" data-rm="${p.id}">Remove</button></div></li>`).join(''):'<p class="empty">Nothing planned. Add places from Explore.</p>';
  $('#plan').querySelectorAll('[data-rm]').forEach(b=>b.onclick=()=>Store.toggle(+b.dataset.rm))}};

const MapView={map:null,me:null,acc:null,watch:null,pos:null,markers:{},hud:false,_p:null,
  load(){return this._p||(this._p=new Promise((ok,no)=>{const l=document.createElement('link');l.rel='stylesheet';l.href='vendor/leaflet.css';document.head.appendChild(l);
    const add=(src,cb)=>{const s=document.createElement('script');s.src=src;s.onload=cb;s.onerror=no;document.head.appendChild(s)};add('vendor/leaflet.js',()=>add('map.js',ok))}))}};
const Outbox={async report(id,note){await DB.add({type:'report',placeId:id,note,ts:Date.now()});await this.kick();Status.render();alert('Saved. It sends automatically once you are online.')},
  async kick(){const r=navigator.serviceWorker&&await navigator.serviceWorker.ready;if(r&&r.sync){try{await r.sync.register('outbox');return}catch(e){}}if(navigator.onLine)DB.flush().catch(()=>{})}};
const Status={async render(){let n=0,q=0;try{q=(await DB.all()).length}catch(e){}try{const ks=await caches.keys();for(const k of ks)n+=(await (await caches.open(k)).keys()).length}catch(e){}
  $('#status').innerHTML=`<div class="item"><h3>${navigator.onLine?'Online':'Offline'}</h3><p>Cached files: ${n}</p><p>Queued actions: ${q}</p><p>Service worker: ${navigator.serviceWorker&&navigator.serviceWorker.controller?'active':'not yet active (reload once)'}</p></div>`;
  $('#offline-banner').hidden=navigator.onLine}};

async function boot(){
  await Store.load();Tabs.init();Explore.render();Itinerary.render();Status.render();
  document.addEventListener('pointerdown',e=>{const b=e.target.closest('.btn,.chip,.tabs button,.fab,#hud-toggle');if(!b)return;const r=b.getBoundingClientRect();b.style.setProperty('--x',(e.clientX-r.left)+'px');b.style.setProperty('--y',(e.clientY-r.top)+'px');b.classList.remove('rip');void b.offsetWidth;b.classList.add('rip');if(navigator.vibrate)navigator.vibrate(8)},{passive:true});
  $('#hud-toggle').onclick=()=>MapView.load().then(()=>MapView.toggleHud());$('#locate').onclick=()=>MapView.load().then(()=>MapView.track());
  $('#list').addEventListener('click',e=>{const b=e.target.closest('[data-rep]');if(!b)return;const n=prompt('What is wrong with this place?');if(n)Outbox.report(+b.dataset.rep,n)});
  $('#cache-map').onclick=async()=>{await MapView.load();MapView.ensure();const sw=navigator.serviceWorker.controller;if(!sw)return alert('Reload once so the service worker can take control.');
    sw.postMessage({type:'CACHE_TILES',urls:MapView.tileUrls()});$('#cache-map').textContent='Saving…'};
  $('#osm-sync').onclick=async()=>{const b=$('#osm-sync');b.textContent='Syncing…';b.setAttribute('aria-busy','true');
    try{const r=await OSM.sync();Explore.render();if(MapView.map)Store.places.forEach(p=>{if(!MapView.markers[p.id])MapView.markers[p.id]=L.marker([p.latitude,p.longitude]).addTo(MapView.map).bindPopup('<b>'+esc(p.name)+'</b><br>'+esc(p.category))});
      Status.render();alert('OpenStreetMap had '+r.found+' named places. Added '+r.added+'. Total now '+r.total+' (max '+OSM.LIMIT+').')}
    catch(e){alert('Sync failed. Go online and try again. '+e.message)}b.textContent='Sync more places from OpenStreetMap';b.removeAttribute('aria-busy')};
  addEventListener('online',()=>{Status.render();DB.flush().catch(()=>{})});addEventListener('offline',()=>Status.render());
  if('serviceWorker' in navigator){navigator.serviceWorker.register('sw.js').then(()=>navigator.serviceWorker.ready).then(r=>r.sync&&r.sync.register('refresh-data')).catch(e=>console.warn('SW',e));
    navigator.serviceWorker.addEventListener('message',e=>{if(e.data.type==='TILES_DONE'){$('#cache-map').textContent='Save map area around Lipa';Status.render();alert('Saved '+e.data.count+' map tiles.')}})}
}
boot();

'use strict';/* Lazy chunk: loaded on first Map open (code splitting). */
Object.assign(MapView,{
  ensure(){if(this.map){this.map.invalidateSize();return}
    this.map=L.map('map').setView(CENTER,13);
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:18,attribution:'&copy; OpenStreetMap contributors'}).addTo(this.map);
    L.Icon.Default.prototype.options.imagePath='vendor/images/';
    Store.places.forEach(p=>{this.markers[p.id]=L.marker([p.latitude,p.longitude]).addTo(this.map).bindPopup(`<b>${esc(p.name)}</b><br>${esc(p.category)}`)})},
  focus(id){this.ensure();const p=Store.get(id);if(!p||!this.map)return;this.map.setView([p.latitude,p.longitude],16);this.markers[id].openPopup()},
  track(){if(!navigator.geolocation){alert('Geolocation is not supported.');return}
    if(this.watch!=null){navigator.geolocation.clearWatch(this.watch);this.watch=null;$('#locate').textContent='Track me';return}
    $('#locate').textContent='Stop tracking';
    this.watch=navigator.geolocation.watchPosition(g=>{this.pos=g.coords;const ll=[g.coords.latitude,g.coords.longitude];
      if(!this.me){this.me=L.circleMarker(ll,{radius:8,color:'#fff',weight:3,fillColor:'#1e6fff',fillOpacity:1}).addTo(this.map);
        this.acc=L.circle(ll,{radius:g.coords.accuracy,color:'#1e6fff',weight:1,fillOpacity:.12}).addTo(this.map);this.map.setView(ll,16)}
      else{this.me.setLatLng(ll);this.acc.setLatLng(ll).setRadius(g.coords.accuracy)}
      this.updateHud()},e=>{alert('GPS error: '+e.message);$('#locate').textContent='Track me';this.watch=null},{enableHighAccuracy:true,maximumAge:2000,timeout:15000})},
  toggleHud(){this.hud=!this.hud;$('#hud').hidden=!this.hud;$('#hud-toggle').setAttribute('aria-pressed',this.hud);
    if(this.hud){Tabs.go('map');this.updateHud()}},
  updateHud(){if(!this.hud)return;const h=$('#hud');if(!this.pos){h.textContent='Tap "Track me" to start GPS.';return}
    let best=null;Store.places.forEach(p=>{const d=this.map.distance([this.pos.latitude,this.pos.longitude],[p.latitude,p.longitude]);if(!best||d<best.d)best={p,d}});
    h.innerHTML=best?`Nearest<b>${esc(best.p.name)}</b>${best.d>=1000?(best.d/1000).toFixed(2)+' km':Math.round(best.d)+' m'} away · GPS ±${Math.round(this.pos.accuracy)} m`:'No places loaded.'},
  tileUrls(){const b=this.map.getBounds(),z=this.map.getZoom(),out=[];
    for(let zz=Math.max(11,z-1);zz<=Math.min(z+2,16);zz++){const n=2**zz,x=lng=>Math.floor((lng+180)/360*n),
      y=lat=>{const r=lat*Math.PI/180;return Math.floor((1-Math.log(Math.tan(r)+1/Math.cos(r))/Math.PI)/2*n)};
      for(let i=x(b.getWest());i<=x(b.getEast());i++)for(let j=y(b.getNorth());j<=y(b.getSouth());j++)out.push(`https://tile.openstreetmap.org/${zz}/${i}/${j}.png`)}
    return out.slice(0,150)}});

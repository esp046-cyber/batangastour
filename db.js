/* Shared by page and service worker. IndexedDB: 'kv' = backup copy of places/plan, 'outbox' = queued offline actions. */
const LIPA_ENDPOINT=''; /* Set to your form/API URL (e.g. Formspree) and add it to connect-src in index.html + _headers. */
const DB={
  open(){return this.p||(this.p=new Promise((ok,no)=>{const r=indexedDB.open('lipa',1);r.onupgradeneeded=()=>{r.result.createObjectStore('kv');r.result.createObjectStore('outbox',{autoIncrement:true})};r.onsuccess=()=>ok(r.result);r.onerror=()=>no(r.error)}))},
  async tx(s,m,f){const d=await this.open();return new Promise((ok,no)=>{const t=d.transaction(s,m),q=f(t.objectStore(s));t.oncomplete=()=>ok(q&&q.result);t.onerror=()=>no(t.error)})},
  get(k){return this.tx('kv','readonly',s=>s.get(k)).catch(()=>null)},
  set(k,v){return this.tx('kv','readwrite',s=>s.put(v,k)).catch(()=>null)},
  add(v){return this.tx('outbox','readwrite',s=>s.add(v))},
  del(k){return this.tx('outbox','readwrite',s=>s.delete(k))},
  all(){return this.open().then(d=>new Promise(ok=>{const o=[],q=d.transaction('outbox').objectStore('outbox').openCursor();q.onsuccess=()=>{const c=q.result;if(c){o.push({k:c.key,v:c.value});c.continue()}else ok(o)}}))},
  async flush(){if(!LIPA_ENDPOINT)return;for(const {k,v} of await this.all()){const r=await fetch(LIPA_ENDPOINT,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(v)});if(!r.ok)throw new Error('retry');await this.del(k)}}
};

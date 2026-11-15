#!/usr/bin/env python3
"""Build data/locations.json for Lipa City from OpenStreetMap (free to store/reuse, ODbL).
Run once on your computer (needs internet):   python3 tools/build_locations.py
It keeps your curated entries (source != "osm") and adds every named OSM place it finds,
up to 400 total. The real number depends on what OSM has mapped for Lipa: if it prints
less than 400, that is the true count; do not pad it with guesses. Add missing places
in OpenStreetMap itself (openstreetmap.org) or append them to the JSON by hand.
Attribution required: (c) OpenStreetMap contributors, ODbL (shown in the app)."""
import json, math, urllib.request, urllib.parse, pathlib
OUT = pathlib.Path(__file__).resolve().parent.parent / "data" / "locations.json"
LIMIT = 400
QUERY = """[out:json][timeout:120];
area["boundary"="administrative"]["name"~"^Lipa( City)?$"]["admin_level"~"^[5-6]$"]->.a;
(nwr(area.a)["name"]["tourism"~"^(attraction|museum|gallery|viewpoint|theme_park|zoo|artwork|picnic_site)$"];
 nwr(area.a)["name"]["historic"];
 nwr(area.a)["name"]["leisure"~"^(park|garden|nature_reserve|water_park|resort|golf_course)$"];
 nwr(area.a)["name"]["amenity"~"^(restaurant|cafe|fast_food|food_court|bar|ice_cream|marketplace)$"];
 nwr(area.a)["name"]["shop"~"^(bakery|mall|coffee|confectionery)$"];
 nwr(area.a)["name"]["amenity"="place_of_worship"]["tourism"];
 nwr(area.a)["name"]["tourism"~"^(hotel|motel|guest_house|hostel|resort|apartment|chalet)$"];);
out center tags;"""
def cat(t):
    if t.get("tourism") in ("hotel","motel","guest_house","hostel","resort","apartment","chalet"): return "Hotels"
    if t.get("amenity") in ("restaurant","cafe","fast_food","food_court","bar","ice_cream") or t.get("shop") in ("bakery","coffee","confectionery"): return "Restaurants"
    return "Tourist Spots"
def km(a,b):
    return math.hypot((a[0]-b[0])*111.0,(a[1]-b[1])*111.0*math.cos(math.radians(a[0])))
def main():
    req = urllib.request.Request("https://overpass-api.de/api/interpreter",
        data=urllib.parse.urlencode({"data": QUERY}).encode(), headers={"User-Agent":"batangastour-pwa/1.0"})
    els = json.load(urllib.request.urlopen(req, timeout=180))["elements"]
    data = json.loads(OUT.read_text()) if OUT.exists() else []
    data = [d for d in data if d.get("source") != "osm"]      # keep curated entries
    seen = [(d["name"].lower(), (d["latitude"], d["longitude"])) for d in data]
    nid = max([d["id"] for d in data], default=0)
    for e in els:
        t = e.get("tags", {}); name = t.get("name")
        la = e.get("lat") or e.get("center",{}).get("lat"); lo = e.get("lon") or e.get("center",{}).get("lon")
        if not name or la is None: continue
        if any(n == name.lower() and km((la,lo),p) < 0.15 for n,p in seen): continue   # duplicate
        seen.append((name.lower(),(la,lo))); c = cat(t)
        addr = ", ".join(x for x in [t.get("addr:housenumber"), t.get("addr:street"), t.get("addr:suburb") or t.get("addr:barangay"), "Lipa City, Batangas"] if x)
        kind = (t.get("cuisine") or t.get("tourism") or t.get("historic") or t.get("leisure") or t.get("amenity") or t.get("shop") or "place").replace("_"," ").replace(";",", ")
        feats = [kind.title()]
        if t.get("opening_hours"): feats.append("Hours: " + t["opening_hours"])
        if t.get("internet_access") in ("wlan","yes"): feats.append("Wi-Fi")
        if t.get("stars"): feats.append(t["stars"] + " stars")
        desc = f"{name} is a {kind} in Lipa City, Batangas." + (f" {t['description']}" if t.get("description") else "") + " Listing from OpenStreetMap: confirm hours before visiting."
        nid += 1
        data.append(dict(id=nid,name=name,category=c,latitude=round(la,6),longitude=round(lo,6),description=desc,address=addr,
            contact=t.get("phone") or t.get("contact:phone") or "",features=feats,verified=True,source="osm"))
        if len(data) >= LIMIT: break
    OUT.write_text(json.dumps(data, indent=1, ensure_ascii=False))
    from collections import Counter
    print(len(data), "locations written;", dict(Counter(d["category"] for d in data)))
    if len(data) < LIMIT: print(f"OSM only has {len(data)} matching named places for Lipa. Add more in OpenStreetMap, then re-run.")
main()

#!/usr/bin/env python3
"""Performance budget: first-load critical path (gzip) must stay under 100 KB, so it can load in <2s on 3G
(~1.6 Mbps, 300 ms RTT) with the service worker making repeat visits instant. Run: python3 tools/check-budget.py"""
import gzip, pathlib, sys
R = pathlib.Path(__file__).resolve().parent.parent
CRIT = ["index.html", "style.css", "db.js", "app.js", "manifest.webmanifest", "data/locations.json"]
LAZY = ["map.js", "vendor/leaflet.js", "vendor/leaflet.css"]   # code-split: loaded only when Map opens
g = lambda f: len(gzip.compress((R / f).read_bytes()))
tot = sum(g(f) for f in CRIT)
for f in CRIT + LAZY: print(f"{g(f)/1024:7.1f} KB gz  {f}" + ("  (lazy)" if f in LAZY else ""))
print(f"critical total {tot/1024:.1f} KB / budget 100 KB")
sys.exit(0 if tot <= 100 * 1024 else 1)

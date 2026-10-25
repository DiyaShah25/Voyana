# Country lookup fallback

`world-countries.ts` is generated from Natural Earth's public-domain 1:110m Admin 0 country outlines. It is used only when the live place-name lookup cannot provide a result. These generalized outlines provide country context, not precise city, address or coastline accuracy.

Source: https://github.com/nvkelso/natural-earth-vector/blob/master/geojson/ne_110m_admin_0_countries.geojson

Photon supplies detailed place names from OpenStreetMap. Its public demo permits reasonable project use without availability guarantees. The backend caches responses, serializes requests at no more than one per second, and permits replacement of the base URL through `GEOCODER_URL`.

Provider documentation: https://github.com/komoot/photon/blob/master/docs/api-v1.md
Usage: https://github.com/komoot/photon#demo-server

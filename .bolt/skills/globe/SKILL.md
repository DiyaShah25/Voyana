---
name: globe
description: "Expert skill for building production-quality interactive 3D Earth experiences in React and TypeScript using react-globe.gl, Three.js, geographic data, GeoJSON/TopoJSON, and geocoding APIs. Use this skill whenever Voyana requires a functional 3D globe, geographic location search, city/state/country positioning, destination markers, country/state highlighting, animated travel routes, or search-to-globe navigation."
---

# Voyana Interactive 3D Globe Skill

## Skill Name

`voyana-interactive-3d-globe`

## Purpose

Use this skill whenever the application requires a production-quality, interactive 3D Earth/globe.

This skill is specifically designed for the Voyana travel platform.

The globe must be a genuine 3D geographic visualization, not a static image, SVG, video, GIF, or fake CSS sphere.

---

# 1. Core Technology

Primary technologies:

- React.js
- TypeScript
- Three.js
- React Three Fiber where appropriate
- react-globe.gl when appropriate
- Tailwind CSS

Supporting technologies:

- Google Maps Geocoding API
- GeoJSON
- TopoJSON
- Natural Earth geographic datasets
- REST APIs

Use `react-globe.gl` when its existing functionality can satisfy the requirement instead of unnecessarily rebuilding globe functionality from scratch.

Official repository:

[https://github.com/vasturiano/react-globe.gl](https://github.com/vasturiano/react-globe.gl)

Official documentation:

[https://globe.gl/](https://globe.gl/)

---

# 2. Core Philosophy

The globe is not decorative.

It must be geographically functional.

The following interaction must work:

USER SEARCH

↓

LOCATION RESOLUTION

↓

LATITUDE + LONGITUDE

↓

3D EARTH POSITION

↓

GLOBE ROTATION

↓

DESTINATION MOVES TO FRONT

↓

MARKER APPEARS

↓

LOCATION IS HIGHLIGHTED

The user should feel that the Earth is actually finding their destination.

---

# 3. Required Globe Features

The globe should support:

- realistic 3D Earth
- automatic rotation
- mouse rotation
- touch rotation
- zoom
- pinch zoom
- destination markers
- country highlighting
- state/province highlighting
- city markers
- country boundaries
- state boundaries
- animated travel routes
- flight-path arcs
- destination labels
- atmosphere
- clouds where performance allows
- day/night lighting where appropriate
- click interaction
- hover interaction
- programmatic destination focusing
- reset
- pause/resume rotation

---

# 4. React Component

Create a reusable component:

```tsx
<VoyanaGlobe />

```

Do not place all globe logic inside `App.tsx`.

Recommended architecture:

```text
src/
└── components/
    └── Globe/
        ├── VoyanaGlobe.tsx
        ├── GlobeScene.tsx
        ├── Earth.tsx
        ├── Atmosphere.tsx
        ├── Clouds.tsx
        ├── CountryLayer.tsx
        ├── StateLayer.tsx
        ├── DestinationMarker.tsx
        ├── DestinationLabel.tsx
        ├── TravelRoute.tsx
        ├── GlobeControls.tsx
        ├── globe.types.ts
        ├── globe.utils.ts
        └── globe.constants.ts

```

---

# 5. Globe Component API

The component should support:

```tsx
<VoyanaGlobe
    selectedLocation={selectedLocation}
    markers={markers}
    routes={routes}
    autoRotate={true}
    onLocationSelect={handleLocationSelect}
/>

```

Expose methods using a React ref:

```ts
globeRef.current?.focusOnLocation(
    latitude,
    longitude
);

globeRef.current?.reset();

globeRef.current?.pauseRotation();

globeRef.current?.resumeRotation();

globeRef.current?.zoomIn();

globeRef.current?.zoomOut();

```

---

# 6. Location Type

Use a strongly typed geographic object:

```ts
interface GlobeLocation {
    name: string;
    city?: string;
    state?: string;
    country?: string;
    latitude: number;
    longitude: number;
    type:
        | "city"
        | "state"
        | "country"
        | "region"
        | "landmark";
}

```

---

# 7. Location Search Pipeline

Whenever a user enters a destination:

```text
USER INPUT
    ↓
NORMALIZE QUERY
    ↓
GEOCODING SERVICE
    ↓
LOCATION RESULT
    ↓
CITY / STATE / COUNTRY
    ↓
LATITUDE + LONGITUDE
    ↓
GLOBE

```

Example:

```text
Ahmedabad

```

must resolve to approximately:

```text
city: Ahmedabad
state: Gujarat
country: India
latitude: 23.0225
longitude: 72.5714

```

Never randomly guess coordinates.

---

# 8. Geocoding

Use the project's configured location/geocoding service.

Prefer Google Maps Geocoding API when it is already part of the project.

Create an abstraction:

```ts
locationService.ts

```

Example:

```ts
const location = await searchLocation("Ahmedabad");

```

Return:

```ts
{
    name: "Ahmedabad",
    city: "Ahmedabad",
    state: "Gujarat",
    country: "India",
    latitude: 23.0225,
    longitude: 72.5714,
    type: "city"
}

```

Do not couple the globe directly to the Google API.

---

# 9. Geographic Hierarchy

Understand:

```text
CONTINENT
    ↓
COUNTRY
    ↓
STATE / PROVINCE
    ↓
CITY
    ↓
LANDMARK

```

Example:

```text
Asia
 ↓
India
 ↓
Gujarat
 ↓
Ahmedabad
 ↓
Sabarmati Ashram

```

The selected location should determine the appropriate level of highlighting.

---

# 10. City Search

When a city is searched:

Example:

```text
Paris

```

The globe should:

1. resolve Paris coordinates
2. rotate toward Paris
3. place a marker
4. highlight France subtly
5. highlight Europe subtly
6. display Paris label

---

# 11. State Search

When a state/province is searched:

Example:

```text
Gujarat

```

The globe should:

1. resolve Gujarat
2. rotate toward Gujarat
3. highlight Gujarat boundary
4. subtly highlight India
5. place a marker
6. display Gujarat label

---

# 12. Country Search

When a country is searched:

Example:

```text
Japan

```

The globe should:

1. resolve Japan
2. rotate toward Japan
3. highlight Japan
4. subtly highlight Asia
5. display Japan marker

Do not select a random city inside the country unless the application explicitly requests it.

---

# 13. Coordinate Conversion

Implement reusable geographic utilities.

```ts
latLngToVector3(
    latitude: number,
    longitude: number,
    radius: number
): THREE.Vector3

```

And where needed:

```ts
vector3ToLatLng(
    position: THREE.Vector3
): {
    latitude: number;
    longitude: number;
}

```

Use these for:

- markers
- labels
- country highlights
- state highlights
- routes
- click detection

---

# 14. Marker Positioning

Markers must be attached to the Earth coordinate system.

Incorrect:

```text
screen position = marker

```

Correct:

```text
latitude
longitude
    ↓
3D Earth coordinate
    ↓
marker attached to Earth

```

When the Earth rotates, the marker must rotate with it.

Never keep geographic markers fixed to the screen.

---

# 15. Destination Marker

Selected locations should use:

- small glowing dot
- soft outer ring
- subtle pulse
- optional label

Example:

```text
Ahmedabad
    │
    ●
   ◉
   🌍

```

The marker should be slightly above the Earth surface.

---

# 16. Destination Focus

Implement:

```ts
focusOnLocation(latitude, longitude)

```

This must:

1. stop/slower auto rotation
2. calculate target orientation
3. smoothly rotate the Earth
4. move destination toward front-center
5. settle into position
6. display marker

Use smooth interpolation.

Do not instantly change rotation.

---

# 17. Quaternion Rotation

For major geographic rotations, prefer quaternion-based rotation or a reliable globe library's geographic point-of-view system.

Avoid crude Euler rotation when it creates unnatural movement.

The destination should reach the front of the globe using a visually natural shortest path.

---

# 18. Search-to-Globe Example

User searches:

```text
Tokyo

```

System resolves:

```text
35.6762
139.6503

```

Then:

```text
Search
 ↓
Pause rotation
 ↓
Calculate destination
 ↓
Rotate Earth
 ↓
Japan approaches front
 ↓
Tokyo becomes centered
 ↓
Marker appears
 ↓
Label appears

```

Animation duration:

approximately 1.5–2.5 seconds.

---

# 19. Reverse Globe Interaction

The globe must also work in reverse.

User clicks the Earth:

```text
CLICK
 ↓
Raycast
 ↓
3D position
 ↓
Latitude + Longitude
 ↓
Reverse geocoding
 ↓
Location
 ↓
Update search

```

Expose:

```ts
onLocationSelect(location)

```

---

# 20. Country Boundaries

Use real geographic boundary data.

Prefer:

- GeoJSON
- TopoJSON
- Natural Earth

Do not manually draw country shapes.

Default country boundaries should be subtle.

When selected:

```text
country
 ↓
soft outline
 ↓
subtle glow

```

Do not use heavy borders everywhere.

---

# 21. State Boundaries

Support first-level administrative boundaries.

Example:

```text
India
 ├── Gujarat
 ├── Maharashtra
 ├── Rajasthan
 └── ...

```

When Gujarat is selected:

Gujarat gets the strongest highlight.

India receives a weaker highlight.

---

# 22. Fallback Resolution

If a city has no famous-place data:

```text
CITY
 ↓
NO CITY DATA
 ↓
COUNTRY
 ↓
COUNTRY DESTINATIONS

```

Never leave the destination experience empty.

The globe should still focus on the available geographic location.

---

# 23. Famous Destination Integration

The globe itself should only be responsible for geographic interaction.

The parent application can handle famous places.

Example:

```ts
{
    city: "Paris",
    country: "France",
    famousPlace: {
        name: "Eiffel Tower",
        image: "...",
        description: "..."
    }
}

```

After the globe focuses on Paris:

The parent can animate the Eiffel Tower background.

Keep globe logic and destination-content logic separate.

---

# 24. Travel Routes

Support optional 3D travel arcs.

Example:

```text
Ahmedabad ●
          \
           \
            ✈
              \
               \
                ● Paris

```

Routes must follow Earth's curvature.

Use geographic great-circle interpolation where possible.

Do not draw flat straight lines through the scene.

---

# 25. Auto Rotation

When idle:

Earth rotates slowly.

Recommended:

```text
30–45 seconds
per complete revolution

```

When the user:

- drags
- zooms
- searches
- clicks

pause or slow auto rotation.

Resume smoothly after inactivity when appropriate.

---

# 26. Realistic Earth

Use a real Earth texture system with:

- day texture
- normal/bump map
- specular map
- night texture
- cloud layer
- atmosphere

Use optimized textures.

Do not load unnecessarily huge assets.

---

# 27. Lighting

Use realistic directional lighting.

Include:

- sun-like directional light
- subtle ambient light
- Earth shadow
- atmospheric rim

Optional:

subtle night-side city lights.

Do not make the Earth completely dark.

---

# 28. Clouds

If performance permits:

Add a transparent cloud layer.

Clouds should rotate independently.

Keep opacity low.

Clouds must not hide destination markers.

On low-end/mobile devices:

reduce or disable clouds.

---

# 29. Atmosphere

Add a subtle blue atmospheric rim around Earth.

Do not use a huge neon glow.

The atmosphere should look natural.

---

# 30. Visual Style

Voyana's globe should use a:

**light-premium travel aesthetic.**

The surrounding UI may use:

- warm ivory
- soft blue
- muted lavender
- subtle peach
- indigo accents

The Earth itself should remain realistic.

Do not turn the Earth into a cartoon.

---

# 31. Interaction

Support:

### Desktop

- mouse drag
- mouse wheel zoom
- click
- hover

### Mobile

- touch drag
- pinch zoom
- tap

The globe must remain functional on mobile.

---

# 32. Performance

Target:

60 FPS where possible.

Rules:

- do not update React state every frame
- use requestAnimationFrame correctly
- optimize textures
- optimize GeoJSON geometry
- limit markers
- throttle pointer events
- dispose WebGL resources
- cleanup listeners
- lazy-load heavy globe assets

---

# 33. Accessibility

Support:

- keyboard-accessible globe controls
- reset control
- zoom controls
- pause/resume
- aria-labels
- reduced-motion preference

When reduced motion is enabled:

- disable automatic rotation
- reduce marker pulsing
- simplify route animations
- keep basic interaction available

---

# 34. Error Handling

If WebGL is unavailable:

display a static Earth fallback.

If geocoding fails:

return an appropriate error.

If geographic data fails:

keep the Earth functional without boundary highlighting.

Never crash the landing page because one geographic layer failed.

---

# 35. Do Not Do This

Never:

- use a rotating PNG
- use a GIF
- use a video
- use a static screenshot
- fake the globe using CSS
- hardcode screen coordinates
- randomly rotate the Earth
- hardcode only five cities
- keep markers fixed to the viewport
- manually draw fake country shapes
- put all logic in one React component
- rebuild existing react-globe.gl functionality unnecessarily

---

# 36. Preferred Library Strategy

Use:

```text
React
 +
TypeScript
 +
react-globe.gl
 +
Three.js
 +
GeoJSON/TopoJSON
 +
Google Geocoding

```

Prefer `react-globe.gl` for:

- globe rendering
- points
- labels
- arcs
- polygons
- interaction
- point-of-view control

Use direct Three.js customization only when the required visual effect cannot reasonably be achieved through the library.

---

# 37. Final Goal

The finished component must create this experience:

```text
             🌍
        REAL 3D EARTH
             │
      slowly rotating
             │
             ▼

User searches:

       "Ahmedabad"

             ↓

       GEOCODING
             ↓
23.0225, 72.5714
             ↓
       3D LOCATION
             ↓
      EARTH ROTATES
             ↓

             🌍
              \
               ● Ahmedabad

             ↓

     Gujarat highlighted
     India subtly highlighted
     Ahmedabad marker active

```

Then the user searches:

```text
Tokyo

```

and the Earth smoothly transitions from Ahmedabad to Tokyo.

The user can then manually drag the Earth, zoom, explore, click another location, and continue discovering the world.

---

# 38. Definition of Done

The skill implementation is considered complete only when:

-  Earth is genuinely 3D
-  Earth rotates automatically
-  Earth can be manually dragged
-  Earth supports zoom
-  Earth supports mobile touch
-  Continents are geographically correct
-  Country boundaries can be displayed
-  State boundaries can be displayed
-  Cities can be resolved
-  Countries can be resolved
-  States can be resolved
-  Latitude/longitude are accurate
-  Search can control the globe
-  Globe can update the search
-  Destination marker attaches to Earth
-  Selected destination reaches front-center
-  Country/state highlighting works
-  Travel routes can be animated
-  Famous-place system can integrate with globe
-  Unknown city fallback works
-  Globe remains performant
-  WebGL fallback exists
-  Reduced-motion support exists
-  Component is reusable
-  TypeScript types are defined
-  Globe logic is separated into modular files

The final result should feel like a **real interactive Earth used by a premium travel product**, not a simple spinning globe demo.
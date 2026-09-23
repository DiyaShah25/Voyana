import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import * as THREE from 'three';
import type { GlobeLocation, GlobeLocationType, GlobeRoute, VoyanaGlobeHandle, VoyanaGlobeProps } from './globe.types';
import { greatCirclePoints, latLngToVector3, makeFocusQuaternion, vector3ToLatLng } from './globe.utils';

// Local high-resolution photorealistic NASA texture maps
const earthTextureUrl = '/textures/earth_atmos_2048.jpg';
const earthNormalUrl = '/textures/earth_normal_2048.jpg';
const earthSpecularUrl = '/textures/earth_specular_2048.jpg';
const cloudTextureUrl = '/textures/earth_clouds_1024.png';

export interface KeyCity {
  name: string;
  country: string;
  latitude: number;
  longitude: number;
}

export const keyWorldCities: KeyCity[] = [
  { name: 'Tokyo', country: 'Japan', latitude: 35.6762, longitude: 139.6503 },
  { name: 'Paris', country: 'France', latitude: 48.8566, longitude: 2.3522 },
  { name: 'New York', country: 'United States', latitude: 40.7128, longitude: -74.006 },
  { name: 'Cairo', country: 'Egypt', latitude: 30.0444, longitude: 31.2357 },
  { name: 'Bali', country: 'Indonesia', latitude: -8.4095, longitude: 115.1889 },
  { name: 'Rome', country: 'Italy', latitude: 41.9028, longitude: 12.4964 },
  { name: 'Reykjavik', country: 'Iceland', latitude: 64.1466, longitude: -21.9426 },
  { name: 'Cape Town', country: 'South Africa', latitude: -33.9249, longitude: 18.4241 },
  { name: 'Sydney', country: 'Australia', latitude: -33.8688, longitude: 151.2093 },
  { name: 'Rio de Janeiro', country: 'Brazil', latitude: -22.9068, longitude: -43.1729 },
  { name: 'Santorini', country: 'Greece', latitude: 36.3932, longitude: 25.4615 },
  { name: 'Kyoto', country: 'Japan', latitude: 35.0116, longitude: 135.7681 },
];

export interface VoyanaGlobeExtendedProps extends VoyanaGlobeProps {
  metadata?: {
    temperature?: string;
    style?: string;
  };
}

const VoyanaGlobe = forwardRef<VoyanaGlobeHandle, VoyanaGlobeExtendedProps>(function VoyanaGlobe(
  { selectedLocation, routes = [], autoRotate = true, onLocationSelect, onGlobeReady, metadata },
  ref,
) {
  const containerRef = useRef<HTMLDivElement>(null);
  const selectedRef = useRef(selectedLocation);
  const onLocationSelectRef = useRef(onLocationSelect);
  const autoRotateRef = useRef(autoRotate);
  const apiRef = useRef<VoyanaGlobeHandle | null>(null);

  // Floating label projected coordinates on 2D screen
  const [labelPos, setLabelPos] = useState<{ x: number; y: number; visible: boolean } | null>(null);

  selectedRef.current = selectedLocation;
  onLocationSelectRef.current = onLocationSelect;
  autoRotateRef.current = autoRotate;

  useImperativeHandle(ref, () => ({
    focusOnLocation: (latitude: number, longitude: number, type?: GlobeLocationType) =>
      apiRef.current?.focusOnLocation(latitude, longitude, type),
    setMarker: (location?: GlobeLocation) => apiRef.current?.setMarker(location),
    reset: () => apiRef.current?.reset(),
    pauseRotation: () => apiRef.current?.pauseRotation(),
    resumeRotation: () => apiRef.current?.resumeRotation(),
    zoomIn: () => apiRef.current?.zoomIn(),
    zoomOut: () => apiRef.current?.zoomOut(),
  }), []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const scene = new THREE.Scene();

    // Perspective camera positioned for a commanding planetary presence with generous breathing room
    const camera = new THREE.PerspectiveCamera(44, 1, 0.1, 100);
    camera.position.set(0, 0, 3.20);

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true,
        powerPreference: 'high-performance',
      });
    } catch {
      container.dataset.webgl = 'unavailable';
      return;
    }

    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.setClearColor(0x000000, 0); // Pure transparent so it blends seamlessly
    container.appendChild(renderer.domElement);

    const earthGroup = new THREE.Group();
    scene.add(earthGroup);

    // Natural axial tilt (23.5 degrees)
    earthGroup.rotation.z = THREE.MathUtils.degToRad(16);

    // 1. HIGH-TESSELLATION 3D SPHERICAL EARTH (128x128 vertices)
    const sphereGeometry = new THREE.SphereGeometry(1, 128, 128);
    const textureLoader = new THREE.TextureLoader();

    // Realistic Planetary Material: Specular oceans, relief terrain, natural light response
    const earthMaterial = new THREE.MeshPhongMaterial({
      color: 0xffffff,
      shininess: 32,
      specular: new THREE.Color(0x2d6898), // Realistic ocean blue glint
    });

    const earthMesh = new THREE.Mesh(sphereGeometry, earthMaterial);
    earthMesh.name = 'earth';
    earthGroup.add(earthMesh);

    // 2. DETAILED CLOUD SPHERE (Separate altitude layer for genuine 3D parallax)
    const cloudGeometry = new THREE.SphereGeometry(1.015, 96, 96);
    const cloudMaterial = new THREE.MeshPhongMaterial({
      transparent: true,
      opacity: 0.40,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    const cloudMesh = new THREE.Mesh(cloudGeometry, cloudMaterial);
    earthGroup.add(cloudMesh);

    // 3. FRESNEL ATMOSPHERE RIM HALO (Delicate planetary daylight limb glow)
    const atmosphereMaterial = new THREE.ShaderMaterial({
      transparent: true,
      side: THREE.BackSide,
      blending: THREE.AdditiveBlending,
      uniforms: {
        glowColor: { value: new THREE.Color(0x38bdf8) }, // Natural planetary sky blue
      },
      vertexShader: `
        varying vec3 vNormal;
        void main() {
          vNormal = normalize(normalMatrix * normal);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 glowColor;
        varying vec3 vNormal;
        void main() {
          float intensity = pow(0.70 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 2.2);
          gl_FragColor = vec4(glowColor, max(0.0, intensity) * 0.95);
        }
      `,
    });
    const atmosphereMesh = new THREE.Mesh(new THREE.SphereGeometry(1.055, 64, 64), atmosphereMaterial);
    scene.add(atmosphereMesh);

    // 4. PLANETARY DIRECTIONAL SUNLIGHT (Creates distinct 3D daylight and terminator curvature)
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.42);
    scene.add(ambientLight);

    const sunLight = new THREE.DirectionalLight(0xfffdf4, 2.7);
    sunLight.position.set(-6, 3.8, 5.0);
    scene.add(sunLight);

    const softFillLight = new THREE.DirectionalLight(0x38bdf8, 0.28);
    softFillLight.position.set(5, -2, -2.5);
    scene.add(softFillLight);

    // 5. GLOBAL CITY REFERENCE PINS (Subtle markers across continents)
    const referenceGroup = new THREE.Group();
    earthGroup.add(referenceGroup);

    keyWorldCities.forEach((city) => {
      const pos = latLngToVector3(city.latitude, city.longitude, 1.008);
      const dot = new THREE.Mesh(
        new THREE.SphereGeometry(0.011, 12, 12),
        new THREE.MeshBasicMaterial({ color: 0x0b7a3b, transparent: true, opacity: 0.7 })
      );
      dot.position.copy(pos);
      referenceGroup.add(dot);
    });

    // 6. ACTIVE SELECTED LOCATION MARKER (Botanical Green + Pulsing Wave Ring)
    let activeMarker: THREE.Group | null = null;

    const setMarker = (location: GlobeLocation | undefined) => {
      if (activeMarker) {
        earthGroup.remove(activeMarker);
        activeMarker.traverse((obj) => {
          if (obj instanceof THREE.Mesh) {
            obj.geometry.dispose();
            if (Array.isArray(obj.material)) obj.material.forEach((m) => m.dispose());
            else obj.material.dispose();
          }
        });
        activeMarker = null;
      }

      if (!location) {
        setLabelPos(null);
        return;
      }

      const normal = latLngToVector3(location.latitude, location.longitude, 1).normalize();

      activeMarker = new THREE.Group();
      activeMarker.position.copy(normal.clone().multiplyScalar(1.032));

      // Central emerald beacon dot
      const centerDot = new THREE.Mesh(
        new THREE.SphereGeometry(0.028, 20, 20),
        new THREE.MeshBasicMaterial({ color: 0x10b981 })
      );

      // Inner white luminous core for pinpoint clarity
      const coreDot = new THREE.Mesh(
        new THREE.SphereGeometry(0.014, 16, 16),
        new THREE.MeshBasicMaterial({ color: 0xffffff })
      );

      // Pulsing outer ring
      const ring = new THREE.Mesh(
        new THREE.RingGeometry(0.046, 0.066, 36),
        new THREE.MeshBasicMaterial({ color: 0x10b981, transparent: true, opacity: 0.9, side: THREE.DoubleSide })
      );
      ring.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), normal);

      activeMarker.add(centerDot, coreDot, ring);
      earthGroup.add(activeMarker);
    };

    // 7. GREAT-CIRCLE FLIGHT ROUTE LINES
    let routeGroup = new THREE.Group();
    earthGroup.add(routeGroup);

    const rebuildRoutes = () => {
      earthGroup.remove(routeGroup);
      routeGroup.traverse((obj) => {
        if (obj instanceof THREE.Line) {
          obj.geometry.dispose();
          (obj.material as THREE.Material).dispose();
        }
      });
      routeGroup = new THREE.Group();
      routes.forEach((route) => {
        const points = greatCirclePoints(route.from, route.to, 1.032);
        const line = new THREE.Line(
          new THREE.BufferGeometry().setFromPoints(points),
          new THREE.LineBasicMaterial({ color: 0x10b981, transparent: true, opacity: 0.85, linewidth: 2 })
        );
        routeGroup.add(line);
      });
      earthGroup.add(routeGroup);
    };
    rebuildRoutes();

    // 8. CAMERA & SLERP ANIMATION INTERPOLATION
    const targetQuaternion = new THREE.Quaternion();
    const focusStartQuaternion = new THREE.Quaternion();
    let focusStartedAt = 0;
    let focusing = false;
    let rotationPaused = false;
    let cameraDistance = 3.20;
    let startCameraDistance = 3.20;
    let targetCameraDistance = 3.20;
    let lastInteraction = performance.now();

    const focusOnLocation = (latitude: number, longitude: number, type?: GlobeLocationType) => {
      targetQuaternion.copy(makeFocusQuaternion(latitude, longitude));
      focusStartQuaternion.copy(earthGroup.quaternion);
      focusStartedAt = performance.now();
      focusing = true;
      rotationPaused = true;
      lastInteraction = performance.now();

      startCameraDistance = cameraDistance;
      if (type === 'city' || type === 'landmark') targetCameraDistance = 3.05;
      else if (type === 'region') targetCameraDistance = 3.14;
      else targetCameraDistance = 3.20;
    };

    const reset = () => {
      targetQuaternion.identity();
      focusStartQuaternion.copy(earthGroup.quaternion);
      focusStartedAt = performance.now();
      focusing = true;
      rotationPaused = false;
      targetCameraDistance = 3.20;
    };

    const pauseRotation = () => {
      rotationPaused = true;
      lastInteraction = performance.now();
    };

    const resumeRotation = () => {
      rotationPaused = false;
      lastInteraction = performance.now();
    };

    const zoomIn = () => {
      cameraDistance = Math.max(2.98, cameraDistance - 0.12);
      lastInteraction = performance.now();
    };

    const zoomOut = () => {
      cameraDistance = Math.min(3.90, cameraDistance + 0.12);
      lastInteraction = performance.now();
    };

    apiRef.current = { focusOnLocation, reset, pauseRotation, resumeRotation, zoomIn, zoomOut, setMarker };

    // 9. LOAD PHOTOREALISTIC NASA TEXTURES LOCALLY
    const loadTextures = async () => {
      try {
        const [earthTex, normalTex, specTex, cloudTex] = await Promise.all([
          textureLoader.loadAsync(earthTextureUrl),
          textureLoader.loadAsync(earthNormalUrl),
          textureLoader.loadAsync(earthSpecularUrl),
          textureLoader.loadAsync(cloudTextureUrl),
        ]);

        earthTex.colorSpace = THREE.SRGBColorSpace;
        cloudTex.colorSpace = THREE.SRGBColorSpace;

        earthMaterial.map = earthTex;
        earthMaterial.normalMap = normalTex;
        earthMaterial.normalScale.set(0.75, 0.75); // Enhanced relief elevation
        earthMaterial.specularMap = specTex;
        earthMaterial.needsUpdate = true;

        cloudMaterial.map = cloudTex;
        cloudMaterial.needsUpdate = true;
      } catch (err) {
        console.warn('Local texture load notice:', err);
      }
    };
    void loadTextures();

    // 10. RESIZE OBSERVER
    const resize = () => {
      const width = container.clientWidth || 1;
      const height = container.clientHeight || width;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height, false);
    };

    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(container);
    resize();

    // 11. MOUSE / TOUCH GESTURES
    let pointerDown = false;
    let movedSinceDown = false;
    let lastPointer = { x: 0, y: 0 };
    const raycaster = new THREE.Raycaster();
    const pointerVec = new THREE.Vector2();

    const handlePointerDown = (e: PointerEvent) => {
      pointerDown = true;
      movedSinceDown = false;
      lastPointer = { x: e.clientX, y: e.clientY };
      renderer.domElement.setPointerCapture(e.pointerId);
      pauseRotation();
    };

    const handlePointerMove = (e: PointerEvent) => {
      if (!pointerDown) return;
      const dx = e.clientX - lastPointer.x;
      const dy = e.clientY - lastPointer.y;
      if (Math.abs(dx) + Math.abs(dy) > 2) movedSinceDown = true;

      earthGroup.rotateY(dx * 0.005);
      earthGroup.rotateX(dy * 0.0035);
      lastPointer = { x: e.clientX, y: e.clientY };
      lastInteraction = performance.now();
    };

    const handlePointerUp = (e: PointerEvent) => {
      pointerDown = false;
      renderer.domElement.releasePointerCapture(e.pointerId);

      // Click detection: raycast to find clicked coordinates on the 3D globe
      if (!movedSinceDown) {
        const bounds = renderer.domElement.getBoundingClientRect();
        pointerVec.x = ((e.clientX - bounds.left) / bounds.width) * 2 - 1;
        pointerVec.y = -((e.clientY - bounds.top) / bounds.height) * 2 + 1;
        raycaster.setFromCamera(pointerVec, camera);

        const hits = raycaster.intersectObject(earthMesh, false);
        if (hits.length > 0) {
          const localHit = earthGroup.worldToLocal(hits[0].point.clone());
          const coords = vector3ToLatLng(localHit);
          onLocationSelectRef.current?.({
            name: 'Explored Coordinates',
            latitude: coords.latitude,
            longitude: coords.longitude,
            type: 'region',
          });
        }
      }
    };

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      // Clamped so the spherical curvature is ALWAYS prominently visible, never flattening or clipping against borders
      cameraDistance = THREE.MathUtils.clamp(cameraDistance + e.deltaY * 0.0016, 2.98, 3.90);
      lastInteraction = performance.now();
      pauseRotation();
    };

    const canvas = renderer.domElement;
    canvas.addEventListener('pointerdown', handlePointerDown);
    canvas.addEventListener('pointermove', handlePointerMove);
    canvas.addEventListener('pointerup', handlePointerUp);
    canvas.addEventListener('pointercancel', handlePointerUp);
    canvas.addEventListener('wheel', handleWheel, { passive: false });

    // 12. ANIMATION LOOP & 2D PROJECTION
    const clock = new THREE.Clock();
    let animId = 0;

    const animate = () => {
      animId = window.requestAnimationFrame(animate);
      const elapsed = clock.getElapsedTime();
      const now = performance.now();

      // Smooth cinematic camera transition
      if (focusing) {
        const progress = THREE.MathUtils.clamp((now - focusStartedAt) / 1600, 0, 1);
        const eased = 1 - Math.pow(1 - progress, 3); // cubic ease-out
        earthGroup.quaternion.copy(focusStartQuaternion).slerp(targetQuaternion, eased);

        const zoomProgress = THREE.MathUtils.clamp((progress - 0.2) / 0.8, 0, 1);
        const zoomEased = 1 - Math.pow(1 - zoomProgress, 3);
        cameraDistance = startCameraDistance + (targetCameraDistance - startCameraDistance) * zoomEased;

        if (progress >= 1) focusing = false;
      } else if (autoRotateRef.current && !rotationPaused && !pointerDown && now - lastInteraction > 1400) {
        earthGroup.rotateY(0.00065);
      }

      if (!pointerDown && rotationPaused && autoRotateRef.current && now - lastInteraction > 5000 && !selectedRef.current) {
        rotationPaused = false;
      }

      // Gentle independent cloud drift
      cloudMesh.rotation.y = elapsed * 0.014;

      // Pulse active marker ring
      if (activeMarker) {
        const ringPulse = 1 + Math.sin(elapsed * 3.6) * 0.22;
        if (activeMarker.children[2]) {
          activeMarker.children[2].scale.setScalar(ringPulse);
        }

        // Project 3D marker position to 2D screen coordinates
        const markerWorldPos = activeMarker.getWorldPosition(new THREE.Vector3());
        const camDir = camera.position.clone().sub(markerWorldPos).normalize();
        const normalWorld = markerWorldPos.clone().normalize();
        const isFacing = normalWorld.dot(camDir) > 0.05; // Visible on facing hemisphere

        if (isFacing) {
          const screenPos = markerWorldPos.clone().project(camera);
          const x = (screenPos.x * 0.5 + 0.5) * container.clientWidth;
          const y = (-screenPos.y * 0.5 + 0.5) * container.clientHeight;
          setLabelPos({ x, y, visible: true });
        } else {
          setLabelPos(null);
        }
      } else {
        setLabelPos(null);
      }

      // Camera easing
      camera.position.z += (cameraDistance - camera.position.z) * 0.08;
      renderer.render(scene, camera);
    };

    animate();
    onGlobeReady?.();

    return () => {
      window.cancelAnimationFrame(animId);
      resizeObserver.disconnect();
      canvas.removeEventListener('pointerdown', handlePointerDown);
      canvas.removeEventListener('pointermove', handlePointerMove);
      canvas.removeEventListener('pointerup', handlePointerUp);
      canvas.removeEventListener('pointercancel', handlePointerUp);
      canvas.removeEventListener('wheel', handleWheel);
      sphereGeometry.dispose();
      earthMaterial.dispose();
      cloudGeometry.dispose();
      cloudMaterial.dispose();
      atmosphereMaterial.dispose();
      renderer.dispose();
      if (container.contains(canvas)) container.removeChild(canvas);
      apiRef.current = null;
    };
  }, [onGlobeReady, routes]);

  useEffect(() => {
    if (selectedLocation) {
      apiRef.current?.focusOnLocation(selectedLocation.latitude, selectedLocation.longitude, selectedLocation.type);
      apiRef.current?.setMarker(selectedLocation);
    } else {
      apiRef.current?.setMarker(undefined);
    }
  }, [selectedLocation]);

  return (
    <div className="voyana-globe-circular-container">
      {/* Subtle Circular Atmospheric Halo Aura */}
      <div className="globe-circular-aura" aria-hidden="true" />

      {/* WebGL Canvas mount */}
      <div ref={containerRef} className="globe-canvas-mount" aria-label="Interactive 3D Earth Globe" />

      {/* Projected Editorial 2D Location Pin Label */}
      {labelPos && labelPos.visible && selectedLocation && (
        <div
          className="editorial-globe-label animate-fade-in"
          style={{
            left: `${labelPos.x}px`,
            top: `${labelPos.y}px`,
          }}
        >
          <div className="label-stem" />
          <div className="label-content">
            <div className="label-city">{selectedLocation.name}</div>
            <div className="label-country">{selectedLocation.country || 'Global Destination'}</div>
            {metadata?.temperature && (
              <div className="label-meta">
                <span>{metadata.temperature}</span>
                {metadata.style && <span>&bull; {metadata.style}</span>}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
});

VoyanaGlobe.displayName = 'VoyanaGlobe';

export default VoyanaGlobe;

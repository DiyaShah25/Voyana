import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import * as THREE from 'three';
import type { GlobeLocation, GlobeLocationType, GlobeRoute, VoyanaGlobeHandle, VoyanaGlobeProps } from './globe.types';
import { greatCirclePoints, latLngToVector3, makeFocusQuaternion, vector3ToLatLng } from './globe.utils';

const earthTextureUrl = 'https://threejs.org/examples/textures/planets/earth_atmos_2048.jpg';
const earthNormalUrl = 'https://threejs.org/examples/textures/planets/earth_normal_2048.jpg';
const earthSpecularUrl = 'https://threejs.org/examples/textures/planets/earth_specular_2048.jpg';
const cloudTextureUrl = 'https://threejs.org/examples/textures/planets/earth_clouds_1024.png';

export interface EnhancedVoyanaGlobeProps extends VoyanaGlobeProps {
  onHoverLocation?: (info: { name: string; x: number; y: number } | null) => void;
}

const VoyanaGlobe = forwardRef<VoyanaGlobeHandle, EnhancedVoyanaGlobeProps>(function VoyanaGlobe(
  { selectedLocation, routes = [], autoRotate = true, onLocationSelect, onGlobeReady },
  ref,
) {
  const containerRef = useRef<HTMLDivElement>(null);
  const selectedRef = useRef(selectedLocation);
  const onLocationSelectRef = useRef(onLocationSelect);
  const autoRotateRef = useRef(autoRotate);
  const apiRef = useRef<VoyanaGlobeHandle | null>(null);

  const [tooltip, setTooltip] = useState<{ text: string; x: number; y: number } | null>(null);

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
    const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100);
    camera.position.set(0, 0, 3.25);

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    } catch {
      container.dataset.webgl = 'unavailable';
      return;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.setClearColor(0x000000, 0); // Transparent background for pure white page
    container.appendChild(renderer.domElement);

    const earthGroup = new THREE.Group();
    scene.add(earthGroup);

    // Natural Earth Material: True natural textures with subtle specular ocean shine
    const textureLoader = new THREE.TextureLoader();
    const earthMaterial = new THREE.MeshPhongMaterial({
      color: 0xffffff,
      shininess: 18,
      specular: new THREE.Color(0x1a3344),
    });
    const earth = new THREE.Mesh(new THREE.SphereGeometry(1, 96, 96), earthMaterial);
    earth.name = 'earth';
    earthGroup.add(earth);

    // Realistic Cloud Layer: Delicate natural opacity
    const cloudMaterial = new THREE.MeshPhongMaterial({
      transparent: true,
      opacity: 0.28,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    const clouds = new THREE.Mesh(new THREE.SphereGeometry(1.012, 64, 64), cloudMaterial);
    earthGroup.add(clouds);

    // Subtle Natural Atmospheric Glow Shader (Clean, muted oceanic daylight rim)
    const atmosphereMaterial = new THREE.ShaderMaterial({
      transparent: true,
      side: THREE.BackSide,
      blending: THREE.AdditiveBlending,
      uniforms: {
        glowColor: { value: new THREE.Color(0x4aa3df) },
        coefficient: { value: 0.32 },
        power: { value: 3.6 },
      },
      vertexShader: `
        varying vec3 vNormal;
        varying vec3 vWorldPosition;
        void main() {
          vNormal = normalize(normalMatrix * normal);
          vec4 worldPosition = modelMatrix * vec4(position, 1.0);
          vWorldPosition = worldPosition.xyz;
          gl_Position = projectionMatrix * viewMatrix * worldPosition;
        }
      `,
      fragmentShader: `
        uniform vec3 glowColor;
        uniform float coefficient;
        uniform float power;
        varying vec3 vNormal;
        varying vec3 vWorldPosition;
        void main() {
          vec3 viewDirection = normalize(cameraPosition - vWorldPosition);
          float intensity = pow(coefficient - dot(vNormal, viewDirection), power);
          gl_FragColor = vec4(glowColor, intensity * 0.7);
        }
      `,
    });
    const atmosphere = new THREE.Mesh(new THREE.SphereGeometry(1.065, 64, 64), atmosphereMaterial);
    scene.add(atmosphere);

    // Studio Lighting: Soft daylight balanced with warm sunlight
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.25);
    scene.add(ambientLight);

    const sun = new THREE.DirectionalLight(0xfff8ee, 2.2);
    sun.position.set(-4, 3, 5);
    scene.add(sun);

    const softFill = new THREE.DirectionalLight(0x8bc3eb, 0.45);
    softFill.position.set(4, -2, -3);
    scene.add(softFill);

    let marker: THREE.Group | null = null;
    let routeGroup = new THREE.Group();
    earthGroup.add(routeGroup);

    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    const targetQuaternion = new THREE.Quaternion();
    const focusStartQuaternion = new THREE.Quaternion();
    let focusStartedAt = 0;
    let focusing = false;
    let lastInteraction = performance.now();
    let rotationPaused = false;
    let cameraDistance = 3.25;
    let pointerDown = false;
    let movedSinceDown = false;
    let lastPointer = { x: 0, y: 0 };

    // Minimal Forest Green & Gold Location Pin
    const setMarker = (location: GlobeLocation | undefined) => {
      if (marker) {
        earthGroup.remove(marker);
        marker.traverse((object) => {
          if (object instanceof THREE.Mesh) {
            object.geometry.dispose();
            if (Array.isArray(object.material)) object.material.forEach((mat) => mat.dispose());
            else object.material.dispose();
          }
        });
        marker = null;
      }
      if (!location) return;

      const normal = latLngToVector3(location.latitude, location.longitude, 1).normalize();
      marker = new THREE.Group();
      marker.position.copy(normal.clone().multiplyScalar(1.032));

      // Forest green central dot
      const dot = new THREE.Mesh(
        new THREE.SphereGeometry(0.024, 16, 16),
        new THREE.MeshBasicMaterial({ color: 0x15803d }) // deep forest green
      );

      // Gold pulsing outer ring
      const ring = new THREE.Mesh(
        new THREE.RingGeometry(0.042, 0.054, 32),
        new THREE.MeshBasicMaterial({ color: 0xd97706, transparent: true, opacity: 0.85, side: THREE.DoubleSide })
      );
      ring.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), normal);

      // Delicate location pin needle
      const pin = new THREE.Mesh(
        new THREE.CylinderGeometry(0.006, 0.006, 0.1, 8),
        new THREE.MeshBasicMaterial({ color: 0x15803d })
      );
      pin.position.copy(normal.clone().multiplyScalar(0.05));
      pin.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), normal);

      marker.add(dot, ring, pin);
      earthGroup.add(marker);
    };

    // Rebuild great circle routes
    const rebuildRoutes = () => {
      earthGroup.remove(routeGroup);
      routeGroup.traverse((object) => {
        if (object instanceof THREE.Line) {
          object.geometry.dispose();
          (object.material as THREE.Material).dispose();
        }
      });
      routeGroup = new THREE.Group();
      routes.forEach((route) => {
        const points = greatCirclePoints(route.from, route.to, 1.035);
        const line = new THREE.Line(
          new THREE.BufferGeometry().setFromPoints(points),
          new THREE.LineBasicMaterial({ color: 0x15803d, transparent: true, opacity: 0.6, linewidth: 2 })
        );
        routeGroup.add(line);
      });
      earthGroup.add(routeGroup);
    };
    rebuildRoutes();

    let startCameraDistance = 3.25;
    let targetCameraDistance = 3.25;

    const focusOnLocation = (latitude: number, longitude: number, type?: GlobeLocationType) => {
      targetQuaternion.copy(makeFocusQuaternion(latitude, longitude));
      focusStartQuaternion.copy(earthGroup.quaternion);
      focusStartedAt = performance.now();
      focusing = true;
      rotationPaused = true;
      lastInteraction = performance.now();

      startCameraDistance = cameraDistance;
      if (type === 'city' || type === 'landmark') targetCameraDistance = 2.0;
      else if (type === 'state') targetCameraDistance = 2.35;
      else if (type === 'country') targetCameraDistance = 2.75;
      else targetCameraDistance = 3.25;
    };

    const reset = () => {
      targetQuaternion.identity();
      focusStartQuaternion.copy(earthGroup.quaternion);
      focusStartedAt = performance.now();
      focusing = true;
      rotationPaused = false;
      targetCameraDistance = 3.25;
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
      cameraDistance = Math.max(1.85, cameraDistance - 0.22);
      lastInteraction = performance.now();
    };

    const zoomOut = () => {
      cameraDistance = Math.min(4.4, cameraDistance + 0.22);
      lastInteraction = performance.now();
    };

    apiRef.current = { focusOnLocation, reset, pauseRotation, resumeRotation, zoomIn, zoomOut, setMarker };

    // Load High-Res Earth Maps
    const loadTextures = async () => {
      try {
        const [earthTexture, normalTexture, specularTexture, cloudTexture] = await Promise.all([
          textureLoader.loadAsync(earthTextureUrl),
          textureLoader.loadAsync(earthNormalUrl),
          textureLoader.loadAsync(earthSpecularUrl),
          textureLoader.loadAsync(cloudTextureUrl),
        ]);
        earthTexture.colorSpace = THREE.SRGBColorSpace;
        cloudTexture.colorSpace = THREE.SRGBColorSpace;
        earthMaterial.map = earthTexture;
        earthMaterial.normalMap = normalTexture;
        earthMaterial.normalScale.set(0.35, 0.35);
        earthMaterial.specularMap = specularTexture;
        earthMaterial.needsUpdate = true;
        cloudMaterial.map = cloudTexture;
        cloudMaterial.needsUpdate = true;
      } catch {
        // Fallback silently if textures fail
      }
    };
    void loadTextures();

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

    const handlePointerDown = (event: PointerEvent) => {
      pointerDown = true;
      movedSinceDown = false;
      lastPointer = { x: event.clientX, y: event.clientY };
      renderer.domElement.setPointerCapture(event.pointerId);
      pauseRotation();
    };

    const handlePointerMove = (event: PointerEvent) => {
      if (!pointerDown) {
        // Hover tooltip tracking
        const bounds = renderer.domElement.getBoundingClientRect();
        pointer.x = ((event.clientX - bounds.left) / bounds.width) * 2 - 1;
        pointer.y = -((event.clientY - bounds.top) / bounds.height) * 2 + 1;
        raycaster.setFromCamera(pointer, camera);
        const hit = raycaster.intersectObject(earth, false)[0];
        if (hit) {
          const localPoint = earthGroup.worldToLocal(hit.point.clone());
          const coords = vector3ToLatLng(localPoint);
          setTooltip({
            text: `${Math.abs(coords.latitude).toFixed(1)}°${coords.latitude >= 0 ? 'N' : 'S'}, ${Math.abs(coords.longitude).toFixed(1)}°${coords.longitude >= 0 ? 'E' : 'W'}`,
            x: event.clientX - bounds.left,
            y: event.clientY - bounds.top - 28,
          });
        } else {
          setTooltip(null);
        }
        return;
      }

      const deltaX = event.clientX - lastPointer.x;
      const deltaY = event.clientY - lastPointer.y;
      if (Math.abs(deltaX) + Math.abs(deltaY) > 2) movedSinceDown = true;
      earthGroup.rotateY(deltaX * 0.0055);
      earthGroup.rotateX(deltaY * 0.0035);
      lastPointer = { x: event.clientX, y: event.clientY };
      lastInteraction = performance.now();
      setTooltip(null);
    };

    const handlePointerUp = (event: PointerEvent) => {
      pointerDown = false;
      renderer.domElement.releasePointerCapture(event.pointerId);
      if (!movedSinceDown) {
        const bounds = renderer.domElement.getBoundingClientRect();
        pointer.x = ((event.clientX - bounds.left) / bounds.width) * 2 - 1;
        pointer.y = -((event.clientY - bounds.top) / bounds.height) * 2 + 1;
        raycaster.setFromCamera(pointer, camera);
        const hit = raycaster.intersectObject(earth, false)[0];
        if (hit) {
          const localPoint = earthGroup.worldToLocal(hit.point.clone());
          const coordinates = vector3ToLatLng(localPoint);
          onLocationSelectRef.current?.({
            name: 'Explored Coordinates',
            latitude: coordinates.latitude,
            longitude: coordinates.longitude,
            type: 'region',
          });
        }
      }
    };

    const handlePointerLeave = () => {
      setTooltip(null);
    };

    const handleWheel = (event: WheelEvent) => {
      event.preventDefault();
      cameraDistance = THREE.MathUtils.clamp(cameraDistance + event.deltaY * 0.0016, 1.85, 4.4);
      lastInteraction = performance.now();
      pauseRotation();
    };

    const canvas = renderer.domElement;
    canvas.addEventListener('pointerdown', handlePointerDown);
    canvas.addEventListener('pointermove', handlePointerMove);
    canvas.addEventListener('pointerup', handlePointerUp);
    canvas.addEventListener('pointercancel', handlePointerUp);
    canvas.addEventListener('pointerleave', handlePointerLeave);
    canvas.addEventListener('wheel', handleWheel, { passive: false });

    const clock = new THREE.Clock();
    let animationFrame = 0;

    const animate = () => {
      animationFrame = window.requestAnimationFrame(animate);
      const elapsed = clock.getElapsedTime();
      const now = performance.now();

      // Smooth cinematic spherical slerp camera transitions
      if (focusing) {
        const progress = THREE.MathUtils.clamp((now - focusStartedAt) / 2200, 0, 1);
        const eased = 1 - Math.pow(1 - progress, 3); // cubic ease-out
        earthGroup.quaternion.copy(focusStartQuaternion).slerp(targetQuaternion, eased);

        const zoomProgress = THREE.MathUtils.clamp((progress - 0.25) / 0.75, 0, 1);
        const zoomEased = 1 - Math.pow(1 - zoomProgress, 3);
        cameraDistance = startCameraDistance + (targetCameraDistance - startCameraDistance) * zoomEased;

        if (progress >= 1) focusing = false;
      } else if (autoRotateRef.current && !rotationPaused && !pointerDown && now - lastInteraction > 1400) {
        earthGroup.rotateY(0.00075);
      }

      if (!pointerDown && rotationPaused && autoRotateRef.current && now - lastInteraction > 4500 && !selectedRef.current) {
        rotationPaused = false;
      }

      clouds.rotation.y = elapsed * 0.01;

      if (marker) {
        const pulse = 1 + Math.sin(elapsed * 3.2) * 0.16;
        marker.children[0].scale.setScalar(pulse);
        marker.children[1].scale.setScalar(pulse);
      }

      camera.position.z += (cameraDistance - camera.position.z) * 0.08;
      renderer.render(scene, camera);
    };

    animate();
    onGlobeReady?.();

    return () => {
      window.cancelAnimationFrame(animationFrame);
      resizeObserver.disconnect();
      canvas.removeEventListener('pointerdown', handlePointerDown);
      canvas.removeEventListener('pointermove', handlePointerMove);
      canvas.removeEventListener('pointerup', handlePointerUp);
      canvas.removeEventListener('pointercancel', handlePointerUp);
      canvas.removeEventListener('pointerleave', handlePointerLeave);
      canvas.removeEventListener('wheel', handleWheel);
      earth.geometry.dispose();
      earthMaterial.dispose();
      clouds.geometry.dispose();
      cloudMaterial.dispose();
      atmosphere.geometry.dispose();
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
    <div className="voyana-globe-wrapper">
      <div ref={containerRef} className="voyana-globe" aria-label="Interactive 3D Earth Globe" />
      {tooltip && (
        <div
          className="globe-tooltip animate-fade-in"
          style={{ left: `${tooltip.x}px`, top: `${tooltip.y}px` }}
        >
          {tooltip.text}
        </div>
      )}
    </div>
  );
});

VoyanaGlobe.displayName = 'VoyanaGlobe';

export default VoyanaGlobe;

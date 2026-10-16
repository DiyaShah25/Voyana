/**
 * Globe Utility Functions
 * Provides math helpers for converting between geographic coordinates
 * (lat/lng) and Three.js 3D vectors, computing focus quaternions,
 * and generating great-circle arc points for route rendering.
 */

import * as THREE from 'three';

// Convert geographic lat/lng to a 3D point on a sphere
export function latLngToVector3(latitude: number, longitude: number, radius: number): THREE.Vector3 {
  const lat = THREE.MathUtils.degToRad(latitude);
  const lon = THREE.MathUtils.degToRad(longitude);
  const cosLat = Math.cos(lat);
  
  // Greenwich sits on +X, 90E on -Z and 90W on +Z
  return new THREE.Vector3(
    radius * cosLat * Math.cos(lon),
    radius * Math.sin(lat),
    -radius * cosLat * Math.sin(lon),
  );
}

// Convert a 3D vector back to geographic coordinates
export function vector3ToLatLng(position: THREE.Vector3): { latitude: number; longitude: number } {
  const normalized = position.clone().normalize();
  return {
    latitude: THREE.MathUtils.radToDeg(Math.asin(normalized.y)),
    longitude: THREE.MathUtils.radToDeg(Math.atan2(normalized.x, -normalized.z)),
  };
}

// Build a quaternion that rotates the globe to bring a lat/lng into view
export function makeFocusQuaternion(latitude: number, longitude: number): THREE.Quaternion {
  const lat = THREE.MathUtils.degToRad(latitude);
  const lon = THREE.MathUtils.degToRad(longitude);
  
  // Ry swings the meridian round to face the camera; Rx tilts the parallel up
  const euler = new THREE.Euler(lat, -(Math.PI / 2 + lon), 0, 'XYZ');
  return new THREE.Quaternion().setFromEuler(euler);
}

// Generate interpolated points along a great-circle arc between two locations
export function greatCirclePoints(from: GlobeLocationPoint, to: GlobeLocationPoint, radius: number, segments = 64): THREE.Vector3[] {
  const start = latLngToVector3(from.latitude, from.longitude, 1).normalize();
  const end = latLngToVector3(to.latitude, to.longitude, 1).normalize();
  const angle = start.angleTo(end);
  const points: THREE.Vector3[] = [];
  for (let index = 0; index <= segments; index += 1) {
    const t = index / segments;
    const sinTotal = Math.sin(angle);
    const first = sinTotal === 0 ? 1 - t : Math.sin((1 - t) * angle) / sinTotal;
    const second = sinTotal === 0 ? t : Math.sin(t * angle) / sinTotal;
    const point = start.clone().multiplyScalar(first).add(end.clone().multiplyScalar(second)).normalize();
    const lift = Math.sin(Math.PI * t) * 0.16;
    points.push(point.multiplyScalar(radius + lift));
  }
  return points;
}

// Minimal lat/lng point interface used by utility functions
export interface GlobeLocationPoint {
  latitude: number;
  longitude: number;
}

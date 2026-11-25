import * as THREE from "three";
import { makeCloudTexture } from "./textures.js";
import { rng } from "./util.js";

/** Biển mây: các sprite mềm rải dọc đường bay lên (theo trục Z, độ cao y). */
export function createClouds(renderer, { center, spanZ = 50, count = 70 }) {
  const group = new THREE.Group();
  const textures = [makeCloudTexture(renderer, 3), makeCloudTexture(renderer, 9), makeCloudTexture(renderer, 17)];
  const r = rng(23);
  const sprites = [];
  for (let i = 0; i < count; i++) {
    const mat = new THREE.SpriteMaterial({
      map: textures[i % 3],
      transparent: true,
      depthWrite: false,
      opacity: 0,
    });
    const s = new THREE.Sprite(mat);
    const scale = 10 + r() * 16;
    s.scale.set(scale, scale * 0.6, 1);
    s.position.set(
      center.x + 4 + r() * 30, // phía sau đường bay (so với camera) để không che máy bay
      center.y + (r() - 0.5) * 16,
      center.z + (r() - 0.5) * spanZ,
    );
    s.userData.base = 0.75 + r() * 0.25;
    group.add(s);
    sprites.push(s);
  }
  function update(visible) {
    group.visible = visible > 0.001;
    for (const s of sprites) s.material.opacity = s.userData.base * visible;
  }
  return { group, update };
}

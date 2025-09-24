// js/modules/biomes/TundraBiome.js
import * as THREE from 'three';
import { ImprovedNoise } from 'three/addons/math/ImprovedNoise.js';

import { Biome } from './Biome.js';

/**
 * ツンドラバイオーム
 */
export class TundraBiome extends Biome {
  constructor() {
    super('Tundra', {
      heightScale: 1.5, // ツンドラは山地が多い
      materialColor: 0xADD8E6, // 薄い雪色
      floraDensity: 0.1, // 植物が少ないが、低木など
      objectTypes: [
        { type: 'snowy_tree', density: 0.08, properties: { color: 0x87CEEB } },
        { type: 'rock', density: 0.05, properties: { color: 0x708090 } }
      ]
    });
  }

  getHeight(x, z) {
    // ツンドラ用のノイズ（高低差が大きい）
    const perlin = new ImprovedNoise();
    return perlin.noise(x * 0.03, 0, z * 0.03) * this.config.heightScale * 15;
  }

  getMaterial(x, z) {
    // ツンドラ用マテリアル
    return new THREE.MeshStandardMaterial({ color: this.config.materialColor });
  }

  getObjects() {
    return this.config.objectTypes;
  }
}
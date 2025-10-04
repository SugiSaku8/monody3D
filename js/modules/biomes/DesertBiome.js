// js/modules/biomes/DesertBiome.js
import * as THREE from 'three';
import { ImprovedNoise } from 'three/addons/math/ImprovedNoise.js';

import { Biome } from './Biome.js';

/**
 * 砂漠バイオーム
 */
export class DesertBiome extends Biome {
  constructor() {
    super('Desert', {
      heightScale: 0.5, // 砂漠は比較的平坦
      materialColor: 0xF4A460, // サンドカラー
      floraDensity: 0.05, // 植物が少ない
      objectTypes: [
        { type: 'cactus', density: 0.03, properties: { color: 0x32CD32 } },
        { type: 'rock', density: 0.02, properties: { color: 0x808080 } }
      ]
    });
  }

  getHeight(x, z) {
    // 砂漠用のノイズ（より滑らか）
    const perlin = new ImprovedNoise();
    return perlin.noise(x * 0.01, 0, z * 0.01) * this.config.heightScale * 5;
  }

  getMaterial(x, z) {
    // 砂漠用マテリアル
    return new THREE.MeshStandardMaterial({ color: this.config.materialColor });
  }

  getObjects() {
    return this.config.objectTypes;
  }
  getFlowers() {
    // this.config.flowerTypes を返す
    // 親クラスの getFlowers (フォールバック) は呼び出さない
    return this.config.flowerTypes || [];
}
}
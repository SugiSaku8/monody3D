// js/modules/biomes/ForestBiome.js
import * as THREE from 'three';
import { ImprovedNoise } from 'three/addons/math/ImprovedNoise.js';
import { Biome } from './Biome.js';

/**
 * 森バイオーム
 */
export class ForestBiome extends Biome {
  constructor() {
    super('Forest', {
      heightScale: 1.0,
      materialColor: 0x228B22, // 森緑
      floraDensity: 0.3, // 木の密度 (この値はオブジェクト生成全体の密度かもしれません)
      treeTypes: [
        { type: 'tree', density: 0.05, properties: { color: 0x228B22 } }, // density を下げた
        { type: 'bush', density: 0.02, properties: { color: 0x32CD32 } }  // density を下げた
      ]
    });
  }

  getHeight(x, z) {
    // 単純な例: パーリンノイズにバイオーム固有のスケールを適用
    // 実際にはより複雑なノイズ関数や、複数のオクターブを使用
    const perlin = new ImprovedNoise(); // Three.js Addons から
    return perlin.noise(x * 0.02, 0, z * 0.02) * this.config.heightScale * 10;
  }

  getMaterial(x, z) {
    // 簡易的なマテリアル返却
    return new THREE.MeshStandardMaterial({ color: this.config.materialColor });
  }

  getObjects() {
    return this.config.treeTypes;
  }
}
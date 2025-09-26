// js/modules/biomes/ForestBiome.js
import * as THREE from 'three';
import { ImprovedNoise } from 'three/addons/math/ImprovedNoise.js';
import { Biome } from './Biome.js';

export class ForestBiome extends Biome {
  constructor() {
    super('Forest', {
      heightScale: 1.0,
      floraDensity: 0.3,
      treeTypes: [
        { type: 'tree', density: 0.2, properties: { color: 0x228B22 } },
        { type: 'bush', density: 0.1, properties: { color: 0x32CD32 } }
      ]
    },
    // --- 追加: 草の設定 ---
    {
        density: 0.8, // 1平方メートルあたり0.8本程度 (例)
        color: new THREE.Color(0x32CD32) // 森に合いそうな明るい緑
    }
    // --- 追加 ここまで ---
    );
  }

  getHeight(x, z) {
    const perlin = new ImprovedNoise();
    return perlin.noise(x * 0.02, 0, z * 0.02) * this.config.heightScale * 10;
  }

  // getMaterial は親クラスのものを使用
}
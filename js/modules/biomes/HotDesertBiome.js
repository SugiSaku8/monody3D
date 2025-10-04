// js/modules/biomes/HotDesertBiome.js
import * as THREE from 'three';
import { ImprovedNoise } from 'three/addons/math/ImprovedNoise.js';
import { Biome } from './Biome.js';

/**
 * 砂漠気候 (BWh) バイオーム
 * 年降水量が極端に少なく高温。
 * 木は全くなく、砂漠と、枯れた草が多い。たまにオアシスがある。
 */
export class HotDesertBiome extends Biome {
  constructor() {
    super(
      'Hot Desert',
      'BWh',
      30, // 高温
      100, // 降水量极少
      20, // 湿度低
      {
        heightScale: 0.5, // 平坦な地形
        noiseFrequency: 0.005,
        noiseOctaves: 2,
        // 砂漠特有のオブジェクト
        desertObjects: [
            { type: 'cactus', density: 0.05, properties: { color: 0x32CD32 } },
            { type: 'dead_bush', density: 0.1, properties: { color: 0x8B7500 } },
            { type: 'rock', density: 0.02, properties: { color: 0x808080 } }
        ]
      },
      {
        density: 0.05, // 草の密度も非常に低い
        color: new THREE.Color(0xF4A460) // 砂色
      }
    );
  }

  getHeight(x, z) {
    const perlin = new ImprovedNoise();
    let height = 0;
    let amplitude = 1;
    let frequency = this.config.noiseFrequency || 0.005;

    for (let i = 0; i < (this.config.noiseOctaves || 2); i++) {
      height += perlin.noise(x * frequency, 0, z * frequency) * amplitude;
      amplitude *= 0.5;
      frequency *= 2;
    }
    return height * (this.config.heightScale || 0.5) * 5; // スケールを小さくして平坦に
  }
  getFlowers() {
    // this.config.flowerTypes を返す
    // 親クラスの getFlowers (フォールバック) は呼び出さない
    return this.config.flowerTypes || [];
}
  getMaterial(x, z) {
    const material = super.getMaterial(x, z);
    if (material && material.uniforms) {
      // 砂漠っぽい色 (黄土色)
      material.uniforms.baseTerrainColor.value = new THREE.Color(0xD2B48C); // タン
    }
    return material;
  }

  getObjects() {
    return this.config.desertObjects || [];
  }

  getTraits() {
      return ['Extremely Dry', 'High Temperature', 'Rare Vegetation'];
  }

  getDescription() {
      return "A scorching hot desert biome with little to no vegetation and vast stretches of sand.";
  }
}
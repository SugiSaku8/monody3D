// js/modules/biomes/TemperateHumidBiome.js
import * as THREE from 'three';
import { ImprovedNoise } from 'three/addons/math/ImprovedNoise.js';
import { Biome } from './Biome.js';

/**
 * 西岸海洋性気候 (Cfb) バイオーム
 * 年間を通して温和で湿潤。
 * 暖かく、一定であることを生かした生態系が生まれている。
 */
export class TemperateHumidBiome extends Biome {
  constructor() {
    super(
      'Temperate Humid',
      'Cfb',
      15, // 温和
      1000, // 降水量多め
      70, // 湿度中〜高
      {
        heightScale: 1.0, // ゆるやかな起伏
        noiseFrequency: 0.01,
        noiseOctaves: 3,
        // 湿潤温帯特有のオブジェクト
        temperateObjects: [
            { type: 'deciduous_tree', density: 0.3, properties: { color: 0x228B22 } },
            { type: 'bush', density: 0.2, properties: { color: 0x32CD32 } },
            { type: 'flower_patch', density: 0.05, properties: { colors: [0xFF0000, 0x0000FF, 0xFFFF00] } } // 赤, 青, 黄の花
        ]
      },
      {
        density: 0.5, // 草の密度中程度
        color: new THREE.Color(0x7CFC00) // 芝生グリーン
      }
    );
  }

  getHeight(x, z) {
    const perlin = new ImprovedNoise();
    let height = 0;
    let amplitude = 1;
    let frequency = this.config.noiseFrequency || 0.01;

    for (let i = 0; i < (this.config.noiseOctaves || 3); i++) {
      height += perlin.noise(x * frequency, 0, z * frequency) * amplitude;
      amplitude *= 0.5;
      frequency *= 2;
    }
    return height * (this.config.heightScale || 1.0) * 10; // 中程度の起伏
  }

  getMaterial(x, z) {
    const material = super.getMaterial(x, z);
    if (material && material.uniforms) {
      // 湿潤温帯っぽい色 (芝生グリーン)
      material.uniforms.baseTerrainColor.value = new THREE.Color(0x90EE90); // ライトグリーン
    }
    return material;
  }

  getObjects() {
    return this.config.temperateObjects || [];
  }

  getTraits() {
      return ['Moderate Climate', 'Consistent Weather', 'Diverse Flora'];
  }

  getDescription() {
      return "A mild and humid biome with consistent weather, supporting diverse plant life like deciduous forests.";
  }
}
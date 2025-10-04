// js/modules/biomes/HighlandBiome.js
import * as THREE from 'three';
import { ImprovedNoise } from 'three/addons/math/ImprovedNoise.js';
import { Biome } from './Biome.js';

/**
 * 高山気候 (H) バイオーム
 * 標高に左右されるため、赤道直下でも冷涼。
 */
export class HighlandBiome extends Biome {
  constructor() {
    super(
      'Highland',
      'H', // Classification code
      0, // 気温は低め (高度補正でさらに下がる)
      500, // 降水量中程度 (場所による)
      50, // 湿度中
      {
        heightScale: 2.0, // 非常に大きな起伏 (山)
        noiseFrequency: 0.03, // 高周波ノイズで険しい地形
        noiseOctaves: 5,
        // 高山特有のオブジェクト
        highlandObjects: [
            { type: 'boulder', density: 0.1, properties: { color: 0x708090 } }, // 大きな岩
            { type: 'snow_patch', density: 0.2, properties: { color: 0xFFFFFF } }, // 雪
            { type: 'alpine_flower', density: 0.02, properties: { colors: [0xFF69B4, 0x1E90FF] } } // ピンク, 青の高山植物
        ]
      },
      {
        density: 0.1, // 草の密度非常に低い
        color: new THREE.Color(0x708090) // スレートグレー
      }
    );
  }

  getHeight(x, z) {
    const perlin = new ImprovedNoise();
    let height = 0;
    let amplitude = 1;
    let frequency = this.config.noiseFrequency || 0.03; // 高周波

    for (let i = 0; i < (this.config.noiseOctaves || 5); i++) { // 多オクターブ
      height += perlin.noise(x * frequency, 0, z * frequency) * amplitude;
      amplitude *= 0.5;
      frequency *= 2;
    }
    return height * (this.config.heightScale || 2.0) * 20; // 非常に高い起伏
  }

  getMaterial(x, z) {
    const material = super.getMaterial(x, z);
    if (material && material.uniforms) {
      // 高山っぽい色 (岩色〜雪色)
      material.uniforms.baseTerrainColor.value = new THREE.Color(0xA9A9A9); // ダークグレー
    }
    return material;
  }

  getObjects() {
    return this.config.highlandObjects || [];
  }

  getTraits() {
      return ['High Altitude', 'Steep Terrain', 'Sparse Vegetation', 'Snow'];
  }

  getDescription() {
      return "A harsh biome found at high altitudes, characterized by steep terrain, rocky surfaces, and sparse vegetation adapted to thin air.";
  }
  getFlowers() {
    // this.config.flowerTypes を返す
    // 親クラスの getFlowers (フォールバック) は呼び出さない
    return this.config.flowerTypes || [];
}
}
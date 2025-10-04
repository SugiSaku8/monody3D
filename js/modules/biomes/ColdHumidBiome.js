// js/modules/biomes/ColdHumidBiome.js
import * as THREE from 'three';
import { ImprovedNoise } from 'three/addons/math/ImprovedNoise.js';
import { Biome } from './Biome.js';

/**
 * 冷帯湿潤気候 (Dfb) バイオーム
 * 夏暑く冬寒い。冬は雪だらけ。
 */
export class ColdHumidBiome extends Biome {
  constructor() {
    super(
      'Cold Humid',
      'Dfb',
      5, // 冷涼
      800, // 降水量中〜多
      60, // 湿度中
      {
        heightScale: 1.2, // やや起伏あり
        noiseFrequency: 0.015,
        noiseOctaves: 4,
        // 冷帯湿潤特有のオブジェクト
        coldObjects: [
            { type: 'conifer_tree', density: 0.4, properties: { color: 0x228B22 } }, // トウヒ/マツ
            { type: 'fallen_log', density: 0.05, properties: { color: 0x8B4513 } },
            { type: 'mushroom_patch', density: 0.03, properties: { color: 0xFF69B4 } } // ピンクキノコなど
        ]
      },
      {
        density: 0.4, // 草の密度中程度
        color: new THREE.Color(0x9ACD32) // 黄緑
      }
    );
  }

  getHeight(x, z) {
    const perlin = new ImprovedNoise();
    let height = 0;
    let amplitude = 1;
    let frequency = this.config.noiseFrequency || 0.015;

    for (let i = 0; i < (this.config.noiseOctaves || 4); i++) {
      height += perlin.noise(x * frequency, 0, z * frequency) * amplitude;
      amplitude *= 0.5;
      frequency *= 2;
    }
    return height * (this.config.heightScale || 1.2) * 12; // やや大きな起伏
  }

  getMaterial(x, z) {
    const material = super.getMaterial(x, z);
    if (material && material.uniforms) {
      // 冷帯湿潤っぽい色 (黄緑〜緑)
      material.uniforms.baseTerrainColor.value = new THREE.Color(0x8FBC8F); // ダークシーグリーン
    }
    return material;
  }

  getObjects() {
    return this.config.coldObjects || [];
  }

  getTraits() {
      return ['Cold Winters', 'Snow Cover', 'Coniferous Forests'];
  }

  getDescription() {
      return "A biome with warm, humid summers and cold, snowy winters, dominated by coniferous forests.";
  }
  getFlowers() {
    // this.config.flowerTypes を返す
    // 親クラスの getFlowers (フォールバック) は呼び出さない
    return this.config.flowerTypes || [];
}
}
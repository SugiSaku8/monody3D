// js/modules/biomes/TundraBiome.js
import * as THREE from 'three';
import { ImprovedNoise } from 'three/addons/math/ImprovedNoise.js';
import { Biome } from './Biome.js';

/**
 * ツンドラ気候 (ET) バイオーム
 * 夏でも平均気温10℃未満。草や苔が生える。かなり面白い生態系。
 */
export class TundraBiome extends Biome {
  constructor() {
    super(
      'Tundra',
      'ET',
      -5, // 寒冷
      300, // 降水量少なめ
      40, // 湿度低〜中
      {
        heightScale: 0.8, // ほぼフラット、少し起伏
        noiseFrequency: 0.02,
        noiseOctaves: 2,
        // ツンドラ特有のオブジェクト
        tundraObjects: [
            { type: 'lichen_patch', density: 0.2, properties: { colors: [0x8FBC8F, 0x20B2AA] } }, // シーグリーン, ライトシーグリーン
            { type: 'small_shrub', density: 0.1, properties: { color: 0x8B7355 } }, // 小さな低木
            { type: 'moss_carpet', density: 0.3, properties: { color: 0x556B2F } } // モス
        ]
      },
      {
        density: 0.3, // 草の密度低め
        color: new THREE.Color(0xD2B48C) // タン (土っぽい色)
      }
    );
  }

  getHeight(x, z) {
    const perlin = new ImprovedNoise();
    let height = 0;
    let amplitude = 1;
    let frequency = this.config.noiseFrequency || 0.02;

    for (let i = 0; i < (this.config.noiseOctaves || 2); i++) {
      height += perlin.noise(x * frequency, 0, z * frequency) * amplitude;
      amplitude *= 0.5;
      frequency *= 2;
    }
    return height * (this.config.heightScale || 0.8) * 3; // 非常に平坦
  }

  getMaterial(x, z) {
    const material = super.getMaterial(x, z);
    if (material && material.uniforms) {
      // ツンドラっぽい色 (土色〜淡い緑)
      material.uniforms.baseTerrainColor.value = new THREE.Color(0xDAA520); // ゴールデンロッド (枯れ色)
    }
    return material;
  }

  getObjects() {
    return this.config.tundraObjects || [];
  }

  getTraits() {
      return ['Permafrost', 'Low Biodiversity', 'Short Growing Season'];
  }

  getDescription() {
      return "A frozen biome with short growing seasons, where only hardy plants like mosses and lichens can survive.";
  }
  getFlowers() {
    // this.config.flowerTypes を返す
    // 親クラスの getFlowers (フォールバック) は呼び出さない
    return this.config.flowerTypes || [];
}
}
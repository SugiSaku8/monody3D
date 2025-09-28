// js/modules/biomes/TropicalRainforestBiome.js
import * as THREE from 'three';
import { ImprovedNoise } from 'three/addons/math/ImprovedNoise.js'; // getHeight で使用する場合
import { Biome } from './Biome.js'; // 親クラスをインポート

/**
 * 熱帯雨林気候 (Af) バイオーム
 * 常に高温多雨。ジャングルが広がる。
 * 木の間隔が非常に狭く、雨が多い。背の高い木が多く、ジャングル特有の生態系が見られる。
 */
export class TropicalRainforestBiome extends Biome {
  constructor() {
    super(
      'Tropical Rainforest',
      'Af',
      25,
      2000,
      90,
      {
        heightScale: 1.5,
        noiseFrequency: 0.01,
        noiseOctaves: 4,
        treeTypes: [
            { type: 'jungle_tree', density: 1.0, properties: { color: 0x228B22 } },
            { type: 'vine', density: 0.8, properties: { color: 0x32CD32 } },
            { type: 'fern', density: 0.5, properties: { color: 0x2E8B57 } }
        ]
      },
      {
        density: 0.9,
        color: new THREE.Color(0x009944)
      }
    );
  }

  getHeight(x, z) {
    const perlin = new ImprovedNoise(); // getHeight 内でノイズインスタンスを生成
    let height = 0;
    let amplitude = 1;
    let frequency = this.config.noiseFrequency || 0.01;

    for (let i = 0; i < (this.config.noiseOctaves || 4); i++) {
      height += perlin.noise(x * frequency, 0, z * frequency) * amplitude;
      amplitude *= 0.5;
      frequency *= 2;
    }
    return height * (this.config.heightScale || 1.0) * 15;
  }

  getMaterial(x, z) {
    // 1. 親クラスのシェーダーマテリアルを取得
    const material = super.getMaterial(x, z);

    // 2. このバイオーム特有の uniform を設定
    if (material && material.uniforms) {
      // a. ジャングル特有のベースカラー (より濃い緑) を設定
      material.uniforms.baseTerrainColor.value = new THREE.Color(0x1a5d1a); // より濃いジャングルグリーン

      // b. 他のパラメータも調整可能 (例: テクスチャスケールを小さくして細かく)
      // material.uniforms.textureScale.value = 0.03;
    }

    return material;
  }

  // --- 修正 ここまで ---

  getObjects() {
    return this.config.treeTypes || [];
  }

  getTraits() {
      return ['High Humidity', 'Frequent Rain', 'Dense Vegetation'];
  }

  getDescription() {
      return "A hot, humid jungle biome with dense vegetation and tall trees.";
  }
}
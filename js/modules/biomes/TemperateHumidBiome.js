// js/modules/biomes/TemperateHumidBiome.js
import * as THREE from 'three';
import { ImprovedNoise } from 'three/addons/math/ImprovedNoise.js';
import { Biome } from './Biome.js';

/**
 * 西岸海洋性気候 (Cfb) バイオーム
 * 年間を通して温和で湿潤。
 * 暖かく、一定であることを生かした生態系が生まれている。
 */
// --- 修正: 名前付きエクスポートに変更 ---
export class TemperateHumidBiome extends Biome {
// --- 修正 ここまて ---
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
        treeTypes: [
            { type: 'deciduous_tree', density: 0.3, properties: { color: 0x228B22 } },
            { type: 'bush', density: 0.2, properties: { color: 0x32CD32 } },
            { type: 'flower_patch', density: 0.05, properties: { colors: [0xFF0000, 0x0000FF, 0xFFFF00] } } // 赤, 青, 黄の花
        ],
        // --- 追加: flowerTypes を config に追加 ---
        flowerTypes: [
            { type: 'Hydrangea', density: 0.2, properties: { color: 0x4169E1 } }, // アジサイ（雨と霧に映える）
            { type: 'Rhododendron', density: 0.15, properties: { color: 0xFF6347 } }, // シャクナゲ（高木下の花）
            { type: 'Violet', density: 0.1, properties: { color: 0x8A2BE2 } }, // スミレ（林床）
            { type: 'Crocus', density: 0.05, properties: { color: 0xFFD700 } }, // クロッカス（早春）
            { type: 'WinterAconite', density: 0.08, properties: { color: 0xFFFF00 } }, // キンポウゲ（野原に）
            { type: 'Foxglove', density: 0.12, properties: { color: 0x9370DB } }, // フォックスグローブ（高い鐘形）
            { type: 'Chamomile', density: 0.07, properties: { color: 0xFFFFFF } }, // カモミール（白い花、香草）
            { type: 'ForgetMeNot', density: 0.09, properties: { color: 0x1E90FF } }, // ワスレナグサ（青く小さい）
            { type: 'Poppy', density: 0.06, properties: { color: 0xFF0000 } }, // ポピー（赤やオレンジ）
            { type: 'Lilac', density: 0.04, properties: { color: 0xDA70D6 } } // ライラック（紫)
        ],
        // --- 追加 ここまて ---
        // --- 追加: stoneTypes を config に追加 ---
        stoneTypes: [
            { type: 'Sandstone', density: 0.06, properties: { color: 0xF4A460 } }, // 砂岩
            { type: 'Limestone', density: 0.04, properties: { color: 0xC0C0C0 } } // 石灰岩
        ]
        // --- 追加 ここまて ---
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
    return this.config.treeTypes || [];
  }

  getFlowers() {
      // this.config.flowerTypes を返す
      // 親クラスの getFlowers (フォールバック) は呼び出さない
      return this.config.flowerTypes || [];
  }
  // --- 追加 ここまて ---

  // --- 追加: getStones メソッド ---
  getStones() {
      return this.config.stoneTypes || super.getStones();
  }
  // --- 追加 ここまて ---

  getTraits() {
      return ['Moderate Climate', 'Consistent Weather', 'Diverse Flora'];
  }

  getDescription() {
      return "A mild and humid biome with consistent weather, supporting diverse plant life like deciduous forests.";
  }
}
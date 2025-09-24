// js/modules/biomes/BiomeManager.js
import { ImprovedNoise } from 'three/addons/math/ImprovedNoise.js';
import { ForestBiome } from './ForestBiome.js';
import { DesertBiome } from './DesertBiome.js';
import { TundraBiome } from './TundraBiome.js';

/**
 * ワールド全体のバイオームを管理するクラス。
 * 座標に基づいて適切なバイオームを返す。
 */
export class BiomeManager {
  constructor() {
    this.biomes = {
      'Forest': new ForestBiome(),
      'Desert': new DesertBiome(),
      'Tundra': new TundraBiome(),
      // 今後、他のバイオームを追加
    };

    // バイオームのマッピングロジック用のパラメータ
    // 例: パーリンノイズを使ってマッピング
    this.noiseScale = 0.001; // バイオームの変化のスケール
  }

  /**
   * 指定されたワールド座標 (x, z) に対応するバイオームを返します。
   * @param {number} x - ワールドX座標
   * @param {number} z - ワールドZ座標
   * @returns {Biome} バイオームインスタンス
   */
  getBiomeAt(x, z) {
    // 簡単な例: ノイズ値に基づいてバイオームを決定
    // 実際には、湿度、標高、温度などの複数のノイズを組み合わせる方が自然
    const perlin = new ImprovedNoise(); // Three.js Addons から
    const noiseValue = perlin.noise(x * this.noiseScale, 0, z * this.noiseScale);

    // ノイズ値の範囲 (-1 to 1) をバイオームにマッピング
    if (noiseValue < -0.3) {
      return this.biomes['Desert'];
    } else if (noiseValue < 0.3) {
      return this.biomes['Forest'];
    } else {
      return this.biomes['Tundra'];
    }
  }

  /**
   * 登録されているすべてのバイオームを返します。
   * @returns {Object} { biomeName: BiomeInstance, ... }
   */
  getAllBiomes() {
    return this.biomes;
  }
}
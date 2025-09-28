// js/modules/biomes/BiomeManager.js
import { ImprovedNoise } from 'three/addons/math/ImprovedNoise.js';
// --- 修正: 新しいバイオームクラスをインポート ---
import { TropicalRainforestBiome } from './TropicalRainforestBiome.js';
// import { SavannaBiome } from './SavannaBiome.js';
// import { HotDesertBiome } from './HotDesertBiome.js';
// ... (他のバイオームも同様にインポート)
// --- 修正 ここまで ---

export class BiomeManager {
  constructor() {
    // --- 修正: 新しいバイオームを登録 ---
    this.biomes = {
      'Af': new TropicalRainforestBiome(),
      // 'Aw': new SavannaBiome(),
      // 'BWh': new HotDesertBiome(),
      // ... (他のバイオームも同様に登録)
      // 一時的なフォールバック用
      'Forest': new (import('./ForestBiome.js')).ForestBiome(), // 動的インポート例
    };
    // --- 修正 ここまで ---

    this.noiseScale = 0.001;
    this.elevationScale = 0.0005;
    this.temperatureNoise = new ImprovedNoise();
    this.precipitationNoise = new ImprovedNoise();
    this.elevationNoise = new ImprovedNoise();
  }
  /**
   * 指定されたワールド座標 (x, z) におけるバイオームと、そのバイオームでの地形高さを計算します。
   * @param {number} x - ワールドX座標
   * @param {number} z - ワールドZ座標
   * @returns {{ biome: Biome, height: number }} バイオームインスタンスと高さ
   */
  getBiomeAndHeightAt(x, z) {
    // 1. 基準高度マップからその地点の「基準高度」を取得
    const baseElevation = this.elevationNoise.noise(x * this.elevationScale, z * this.elevationScale, 0) * 5000;

    // 2. 温度マップと降水量マップを生成
    const tempNoiseValue = this.temperatureNoise.noise(x * this.noiseScale, 0, z * this.noiseScale);
    const precipNoiseValue = this.precipitationNoise.noise(0, x * this.noiseScale, z * this.noiseScale);

    // 3. ノイズ値を実際の気温や降水量に変換
    const temperature = tempNoiseValue * 30 + 15; // -15°C ~ +45°C
    const precipitation = Math.max(0, precipNoiseValue * 1000 + 500); // 0mm ~ 1500mm (負の値は0にクランプ)

    // 4. 気候分類コード (Köppenなど) を仮決定 (高度補正前)
    //    これは、その地域の大まかな気候を表す。高度補正は最終調整。
    let provisionalClassificationCode = 'BWh'; // デフォルトは乾燥
    if (temperature >= 18 && precipitation >= 600) {
      provisionalClassificationCode = 'Af'; // 熱帯雨林
    } else if (temperature >= 18 && precipitation >= 250 && precipitation < 600) {
      provisionalClassificationCode = 'Aw'; // サバナ
    } else if (temperature >= 18) {
      provisionalClassificationCode = 'Am'; // 熱帯モンスーン
    } else if (temperature >= 10 && temperature < 18 && precipitation >= 500) {
        provisionalClassificationCode = 'Cfb'; // 西岸海洋性
    } else if (temperature >= 10 && temperature < 18) {
        provisionalClassificationCode = 'Csa'; // 地中海性
    } else if (temperature >= 0 && temperature < 10 && precipitation >= 300) {
        provisionalClassificationCode = 'Dfb'; // 冷帯湿潤
    } else if (temperature >= 0 && temperature < 10) {
        provisionalClassificationCode = 'Dwb'; // 冷帯冬季少雨
    } else if (temperature < 0 && precipitation >= 200) {
        provisionalClassificationCode = 'ET'; // ツンドラ
    } else if (temperature < 0) {
        provisionalClassificationCode = 'EF'; // 氷雪
    } else {
      provisionalClassificationCode = 'BWh'; // 砂漠
    }

    // 5. 高度補正前の仮のバイオームを取得 (地形高さ計算のため)
    const provisionalBiome = this.biomes[provisionalClassificationCode] || this.biomes['Forest'];
    // 6. 仮のバイオームで地形高さを計算
    const provisionalHeight = provisionalBiome.getHeight(x, z);

    // 7. 計算された高さを使って、最終的な高度差と気温を計算
    const heightDifference = provisionalHeight - baseElevation;
    const lapseRate = 0.0065; // 6.5°C/100m
    const altitudeAdjustedTemp = temperature - (heightDifference * lapseRate);

    // 8. 高度補正後の気温で、最終的な気候分類コードを決定
    let finalClassificationCode = provisionalClassificationCode; // デフォルトは仮のもの
    if (altitudeAdjustedTemp >= 18 && precipitation >= 600) {
      finalClassificationCode = 'Af';
    } else if (altitudeAdjustedTemp >= 18 && precipitation >= 250 && precipitation < 600) {
      finalClassificationCode = 'Aw';
    } else if (altitudeAdjustedTemp >= 18) {
      finalClassificationCode = 'Am';
    } else if (altitudeAdjustedTemp >= 10 && altitudeAdjustedTemp < 18 && precipitation >= 500) {
        finalClassificationCode = 'Cfb';
    } else if (altitudeAdjustedTemp >= 10 && altitudeAdjustedTemp < 18) {
        finalClassificationCode = 'Csa';
    } else if (altitudeAdjustedTemp >= 0 && altitudeAdjustedTemp < 10 && precipitation >= 300) {
        finalClassificationCode = 'Dfb';
    } else if (altitudeAdjustedTemp >= 0 && altitudeAdjustedTemp < 10) {
        finalClassificationCode = 'Dwb';
    } else if (altitudeAdjustedTemp < 0 && precipitation >= 200) {
        finalClassificationCode = 'ET';
    } else if (altitudeAdjustedTemp < 0) {
        finalClassificationCode = 'EF';
    } else {
      finalClassificationCode = 'BWh';
    }

    // 9. 高度が極端に高い場合、高山気候(H)に上書き
    if (provisionalHeight > 2000) { // provisionalHeight を使用
        finalClassificationCode = 'H';
    }

    // 10. 最終的なバイオームを取得
    const finalBiome = this.biomes[finalClassificationCode] || this.biomes['Forest'];

    // 11. 最終バイオームで地形高さを再計算 (念のため、または最終バイオームが異なる場合)
    const finalHeight = finalBiome.getHeight(x, z);

    return { biome: finalBiome, height: finalHeight };
  }
  // --- 修正 ここまで ---
   /**
   * 指定されたワールド座標におけるバイオームを取得します。
   * @param {number} x - ワールドX座標
   * @param {number} y - ワールドY座標 (高度) - 高度補正に使用
   * @param {number} z - ワールドZ座標
   * @returns {Biome} バイオームインスタンス
   */
   getBiomeAt(x, y, z) {
    // getBiomeAndHeightAt でバイオームと高さを取得
    // ただし、y は高度補正にのみ使用し、高さ計算は x,z に基づいて行う
    // (以前の getBiomeAt(x,y,z) の y の使い方と整合性を保つため)
    const result = this.getBiomeAndHeightAt(x, z);
    const baseBiome = result.biome;
    const baseHeight = result.height;

    // 高度補正 (以前の getBiomeAt のロジックを再利用)
    const baseElevation = this.elevationNoise.noise(x * this.elevationScale, z * this.elevationScale, 0) * 5000;
    const heightDifference = y - baseElevation;
    const lapseRate = 0.0065;
    // 再度、気候マップから温度を取得して補正 (getBiomeAndHeightAt では高さから逆算していた)
    const tempNoiseValue = this.temperatureNoise.noise(x * this.noiseScale, 0, z * this.noiseScale);
    const temperature = tempNoiseValue * 30 + 15;
    const altitudeAdjustedTemp = temperature - (heightDifference * lapseRate);

    const precipNoiseValue = this.precipitationNoise.noise(0, x * this.noiseScale, z * this.noiseScale);
    const precipitation = Math.max(0, precipNoiseValue * 1000 + 500);

    // 高度補正後の気温で、バイオームを微調整する可能性 (例: 山の上は高山気候)
    let adjustedClassificationCode = baseBiome.classification;
    if (altitudeAdjustedTemp < 0 && precipitation >= 200) {
        adjustedClassificationCode = 'ET'; // 高山でも非常に寒ければツンドラ
    } else if (altitudeAdjustedTemp < 0) {
        adjustedClassificationCode = 'EF'; // 高山でも非常に寒ければ氷雪
    }
    // 高度が極端に高い場合、高山気候(H)に上書き
    if (y > 2000) {
        adjustedClassificationCode = 'H';
    }

    // 調整された分類コードに対応するバイオームを返す (なければ元のバイオーム)
    return this.biomes[adjustedClassificationCode] || baseBiome;
  }
  // --- 修正 ここまで ---

  getAllBiomes() {
    return this.biomes;
  }
}
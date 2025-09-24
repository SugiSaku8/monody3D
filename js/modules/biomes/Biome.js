// js/modules/biomes/Biome.js
import * as THREE from 'three';
/**
 * バイオームの基本クラス。
 * すべてのバイオームはこのクラスを継承する必要があります。
 */
export class Biome {
    /**
     * @param {string} name - バイオームの名前 (例: "Forest", "Desert")
     * @param {Object} config - バイオームの設定 (オプション)
     */
    constructor(name, config = {}) {
      this.name = name;
      this.config = config;
      // 例: { heightScale: 1.0, materialColor: 0x00aa00, floraDensity: 0.5 }
    }
  
    /**
     * 指定されたワールド座標における地形の高さを計算します。
     * @param {number} x - X座標
     * @param {number} z - Z座標
     * @returns {number} 高さ
     */
    getHeight(x, z) {
      // サブクラスでオーバーライドしてください
      return 0;
    }
  
    /**
     * 指定されたワールド座標における地形のマテリアルを取得します。
     * @param {number} x - X座標
     * @param {number} z - Z座標
     * @returns {THREE.Material} Three.js マテリアル
     */
    getMaterial(x, z) {
      // サブクラスでオーバーライドしてください
      return null;
    }
  
    /**
     * このバイオームに配置されるオブジェクトのリストを返します。
     * @returns {Array<Object>} { type: 'tree', density: 0.1, ... }
     */
    getObjects() {
      // サブクラスでオーバーライドしてください
      return [];
    }
  
    /**
     * 指定されたチャンク内に配置するオブジェクトの位置を生成します。
     * @param {number} cx - チャンクX座標
     * @param {number} cz - チャンクZ座標
     * @param {number} chunkSize - チャンクのサイズ
     * @returns {Array<Object>} { type: string, position: THREE.Vector3, ... }
     */
    generateObjectsInChunk(cx, cz, chunkSize) {
      const objects = [];
      const biomeObjects = this.getObjects();
      const startX = cx * chunkSize;
      const startZ = cz * chunkSize;
  
      for (const objDef of biomeObjects) {
        const count = Math.floor(objDef.density * chunkSize * chunkSize);
        for (let i = 0; i < count; i++) {
          // チャンク内のランダムな位置を計算
          const localX = Math.random() * chunkSize;
          const localZ = Math.random() * chunkSize;
          const worldX = startX + localX;
          const worldZ = startZ + localZ;
  
          // 地形の高さを取得して配置
          const worldY = this.getHeight(worldX, worldZ);
  
          objects.push({
            type: objDef.type,
            position: new THREE.Vector3(localX - chunkSize / 2, worldY, localZ - chunkSize / 2),
            ...objDef.properties // 他のプロパティも渡す
          });
        }
      }
      return objects;
    }
  }
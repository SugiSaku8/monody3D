// js/modules/worldgen/features/Stone.js
import * as THREE from 'three';

export class Stone {
    constructor(world, biomeManager, physicsWorld) {
        this.world = world;
        this.biomeManager = biomeManager;
        this.physicsWorld = physicsWorld;

        // --- 追加: 石の種類とそのジオメトリ・マテリアルの定義 ---
        this.stoneTypes = {
            // 🌿 熱帯雨林
            'Granite': { // 花崗岩
                geometry: new THREE.DodecahedronGeometry(0.2, 0),
                material: new THREE.MeshStandardMaterial({ color: 0x808080 }), // グレー
                scaleRange: [0.8, 1.5]
            },
            'Basalt': { // 玄武岩
                geometry: new THREE.IcosahedronGeometry(0.15, 0),
                material: new THREE.MeshStandardMaterial({ color: 0x2F4F4F }), // ダークスレートグレー
                scaleRange: [0.7, 1.3]
            },

            // 🌧 西岸海洋性気候（温帯の森・丘陵）
            'Sandstone': { // 砂岩
                geometry: new THREE.BoxGeometry(0.3, 0.2, 0.3),
                material: new THREE.MeshStandardMaterial({ color: 0xF4A460 }), // サンディブラウン
                scaleRange: [0.9, 1.4]
            },
            'Limestone': { // 石灰岩
                geometry: new THREE.SphereGeometry(0.25, 6, 6),
                material: new THREE.MeshStandardMaterial({ color: 0xC0C0C0 }), // シルバー
                scaleRange: [0.8, 1.2]
            },

            // 🏜 砂漠気候
            'DesertStone': { // 砂漠石
                geometry: new THREE.DodecahedronGeometry(0.18, 0),
                material: new THREE.MeshStandardMaterial({ color: 0xD2B48C }), // タン
                scaleRange: [0.7, 1.1]
            },
            'Obsidian': { // 黒曜石
                geometry: new THREE.IcosahedronGeometry(0.12, 0),
                material: new THREE.MeshStandardMaterial({ color: 0x000000 }), // 黒
                scaleRange: [0.5, 0.9]
            },

            // 🏔 高山気候
            'Marble': { // 大理石
                geometry: new THREE.SphereGeometry(0.3, 8, 8),
                material: new THREE.MeshStandardMaterial({ color: 0xFFFFFF }), // 白
                scaleRange: [1.0, 1.6]
            },
            'Quartz': { // 石英
                geometry: new THREE.ConeGeometry(0.1, 0.4, 6),
                material: new THREE.MeshStandardMaterial({ color: 0xF5F5F5 }), // ホワイトスモーク
                scaleRange: [0.8, 1.2]
            },

            // 🌲 冷帯（タイガ・亜寒帯）
            'Slate': { // スレート
                geometry: new THREE.BoxGeometry(0.25, 0.1, 0.4),
                material: new THREE.MeshStandardMaterial({ color: 0x708090 }), // スレートグレー
                scaleRange: [0.9, 1.3]
            },
            'Flint': { // 燧石
                geometry: new THREE.IcosahedronGeometry(0.1, 0),
                material: new THREE.MeshStandardMaterial({ color: 0x696969 }), // ダークグレー
                scaleRange: [0.6, 1.0]
            }
        };
        // --- 追加 ここまて ---
    }

    generateInChunk(cx, cy, cz, chunkSize) {
        if (cy !== 0) return; // 地面(Y=0)のチャンクのみ

        const chunkKey = `${cx},${cy},${cz}`;
        const chunk = this.world.getChunkAt(cx, cy, cz);

        if (!chunk) {
            console.warn(`Chunk (${cx}, ${cy}, ${cz}) not found for Stone generation.`);
            return;
        }

        // チャンクの中心座標からバイオームを取得
        const worldCenterX = cx * chunkSize + chunkSize / 2;
        const worldCenterZ = cz * chunkSize + chunkSize / 2;
        // --- 修正: BiomeManager から Biome インスタンスを直接取得 ---
        const biome = this.biomeManager.getBiomeAt(worldCenterX, 0, worldCenterZ); // Y=0でのバイオーム
        // --- 修正 ここまて ---

        // --- 修正: biome が null/undefined でないことを確認 ---
        if (!biome) {
             console.warn(`Biome not found for chunk (${cx}, ${cy}, ${cz}). Skipping stone generation.`);
             return;
        }
        // --- 修正 ここまて ---

        // --- 修正: biome.getStones が関数であることを確認 ---
        if (typeof biome.getStones !== 'function') {
             console.error(`Biome '${biome.name}' does not have a getStones method.`);
             return;
        }
        // --- 修正 ここまて ---

        // バイオームから石の定義を取得
        // --- 修正: biome.getStones() を呼び出す ---
        const stoneDefinitions = biome.getStones(); // [{ type: '...', density: ..., properties: {...} }, ...]
        // --- 修正 ここまて ---

        // 石の定義に基づいて、InstancedMesh を生成・配置
        for (const stoneDef of stoneDefinitions) {
            const stoneType = stoneDef.type;
            const density = stoneDef.density || 0;
            const properties = stoneDef.properties || {};

            // 石の種類が定義されているか確認
            if (!this.stoneTypes[stoneType]) {
                console.warn(`Unknown stone type: ${stoneType}`);
                continue;
            }

            // 石の密度から、チャンク内に生成する数を計算
            const count = Math.floor(density * chunkSize * chunkSize);
            if (count <= 0) continue;

            // 石のジオメトリとマテリアルを取得
            const stoneData = this.stoneTypes[stoneType];
            const geometry = stoneData.geometry;
            const material = stoneData.material.clone(); // マテリアルをクローンして、色などを変更可能に
            const scaleRange = stoneData.scaleRange;

            // InstancedMesh を作成
            const instancedMesh = new THREE.InstancedMesh(geometry, material, count);
            instancedMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage); // 更新頻度が低い場合は StaticDrawUsage でも可
            instancedMesh.castShadow = true;
            instancedMesh.receiveShadow = true;
            instancedMesh.frustumCulled = true; // Frustum Culling を有効化

            // 各インスタンスの変換行列と色を設定
            const matrix = new THREE.Matrix4();
            const color = new THREE.Color();
            for (let i = 0; i < count; i++) {
                // チャンク内のランダムなローカル座標
                const localX = Math.random() * chunkSize;
                const localZ = Math.random() * chunkSize;
                const worldX = cx * chunkSize + localX;
                const worldZ = cz * chunkSize + localZ;

                // 地形の高さを取得して、石のY座標を決定
                const terrainHeight = this.world.getWorldTerrainHeightAt(worldX, worldZ);

                // 石の位置と回転を設定
                const position = new THREE.Vector3(
                    localX - chunkSize / 2,
                    terrainHeight,
                    localZ - chunkSize / 2
                );
                const rotation = new THREE.Euler(
                    Math.random() * Math.PI, // X軸回転 (ランダム)
                    Math.random() * Math.PI * 2, // Y軸回転 (ランダム)
                    Math.random() * Math.PI // Z軸回転 (ランダム)
                );
                const scale = new THREE.Vector3(
                    scaleRange[0] + Math.random() * (scaleRange[1] - scaleRange[0]),
                    scaleRange[0] + Math.random() * (scaleRange[1] - scaleRange[0]),
                    scaleRange[0] + Math.random() * (scaleRange[1] - scaleRange[0])
                );

                matrix.compose(position, new THREE.Quaternion().setFromEuler(rotation), scale);
                instancedMesh.setMatrixAt(i, matrix);

                // 石の色にランダム性を加える (properties から色を取得、なければデフォルト)
                let baseColor = properties.color || material.color;
                if (typeof baseColor === 'number') {
                    baseColor = new THREE.Color(baseColor);
                }
                color.copy(baseColor);
                color.offsetHSL((Math.random() - 0.5) * 0.05, 0, (Math.random() - 0.5) * 0.05); // 石なので色の変化は控えめに
                instancedMesh.setColorAt(i, color);
            }

            instancedMesh.instanceMatrix.needsUpdate = true;
            if (instancedMesh.instanceColor) {
                 instancedMesh.instanceColor.needsUpdate = true;
            }

            // World に追加 (World.js の addStoneToChunk メソッド経由)
            this.world.addStoneToChunk(cx, cy, cz, instancedMesh);
        }
    }

    
}
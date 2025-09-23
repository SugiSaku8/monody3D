// js/world/chunk.js
import * as THREE from "https://unpkg.com/three@0.168.0/build/three.module.js";
import { ImprovedNoise } from "https://unpkg.com/three@0.168.0/examples/jsm/math/ImprovedNoise.js";
import * as CANNON from "https://unpkg.com/cannon-es@0.20.0/dist/cannon-es.js";

// 定数
export const CHUNK_SIZE = 32;
export const TERRAIN_RESOLUTION = 32;
export const RENDER_DISTANCE = 2;

// 関数
export function worldToChunkCoord(worldCoord) {
    return Math.floor(worldCoord / CHUNK_SIZE);
}

export function calculateVisibleChunks(playerChunkX, playerChunkY, playerChunkZ) {
    const chunksToLoad = [];
    for (let dx = -RENDER_DISTANCE; dx <= RENDER_DISTANCE; dx++) {
        for (let dy = -RENDER_DISTANCE; dy <= RENDER_DISTANCE; dy++) {
            for (let dz = -RENDER_DISTANCE; dz <= RENDER_DISTANCE; dz++) {
                const cx = playerChunkX + dx;
                const cy = playerChunkY + dy;
                const cz = playerChunkZ + dz;
                chunksToLoad.push({ cx, cy, cz });
            }
        }
    }
    return chunksToLoad;
}

export function getChunkKey(chunkCoord) {
    return `${chunkCoord.cx},${chunkCoord.cy},${chunkCoord.cz}`;
}

export function chunkToWorldCenter(chunkCoord) {
    return chunkCoord * CHUNK_SIZE + CHUNK_SIZE / 2;
}

export function createChunkWireframe(cx, cy, cz, color = 0xffffff) {
    const chunkGeometry = new THREE.BoxGeometry(CHUNK_SIZE, CHUNK_SIZE, CHUNK_SIZE);
    const edgesGeometry = new THREE.EdgesGeometry(chunkGeometry);
    const lineMaterial = new THREE.LineBasicMaterial({ color: color, linewidth: 1 });
    const chunkWireframe = new THREE.LineSegments(edgesGeometry, lineMaterial);
    const centerX = chunkToWorldCenter(cx);
    const centerY = chunkToWorldCenter(cy);
    const centerZ = chunkToWorldCenter(cz);
    chunkWireframe.position.set(centerX, centerY, centerZ);
    return chunkWireframe;
}

// js/world/chunk.js (関数実装部分)

// ... (import文, 定数定義, 既存のエクスポート関数は変更なし) ...

// --- createNoiseTerrain 関数 ---
export function createNoiseTerrain(cx, cy, cz) {
    const perlin = new ImprovedNoise();
    const geometry = new THREE.BufferGeometry();
    const material = new THREE.MeshStandardMaterial({
        color: 0x00aa00,
        wireframe: false,
        flatShading: false,
    });

    const segments = TERRAIN_RESOLUTION;
    const vertices = [];
    const indices = [];
    const uvs = [];

    const halfSize = CHUNK_SIZE / 2;
    const segmentSize = CHUNK_SIZE / segments;

    // オクターブノイズ関数 (Terrain生成ロジックから抽出)
    function octavedNoise(x, y, z, octaves = 3, persistence = 0.5, scale = 1) {
        let value = 0;
        let amplitude = 1;
        let frequency = scale;
        let maxValue = 0;
        for (let i = 0; i < octaves; i++) {
            value += perlin.noise(x * frequency, y * frequency, z * frequency) * amplitude;
            maxValue += amplitude;
            amplitude *= persistence;
            frequency *= 2;
        }
        return value / maxValue;
    }

    for (let z = 0; z <= segments; z++) {
        for (let x = 0; x <= segments; x++) {
            const localX = x * segmentSize;
            const localZ = z * segmentSize;
            const worldX = cx * CHUNK_SIZE + localX;
            const worldZ = cz * CHUNK_SIZE + localZ;

            let height = octavedNoise(worldX * 0.02, 0, worldZ * 0.02, 4, 0.4) * 10;
            const ceilingLevel = cy * CHUNK_SIZE + 25;
            const worldY = cy * CHUNK_SIZE + height;
            if (worldY > ceilingLevel) {
                const ceilingNoise = octavedNoise(worldX * 0.05, 100, worldZ * 0.05, 3, 0.5) * 3;
                const clampedCeiling = ceilingLevel - Math.max(0, ceilingNoise);
                height = clampedCeiling - cy * CHUNK_SIZE;
            }
            vertices.push(localX - halfSize, cy * CHUNK_SIZE + height, localZ - halfSize);
            uvs.push(x / segments, 1 - z / segments);
        }
    }

    for (let z = 0; z < segments; z++) {
        for (let x = 0; x < segments; x++) {
            const a = x + (segments + 1) * z;
            const b = x + (segments + 1) * (z + 1);
            const c = (x + 1) + (segments + 1) * (z + 1);
            const d = (x + 1) + (segments + 1) * z;
            indices.push(a, b, d);
            indices.push(b, c, d);
        }
    }

    geometry.setIndex(indices);
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geometry.computeVertexNormals();

    const terrainMesh = new THREE.Mesh(geometry, material);
    terrainMesh.position.set(
        chunkToWorldCenter(cx),
        0, // Yは0で、頂点のY座標に高さが含まれている
        chunkToWorldCenter(cz)
    );
    terrainMesh.receiveShadow = true;
    terrainMesh.castShadow = true;
    return terrainMesh;
}
// --- createNoiseTerrain 関数 ここまで ---

// --- getTerrainHeightAt 関数 ---
// Note: これは簡易実装です。正確な高さを得るには、チャンクの頂点データを参照する必要があります。
// ここでは、プレイヤーの現在のチャンクY座標をベースにします。
export function getTerrainHeightAt(x, z) {
    const chunkX = worldToChunkCoord(x);
    const chunkZ = worldToChunkCoord(z);
    // 簡易化: プレイヤーの現在のチャンクYを使用（本来はx,z座標のチャンクY）
    const chunkY = window.GAME ? window.GAME.playerChunkY : 0; // main.jsのグローバル変数にアクセス

    const key = getChunkKey({cx: chunkX, cy: chunkY, cz: chunkZ});
    // 実際には loadedChunks から取得する必要があるが、簡略化のため省略
    // const chunkData = loadedChunks.get(key);
    // if (!chunkData || !chunkData.terrain) {
        return chunkY * CHUNK_SIZE;
    // }
    // ... (実際の頂点データから高さを計算するロジック)
}
// --- getTerrainHeightAt 関数 ここまで ---

// --- createChest 関数 ---
export function createChest() {
    const chestGeometry = new THREE.BoxGeometry(1, 0.8, 0.6);
    const chestMaterial = new THREE.MeshStandardMaterial({ color: 0x8B4513 });
    const chestMesh = new THREE.Mesh(chestGeometry, chestMaterial);
    chestMesh.castShadow = true;
    chestMesh.receiveShadow = true;
    return chestMesh;
}
// --- createChest 関数 ここまで ---

// --- placeChestsInChunk 関数 ---
export function placeChestsInChunk(chunkGroup, cx, cz) {
    if (Math.random() > 0.3) {
        return;
    }

    const localX = Math.random() * CHUNK_SIZE;
    const localZ = Math.random() * CHUNK_SIZE;
    const worldX = cx * CHUNK_SIZE + localX;
    const worldZ = cz * CHUNK_SIZE + localZ;
    const terrainHeight = getTerrainHeightAt(worldX, worldZ); // 簡易実装

    const chest = createChest();

    const halfChunkSize = CHUNK_SIZE / 2;
    chest.position.set(
        localX - halfChunkSize,
        terrainHeight,
        localZ - halfChunkSize
    );

    chunkGroup.add(chest);
    // loadedChests.push(chest); // main.jsのグローバル配列にアクセス
    if (window.GAME && window.GAME.loadedChests) {
        window.GAME.loadedChests.push(chest);
    }
}
// --- placeChestsInChunk 関数 ここまで ---

// --- createTroll 関数 ---
export function createTroll() {
    const trollGeometry = new THREE.SphereGeometry(0.8, 16, 16);
    const trollMaterial = new THREE.MeshStandardMaterial({ color: 0x00ff00 });
    const trollMesh = new THREE.Mesh(trollGeometry, trollMaterial);
    trollMesh.castShadow = true;
    trollMesh.receiveShadow = true;
    trollMesh.userData = { originalColor: new THREE.Color(0x00ff00) };
    return trollMesh;
}
// --- createTroll 関数 ここまで ---

// --- placeTrollsInChunk 関数 ---
export function placeTrollsInChunk(chunkGroup, cx, cz) {
    const trolls = [];
    
    // 20%の確率でトロールを1体配置
    if (Math.random() > 0.2) {
        return trolls; // 空の配列を返す
    }

    const localX = Math.random() * CHUNK_SIZE;
    const localZ = Math.random() * CHUNK_SIZE;
    const worldX = cx * CHUNK_SIZE + localX;
    const worldZ = cz * CHUNK_SIZE + localZ;
    const terrainHeight = getTerrainHeightAt(worldX, worldZ); // 簡易実装

    const troll = createTroll();

    const halfChunkSize = CHUNK_SIZE / 2;
    troll.position.set(
        localX - halfChunkSize,
        terrainHeight + 0.8, // 球体の半径(0.8)を足して地面に立たせる
        localZ - halfChunkSize
    );

    chunkGroup.add(troll);
    trolls.push(troll);
    
    // グローバルなトロールリストに追加
    if (window.GAME && window.GAME.loadedTrolls) {
        window.GAME.loadedTrolls.push(troll);
    }
    
    return trolls;
}
// --- placeTrollsInChunk 関数 ここまで ---

// --- placeTreesInChunk 関数 ---
export function placeTreesInChunk(chunkGroup, cx, cz) {
    const numTrees = Math.floor(Math.random() * 10) + 1;
    const halfChunkSize = CHUNK_SIZE / 2;
    const minDistance = 4.0;
    const maxAttempts = 10;
    const placedTrees = [];

    for (let i = 0; i < numTrees; i++) {
        let placed = false;
        let attempts = 0;

        while (!placed && attempts < maxAttempts) {
            attempts++;
            const margin = 2.0;
            const localX = margin + Math.random() * (CHUNK_SIZE - 2 * margin);
            const localZ = margin + Math.random() * (CHUNK_SIZE - 2 * margin);
            const worldX = cx * CHUNK_SIZE + localX;
            const worldZ = cz * CHUNK_SIZE + localZ;

            let tooClose = false;
            for (const otherTreePos of placedTrees) {
                const dx = worldX - otherTreePos.x;
                const dz = worldZ - otherTreePos.z;
                const distanceSq = dx * dx + dz * dz;
                if (distanceSq < minDistance * minDistance) {
                    tooClose = true;
                    break;
                }
            }

            if (!tooClose) {
                const terrainHeight = getTerrainHeightAt(worldX, worldZ); // 簡易実装
                const tree = createTree();
                tree.position.set(
                    localX - halfChunkSize,
                    terrainHeight,
                    localZ - halfChunkSize
                );
                chunkGroup.add(tree);
                placedTrees.push({ x: worldX, z: worldZ });
                placed = true;
            }
        }
        if (!placed) {
            console.warn(`チャンク (${cx}, ${cz}) への木の配置に失敗しました (試行回数オーバー)`);
        }
    }
    // loadedTrees.push(...placedTrees); // 必要に応じて管理配列に追加
    if (window.GAME && window.GAME.loadedTrees) {
        window.GAME.loadedTrees.push(...placedTrees);
    }
}
// --- placeTreesInChunk 関数 ここまで ---

// --- createTree 関数 ---
export function createTree() {
    const treeGroup = new THREE.Group();

    const trunkHeight = 1.5 + Math.random() * 3.5;
    const trunkTopRadius = 0.08 + Math.random() * 0.25;
    const trunkBottomRadius = trunkTopRadius + 0.05 + Math.random() * 0.25;
    const leavesRadius = 0.8 + Math.random() * 1.7;

    const leafHue = 0.3 + Math.random() * 0.1;
    const leafSaturation = 0.5 + Math.random() * 0.5;
    const leafLightness = 0.2 + Math.random() * 0.3;
    const leafColor = new THREE.Color(`hsl(${leafHue * 360}, ${leafSaturation * 100}%, ${leafLightness * 100}%)`);

    const trunkHue = 0.1;
    const trunkSaturation = 0.3 + Math.random() * 0.3;
    const trunkLightness = 0.1 + Math.random() * 0.2;
    const trunkColor = new THREE.Color(`hsl(${trunkHue * 360}, ${trunkSaturation * 100}%, ${trunkLightness * 100}%)`);

    const trunkGeometry = new THREE.CylinderGeometry(trunkTopRadius, trunkBottomRadius, trunkHeight, 8);
    const trunkMaterial = new THREE.MeshStandardMaterial({ color: trunkColor });
    const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
    trunk.position.y = trunkHeight / 2;
    trunk.castShadow = true;
    trunk.receiveShadow = true;
    treeGroup.add(trunk);

    const leavesGeometry = new THREE.SphereGeometry(leavesRadius, 8, 8);
    const leavesMaterial = new THREE.MeshStandardMaterial({ color: leafColor });
    const leaves = new THREE.Mesh(leavesGeometry, leavesMaterial);
    leaves.position.y = trunkHeight + leavesRadius * 0.7;
    leaves.castShadow = true;
    leaves.receiveShadow = true;
    treeGroup.add(leaves);

    return treeGroup;
}
// --- createTree 関数 ここまで ---

// ... (既存のエクスポートされた関数は変更なし) ...
// js/world/chunk.js

// ... (既存の import, 定数, 関数は変更なし) ...

// --- 追加したコード: initWorld 関数 ---
/**
 * ワールドの初期設定を行う関数
 * @param {THREE.Scene} scene - Three.jsのシーン
 */
export function initWorld(scene) {
    console.log("ワールドシステムを初期化しています...");

    // 1. 環境光の追加
    const ambientLight = new THREE.AmbientLight(0x404040);
    scene.add(ambientLight);

    // 2. 平行光源（ディレクショナルライト）の追加
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(1, 1, 0.5).normalize();
    directionalLight.castShadow = true;

    // ライトの影の設定 (パラメータは調整可能)
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    directionalLight.shadow.camera.near = 0.5;
    directionalLight.shadow.camera.far = 500;
    directionalLight.shadow.camera.left = -100;
    directionalLight.shadow.camera.right = 100;
    directionalLight.shadow.camera.top = 100;
    directionalLight.shadow.camera.bottom = -100;

    scene.add(directionalLight);

    console.log("ワールドシステムの初期化が完了しました。(光源追加)");
    // チャンクの初期読み込みは main.js の animate ループや init 関数で行う想定
}
// --- 追加したコード ここまで ---

// ... (既存のエクスポート関数は変更なし) ...
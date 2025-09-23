// js/main.js - メインエントリーポイント
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { ImprovedNoise } from 'three/addons/math/ImprovedNoise.js';
import * as CANNON from 'cannon-es';

// モジュールのインポート
import {
    CHUNK_SIZE,
    TERRAIN_RESOLUTION,
    RENDER_DISTANCE,
    worldToChunkCoord,
    calculateVisibleChunks,
    createChunkWireframe,
    createNoiseTerrain,
    getTerrainHeightAt,
    createChest,
    placeChestsInChunk,
    createTroll,
    placeTrollsInChunk,
    placeTreesInChunk,
    createTree,
    initWorld // <- これはまだ chunk.js に定義されていない
} from './world/chunk.js';

// ui/ui.js からエクスポートされているものをインポート
import {
    initSounds, // <- ui.js に定義済み
    playSound,   // <- ui.js に定義済み
    toggleBGM,   // <- ui.js に定義済み
    showMessage,  // <- ui.js に定義済み
     initUI // <- これはまだ ui.js に定義されていない
} from './ui/ui.js';

// player/player.js からエクスポートされているものをインポート
import {
    playerInventory,    // <- player.js に定義済み
    updateInventoryUI,   // <- player.js に定義済み
    addItemToInventory,  // <- player.js に定義済み
    craftItem,           // <- player.js に定義済み
    playerHP,            // <- player.js に定義済み (let なので注意)
    updatePlayerHP,      // <- player.js に定義済み
    damagePlayer,         // <- player.js に定義済み
    initPlayer // <- これはまだ player.js に定義されていない
} from './player/player.js';

// 定数とグローバル変数
const PLAYER_SPEED = 5.0;
const JUMP_FORCE = 7.0;
const GRAVITY = 20.0;

// ゲームの状態
const state = {
    isPaused: false,
    lastTime: 0,
    clock: new THREE.Clock(),
    player: {
        position: new THREE.Vector3(50, 20, -25),
        velocity: new THREE.Vector3(),
        direction: new THREE.Vector3(),
        moveForward: false,
        moveBackward: false,
        moveLeft: false,
        moveRight: false,
        canJump: true,
        isOnGround: false
    },
    chunks: {},
    loadedChunks: new Set(),
    loadedTrolls: []
};

// Three.jsのセットアップ
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87CEEB); // 空の色
scene.fog = new THREE.Fog(0x87CEEB, 100, 200); // フォグを追加して遠景をぼかす

// カメラの設定
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true, canvas: document.getElementById('gameCanvas') });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

// 物理エンジンの設定
const physicsWorld = new CANNON.World({
    gravity: new CANNON.Vec3(0, -GRAVITY, 0),
    broadphase: new CANNON.NaiveBroadphase(),
    solver: new CANNON.GSSolver()
});
physicsWorld.defaultContactMaterial.friction = 0.1;
physicsWorld.defaultContactMaterial.restitution = 0.3;

// プレイヤーの物理ボディ
const playerShape = new CANNON.Sphere(0.5);
const playerBody = new CANNON.Body({
    mass: 5,
    position: new CANNON.Vec3(50, 20, -25),
    shape: playerShape,
    linearDamping: 0.5
});
physicsWorld.addBody(playerBody);

// 地面の物理ボディ
const groundShape = new CANNON.Plane();
const groundBody = new CANNON.Body({
    mass: 0, // 質量0で静的ボディに
    shape: groundShape
});
groundBody.quaternion.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), -Math.PI / 2);
physicsWorld.addBody(groundBody);

// ライトの設定
const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambientLight);

const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
dirLight.position.set(50, 200, 100);
dirLight.castShadow = true;
dirLight.shadow.mapSize.width = 2048;
dirLight.shadow.mapSize.height = 2048;
dirLight.shadow.camera.near = 0.5;
dirLight.shadow.camera.far = 500;
dirLight.shadow.camera.left = -100;
dirLight.shadow.camera.right = 100;
dirLight.shadow.camera.top = 100;
dirLight.shadow.camera.bottom = -100;
scene.add(dirLight);

// プレイヤーメッシュ
const playerGeometry = new THREE.CapsuleGeometry(0.5, 1, 4, 8);
const playerMaterial = new THREE.MeshPhongMaterial({ color: 0x00ff00 });
const playerMesh = new THREE.Mesh(playerGeometry, playerMaterial);
playerMesh.castShadow = true;
playerMesh.receiveShadow = true;
scene.add(playerMesh);

// チャンクの読み込みとアンロード
function updateChunks() {
    const chunkX = Math.floor(playerBody.position.x / CHUNK_SIZE);
    const chunkZ = Math.floor(playerBody.position.z / CHUNK_SIZE);
    
    // 表示するチャンクを計算
    const visibleChunks = [];
    for (let x = -RENDER_DISTANCE; x <= RENDER_DISTANCE; x++) {
        for (let z = -RENDER_DISTANCE; z <= RENDER_DISTANCE; z++) {
            visibleChunks.push(`${chunkX + x},${0},${chunkZ + z}`);
        }
    }
    
    // 不要なチャンクをアンロード
    const chunksToRemove = [];
    state.loadedChunks.forEach(chunkKey => {
        if (!visibleChunks.includes(chunkKey)) {
            chunksToRemove.push(chunkKey);
        }
    });
    
    // 新しいチャンクをロード
    visibleChunks.forEach(chunkKey => {
        if (!state.loadedChunks.has(chunkKey)) {
            loadChunk(chunkKey);
        }
    });
}

// チャンクをロードする
function loadChunk(chunkKey) {
    if (state.loadedChunks.has(chunkKey)) {
        console.log(`Chunk ${chunkKey} already loaded, skipping...`);
        return;
    }
    
    console.log(`Loading chunk: ${chunkKey}`);
    const [cx, cy, cz] = chunkKey.split(',').map(Number);
    
    // チャンクグループの作成
    const chunkGroup = new THREE.Group();
    chunkGroup.name = `chunk_${chunkKey}`;
    
    try {
        // 地形を生成
        console.log(`Creating terrain for chunk ${chunkKey} (${cx}, ${cy}, ${cz})...`);
        const terrain = createNoiseTerrain(cx, cy, cz);
        
        if (!terrain) {
            console.error('createNoiseTerrain returned null or undefined');
            return; // Skip this chunk if terrain creation fails
        }
        
        // メッシュの追加
        if (terrain.mesh && terrain.mesh.isObject3D) {
            try {
                chunkGroup.add(terrain.mesh);
                console.log(`Added terrain mesh to chunk ${chunkKey}`);
                
                // 物理ボディの追加 (オプション)
                if (terrain.body && physicsWorld) {
                    try {
                        physicsWorld.addBody(terrain.body);
                        console.log(`Added physics body for chunk ${chunkKey}`);
                    } catch (physicsError) {
                        console.warn(`Failed to add physics body for chunk ${chunkKey}:`, physicsError);
                        // 物理ボディが追加できなくても処理は続行
                    }
                }
                
                // チャンクをシーンに追加
                scene.add(chunkGroup);
                state.loadedChunks.add(chunkKey);
                state.chunks[chunkKey] = chunkGroup;
                
                console.log(`Successfully loaded chunk ${chunkKey}`);
                
            } catch (addError) {
                console.error(`Error adding terrain to chunk ${chunkKey}:`, addError);
                // エラーが発生した場合、チャンクをクリーンアップ
                if (terrain.body && physicsWorld) {
                    physicsWorld.remove(terrain.body);
                }
                scene.remove(chunkGroup);
                throw addError; // エラーを再スローして上位のエラーハンドラに渡す
            }
        } else {
            console.error(`Invalid terrain mesh for chunk ${chunkKey}`, {
                hasMesh: !!terrain.mesh,
                isObject3D: terrain.mesh ? terrain.mesh.isObject3D : false
            });
            // 無効なメッシュの場合は処理をスキップ
            return;
        }
        
        // トロールを配置（ランダムに）
        if (Math.random() < 0.3) { // 30%の確率でトロールを配置
            try {
                const trolls = placeTrollsInChunk(chunkGroup, cx, cz);
                if (trolls && trolls.length > 0) {
                    trolls.forEach(troll => {
                        if (troll && troll.body && physicsWorld) {
                            physicsWorld.addBody(troll.body);
                            state.loadedTrolls.push(troll);
                        }
                    });
                }
            } catch (error) {
                console.error('Error placing trolls:', error);
            }
        }
        
        // チャンクグループをシーンに追加
        if (chunkGroup && chunkGroup.isObject3D) {
            try {
                scene.add(chunkGroup);
                console.log('Chunk group added to scene:', chunkKey);
                state.loadedChunks.add(chunkKey);
                state.chunks[chunkKey] = chunkGroup;
            } catch (e) {
                console.error('Error adding chunk group to scene:', e);
                console.error('Chunk group state:', {
                    isObject3D: chunkGroup.isObject3D,
                    children: chunkGroup.children,
                    position: chunkGroup.position,
                    userData: chunkGroup.userData
                });
            }
        } else {
            console.error('Invalid chunk group:', chunkGroup);
        }
    } catch (error) {
        console.error(`Error loading chunk ${chunkKey}:`, error);
    }
}

// アンロードするチャンクを削除
function unloadChunk(chunkKey) {
    if (!state.loadedChunks.has(chunkKey)) return;
    
    const chunk = state.chunks[chunkKey];
    if (chunk) {
        // シーンから削除
        scene.remove(chunk);
        
        // 物理ボディを削除（あれば）
        if (chunk.body) {
            physicsWorld.removeBody(chunk.body);
        }
        
        // トロールを削除
        state.loadedTrolls = state.loadedTrolls.filter(troll => {
            if (chunk.children.includes(troll.mesh)) {
                physicsWorld.removeBody(troll.body);
                return false;
            }
            return true;
        });
        
        // メモリ解放
        chunk.traverse(child => {
            if (child.geometry) child.geometry.dispose();
            if (child.material) {
                if (Array.isArray(child.material)) {
                    child.material.forEach(material => material.dispose());
                } else {
                    child.material.dispose();
                }
            }
        });
        
        delete state.chunks[chunkKey];
    }
    
    state.loadedChunks.delete(chunkKey);
}

// キーボード入力の処理
const keys = {};
document.addEventListener('keydown', (event) => {
    keys[event.code] = true;
    
    // スペースキーでジャンプ
    if (event.code === 'Space' && state.player.canJump) {
        playerBody.velocity.y = JUMP_FORCE;
        state.player.canJump = false;
    }
    
    // Cキーでクラフト
    if (event.code === 'KeyC') {
        craftItem('棒');
    }
    
    // Pキーで一時停止
    if (event.code === 'KeyP') {
        state.isPaused = !state.isPaused;
        showMessage(state.isPaused ? '一時停止中' : '再開しました');
    }
    
    // MキーでBGMのON/OFF
    if (event.code === 'KeyM') {
        toggleBGM();
    }
});

document.addEventListener('keyup', (event) => {
    keys[event.code] = false;
});

// マウスで視点移動
let isMouseLocked = false;
const mouse = new THREE.Vector2();
const target = new THREE.Vector3();
const PI_2 = Math.PI / 2;
let yaw = 0;
let pitch = 0;

// マウスロックのリクエスト
function requestPointerLock() {
    const canvas = renderer.domElement;
    canvas.requestPointerLock = canvas.requestPointerLock || 
                               canvas.mozRequestPointerLock || 
                               canvas.webkitRequestPointerLock;
    
    canvas.requestPointerLock();
}

// マウスロックの変更を監視
document.addEventListener('pointerlockchange', onPointerLockChange, false);
document.addEventListener('mozpointerlockchange', onPointerLockChange, false);
document.addEventListener('webkitpointerlockchange', onPointerLockChange, false);

function onPointerLockChange() {
    if (document.pointerLockElement === renderer.domElement ||
        document.mozPointerLockElement === renderer.domElement ||
        document.webkitPointerLockElement === renderer.domElement) {
        isMouseLocked = true;
        document.addEventListener('mousemove', onMouseMove, false);
    } else {
        isMouseLocked = false;
        document.removeEventListener('mousemove', onMouseMove, false);
    }
}

// マウス移動の処理
function onMouseMove(event) {
    if (!isMouseLocked) return;
    
    const movementX = event.movementX || event.mozMovementX || event.webkitMovementX || 0;
    const movementY = event.movementY || event.mozMovementY || event.webkitMovementY || 0;
    
    yaw -= movementX * 0.002;
    pitch -= movementY * 0.002;
    
    // 上下の回転を制限
    pitch = Math.max(-PI_2, Math.min(PI_2, pitch));
}

// リサイズ処理
window.addEventListener('resize', onWindowResize, false);

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

// ゲームループ
function animate() {
    requestAnimationFrame(animate);
    
    // 一時停止中は更新しない
    if (state.isPaused) return;
    
    const deltaTime = Math.min(0.1, state.clock.getDelta());
    
    // プレイヤーの移動処理
    updatePlayer(deltaTime);
    
    // 物理シミュレーションの更新
    physicsWorld.step(1/60, deltaTime, 3);
    
    // カメラの位置と向きを更新
    updateCamera();
    
    // チャンクの更新
    updateChunks();
    
    // トロールの更新
    updateTrolls(deltaTime);
    
    // UIの更新
    updateUI();
    
    // レンダリング
    renderer.render(scene, camera);
}

// プレイヤーの更新
function updatePlayer(deltaTime) {
    // キーボード入力に基づいて移動方向を計算
    const moveX = (keys['KeyD'] ? 1 : 0) - (keys['KeyA'] ? 1 : 0);
    const moveZ = (keys['KeyS'] ? 1 : 0) - (keys['KeyW'] ? 1 : 0);
    
    // 移動方向を正規化
    const moveLength = Math.sqrt(moveX * moveX + moveZ * moveZ);
    const moveDirection = new THREE.Vector3(
        moveLength > 0 ? moveX / moveLength : 0,
        0,
        moveLength > 0 ? moveZ / moveLength : 0
    );
    
    // カメラの向きに合わせて移動方向を回転
    const yawQuaternion = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), yaw);
    moveDirection.applyQuaternion(yawQuaternion);
    
    // 移動速度を適用
    const moveSpeed = PLAYER_SPEED * deltaTime;
    moveDirection.multiplyScalar(moveSpeed);
    
    // 物理ボディに速度を適用
    playerBody.velocity.x = moveDirection.x * 10;
    playerBody.velocity.z = moveDirection.z * 10;
    
    // プレイヤーメッシュの位置を物理ボディに同期
    playerMesh.position.copy(playerBody.position);
    
    // 地面に接地しているかチェック
    const ray = new THREE.Raycaster(
        playerMesh.position,
        new THREE.Vector3(0, -1, 0),
        0,
        1.1
    );
    
    const intersects = []; // ここでレイキャストを実行する必要があります
    state.player.isOnGround = intersects.length > 0;
    
    if (state.player.isOnGround) {
        state.player.canJump = true;
    }
}

// カメラの更新
function updateCamera() {
    // カメラの位置をプレイヤーの頭の位置に設定
    camera.position.x = playerBody.position.x;
    camera.position.y = playerBody.position.y + 1.6; // 目の高さ
    camera.position.z = playerBody.position.z;
    
    // カメラの向きを更新
    const yawQuaternion = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), yaw);
    const pitchQuaternion = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), pitch);
    
    const quaternion = new THREE.Quaternion().multiplyQuaternions(yawQuaternion, pitchQuaternion);
    camera.quaternion.copy(quaternion);
    
    // カメラの向きに応じてプレイヤーメッシュを回転
    playerMesh.quaternion.copy(yawQuaternion);
}

// トロールの更新
function updateTrolls(deltaTime) {
    const playerPos = {
        x: playerBody.position.x,
        y: playerBody.position.y,
        z: playerBody.position.z
    };
    
    state.loadedTrolls = state.loadedTrolls.filter(troll => {
        // トロールが生きているか確認
        if (!troll.isAlive()) return false;
        
        // トロールの更新
        troll.update(playerPos, deltaTime);
        
        // プレイヤーとの距離をチェック
        const distance = new THREE.Vector3(
            playerPos.x - troll.body.position.x,
            playerPos.y - troll.body.position.y,
            playerPos.z - troll.body.position.z
        ).length();
        
        // 近くにいるトロールにダメージを与える（例: 左クリックで攻撃）
        if (distance < 2 && keys['Mouse0']) {
            const damage = 10; // ダメージ量
            const isDead = troll.takeDamage(damage);
            if (isDead) {
                // トロールが死んだらインベントリにアイテムを追加
                addItemToInventory('青りんご', 1);
                return false; // トロールを削除
            }
        }
        
        return true; // トロールを保持
    });
}

// プレイヤーの位置UIを更新する関数
function updatePlayerPositionUI(x, y, z) {
    try {
        const posX = Math.round(x * 10) / 10;
        const posY = Math.round(y * 10) / 10;
        const posZ = Math.round(z * 10) / 10;
        
        const posElement = document.getElementById('player-position');
        if (posElement) {
            posElement.textContent = `位置: X: ${posX}, Y: ${posY}, Z: ${posZ}`;
        } else {
            console.warn('Player position element not found');
        }
    } catch (e) {
        console.error('Error updating player position UI:', e);
    }
}

// プレイヤーのチャンク位置UIを更新する関数
function updatePlayerChunkUI(chunkX, chunkY, chunkZ) {
    try {
        const chunkPosElement = document.getElementById('player-chunk');
        if (chunkPosElement) {
            chunkPosElement.textContent = `チャンク: ${chunkX}, ${chunkY}, ${chunkZ}`;
        } else {
            console.warn('Player chunk element not found');
        }
    } catch (e) {
        console.error('Error updating player chunk UI:', e);
    }
}

// プレイヤーの接地状態UIを更新する関数
function updateOnGroundUI(isOnGround) {
    try {
        const groundElement = document.getElementById('player-ground-state');
        if (groundElement) {
            groundElement.textContent = `接地状態: ${isOnGround ? '接地中' : '空中'}`;
            groundElement.style.color = isOnGround ? '#4CAF50' : '#F44336';
        }
    } catch (e) {
        console.error('Error updating ground state UI:', e);
    }
}

// UIの更新
function updateUI() {
    try {
        if (!state.player || !state.player.body) {
            console.warn('Player or player body not available for UI update');
            return;
        }

        // プレイヤーの位置を更新
        updatePlayerPositionUI(
            state.player.body.position.x, 
            state.player.body.position.y, 
            state.player.body.position.z
        );
        
        // プレイヤーのチャンク位置を更新
        const chunkX = Math.floor(state.player.body.position.x / CHUNK_SIZE);
        const chunkZ = Math.floor(state.player.body.position.z / CHUNK_SIZE);
        updatePlayerChunkUI(chunkX, 0, chunkZ);
        
        // 接地状態を更新
        if (typeof state.player.isOnGround !== 'undefined') {
            updateOnGroundUI(state.player.isOnGround);
        }
    } catch (error) {
        console.error('Error in updateUI:', error);
    }
}

// 初期化
async function init() {
    console.log('ゲームを初期化中...');
    
    // UIの初期化
    initUI();
    
    // プレイヤーの初期化
    const initialPlayerPosition = new THREE.Vector3(0, 10, 0); // 初期位置を設定 (適切なY座標に調整)
    const { playerMesh, playerBody, camera } = initPlayer(scene, physicsWorld, initialPlayerPosition);
    
    // プレイヤー参照を保持
    state.player.mesh = playerMesh;
    state.player.body = playerBody;
    state.player.camera = camera;
    
    // 初期チャンクをロード
    updateChunks();
    
    // マウスロックのリクエスト
    renderer.domElement.addEventListener('click', requestPointerLock);
    
    console.log('ゲームの初期化が完了しました。');
    
    // ゲームループを開始
    animate();
}

// ゲームの開始
init().catch(error => {
    console.error('ゲームの初期化中にエラーが発生しました:', error);
});
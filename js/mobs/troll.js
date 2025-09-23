// js/mobs/troll.js
import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { playSound } from '../ui/ui.js';
import { addItemToInventory } from '../player/player.js';

export function createTroll() {
    // トロールのメッシュを作成
    const geometry = new THREE.BoxGeometry(1, 2, 1);
    const material = new THREE.MeshStandardMaterial({ color: 0x00aa00 });
    const trollMesh = new THREE.Mesh(geometry, material);
    
    // 物理ボディを作成
    const shape = new CANNON.Box(new CANNON.Vec3(0.5, 1, 0.5));
    const body = new CANNON.Body({
        mass: 5,
        shape: shape,
        position: new CANNON.Vec3(0, 5, 0),
        linearDamping: 0.5,
        angularDamping: 0.5
    });
    
    // トロールの状態
    const state = {
        health: 30,
        lastTalkTime: 0,
        talkCooldown: 5000, // 5秒間のクールダウン
        isAlive: true
    };
    
    // トロールの行動パターン
    function updateTroll(playerPosition, deltaTime) {
        if (!state.isAlive) return;
        
        const now = Date.now();
        const distanceToPlayer = body.position.distanceTo(
            new CANNON.Vec3(playerPosition.x, playerPosition.y, playerPosition.z)
        );
        
        // プレイヤーに近づく
        if (distanceToPlayer < 20) {
            const direction = new CANNON.Vec3();
            direction.subVectors(
                new CANNON.Vec3(playerPosition.x, 0, playerPosition.z),
                new CANNON.Vec3(body.position.x, 0, body.position.z)
            ).normalize();
            
            // 移動速度を適用
            const speed = 5;
            body.velocity.x = direction.x * speed;
            body.velocity.z = direction.z * speed;
            
            // ランダムに話しかける
            if (now - state.lastTalkTime > state.talkCooldown && Math.random() < 0.01) {
                talk();
                state.lastTalkTime = now;
            }
        }
        
        // メッシュの位置を物理ボディに同期
        trollMesh.position.copy(body.position);
        trollMesh.quaternion.copy(body.quaternion);
    }
    
    // トロールが話す
    function talk() {
        const messages = [
            "ウォーーーーッ！",
            "お前のものは俺のもの！",
            "ウホウホ！",
            "食ってやるぞ！"
        ];
        const message = messages[Math.floor(Math.random() * messages.length)];
        
        // メッセージを表示
        const messageElement = document.getElementById('message');
        if (messageElement) {
            messageElement.textContent = `トロール「${message}」`;
            messageElement.style.display = 'block';
            
            // 3秒後にメッセージを消す
            setTimeout(() => {
                messageElement.style.display = 'none';
            }, 3000);
        }
        
        // 効果音を再生
        playSound('sfxTrollTalk');
    }
    
    // ダメージを受ける
    function takeDamage(amount) {
        if (!state.isAlive) return false;
        
        state.health -= amount;
        
        // トロールが死んだ場合
        if (state.health <= 0) {
            state.isAlive = false;
            
            // アイテムをドロップ
            if (Math.random() < 0.5) {
                addItemToInventory('青りんご', 1);
            }
            
            // メッシュを非表示にする
            trollMesh.visible = false;
            
            // 物理ボディを無効化
            body.collisionResponse = false;
            body.position.set(-1000, -1000, -1000);
            
            // メッセージを表示
            const messageElement = document.getElementById('message');
            if (messageElement) {
                messageElement.textContent = 'トロールを倒した！';
                messageElement.style.display = 'block';
                
                // 3秒後にメッセージを消す
                setTimeout(() => {
                    messageElement.style.display = 'none';
                }, 3000);
            }
            
            return true; // トロールが倒された
        }
        
        return false; // トロールはまだ生きている
    }
    
    return {
        mesh: trollMesh,
        body: body,
        update: updateTroll,
        takeDamage: takeDamage,
        isAlive: () => state.isAlive
    };
}

export function placeTrollsInChunk(chunkGroup, cx, cz, count = 1) {
    const trolls = [];
    
    for (let i = 0; i < count; i++) {
        // チャンク内のランダムな位置に配置
        const x = (cx * 32) + (Math.random() * 32 - 16);
        const z = (cz * 32) + (Math.random() * 32 - 16);
        const y = 20; // 高さは適当な値（後で地形に合わせて調整）
        
        const troll = createTroll();
        troll.body.position.set(x, y, z);
        troll.mesh.position.set(x, y, z);
        
        chunkGroup.add(troll.mesh);
        trolls.push(troll);
    }
    
    return trolls;
}

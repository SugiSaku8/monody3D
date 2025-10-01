// js/modules/entities/Player.js
import * as THREE from 'three';
import * as CANNON from 'cannon-es';

export class Player {
    constructor(scene, world) {
        this.scene = scene;
        this.world = world; // World インスタンスを保存
        this.SPEED = 5.0; // 移動速度 (必要に応じて調整)
        this.JUMP_FORCE = 4.0;
        this.GRAVITY = 20.0; // 物理エンジンの重力に合わせる
        this.moveDirection = new THREE.Vector3();
        this.velocity = new THREE.Vector3();
        this.isOnGround = false;

        // Set up camera
        this.camera = new THREE.PerspectiveCamera(
            75,
            window.innerWidth / window.innerHeight,
            0.1,
            1000
        );
        this.camera.position.set(0, 1.6, 0); // 目の高さ

        // Set up player physics (Y軸回転のみ固定)
        this.setupPhysics();

        // Set up controls
        this.keys = {
            w: false,
            a: false,
            s: false,
            d: false,
            ' ': false
        };

        // Set up pointer lock
        this.isPointerLocked = false;
        this.pointerSensitivity = 0.002;
        this.yaw = 0;
        this.pitch = 0;
    }

    setupPhysics() {
        // Set up physics body (Cylinder shape)
        const radius = 0.5;
        const height = 1.8;

        const shape = new CANNON.Cylinder(radius, radius, height, 8);

        this.body = new CANNON.Body({
            mass: 5,
            position: new CANNON.Vec3(0, 5, 0), // Start slightly above ground (例: Y=5)
            shape: shape,
            fixedRotation: true, // Y軸回転のみ固定
            linearDamping: 0.1, // Air resistance
            angularDamping: 0.99 // Rotational resistance
        });

        // Add the body to the physics world
        this.world.physicsWorld.addBody(this.body);
    }

    get position() {
        return this.body.position;
    }

    set position(pos) {
        this.body.position.copy(pos);
    }

    lockPointer() {
        if (!this.isPointerLocked) {
            const canvas = document.querySelector('canvas');
            if (canvas) {
                canvas.requestPointerLock = canvas.requestPointerLock ||
                                      canvas.mozRequestPointerLock ||
                                      canvas.webkitRequestPointerLock;
                canvas.requestPointerLock();
            } else {
                console.error("Canvas element not found for pointer lock.");
            }
        }
    }

    handleKeyDown(event) {
        if (event.key in this.keys) {
            this.keys[event.key] = true;

            // Handle jump
            if (event.key === ' ' && this.isOnGround) {
                this.jump();
            }
        }
    }

    handleKeyUp(event) {
        if (event.key in this.keys) {
            this.keys[event.key] = false;
        }
    }

    handleMouseMove(event) {
        if (!this.isPointerLocked) return;

        // Update yaw (left/right) and pitch (up/down) based on mouse movement
        this.yaw -= event.movementX * this.pointerSensitivity;
        this.pitch = Math.max(-Math.PI/2, Math.min(Math.PI/2, this.pitch - event.movementY * this.pointerSensitivity));

        // Update camera rotation
        this.camera.quaternion.setFromEuler(new THREE.Euler(this.pitch, this.yaw, 0, 'YXZ'));
    }

    jump() {
        if (this.isOnGround) {
            this.body.velocity.y = this.JUMP_FORCE;
            this.isOnGround = false;
            // Play jump sound
            // this.audioManager.playSound('jump');
        }
    }

    update(delta) {
        // Update camera position to follow physics body
        this.camera.position.copy(this.body.position);
        this.camera.position.y += 0.5; // Adjust for eye level (0.5 = height/2)

        // Handle movement
        this.handleMovement(delta);

        // --- 修正: World.getWorldTerrainHeightAt を使用して接地判定と位置補正 ---
        this.checkGroundContactWithWorldHeight();
        // --- 修正 ここまて ---

        // Check if player is on ground
        // this.checkGroundContact(); // これは削除またはコメントアウト (checkGroundContactWithWorldHeight で代用)
    }

    handleMovement(delta) {
        // Reset movement vector
        this.moveDirection.set(0, 0, 0);

        // Get camera direction vectors
        const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(this.camera.quaternion);
        const right = new THREE.Vector3(1, 0, 0).applyQuaternion(this.camera.quaternion);

        // Flatten the forward vector for movement on the XZ plane
        const forwardFlat = new THREE.Vector3(forward.x, 0, forward.z).normalize();
        const rightFlat = new THREE.Vector3(right.x, 0, right.z).normalize();

        // Apply movement based on key states
        if (this.keys['w']) this.moveDirection.add(forwardFlat);
        if (this.keys['s']) this.moveDirection.sub(forwardFlat);
        if (this.keys['a']) this.moveDirection.sub(rightFlat);
        if (this.keys['d']) this.moveDirection.add(rightFlat);

        // Normalize and scale by speed
        if (this.moveDirection.lengthSq() > 0) {
            this.moveDirection.normalize().multiplyScalar(this.SPEED);
        }

        // Apply movement to physics body (X, Z only)
        // Y速度は、ジャンプや重力、または接地判定で変更
        this.body.velocity.x = this.moveDirection.x;
        this.body.velocity.z = this.moveDirection.z;
        // Y速度は、ジャンプや重力、または接地判定で変更
    }

    // --- 修正: World.getWorldTerrainHeightAt を使用した接地判定と位置補正 ---
    checkGroundContactWithWorldHeight() {
        const playerPos = this.body.position;
        // --- 修正: World.js の getWorldTerrainHeightAt メソッドを使用 ---
        const terrainHeight = this.world.getWorldTerrainHeightAt(playerPos.x, playerPos.z);
        // --- 修正 ここまて ---

        // プレイヤーの足元のY座標 (Bodyの中心Y - 高さ/2)
        const playerFootY = playerPos.y - 1.8 / 2; // Cylinder の高さが 1.8 なので

        // 地形の高さに少しマージンを設ける (例: 0.1)
        const tolerance = 0.1;

        // --- 修正: プレイヤーの足元が地形の高さ以下のとき、接地しているとみなす ---
        if (playerFootY <= terrainHeight + tolerance) {
            // --- 修正: プレイヤーの位置を地形の高さ + 足元のオフセットに補正 ---
            this.body.position.y = terrainHeight + 1.8 / 2 + tolerance; // 足元 -> 中心Yに変換 + ちょっと上に
            // --- 修正 ここまて ---
            // Y方向の速度を0にして落下を止める
            // 完全に0にすると、坂を下りるときに引っかかる可能性があるので、わずかに下向きの速度を許容
            if (this.body.velocity.y < 0) {
                 this.body.velocity.y = 0;
            }
            this.isOnGround = true;
        } else {
            // 地形から離れている場合、接地状態を解除
            this.isOnGround = false;
        }
        // --- 修正 ここまて ---
    }
    // --- 修正 ここまて ---
}
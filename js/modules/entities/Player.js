// js/modules/entities/Player.js
import * as THREE from 'three';
import * as CANNON from 'cannon-es';

export class Player {
    constructor(scene, world) {
        this.scene = scene;
        this.world = world;
        this.SPEED = 5.0;
        this.JUMP_FORCE = 4.0;
        this.GRAVITY = 20.0;
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
        this.camera.position.set(0, 1.6, 0);

        // Set up player physics
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

    // New method to initialize with renderer
    initWithRenderer(renderer) {
        this.renderer = renderer;
        this.setupEventListeners();
    }

    setupEventListeners() {
        document.addEventListener('keydown', this.handleKeyDown.bind(this));
        document.addEventListener('keyup', this.handleKeyUp.bind(this));
        document.addEventListener('mousemove', this.handleMouseMove.bind(this));
        
        // Use renderer's canvas for pointer lock
        this.renderer.domElement.addEventListener('mousedown', this.lockPointer.bind(this));
        
        document.addEventListener('pointerlockchange', this.onPointerLockChange.bind(this));
        document.addEventListener('mozpointerlockchange', this.onPointerLockChange.bind(this));
        document.addEventListener('webkitpointerlockchange', this.onPointerLockChange.bind(this));
    }

    onPointerLockChange() {
        this.isPointerLocked = document.pointerLockElement === this.renderer.domElement ||
                               document.mozPointerLockElement === this.renderer.domElement ||
                               document.webkitPointerLockElement === this.renderer.domElement;
        console.log("Pointer Locked:", this.isPointerLocked ? "ON" : "OFF");
    }

    setupPhysics() {
        // Set up physics body (Cylinder shape)
        const radius = 0.5;
        const height = 1.8;

        const shape = new CANNON.Cylinder(radius, radius, height, 8);

        this.body = new CANNON.Body({
            mass: 5,
            position: new CANNON.Vec3(0, 5, 0),
            shape: shape,
            fixedRotation: true,
            linearDamping: 0.1,
            angularDamping: 0.99
        });

        this.world.physicsWorld.addBody(this.body);
    }

    get position() {
        return this.body.position;
    }

    set position(pos) {
        this.body.position.copy(pos);
    }

    lockPointer(event) {
        console.log("lockPointer called with event:", event?.type);

        // Check if pointer is already locked
        if (this.isPointerLocked) {
            console.log("Pointer already locked. Skipping lockPointer.");
            return;
        }

        // Focus the canvas
        this.renderer.domElement.focus();
        console.log("Canvas focused.");

        // Request pointer lock
        try {
            const canvas = this.renderer.domElement;
            canvas.requestPointerLock = canvas.requestPointerLock ||
                                      canvas.mozRequestPointerLock ||
                                      canvas.webkitRequestPointerLock;
            canvas.requestPointerLock();
            console.log("requestPointerLock called successfully.");
        } catch (error) {
            console.error("Failed to call requestPointerLock:", error);
        }
    }

    handleKeyDown(event) {
        if (event.key in this.keys) {
            this.keys[event.key] = true;

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

        this.yaw -= event.movementX * this.pointerSensitivity;
        this.pitch = Math.max(-Math.PI/2, Math.min(Math.PI/2, this.pitch - event.movementY * this.pointerSensitivity));

        this.camera.quaternion.setFromEuler(new THREE.Euler(this.pitch, this.yaw, 0, 'YXZ'));
    }

    jump() {
        if (this.isOnGround) {
            this.body.velocity.y = this.JUMP_FORCE;
            this.isOnGround = false;
        }
    }

    update(delta) {
        this.camera.position.copy(this.body.position);
        this.camera.position.y += 0.5;

        this.handleMovement(delta);

        this.checkGroundContactWithWorldHeight();
    }

    handleMovement(delta) {
        this.moveDirection.set(0, 0, 0);

        const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(this.camera.quaternion);
        const right = new THREE.Vector3(1, 0, 0).applyQuaternion(this.camera.quaternion);

        const forwardFlat = new THREE.Vector3(forward.x, 0, forward.z).normalize();
        const rightFlat = new THREE.Vector3(right.x, 0, right.z).normalize();

        if (this.keys['w']) this.moveDirection.add(forwardFlat);
        if (this.keys['s']) this.moveDirection.sub(forwardFlat);
        if (this.keys['a']) this.moveDirection.sub(rightFlat);
        if (this.keys['d']) this.moveDirection.add(rightFlat);

        if (this.moveDirection.lengthSq() > 0) {
            this.moveDirection.normalize().multiplyScalar(this.SPEED);
        }

        this.body.velocity.x = this.moveDirection.x;
        this.body.velocity.z = this.moveDirection.z;
    }

    checkGroundContactWithWorldHeight() {
        const playerPos = this.body.position;
        const terrainHeight = this.world.getWorldTerrainHeightAt(playerPos.x, playerPos.z);

        const playerFootY = playerPos.y - 1.8 / 2;
        const tolerance = 0.1;

        if (playerFootY <= terrainHeight + tolerance) {
            this.body.position.y = terrainHeight + 1.8 / 2 + tolerance;
            if (this.body.velocity.y < 0) {
                 this.body.velocity.y = 0;
            }
            this.isOnGround = true;
        } else {
            this.isOnGround = false;
        }
    }
}
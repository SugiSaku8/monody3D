// js/modules/physics/PhysicsWorld.js
import * as CANNON from 'cannon-es';

export class PhysicsWorld {
    constructor() {
        this.world = new CANNON.World();
        this.world.gravity.set(0, -9.82, 0); // 重力を設定
        this.world.broadphase = new CANNON.NaiveBroadphase();
        this.world.solver.iterations = 10;
    }

    addBody(body) {
        this.world.addBody(body);
    }

    removeBody(body) {
        this.world.removeBody(body);
    }

    // 静的地面を追加するメソッド (Y=0用は削除済み)

    raycastClosest(from, to, options, result) {
        if (!(from instanceof CANNON.Vec3) || !(to instanceof CANNON.Vec3)) {
            console.error("PhysicsWorld.raycastClosest: 'from' and 'to' must be CANNON.Vec3 objects.");
            result.hasHit = false;
            return;
        }

        // Cannon-es の world.rayTest を使用 (closest hit を模倣)
        const hits = [];
        this.world.rayTest(from, to, (raycastResult) => {
            // rayTest は複数のヒットをコールバックで受け取る
            // 最も近いヒットを記録
            hits.push(raycastResult);
        });

        if (hits.length > 0) {
            // 距離でソートして最も近いものを選択
            hits.sort((a, b) => a.distance - b.distance);
            const closestHit = hits[0];
            result.hasHit = true;
            result.hitPointWorld.copy(closestHit.hitPointWorld);
            result.distance = closestHit.distance;
            result.body = closestHit.body;
        } else {
             result.hasHit = false;
        }
    }

    update(deltaTime) {
        this.world.step(deltaTime);
    }
}
// js/world/terrain.js
import * as THREE from 'three';
import { ImprovedNoise } from 'three/addons/math/ImprovedNoise.js';
import * as CANNON from 'cannon-es';
import { CHUNK_SIZE, TERRAIN_RESOLUTION } from './chunk.js';

const noise = new ImprovedNoise();

export function createNoiseTerrain(cx, cy, cz) {
    try {
        // Validate inputs
        if (typeof cx !== 'number' || typeof cy !== 'number' || typeof cz !== 'number') {
            throw new Error(`Invalid chunk coordinates: (${cx}, ${cy}, ${cz})`);
        }

        console.log(`Creating terrain for chunk (${cx}, ${cy}, ${cz})`);
        
        const chunkGeometry = new THREE.PlaneGeometry(CHUNK_SIZE, CHUNK_SIZE, TERRAIN_RESOLUTION, TERRAIN_RESOLUTION);
        
        // Apply noise to the terrain
        const position = chunkGeometry.attributes.position;
        if (!position) {
            throw new Error('Failed to get position attribute from geometry');
        }

        // Pre-calculate world coordinates
        const worldOffsetX = cx * CHUNK_SIZE;
        const worldOffsetZ = cz * CHUNK_SIZE;
        
        // Generate height data
        const heights = [];
        for (let i = 0; i < position.count; i++) {
            const x = position.getX(i);
            const z = position.getZ(i);
            
            // Calculate world position
            const worldX = worldOffsetX + x;
            const worldZ = worldOffsetZ + z;
            
            // Generate height using multiple octaves of noise
            let height = 0;
            let amplitude = 1;
            let frequency = 0.05;
            
            for (let o = 0; o < 4; o++) {
                const noiseValue = noise.noise(
                    worldX * frequency * 0.1, 
                    worldZ * frequency * 0.1, 
                    0
                );
                
                if (isNaN(noiseValue)) {
                    console.warn(`Invalid noise value at (${worldX}, ${worldZ}) with frequency ${frequency}`);
                    continue;
                }
                
                height += noiseValue * amplitude;
                amplitude *= 0.5;
                frequency *= 2;
            }
            
            // Scale the height and add some base height
            height = height * 5 + 5;
            heights.push(height);
            position.setY(i, height);
        }
    
        // Update normals for proper lighting
        chunkGeometry.computeVertexNormals();
        
        // Create material
        const material = new THREE.MeshStandardMaterial({ 
            color: 0x3d9970,
            flatShading: true,
            wireframe: false
        });
        
        // Create mesh
        const terrain = new THREE.Mesh(chunkGeometry, material);
        if (!terrain || !terrain.isMesh) {
            throw new Error('Failed to create terrain mesh');
        }
        
        terrain.rotation.x = -Math.PI / 2; // Rotate to be horizontal
        const posX = cx * CHUNK_SIZE + CHUNK_SIZE / 2;
        const posZ = cz * CHUNK_SIZE + CHUNK_SIZE / 2;
        
        if (isNaN(posX) || isNaN(posZ)) {
            throw new Error(`Invalid position values: (${posX}, ${posZ})`);
        }
        
        terrain.position.set(posX, 0, posZ);
        
        // Create physics body
        let body = null;
        try {
            // Convert height data to a 2D array for Cannon.js
            const heights2D = [];
            for (let i = 0; i <= TERRAIN_RESOLUTION; i++) {
                const row = [];
                for (let j = 0; j <= TERRAIN_RESOLUTION; j++) {
                    const idx = i * (TERRAIN_RESOLUTION + 1) + j;
                    row.push(heights[idx] || 0);
                }
                heights2D.push(row);
            }
            
            const elementSize = CHUNK_SIZE / TERRAIN_RESOLUTION;
            if (elementSize <= 0) {
                throw new Error(`Invalid element size: ${elementSize}`);
            }
            
            const shape = new CANNON.Heightfield(heights2D, { elementSize });
            
            body = new CANNON.Body({
                mass: 0, // Static body
                shape: shape,
                position: new CANNON.Vec3(posX, 0, posZ)
            });
            
            console.log(`Successfully created terrain for chunk (${cx}, ${cy}, ${cz})`);
            return { mesh: terrain, body };
            
        } catch (physicsError) {
            console.error('Error creating physics body:', physicsError);
            // Return just the mesh if physics fails
            return { mesh: terrain, body: null };
        }
        
    } catch (error) {
        console.error(`Error in createNoiseTerrain for chunk (${cx}, ${cy}, ${cz}):`, error);
        // Return a simple flat plane as fallback
        const geometry = new THREE.PlaneGeometry(CHUNK_SIZE, CHUNK_SIZE, 1, 1);
        const material = new THREE.MeshStandardMaterial({ color: 0x888888, wireframe: true });
        const mesh = new THREE.Mesh(geometry, material);
        mesh.rotation.x = -Math.PI / 2;
        mesh.position.set(
            cx * CHUNK_SIZE + CHUNK_SIZE / 2,
            0,
            cz * CHUNK_SIZE + CHUNK_SIZE / 2
        );
        return { mesh, body: null };
    }
}

export function getTerrainHeightAt(x, z) {
    // Simple noise-based height function
    let height = 0;
    let amplitude = 1;
    let frequency = 0.05;
    
    for (let o = 0; o < 4; o++) {
        height += noise.noise(x * frequency * 0.1, z * frequency * 0.1, 0) * amplitude;
        amplitude *= 0.5;
        frequency *= 2;
    }
    
    // Scale the height and add some base height
    return height * 5 + 5;
}

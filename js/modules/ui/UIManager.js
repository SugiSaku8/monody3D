export class UIManager {
    constructor() {
        this.playerPosElement = document.getElementById('playerPos');
        this.playerChunkElement = document.getElementById('playerChunk');
        this.onGroundElement = document.getElementById('onGround');
        this.messageElement = document.getElementById('message');
        
        // Initialize any UI elements
        this.init();
    }
    
    init() {
        // Any initialization code for UI elements
        console.log('UI Manager initialized');
    }
    
    update(player) {
        if (!player) return;
        
        // Update player position display
        if (this.playerPosElement) {
            this.playerPosElement.textContent = 
                `${player.position.x.toFixed(1)}, ${player.position.y.toFixed(1)}, ${player.position.z.toFixed(1)}`;
        }
        
        // Update chunk position display
        if (this.playerChunkElement) {
            const chunkX = Math.floor(player.position.x / 32);
            const chunkY = Math.floor(player.position.y / 32);
            const chunkZ = Math.floor(player.position.z / 32);
            this.playerChunkElement.textContent = `${chunkX}, ${chunkY}, ${chunkZ}`;
        }
        
        // Update on ground status
        if (this.onGroundElement) {
            this.onGroundElement.textContent = player.isOnGround ? 'true' : 'false';
            this.onGroundElement.style.color = player.isOnGround ? '#00ff00' : '#ff0000';
        }
    }
    
    showMessage(message, duration = 3000) {
        if (!this.messageElement) return;
        
        this.messageElement.textContent = message;
        this.messageElement.style.display = 'block';
        
        if (duration > 0) {
            clearTimeout(this.messageTimeout);
            this.messageTimeout = setTimeout(() => {
                this.hideMessage();
            }, duration);
        }
    }
    
    hideMessage() {
        if (this.messageElement) {
            this.messageElement.style.display = 'none';
            this.messageElement.textContent = '';
        }
    }
    
    // Add any additional UI-related methods here
    // For example: showInventory, showPauseMenu, updateHealthBar, etc.
    
    cleanup() {
        clearTimeout(this.messageTimeout);
        // Clean up any event listeners or resources
    }
}

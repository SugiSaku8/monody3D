export class AudioManager {
    constructor() {
        this.sounds = {
           /* bgmForest: {
                url: "https://cdn.pixabay.com/download/audio/2022/03/15/audio_5a2e645f41.mp3?filename=forest-ambience-47463.mp3",
                audio: null,
                volume: 0.3,
                loop: true
            }*/
        };
        
        this.isMuted = false;
        this.initialized = false;
    }
    
    async initialize() {
        if (this.initialized) return;
        
        // Load all sounds
        const loadPromises = Object.entries(this.sounds).map(async ([key, sound]) => {
            try {
                const response = await fetch(sound.url);
                const arrayBuffer = await response.arrayBuffer();
                const audioContext = new (window.AudioContext || window.webkitAudioContext)();
                const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
                
                // Create audio buffer source
                sound.audio = audioBuffer;
                sound.audioContext = audioContext;
                
                console.log(`Loaded sound: ${key}`);
            } catch (error) {
                console.error(`Failed to load sound ${key}:`, error);
            }
        });
        
        await Promise.all(loadPromises);
        this.initialized = true;
        console.log('AudioManager initialized');
    }
    
    playSound(soundName, options = {}) {
        if (this.isMuted || !this.initialized) return null;
        
        const sound = this.sounds[soundName];
        if (!sound) {
            console.warn(`Sound '${soundName}' not found`);
            return null;
        }
        
        try {
            const audioContext = sound.audioContext || new (window.AudioContext || window.webkitAudioContext)();
            const source = audioContext.createBufferSource();
            source.buffer = sound.audio;
            
            // Create gain node for volume control
            const gainNode = audioContext.createGain();
            gainNode.gain.value = options.volume !== undefined ? options.volume : sound.volume;
            
            // Connect nodes
            source.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            // Handle looping
            source.loop = options.loop !== undefined ? options.loop : sound.loop || false;
            
            // Start playing
            source.start(0);
            
            // Return the source for potential control (stop, etc.)
            return {
                stop: (fadeOut = 0) => {
                    if (fadeOut > 0) {
                        gainNode.gain.linearRampToValueAtTime(0, audioContext.currentTime + fadeOut);
                        setTimeout(() => source.stop(), fadeOut * 1000);
                    } else {
                        source.stop();
                    }
                }
            };
        } catch (error) {
            console.error('Error playing sound:', error);
            return null;
        }
    }
    
    playBGM() {
        if (this.bgmInstance) {
            this.bgmInstance.stop();
        }
        this.bgmInstance = this.playSound('bgmForest');
    }
    
    stopBGM(fadeOut = 1.0) {
        if (this.bgmInstance) {
            this.bgmInstance.stop(fadeOut);
            this.bgmInstance = null;
        }
    }
    
    toggleMute() {
        this.isMuted = !this.isMuted;
        
        // Apply mute state to all audio contexts
        Object.values(this.sounds).forEach(sound => {
            if (sound.audioContext) {
                sound.audioContext.resume(); // Resume context if it was suspended
                if (sound.audioContext.gain) {
                    sound.audioContext.gain.gain.value = this.isMuted ? 0 : 1;
                }
            }
        });
        
        return this.isMuted;
    }
    
    setVolume(soundName, volume) {
        const sound = this.sounds[soundName];
        if (sound) {
            sound.volume = Math.max(0, Math.min(1, volume));
        }
    }
    
    // Clean up audio resources
    dispose() {
        Object.values(this.sounds).forEach(sound => {
            if (sound.audioContext) {
                sound.audioContext.close();
            }
        });
        
        this.sounds = {};
        this.initialized = false;
    }
}

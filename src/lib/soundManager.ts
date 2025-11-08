class SoundManager {
  private sounds: Map<string, HTMLAudioElement> = new Map();
  private enabled: boolean = true;
  private volume: number = 0.5;

  constructor() {
    // Initialize sound effects
    this.loadSound('spin', 'https://assets.mixkit.co/active_storage/sfx/2576/2576-preview.mp3'); // Spinning wheel sound
    this.loadSound('tick', 'https://assets.mixkit.co/active_storage/sfx/2571/2571-preview.mp3'); // Quick tick sound
    this.loadSound('reveal', 'https://assets.mixkit.co/active_storage/sfx/1435/1435-preview.mp3'); // Item reveal
    this.loadSound('common', 'https://assets.mixkit.co/active_storage/sfx/2013/2013-preview.mp3'); // Common item
    this.loadSound('rare', 'https://assets.mixkit.co/active_storage/sfx/1468/1468-preview.mp3'); // Rare item
    this.loadSound('godly', 'https://assets.mixkit.co/active_storage/sfx/2018/2018-preview.mp3'); // Godly item
    this.loadSound('chroma', 'https://assets.mixkit.co/active_storage/sfx/2019/2019-preview.mp3'); // Chroma item
    this.loadSound('ancient', 'https://assets.mixkit.co/active_storage/sfx/2020/2020-preview.mp3'); // Ancient item
    this.loadSound('win', 'https://assets.mixkit.co/active_storage/sfx/1435/1435-preview.mp3'); // Winner celebration
  }

  private loadSound(name: string, url: string) {
    try {
      const audio = new Audio(url);
      audio.volume = this.volume;
      audio.preload = 'auto';
      this.sounds.set(name, audio);
    } catch (error) {
      console.warn(`Failed to load sound: ${name}`, error);
    }
  }

  play(soundName: string, options?: { loop?: boolean; volume?: number }) {
    if (!this.enabled) return;

    const sound = this.sounds.get(soundName);
    if (!sound) {
      console.warn(`Sound not found: ${soundName}`);
      return;
    }

    try {
      // Clone the audio element to allow overlapping plays
      const audioClone = sound.cloneNode() as HTMLAudioElement;
      audioClone.volume = options?.volume ?? this.volume;
      
      if (options?.loop) {
        audioClone.loop = true;
      }

      const playPromise = audioClone.play();
      
      if (playPromise !== undefined) {
        playPromise.catch(error => {
          console.warn('Audio play failed:', error);
        });
      }

      return audioClone;
    } catch (error) {
      console.warn('Failed to play sound:', error);
    }
  }

  stop(audio?: HTMLAudioElement) {
    if (audio) {
      audio.pause();
      audio.currentTime = 0;
    }
  }

  setVolume(volume: number) {
    this.volume = Math.max(0, Math.min(1, volume));
    this.sounds.forEach(sound => {
      sound.volume = this.volume;
    });
  }

  setEnabled(enabled: boolean) {
    this.enabled = enabled;
    if (!enabled) {
      this.stopAll();
    }
  }

  stopAll() {
    this.sounds.forEach(sound => {
      sound.pause();
      sound.currentTime = 0;
    });
  }

  playRaritySound(rarity: string) {
    const rarityLower = rarity.toLowerCase();
    
    switch (rarityLower) {
      case 'chroma':
        this.play('chroma', { volume: 0.7 });
        setTimeout(() => this.play('win', { volume: 0.8 }), 500);
        break;
      case 'godly':
        this.play('godly', { volume: 0.6 });
        setTimeout(() => this.play('win', { volume: 0.7 }), 400);
        break;
      case 'ancient':
        this.play('ancient', { volume: 0.6 });
        setTimeout(() => this.play('win', { volume: 0.6 }), 300);
        break;
      case 'legendary':
      case 'vintage':
        this.play('rare', { volume: 0.5 });
        break;
      default:
        this.play('common', { volume: 0.3 });
    }
  }
}

// Singleton instance
export const soundManager = new SoundManager();

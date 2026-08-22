import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class ChatSoundService {
  private audioCtx: AudioContext | null = null;

  constructor() {}

  private initAudio(): void {
    if (!this.audioCtx) {
      this.audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
  }

  /**
   * Plays a gentle, premium dual-tone chat notification chime.
   */
  public playMessageSound(): void {
    try {
      this.initAudio();
      if (!this.audioCtx) return;

      if (this.audioCtx.state === 'suspended') {
        this.audioCtx.resume();
      }

      const now = this.audioCtx.currentTime;

      // Tone 1: Gentle start frequency
      const osc1 = this.audioCtx.createOscillator();
      const gain1 = this.audioCtx.createGain();
      osc1.connect(gain1);
      gain1.connect(this.audioCtx.destination);

      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(523.25, now); // C5 note
      osc1.frequency.exponentialRampToValueAtTime(783.99, now + 0.15); // G5 note

      gain1.gain.setValueAtTime(0.08, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

      osc1.start(now);
      osc1.stop(now + 0.3);

    } catch (e) {
      console.warn('Audio play failed due to browser policies:', e);
    }
  }

  /**
   * Plays a subtle low-pitch sound when sending messages.
   */
  public playSentSound(): void {
    try {
      this.initAudio();
      if (!this.audioCtx) return;

      if (this.audioCtx.state === 'suspended') {
        this.audioCtx.resume();
      }

      const now = this.audioCtx.currentTime;

      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();
      osc.connect(gain);
      gain.connect(this.audioCtx.destination);

      osc.type = 'sine';
      osc.frequency.setValueAtTime(392.00, now); // G4 note
      osc.frequency.exponentialRampToValueAtTime(261.63, now + 0.1); // C4 note

      gain.gain.setValueAtTime(0.05, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

      osc.start(now);
      osc.stop(now + 0.15);
    } catch {}
  }
}

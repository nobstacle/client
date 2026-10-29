"use client";

export interface PlayTranslatedAudioOptions {
  messageId?: string | number;
  audioUrl?: string;
  fallbackText?: string;
  langCode?: string;
}

type PlaybackListener = (playingMessageId: string | number | null) => void;

// 1-sample silent WAV data URL used to warm up HTMLAudioElement on user interaction
const SILENT_WAV_DATA_URL =
  "data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA";

class TranslatedAudioPlayer {
  private queue: PlayTranslatedAudioOptions[] = [];
  private isPlaying = false;
  private currentAudio: HTMLAudioElement | null = null;
  private sharedAudio: HTMLAudioElement | null = null;
  private audioCtx: AudioContext | null = null;
  private currentBufferSource: AudioBufferSourceNode | null = null;
  private currentMessageId: string | number | null = null;
  private listeners = new Set<PlaybackListener>();
  private audioUnlocked = false;
  private pendingBlockedItem: PlayTranslatedAudioOptions | null = null;
  private globalListenersAttached = false;

  constructor() {
    if (typeof window !== "undefined") {
      this.attachGlobalUnlockListeners();
    }
  }

  private getOrCreateAudioContext(): AudioContext | null {
    if (typeof window === "undefined") return null;
    if (!this.audioCtx || this.audioCtx.state === "closed") {
      const AudioCtx =
        window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        try {
          this.audioCtx = new AudioCtx();
        } catch {
          return null;
        }
      }
    }
    return this.audioCtx;
  }

  private getOrCreateSharedAudio(): HTMLAudioElement | null {
    if (typeof window === "undefined") return null;
    if (!this.sharedAudio) {
      try {
        this.sharedAudio = new Audio();
        this.sharedAudio.preload = "auto";
        (this.sharedAudio as any).playsInline = true;
      } catch {
        return null;
      }
    }
    return this.sharedAudio;
  }

  private attachGlobalUnlockListeners() {
    if (typeof window === "undefined" || this.globalListenersAttached) return;
    this.globalListenersAttached = true;

    const handleUserGesture = () => {
      this.unlockAudio();
      if (this.pendingBlockedItem && !this.isPlaying) {
        const pending = this.pendingBlockedItem;
        this.pendingBlockedItem = null;
        this.enqueue(pending);
      }
    };

    const events = ["pointerdown", "touchstart", "mousedown", "keydown", "click"];
    events.forEach((evt) => {
      window.addEventListener(evt, handleUserGesture, {
        capture: true,
        passive: true,
      });
    });
  }

  unlockAudio() {
    if (typeof window === "undefined") return;
    this.attachGlobalUnlockListeners();

    try {
      const ctx = this.getOrCreateAudioContext();
      if (ctx && ctx.state === "suspended") {
        ctx.resume().catch(() => {});
      }

      if (!this.audioUnlocked) {
        // Play a tiny silent buffer through WebAudio
        if (ctx) {
          try {
            const buffer = ctx.createBuffer(1, 1, 22050);
            const source = ctx.createBufferSource();
            source.buffer = buffer;
            source.connect(ctx.destination);
            source.start(0);
          } catch {}
        }

        // Warm up shared HTMLAudioElement
        const audio = this.getOrCreateSharedAudio();
        if (audio && !this.isPlaying) {
          audio.src = SILENT_WAV_DATA_URL;
          audio.volume = 0.01;
          const p = audio.play();
          if (p !== undefined) {
            p.then(() => {
              audio.pause();
              audio.currentTime = 0;
              audio.volume = 1;
              this.audioUnlocked = true;
            }).catch(() => {
              audio.volume = 1;
            });
          }
        }
      }
    } catch {
      // Ignore audio unlock errors
    }
  }

  subscribe(listener: PlaybackListener): () => void {
    this.listeners.add(listener);
    listener(this.currentMessageId);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private setPlayingId(id: string | number | null) {
    this.currentMessageId = id;
    this.listeners.forEach((cb) => {
      try {
        cb(id);
      } catch {}
    });
  }

  enqueue(options: PlayTranslatedAudioOptions) {
    if (typeof window === "undefined") return;
    if (!options.audioUrl && !options.fallbackText?.trim()) return;

    this.attachGlobalUnlockListeners();
    this.queue.push(options);
    if (!this.isPlaying) {
      void this.playNext();
    }
  }

  playNow(options: PlayTranslatedAudioOptions) {
    if (typeof window === "undefined") return;
    this.unlockAudio();

    // If clicking the currently playing message, stop it
    if (
      options.messageId != null &&
      this.currentMessageId === options.messageId &&
      this.isPlaying
    ) {
      this.stopAll();
      return;
    }

    this.stopAll();
    this.enqueue(options);
  }

  stopAll() {
    this.queue = [];
    this.pendingBlockedItem = null;
    if (this.currentBufferSource) {
      try {
        this.currentBufferSource.onended = null;
        this.currentBufferSource.stop();
        this.currentBufferSource.disconnect();
      } catch {}
      this.currentBufferSource = null;
    }
    if (this.currentAudio) {
      try {
        this.currentAudio.pause();
        this.currentAudio.currentTime = 0;
      } catch {}
      this.currentAudio = null;
    }
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      try {
        window.speechSynthesis.cancel();
      } catch {}
    }
    this.isPlaying = false;
    this.setPlayingId(null);
  }

  private async playNext() {
    if (this.queue.length === 0) {
      this.isPlaying = false;
      this.setPlayingId(null);
      return;
    }

    this.isPlaying = true;
    const nextItem = this.queue.shift()!;
    this.setPlayingId(nextItem.messageId ?? "__playing__");

    let playedSuccessfully = false;

    if (nextItem.audioUrl) {
      // 1. Try playing via persistent WebAudio AudioContext first (most reliable for WebSocket events)
      playedSuccessfully = await this.playViaWebAudio(nextItem.audioUrl);

      // 2. Fallback to HTMLAudioElement if WebAudio was suspended or couldn't decode
      if (!playedSuccessfully) {
        playedSuccessfully = await this.playViaHtmlAudio(nextItem.audioUrl);
      }
    }

    // 3. Fallback to browser SpeechSynthesis
    if (!playedSuccessfully && nextItem.fallbackText?.trim()) {
      playedSuccessfully = await this.playViaSpeechSynthesis(
        nextItem.fallbackText.trim(),
        nextItem.langCode,
      );
    }

    // 4. If browser blocked all autoplay because zero user gestures have occurred on this tab yet,
    // save item so the very next tap/click anywhere on the screen plays it immediately.
    if (!playedSuccessfully) {
      this.pendingBlockedItem = nextItem;
    }

    void this.playNext();
  }

  private dataUrlToArrayBuffer(audioUrl: string): ArrayBuffer | null {
    try {
      if (!audioUrl.startsWith("data:")) return null;
      const commaIdx = audioUrl.indexOf(",");
      if (commaIdx === -1) return null;
      const base64 = audioUrl.slice(commaIdx + 1);
      const binaryString = window.atob(base64);
      const len = binaryString.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      return bytes.buffer;
    } catch {
      return null;
    }
  }

  private async playViaWebAudio(audioUrl: string): Promise<boolean> {
    try {
      const ctx = this.getOrCreateAudioContext();
      if (!ctx) return false;

      if (ctx.state === "suspended") {
        try {
          await Promise.race([
            ctx.resume(),
            new Promise((_, reject) => setTimeout(() => reject(new Error("resume timeout")), 400)),
          ]);
        } catch {
          // If still suspended after 400ms, fall through to HTMLAudioElement
        }
      }

      if (ctx.state !== "running") {
        return false;
      }

      let arrayBuffer = this.dataUrlToArrayBuffer(audioUrl);
      if (!arrayBuffer) {
        const res = await fetch(audioUrl);
        if (!res.ok) return false;
        arrayBuffer = await res.arrayBuffer();
      }

      const audioBuffer = await ctx.decodeAudioData(arrayBuffer.slice(0));

      return await new Promise<boolean>((resolve) => {
        try {
          const source = ctx.createBufferSource();
          source.buffer = audioBuffer;

          const gainNode = ctx.createGain();
          gainNode.gain.value = 1.25;
          source.connect(gainNode);
          gainNode.connect(ctx.destination);

          this.currentBufferSource = source;

          source.onended = () => {
            if (this.currentBufferSource === source) {
              this.currentBufferSource = null;
            }
            resolve(true);
          };

          source.start(0);
        } catch {
          resolve(false);
        }
      });
    } catch {
      return false;
    }
  }

  private playViaHtmlAudio(audioUrl: string): Promise<boolean> {
    return new Promise((resolve) => {
      try {
        const audio = this.getOrCreateSharedAudio() || new Audio();
        audio.volume = 1;
        audio.src = audioUrl;
        this.currentAudio = audio;

        const cleanup = () => {
          audio.onended = null;
          audio.onerror = null;
          if (this.currentAudio === audio) {
            this.currentAudio = null;
          }
        };

        audio.onended = () => {
          cleanup();
          resolve(true);
        };

        audio.onerror = () => {
          cleanup();
          resolve(false);
        };

        const playPromise = audio.play();
        if (playPromise !== undefined) {
          playPromise.catch((err) => {
            console.warn(
              "[TranslatedAudioPlayer] Audio.play() blocked or failed, trying fallback:",
              err?.message || err,
            );
            cleanup();
            resolve(false);
          });
        }
      } catch {
        resolve(false);
      }
    });
  }

  private playViaSpeechSynthesis(
    text: string,
    langCode?: string,
  ): Promise<boolean> {
    return new Promise((resolve) => {
      if (typeof window === "undefined" || !("speechSynthesis" in window)) {
        resolve(false);
        return;
      }

      try {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        if (langCode) {
          utterance.lang = langCode;
        }

        const timeout = setTimeout(() => {
          resolve(false);
        }, 30000);

        utterance.onend = () => {
          clearTimeout(timeout);
          resolve(true);
        };

        utterance.onerror = () => {
          clearTimeout(timeout);
          resolve(false);
        };

        window.speechSynthesis.speak(utterance);
      } catch {
        resolve(false);
      }
    });
  }
}

export const translatedAudioPlayer = new TranslatedAudioPlayer();


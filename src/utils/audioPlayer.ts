"use client";

export interface PlayTranslatedAudioOptions {
  messageId?: string | number;
  audioUrl?: string;
  fallbackText?: string;
  langCode?: string;
}

type PlaybackListener = (playingMessageId: string | number | null) => void;

class TranslatedAudioPlayer {
  private queue: PlayTranslatedAudioOptions[] = [];
  private isPlaying = false;
  private currentAudio: HTMLAudioElement | null = null;
  private currentMessageId: string | number | null = null;
  private listeners = new Set<PlaybackListener>();
  private audioUnlocked = false;

  unlockAudio() {
    if (typeof window === "undefined" || this.audioUnlocked) return;
    try {
      const AudioCtx =
        window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        const ctx = new AudioCtx();
        if (ctx.state === "suspended") {
          ctx.resume().catch(() => {});
        }
        setTimeout(() => {
          if (ctx.state !== "closed") {
            ctx.close().catch(() => {});
          }
        }, 200);
      }
      this.audioUnlocked = true;
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

    this.queue.push(options);
    if (!this.isPlaying) {
      this.playNext();
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
      playedSuccessfully = await this.playViaHtmlAudio(nextItem.audioUrl);
    }

    if (!playedSuccessfully && nextItem.fallbackText?.trim()) {
      await this.playViaSpeechSynthesis(
        nextItem.fallbackText.trim(),
        nextItem.langCode,
      );
    }

    this.playNext();
  }

  private playViaHtmlAudio(audioUrl: string): Promise<boolean> {
    return new Promise((resolve) => {
      try {
        const audio = new Audio(audioUrl);
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


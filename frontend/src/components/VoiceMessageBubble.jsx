import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, Mic } from 'lucide-react';
import { resolveMediaUrl } from '../services/api';

// Global tracker so only ONE voice message can play at a time across the entire chat
let activeVoiceAudio = null;

const formatSeconds = (sec) => {
  const safe = Number.isFinite(sec) && sec > 0 ? Math.floor(sec) : 0;
  const m = Math.floor(safe / 60);
  const s = safe % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
};

export default function VoiceMessageBubble({ voice, isMe }) {
  const audioRef = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(Number(voice?.duration) || 0);
  const [loadError, setLoadError] = useState(false);

  const src = resolveMediaUrl(voice?.url || '');

  useEffect(() => {
    setLoadError(false);
    setPlaying(false);
    setCurrentTime(0);
    setDuration(Number(voice?.duration) || 0);
  }, [src, voice?.duration]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const syncDuration = () => {
      if (Number.isFinite(audio.duration) && audio.duration > 0) {
        setDuration(audio.duration);
      }
    };
    const onTimeUpdate = () => setCurrentTime(audio.currentTime || 0);
    const onEnded = () => {
      if (activeVoiceAudio === audio) activeVoiceAudio = null;
      setPlaying(false);
      setCurrentTime(0);
    };
    const onPause = () => {
      if (activeVoiceAudio === audio) activeVoiceAudio = null;
      setPlaying(false);
    };
    const onPlay = () => {
      // Defensive guard in case playback was triggered natively
      if (activeVoiceAudio && activeVoiceAudio !== audio) {
        activeVoiceAudio.pause();
      }
      activeVoiceAudio = audio;
      setLoadError(false);
      setPlaying(true);
    };
    const onError = () => {
      if (activeVoiceAudio === audio) activeVoiceAudio = null;
      setPlaying(false);
      setLoadError(true);
    };

    audio.addEventListener('loadedmetadata', syncDuration);
    audio.addEventListener('durationchange', syncDuration);
    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('ended', onEnded);
    audio.addEventListener('pause', onPause);
    audio.addEventListener('play', onPlay);
    audio.addEventListener('error', onError);

    return () => {
      if (activeVoiceAudio === audio) {
        audio.pause();
        activeVoiceAudio = null;
      }
      audio.removeEventListener('loadedmetadata', syncDuration);
      audio.removeEventListener('durationchange', syncDuration);
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('ended', onEnded);
      audio.removeEventListener('pause', onPause);
      audio.removeEventListener('play', onPlay);
      audio.removeEventListener('error', onError);
    };
  }, [src]);

  // Keep audio.play() synchronous inside the tap gesture (required for iOS Safari)
  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio || !src) return;

    if (!audio.paused) {
      audio.pause();
      return;
    }

    if (activeVoiceAudio && activeVoiceAudio !== audio) {
      activeVoiceAudio.pause();
    }
    activeVoiceAudio = audio;

    if (audio.ended || (duration > 0 && audio.currentTime >= duration)) {
      audio.currentTime = 0;
      setCurrentTime(0);
    }

    const playPromise = audio.play();
    if (playPromise && typeof playPromise.catch === 'function') {
      playPromise.catch(() => {
        if (activeVoiceAudio === audio) activeVoiceAudio = null;
        setPlaying(false);
      });
    }
  };

  const handleSeek = (e) => {
    const audio = audioRef.current;
    if (!audio || !duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    audio.currentTime = ratio * duration;
    setCurrentTime(audio.currentTime);
  };

  const progress = duration > 0 ? Math.min(100, (currentTime / duration) * 100) : 0;
  // Single dynamic timer: shows elapsed while playing/paused mid-track, total length when idle
  const displayedSeconds = playing || currentTime > 0 ? currentTime : duration;

  return (
    <div
      className={`w-[225px] sm:w-[250px] rounded-2xl px-3 py-2.5 flex items-center gap-2.5 border select-none ${
        isMe
          ? 'bg-brand-600 text-white border-brand-600 rounded-br-none'
          : 'bg-white text-slate-900 border-slate-200 rounded-bl-none'
      }`}
    >
      <audio
        ref={audioRef}
        src={src}
        preload="metadata"
        playsInline
        className="hidden"
      />

      <button
        type="button"
        onClick={togglePlay}
        aria-label={playing ? 'Pause voice message' : 'Play voice message'}
        className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 transition cursor-pointer ${
          isMe
            ? 'bg-white text-brand-600 hover:bg-brand-50'
            : 'bg-brand-600 text-white hover:bg-brand-700'
        }`}
      >
        {playing ? (
          <Pause className="w-4 h-4 fill-current" />
        ) : (
          <Play className="w-4 h-4 fill-current ml-0.5" />
        )}
      </button>

      <div className="flex-1 min-w-0 space-y-1.5">
        {/* Interactive Scrubber Bar */}
        <div
          onClick={handleSeek}
          role="slider"
          aria-label="Voice message progress"
          aria-valuemin={0}
          aria-valuemax={Math.round(duration)}
          aria-valuenow={Math.round(currentTime)}
          tabIndex={0}
          className={`h-2 rounded-full cursor-pointer overflow-hidden flex items-center ${
            isMe ? 'bg-white/25' : 'bg-slate-200'
          }`}
        >
          <div
            className={`h-full rounded-full transition-all duration-100 ${
              isMe ? 'bg-white' : 'bg-brand-600'
            }`}
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Single Dynamic Timer */}
        <div
          className={`flex items-center justify-between text-[10px] font-semibold tabular-nums ${
            isMe ? 'text-brand-100' : 'text-slate-500'
          }`}
        >
          <span className="inline-flex items-center gap-1">
            <Mic className="w-3 h-3 shrink-0" />
            <span>{loadError ? 'Audio unavailable' : formatSeconds(displayedSeconds)}</span>
          </span>
        </div>
      </div>
    </div>
  );
}

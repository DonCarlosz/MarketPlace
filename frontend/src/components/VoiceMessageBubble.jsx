import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, Mic } from 'lucide-react';
import { resolveMediaUrl } from '../services/api';

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

  const src = resolveMediaUrl(voice?.url || '');

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onLoadedMetadata = () => {
      if (Number.isFinite(audio.duration) && audio.duration > 0) {
        setDuration(audio.duration);
      }
    };
    const onTimeUpdate = () => setCurrentTime(audio.currentTime || 0);
    const onEnded = () => {
      setPlaying(false);
      setCurrentTime(0);
    };
    const onPause = () => setPlaying(false);
    const onPlay = () => setPlaying(true);

    audio.addEventListener('loadedmetadata', onLoadedMetadata);
    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('ended', onEnded);
    audio.addEventListener('pause', onPause);
    audio.addEventListener('play', onPlay);

    return () => {
      audio.removeEventListener('loadedmetadata', onLoadedMetadata);
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('ended', onEnded);
      audio.removeEventListener('pause', onPause);
      audio.removeEventListener('play', onPlay);
    };
  }, [src]);

  const togglePlay = async () => {
    const audio = audioRef.current;
    if (!audio || !src) return;
    try {
      if (playing) {
        audio.pause();
      } else {
        await audio.play();
      }
    } catch {
      setPlaying(false);
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

  return (
    <div
      className={`w-[235px] sm:w-[260px] rounded-2xl px-3 py-2.5 flex items-center gap-2.5 border ${
        isMe
          ? 'bg-indigo-600 text-white border-indigo-600 rounded-br-none'
          : 'bg-white text-slate-900 border-slate-200 rounded-bl-none'
      }`}
    >
      <audio ref={audioRef} src={src} preload="metadata" className="hidden" />

      <button
        type="button"
        onClick={togglePlay}
        aria-label={playing ? 'Pause voice message' : 'Play voice message'}
        className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 transition cursor-pointer ${
          isMe
            ? 'bg-white text-indigo-600 hover:bg-indigo-50'
            : 'bg-indigo-600 text-white hover:bg-indigo-700'
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
              isMe ? 'bg-white' : 'bg-indigo-600'
            }`}
            style={{ width: `${progress}%` }}
          />
        </div>

        <div
          className={`flex items-center justify-between text-[10px] font-semibold ${
            isMe ? 'text-indigo-100' : 'text-slate-500'
          }`}
        >
          <span className="inline-flex items-center gap-1">
            <Mic className="w-3 h-3" />
            <span>{playing || currentTime > 0 ? formatSeconds(currentTime) : formatSeconds(duration)}</span>
          </span>
          <span>{formatSeconds(duration)}</span>
        </div>
      </div>
    </div>
  );
}

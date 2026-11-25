import { execFile } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import os from 'os';
import path from 'path';
import crypto from 'crypto';
import ffmpegInstaller from '@ffmpeg-installer/ffmpeg';

const execFileAsync = promisify(execFile);
const ffmpegPath = ffmpegInstaller?.path || 'ffmpeg';

/**
 * Transcodes any browser-recorded voice note (Android WebM/Opus, Firefox OGG, iOS MP4/AAC, WAV)
 * into a lightweight, universally playable CBR mono MP3 (64 kbps, 44.1 kHz).
 * Plays natively across all iPhones (iOS Safari, iOS PWA, iOS Chrome), Android, Windows, and macOS.
 */
export const transcodeVoiceToMp3 = async (inputBuffer, inputExt = 'webm') => {
  if (!ffmpegPath) {
    throw new Error('ffmpeg-static binary path is unavailable.');
  }

  const token = `${Date.now()}-${crypto.randomBytes(6).toString('hex')}`;
  const safeExt = String(inputExt || 'webm').replace(/[^a-z0-9]/gi, '').slice(0, 6) || 'webm';
  const tempIn = path.join(os.tmpdir(), `obuy-in-${token}.${safeExt}`);
  const tempOut = path.join(os.tmpdir(), `obuy-out-${token}.mp3`);

  try {
    await fs.writeFile(tempIn, inputBuffer);

    await execFileAsync(
      ffmpegPath,
      [
        '-y',
        '-hide_banner',
        '-loglevel',
        'error',
        '-i',
        tempIn,
        '-vn',
        '-c:a',
        'libmp3lame',
        '-b:a',
        '64k',
        '-ar',
        '44100',
        '-ac',
        '1',
        tempOut,
      ],
      { timeout: 25000 }
    );

    const mp3Buffer = await fs.readFile(tempOut);
    if (!mp3Buffer || mp3Buffer.length < 128) {
      throw new Error('Transcoded MP3 output was empty.');
    }
    return mp3Buffer;
  } finally {
    await Promise.allSettled([
      fs.unlink(tempIn).catch(() => {}),
      fs.unlink(tempOut).catch(() => {}),
    ]);
  }
};

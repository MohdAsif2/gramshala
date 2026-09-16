/**
 * src/services/videoProcessor.js
 */
const path = require('path');
const fs = require('fs');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegStatic = require('ffmpeg-static');

// Explicitly bind the bundled static binary to fluent-ffmpeg
ffmpeg.setFfmpegPath(ffmpegStatic);

const { transcribeLocalWav } = require('./localTranscriber');

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

// 1. Convert MP4 to HLS (.m3u8 + .ts segments)
function convertToHls(inputMp4, outputDir) {
  return new Promise((resolve, reject) => {
    ensureDir(outputDir);
    const m3u8Path = path.join(outputDir, 'index.m3u8');

    ffmpeg(inputMp4)
      .outputOptions([
        '-profile:v baseline',
        '-level 3.0',
        '-start_number 0',
        '-hls_time 6',
        '-hls_list_size 0',
        '-f hls'
      ])
      .output(m3u8Path)
      .on('end', () => resolve(m3u8Path))
      .on('error', (err) => reject(err))
      .run();
  });
}

// 2. Extract 16kHz WAV for Whisper transcription and lightweight MP3 for 3G mode
function extractAudioTracks(inputMp4, outputMp3, outputWav) {
  return new Promise((resolve, reject) => {
    ffmpeg(inputMp4)
      .output(outputMp3)
      .noVideo()
      .audioCodec('libmp3lame')
      .audioBitrate('48k')
      .output(outputWav)
      .noVideo()
      .audioCodec('pcm_s16le')
      .audioFrequency(16000)
      .audioChannels(1)
      .on('end', () => resolve())
      .on('error', (err) => reject(err))
      .run();
  });
}

// 3. Complete Pipeline Execution
async function processLocalMp4(inputMp4Path, lessonId = 'lesson-1') {
  const rootPublic = path.join(__dirname, '../../public');
  const hlsDir = path.join(rootPublic, `videos/hls/${lessonId}`);
  const audioDir = path.join(rootPublic, 'audio');
  ensureDir(audioDir);

  const mp3Path = path.join(audioDir, `${lessonId}.mp3`);
  const wavPath = path.join(audioDir, `${lessonId}-temp.wav`);

  console.log(`🎬 1/3: Converting "${inputMp4Path}" to HLS...`);
  await convertToHls(inputMp4Path, hlsDir);

  console.log('🎵 2/3: Extracting audio tracks for 3G and speech models...');
  await extractAudioTracks(inputMp4Path, mp3Path, wavPath);

  console.log('📝 3/3: Running local offline speech transcription...');
  const transcripts = await transcribeLocalWav(wavPath);

  if (fs.existsSync(wavPath)) fs.unlinkSync(wavPath);

  console.log(`🎉 Done! Generated HLS stream and ${transcripts.length} transcript cues.`);

  return {
    videoUrl: `http://localhost:5000/public/videos/hls/${lessonId}/index.m3u8`,
    audioUrl: `http://localhost:5000/public/audio/${lessonId}.mp3`,
    transcripts
  };
}

module.exports = { processLocalMp4 };
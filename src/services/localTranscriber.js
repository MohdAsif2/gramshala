/**
 * src/services/localTranscriber.js
 */
const ffmpeg = require('fluent-ffmpeg');
const ffmpegStatic = require('ffmpeg-static');
ffmpeg.setFfmpegPath(ffmpegStatic);
const fs = require('fs');
const { pipeline } = require('@xenova/transformers');
const { WaveFile } = require('wavefile');

let transcriberPipeline = null;

// Initialize and cache local Whisper model in memory
async function getTranscriber() {
  if (!transcriberPipeline) {
    console.log('⏳ Loading local offline Whisper model (first time downloads ~39MB)...');
    transcriberPipeline = await pipeline(
      'automatic-speech-recognition',
      'Xenova/whisper-tiny.en'
    );
    console.log('✅ Local Whisper model ready!');
  }
  return transcriberPipeline;
}

// Convert audio file to 16kHz float32 array required by Whisper
function readAudioAsFloat32(wavPath) {
  const buffer = fs.readFileSync(wavPath);
  const wav = new WaveFile(buffer);
  wav.toSampleRate(16000);
  let samples = wav.getSamples(false, Float32Array);
  if (Array.isArray(samples)) samples = samples[0]; // mono channel
  return samples;
}

async function transcribeLocalWav(wavPath) {
  const transcriber = await getTranscriber();
  const audioData = readAudioAsFloat32(wavPath);

  console.log('🎙️ Transcribing audio locally on CPU...');
  const result = await transcriber(audioData, {
    chunk_length_s: 30,
    stride_length_s: 5,
    return_timestamps: true
  });

  // Map to Gramshala transcript format: [{ start, end, text }]
  if (result.chunks && result.chunks.length > 0) {
    return result.chunks.map((chunk) => ({
      start: Math.round(chunk.timestamp[0] || 0),
      end: Math.round(chunk.timestamp[1] || 0),
      text: chunk.text.trim()
    }));
  }

  return [{ start: 0, end: 10, text: result.text.trim() }];
}

module.exports = { transcribeLocalWav };
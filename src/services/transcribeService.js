/**
 * Backend/src/services/transcribeService.js
 */
const path = require('path');
const fs = require('fs');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegStatic = require('ffmpeg-static');
const { pipeline } = require('@xenova/transformers');
const { WaveFile } = require('wavefile');

ffmpeg.setFfmpegPath(ffmpegStatic);

let asrPipeline = null;

// Load Whisper Base (much higher accuracy and stability than tiny)
async function getTranscriber() {
  if (!asrPipeline) {
    console.log('⏳ Loading local Whisper model into memory (Base model)...');
    asrPipeline = await pipeline('automatic-speech-recognition', 'Xenova/whisper-base.en');
    console.log('✅ Local Whisper model ready.');
  }
  return asrPipeline;
}

// Bandpass filter to isolate human vocal frequencies & normalize audio volume
function prepareVocalAudio(inputMp3Path, outputWavPath) {
  return new Promise((resolve, reject) => {
    console.log('🧹 Isolating vocal frequencies and normalizing audio...');
    ffmpeg(inputMp3Path)
      .noVideo()
      .audioCodec('pcm_s16le')
      .audioFrequency(16000)
      .audioChannels(1)
      .audioFilters([
        'highpass=f=120',          // Strip low rumble & mic hum
        'lowpass=f=7000',          // Strip high frequency hiss
        'dynaudnorm=p=0.9:s=5'     // Normalize vocal amplitude
      ])
      .output(outputWavPath)
      .on('end', () => resolve(outputWavPath))
      .on('error', (err) => reject(err))
      .run();
  });
}

async function getOrGenerateTranscript(lessonId = 'math-ch4') {
  const rootPublic = path.resolve(__dirname, '../../public');
  const transcriptDir = path.join(rootPublic, 'transcripts');
  const transcriptPath = path.join(transcriptDir, `${lessonId}.json`);
  const mp3Path = path.join(rootPublic, 'audio', `${lessonId}.mp3`);
  const cleanWavPath = path.join(rootPublic, 'audio', `${lessonId}-clean.wav`);

  if (!fs.existsSync(transcriptDir)) {
    fs.mkdirSync(transcriptDir, { recursive: true });
  }

  // If a broken hallucination transcript exists, wipe it
  if (fs.existsSync(transcriptPath)) {
    try {
      const raw = fs.readFileSync(transcriptPath, 'utf8');
      if (raw.includes('and and and') || raw.includes('"text": "and"')) {
        console.warn('🗑️ Wiping corrupt hallucination transcript...');
        fs.unlinkSync(transcriptPath);
      } else {
        return JSON.parse(raw);
      }
    } catch (e) {}
  }

  if (!fs.existsSync(mp3Path)) {
    return [{ start: 0, end: 5, text: 'Audio source not available for transcription.' }];
  }

  try {
    // 1. Clean audio
    await prepareVocalAudio(mp3Path, cleanWavPath);

    // 2. Load into memory as Float32Array PCM samples
    const wavBuffer = fs.readFileSync(cleanWavPath);
    const wav = new WaveFile(wavBuffer);
    wav.toSampleRate(16000);
    let samples = wav.getSamples(false, Float32Array);
    if (Array.isArray(samples)) samples = samples[0];

    // 3. Transcribe with anti-hallucination & anti-repetition settings
    console.log('🎙️ Transcribing with anti-repetition decoding...');
    const transcriber = await getTranscriber();

    const result = await transcriber(samples, {
      chunk_length_s: 30,
      stride_length_s: 5,
      return_timestamps: true,
      condition_on_prev_tokens: false, // Prevents looping previous words
      temperature: 0.0,
      repetition_penalty: 1.2,          // Heavily penalizes word looping
      no_repeat_ngram_size: 3           // Forbids repeating 3-word combinations
    });

    // 4. Format & filter out noise triggers
    let cues = (result.chunks || [])
      .map((chunk) => ({
        start: Math.round(chunk.timestamp[0] || 0),
        end: Math.round(chunk.timestamp[1] || 0),
        text: chunk.text.trim()
      }))
      .filter((cue) => {
        // Discard 1-word murmurs or accidental loops
        const words = cue.text.toLowerCase().split(/\s+/);
        const isLoop = words.length > 2 && words.every((w) => w === words[0]);
        return cue.text.length > 2 && !isLoop;
      });

    if (cues.length === 0 && result.text) {
      cues = [{ start: 0, end: 10, text: result.text.trim() }];
    }

    // 5. Save to disk cache
    fs.writeFileSync(transcriptPath, JSON.stringify(cues, null, 2), 'utf8');
    console.log(`💾 Successfully generated ${cues.length} clean cues in ${transcriptPath}`);

    return cues;
  } catch (err) {
    console.error('Transcription error:', err);
    return [{ start: 0, end: 5, text: 'Lecture summary and slide notes available.' }];
  } finally {
    if (fs.existsSync(cleanWavPath)) {
      try {
        fs.unlinkSync(cleanWavPath);
      } catch (e) {}
    }
  }
}

module.exports = { getOrGenerateTranscript };
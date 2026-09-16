/**
 * backend/controllers/lessonController.js
 * Optimized for low-bandwidth payload delivery
 */
const fs = require("fs");
const Groq = require("groq-sdk");
const { getOrGenerateTranscript } = require('../services/transcribeService');
const { LESSON_METADATA, DUMMY_SLIDES } = require('../../config/constants');
const { DeepgramClient } = ('@deepgram/sdk');


/**
 * GET /api/ping 
 * Ultra-lightweight health check (~50 bytes)
 */
exports.ping = (req, res) => {
  res.status(200).json({ status: 'ok', t: Date.now() });
};

/**
 * gramshala-backend/src/controllers/lessonController.js
 */

const currentLesson = {
  lessonId: 'math-ch5',
  title: 'English Class',

  // 1. Mode 1 (4G/5G): Public adaptive HLS video stream
  videoUrl: 'http://localhost:5000/public/videos/hls/math-ch4/index.m3u8',
  poster: 'http://localhost:5000/public/slides/slide1.svg',

  // 2. Mode 2 (3G): Audio stream
  audioUrl: 'http://localhost:5000/public/audio/math-ch4.mp3',

  // 3. Mode 2 & Mode 3: Slide deck, captions, and lecture notes
  slides: [
    {
      pageNumber: 1,
      title: 'Introduction to Ratios',
      imageUrl: 'http://localhost:5000/public/slides/slides1.svg',
      caption: 'A ratio compares two quantities of the same kind by division.',
      notes: 'Ratios are written as a:b or a/b. They must compare quantities in the same units.'
    },
    {
      pageNumber: 2,
      title: 'Proportions and Cross Multiplication',
      imageUrl: 'http://localhost:5000/public/slides/slide2.svg',
      caption: 'When two ratios are equal, they form a proportion (a:b = c:d).',
      notes: 'Cross-multiplication rule: If a/b = c/d, then a * d = b * c.'
    },
    {
      pageNumber: 3,
      title: 'Real-World Applications',
      imageUrl: 'http://localhost:5000/public/slides/slide3.svg',
      caption: 'Scales in maps and unit rate calculations rely on proportions.',
      notes: 'Remember to simplify all ratio fractions to their lowest irreducible form.'
    }
  ]
};

exports.getCurrentLesson = async (req, res) => {
  const { mode } = req.query;

  // Mode 3 (2G): Text notes only (zero media URLs)
  if (mode === 'text') {


    const DEEPGRAM_API_KEY = 'c797a4cafcaddf53fb518945ceb2d2af41cee855';

    // Note: This is an English stream, update accordingly for other languages
    const STREAM_URL = '../../public/audio/math-ch4.mp3';

    const live = async () => {
      const deepgram = new DeepgramClient({ apiKey: DEEPGRAM_API_KEY });

      const socket = await deepgram.listen.v1.createConnection({
        model: 'nova-3',
        language: 'en',
      });

      socket.on('message', (data) => {
        if (data.type === 'Results' && data.channel?.alternatives?.[0]) {
          const transcript = data.channel.alternatives[0].transcript;
          if (transcript) {
            console.log(transcript);
          }
        }
      });

      socket.on('close', () => {
        console.log('Connection closed.');
      });

      socket.on('error', (err) => {
        console.error(err);
      });

      socket.connect();
      await socket.waitForOpen();

      console.log(`Transcribing ${STREAM_URL}...`);

      const response = await fetch(STREAM_URL, { redirect: 'follow' });
      const reader = response.body.getReader();

      const pump = async () => {
        const { done, value } = await reader.read();
        if (done) return;
        socket.sendMedia(value);
        return pump();
      };
      pump().catch(console.error);
    }

    live().catch(console.error);


    return res.json({
      lessonId: currentLesson.lessonId,
      title: currentLesson.title,
      transcripts: currentLesson.transcripts || [],
      slides: currentLesson.slides.map(({ pageNumber, title, notes, caption }) => ({
        pageNumber,
        title,
        notes,
        caption
      }))
    });
  }

  // Mode 2 (3G): Audio stream + full slide images
  if (mode === 'audio') {
    return res.json({
      lessonId: currentLesson.lessonId,
      title: currentLesson.title,
      audioUrl: currentLesson.audioUrl,
      transcripts: currentLesson.transcripts || [],
      slides: currentLesson.slides
    });
  }

  // Mode 1 (4G/5G): Full payload with videoUrl
  return res.json(currentLesson);
};
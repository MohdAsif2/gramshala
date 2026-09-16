/**
 * server.js
 * Master entry point for the Gramshala backend.
 * Binds Express REST APIs, static probe assets, and WebSockets onto a single HTTP server.
 */
require('dotenv').config();

const express = require('express');
const http = require('http');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { processLocalMp4 } = require('./services/videoProcessor');
// const connectDB = require("../config/db");


// Internal Imports
const { PORT } = require('../config/constants');
const lessonRoutes = require('./routes/lessonRoutes');
const initClassroomSocket = require('./sockets/classRomeSocket')


const app = express();

// connectDB();

// 1. Configure Global Middleware
app.use(cors({ origin: '*' })); // Allows frontend (Vite/React) to make requests without CORS blocks
app.use(express.json());

// 2. Configure Static File Hosting & Speed Test Probe Asset
const publicDir = path.join(__dirname, '../public');
app.use('/public', express.static(publicDir , {
  setHeaders: (res, filePath) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    if (filePath.endsWith('.m3u8')) {
      res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
    } else if (filePath.endsWith('.ts')) {
      res.setHeader('Content-Type', 'video/mp2t');
    }
  }}));

// Auto-generate the 10 KB speed test probe file if it does not exist
const probePath = path.join(publicDir, 'ping-probe.bin');
if (!fs.existsSync(probePath)) {
  // Create an exact 10 KB binary buffer (10,240 bytes)
  const probeBuffer = Buffer.alloc(10 * 1024, 'g');

  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
  }

  fs.writeFileSync(probePath, probeBuffer);
  console.log('📦 [Server] Auto-generated 10 KB speed probe asset at /public/ping-probe.bin');
}

// 3. Register REST API Routes
app.use('/api/lessons', lessonRoutes);


// Route to convert an MP4 already present in your backend to HLS + Transcripts
app.get('/api/lessons/convert-local-video', async (req, res) => {
  try {
    // Specify the path to your MP4 inside your video folder
    // e.g., Backend/public/videos/sample.mp4
    const inputVideo = path.join(__dirname, '../public/videos/sample2.mp4');
    

    if (!fs.existsSync(inputVideo)) {
      return res.status(404).json({ 
        error: `File not found at: ${inputVideo}. Please place your MP4 there.` 
      });
    }

    const { videoUrl, audioUrl, transcripts } = await processLocalMp4(inputVideo, 'math-ch4');

    // Update active lesson state with the generated HLS & transcripts
    currentLesson.videoUrl = videoUrl;
    currentLesson.audioUrl = audioUrl;
    currentLesson.transcripts = transcripts;

    res.json({
      message: 'Conversion completed without any external API keys!',
      currentLesson
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});



// 4. Create Node.js HTTP Server
const server = http.createServer(app);

// 5. Attach WebSocket Engine onto the HTTP Server Instance
initClassroomSocket(server);

// 6. Boot Up Server
server.listen(PORT, () => {
  console.log(`\n==================================================`);
  console.log(`🚀 Gramshala Backend running on http://localhost:${PORT}`);
  console.log(`📡 Speed Probe Asset: http://localhost:${PORT}/public/ping-probe.bin`);
  console.log(`🔗 REST API Base URL: http://localhost:${PORT}/api`);
  console.log(`⚡ WebSocket Stream:   ws://localhost:${PORT}`);
  console.log(`==================================================\n`);
});
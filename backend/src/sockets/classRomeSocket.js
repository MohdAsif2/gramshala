/**
 * backend/sockets/classroomSocket.js
 * Real-time WebSocket engine for streaming slide changes and live text captions.
 */

const WebSocket = require('ws');
const { SOCKET_EVENTS, TIMERS, DUMMY_SLIDES } = require('../../config/constants');

/**
 * Initializes the WebSocket server attached to the shared Express HTTP server.
 * @param {Object} server - Node.js HTTP Server instance
 */
function initClassroomSocket(server) {
  const wss = new WebSocket.Server({ server });
  let currentSlideIndex = 0;

  console.log('⚡ [WebSocket Engine] Initialized successfully');

  // Helper function to safely broadcast JSON payload to all active clients
  const broadcast = (data) => {
    const payload = JSON.stringify(data);
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(payload);
      }
    });
  };

  // 1. Client Connection Lifecycle
  wss.on('connection', (ws) => {
    console.log('🔌 Student connected to live WebSocket stream');

    // Instantly send the active slide state to newly connected students
    const activeSlide = DUMMY_SLIDES[currentSlideIndex];
    ws.send(JSON.stringify({
      type: SOCKET_EVENTS.SLIDE_CHANGE,
      slide: {
        id: activeSlide.id,
        pageNumber: activeSlide.pageNumber,
        title: activeSlide.title,
        imageUrl: activeSlide.imageUrl,
        caption: activeSlide.caption,
        notes: activeSlide.notes
      },
      timestamp: Date.now()
    }));

    ws.on('close', () => {
      console.log('❌ Student client disconnected from WebSocket stream');
    });

    ws.on('error', (err) => {
      console.error('⚠️ WebSocket connection error:', err.message);
    });
  });

  // 2. Slide Advancement Loop (Used in Mode 2: 3G Audio + Slides)
  setInterval(() => {
    currentSlideIndex = (currentSlideIndex + 1) % DUMMY_SLIDES.length;
    const activeSlide = DUMMY_SLIDES[currentSlideIndex];

    broadcast({
      type: SOCKET_EVENTS.SLIDE_CHANGE,
      slide: {
        id: activeSlide.id,
        pageNumber: activeSlide.pageNumber,
        title: activeSlide.title,
        imageUrl: activeSlide.imageUrl,
        caption: activeSlide.caption,
        notes: activeSlide.notes
      },
      timestamp: Date.now()
    });

    // console.log(`📡 [WS Event] Broadcasted Slide #${activeSlide.pageNumber}: "${activeSlide.title}"`);
  }, TIMERS.SLIDE_INTERVAL_MS);

  // 3. Live Caption Broadcast Loop (Used in Mode 3: 2G Text Mode)
  const sampleCaptions = [
    "Welcome students, today we are discussing fundamental ratios.",
    "Notice how the denominator changes the overall proportion.",
    "A ratio compares two quantities by division.",
    "Let's look at the current slide diagram for a practical example.",
    "Remember to note down this formula in your notebooks."
  ];

  setInterval(() => {
    const randomCaption = sampleCaptions[Math.floor(Math.random() * sampleCaptions.length)];

    broadcast({
      type: SOCKET_EVENTS.LIVE_CAPTION,
      text: randomCaption,
      timestamp: Date.now()
    });
  }, TIMERS.CAPTION_INTERVAL_MS);
}

module.exports = initClassroomSocket;
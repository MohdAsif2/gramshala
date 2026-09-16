// backend/config/constants.js

module.exports = {
  PORT: process.env.PORT || 5000,

  SOCKET_EVENTS: {
    SLIDE_CHANGE: 'SLIDE_CHANGE',
    LIVE_CAPTION: 'LIVE_CAPTION',
  },

  TIMERS: {
    SLIDE_INTERVAL_MS: 4000,   // 4 seconds per slide
    CAPTION_INTERVAL_MS: 4000, // 4 seconds per live caption
  },

  // Presentation Deck Metadata & Slide Array
  LESSON_METADATA: {
    lessonId: 'math-ch4',
    title: 'Mathematics - Chapter 4: Ratios & Proportions',
    sourceDocument: 'Ratios_Lecture_Presentation.pdf', // Original file name
    totalSlides: 4,
  },

  DUMMY_SLIDES: [
    {
      id: 1,
      pageNumber: 1,
      title: 'Introduction to Ratios',
      // Lightweight slide image extracted from your PDF/PPT
      imageUrl: 'http://localhost:5000/public/slides/english1.png',
      caption: 'A ratio compares two quantities by division.',
      notes: 'Key Takeaway: Ratios represent relative sizes, not total quantities.'
    },
    {
      id: 2,
      pageNumber: 2,
      title: 'Understanding Numerator & Denominator',
      imageUrl: 'http://localhost:5000/public/slides/english2.png',
      caption: 'Top number = selected parts; Bottom number = total equal parts.',
      notes: 'Example: In a 3/5 fraction, 3 is the numerator and 5 is the denominator.'
    },
    {
      id: 3,
      pageNumber: 3,
      title: 'Real-world Examples in Agriculture',
      imageUrl: 'http://localhost:5000/public/slides/english3.png',
      caption: 'Calculating seed-to-land ratio for optimal crop yield.',
      notes: 'Demonstrating how ratio formulas apply to daily farming decisions.'
    },
  ]
};
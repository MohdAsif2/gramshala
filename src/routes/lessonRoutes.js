const express = require('express');
const router = express.Router();
const lessonController = require('../controllers/lessonController');

router.get('/current', lessonController.getCurrentLesson); // NOT '/api/lessons/current'

module.exports = router;
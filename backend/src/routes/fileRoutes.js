const express = require('express');
const router = express.Router();
const fileController = require('../controllers/fileController');
const upload = require('../middlewares/upload');

router.post('/upload', upload.single('file'), fileController.uploadFile);
router.get('/', fileController.listFiles);
router.get('/:name', fileController.downloadFile);

module.exports = router;

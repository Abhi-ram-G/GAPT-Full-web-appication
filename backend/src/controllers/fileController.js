const fs = require('fs');
const path = require('path');

exports.uploadFile = (req, res) => {
    if (!req.file) {
        return res.status(400).json({ message: 'No file uploaded' });
    }
    res.status(200).json({
        message: 'File uploaded successfully',
        filename: req.file.filename,
        originalName: req.file.originalname,
        size: req.file.size
    });
};

exports.listFiles = (req, res) => {
    const directoryPath = path.join(__dirname, '../uploads');
    fs.readdir(directoryPath, (err, files) => {
        if (err) {
            return res.status(500).json({ message: 'Unable to scan files' });
        }
        res.status(200).json(files);
    });
};

exports.downloadFile = (req, res) => {
    const fileName = req.params.name;
    const directoryPath = path.join(__dirname, '../uploads');
    res.download(directoryPath + '/' + fileName, fileName, (err) => {
        if (err) {
            res.status(500).send({
                message: "Could not download the file. " + err,
            });
        }
    });
};

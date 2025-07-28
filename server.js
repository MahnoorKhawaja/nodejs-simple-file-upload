require('dotenv').config();
const express = require('express');
const multer = require('multer');
const { BlobServiceClient } = require('@azure/storage-blob');
const cors = require('cors');
const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

app.post('/upload', upload.single('file'), async(req, res) => {
    try {
        const blobServiceClient = BlobServiceClient.fromConnectionString(process.env.AZURE_STORAGE_CONNECTION_STRING);
        const containerClient = blobServiceClient.getContainerClient(process.env.AZURE_CONTAINER_NAME);

        const blobName = `${Date.now()}-${req.file.originalname}`;
        const blockBlobClient = containerClient.getBlockBlobClient(blobName);

        await blockBlobClient.uploadData(req.file.buffer, {
            blobHTTPHeaders: { blobContentType: req.file.mimetype }
        });

        res.status(200).send(`✅ Uploaded "${req.file.originalname}" to Azure Blob`);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('❌ Upload to Azure Blob failed');
    }
});

app.get('/', (req, res) => {
    res.send('Server is running');
});

app.listen(port, () => {
    console.log(`🚀 Server started at http://localhost:${port}`);
});
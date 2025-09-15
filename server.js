const express = require('express');
const multer = require('multer');
const { BlobServiceClient } = require('@azure/storage-blob');
const cors = require('cors');
const path = require('path');

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Set view engine to EJS and views directory
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Multer setup
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// ✅ Upload Endpoint
app.post(['/upload', '/images/upload'], upload.single('file'), async(req, res) => {
    if (!req.file) {
        return res.status(400).send('No file uploaded');
    }

    try {
        const blobServiceClient = BlobServiceClient.fromConnectionString(process.env.AZURE_STORAGE_CONNECTION_STRING);
        const containerClient = blobServiceClient.getContainerClient(process.env.AZURE_CONTAINER_NAME);

        const blobName = `${Date.now()}-${req.file.originalname}`;
        const blockBlobClient = containerClient.getBlockBlobClient(blobName);

        await blockBlobClient.uploadData(req.file.buffer, {
            blobHTTPHeaders: { blobContentType: req.file.mimetype }
        });

        console.log(`✅ Uploaded "${req.file.originalname}" to Azure Blob`);

        // After upload, redirect to /images so the list refreshes
        res.redirect('/images');
    } catch (err) {
        console.error('❌ Upload error:', err.message);
        res.status(500).send('❌ Upload to Azure Blob failed');
    }
});

// ✅ Root route
app.get('/', (req, res) => {
    res.redirect('/images'); // Always show upload + images
});

// ✅ Images page (Upload page + image listing)
app.get('/images', async(req, res) => {
    try {
        const blobServiceClient = BlobServiceClient.fromConnectionString(process.env.AZURE_STORAGE_CONNECTION_STRING);
        const containerClient = blobServiceClient.getContainerClient(process.env.AZURE_CONTAINER_NAME);

        let imageUrls = [];
        for await (const blob of containerClient.listBlobsFlat()) {
            imageUrls.push(containerClient.getBlockBlobClient(blob.name).url);
        }

        res.render('index', { images: imageUrls });
    } catch (err) {
        console.error('❌ Error listing images:', err.message);
        res.status(500).send('❌ Failed to fetch images');
    }
});

// ✅ Health route
app.get('/health', (req, res) => {
    res.status(200).send('OK');
});

// ✅ Start server
app.listen(port, () => {
    console.log(`🚀 Server started at http://localhost:${port}`);
});
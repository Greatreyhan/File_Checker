const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const { PDFDocument } = require('pdf-lib');
const PDFImage = require('pdf-image').PDFImage;
const { Jimp, intToRGBA } = require('jimp');

const app = express();
const upload = multer({ dest: 'uploads/' }); 

async function classifyAndCalculateCost(pdfPath) {
    let totalCost = 0;
    let pageResults = [];

    try {
        const pdfDoc = await PDFDocument.load(fs.readFileSync(pdfPath));
        const pageCount = pdfDoc.getPageCount();

        for (let i = 0; i < pageCount; i++) {
            const pdfImage = new PDFImage(pdfPath);
            const imagePath = await pdfImage.convertPage(i);

            const image = await Jimp.read(imagePath);
            let colorPixelCount = 0;
            let totalPixelCount = image.bitmap.width * image.bitmap.height;

            for (let y = 0; y < image.bitmap.height; y++) {
                for (let x = 0; x < image.bitmap.width; x++) {
                    const { r, g, b } = intToRGBA(image.getPixelColor(x, y));
                    if (!((r < 10 && g < 10 && b < 10) || (r > 245 && g > 245 && b > 245))) {
                        colorPixelCount++;
                    }
                }
            }

            const colorPercentage = (colorPixelCount / totalPixelCount) * 100;
            let category, cost;

            if (colorPercentage < 10) {
                category = 'BNW';
                cost = 350;
            } else if (colorPercentage >= 10 && colorPercentage <= 60) {
                category = 'NCL';
                cost = 500;
            } else {
                category = 'FCL';
                cost = 800;
            }

            totalCost += cost;
            pageResults.push({ page: i + 1, category, colorPercentage, cost });

            fs.unlink(imagePath, (err) => {
                if (err) console.error(`Gagal menghapus file: ${imagePath}`, err);
            });
        }

        return { totalCost, pageResults };
    } catch (error) {
        throw new Error('Error processing PDF: ' + error.message);
    }
}

app.post('/upload', upload.single('pdf'), async (req, res) => {
    try {
        const pdfPath = req.file.path; 

        const result = await classifyAndCalculateCost(pdfPath);

        fs.unlink(pdfPath, (err) => {
            if (err) console.error('Gagal menghapus file PDF:', err);
        });

        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Server berjalan di http://localhost:${PORT}`);
});

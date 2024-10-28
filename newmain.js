const { PDFDocument } = require('pdf-lib');
const PDFImage = require('pdf-image').PDFImage;
const { Jimp, intToRGBA } = require('jimp');
const fs = require('fs');

async function classifyAndCalculateCost(pdfPath) {
    let totalCost = 0;

    try {
        // Muat file PDF
        const pdfDoc = await PDFDocument.load(fs.readFileSync(pdfPath));
        const pageCount = pdfDoc.getPageCount();

        for (let i = 0; i < pageCount; i++) {
            // Konversi halaman PDF ke gambar
            const pdfImage = new PDFImage(pdfPath);
            const imagePath = await pdfImage.convertPage(i);

            // Baca gambar halaman untuk analisis piksel
            const image = await Jimp.read(imagePath);
            let colorPixelCount = 0;
            let totalPixelCount = image.bitmap.width * image.bitmap.height;

            // Loop setiap piksel
            for (let y = 0; y < image.bitmap.height; y++) {
                for (let x = 0; x < image.bitmap.width; x++) {
                    const { r, g, b } = intToRGBA(image.getPixelColor(x, y));

                    // Hitung sebagai berwarna jika piksel bukan hitam/putih
                    if (!((r < 10 && g < 10 && b < 10) || (r > 245 && g > 245 && b > 245))) {
                        colorPixelCount++;
                    }
                }
            }

            // Hitung persentase warna
            const colorPercentage = (colorPixelCount / totalPixelCount) * 100;

            // Klasifikasi berdasarkan persentase warna
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

            // Tambahkan ke total biaya
            totalCost += cost;

            console.log(`Halaman ${i + 1}: ${category} - ${colorPercentage.toFixed(2)}% warna (Biaya: Rp ${cost})`);

            // Hapus file gambar setelah selesai diproses
            fs.unlink(imagePath, (err) => {
                if (err) console.error(`Gagal menghapus file: ${imagePath}`, err);
            });
        }

        console.log(`Total biaya: Rp ${totalCost}`);
    } catch (error) {
        console.error('Error processing PDF:', error);
    }
}

// Jalankan fungsi
classifyAndCalculateCost('./CV.pdf');

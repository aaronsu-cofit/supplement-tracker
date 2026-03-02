const Jimp = require('jimp');

async function processImage() {
    try {
        const image = await Jimp.read('/Users/johnson/.gemini/antigravity/brain/9dddaa77-ac6c-4d52-b655-38a26fadaf98/rich_menu_6grid_v2_1772342060000_1772351715074.png');
        console.log(`Original Size: ${image.bitmap.width}x${image.bitmap.height}`);

        // Autocrop removes borders matching the top-left pixel color with some tolerance
        image.autocrop({ tolerance: 0.05 });
        console.log(`Cropped Size: ${image.bitmap.width}x${image.bitmap.height}`);

        // Also crop a little bit more inward because AI usually leaves a tiny glow shadow margin
        // Let's just resize to 2500x1686 directly from the autocropped bounding box
        image.resize(2500, 1686, Jimp.RESIZE_BICUBIC);

        // Save as high quality JPEG to fit <1MB standard
        await image.quality(85).writeAsync('/tmp/perfect_rich_menu.jpg');
        console.log('Successfully saved to /tmp/perfect_rich_menu.jpg');
    } catch (err) {
        console.error('Failed processing image:', err);
        process.exit(1);
    }
}
processImage();

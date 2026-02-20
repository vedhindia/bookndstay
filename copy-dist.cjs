const fs = require('fs');
const path = require('path');

const src = path.join(__dirname, 'dist');
const dest = path.join(__dirname, 'backend', 'public', 'client');

function copyDir(src, dest) {
    if (!fs.existsSync(dest)) {
        fs.mkdirSync(dest, { recursive: true });
    }
    const entries = fs.readdirSync(src, { withFileTypes: true });

    for (const entry of entries) {
        const srcPath = path.join(src, entry.name);
        const destPath = path.join(dest, entry.name);

        if (entry.isDirectory()) {
            copyDir(srcPath, destPath);
        } else {
            fs.copyFileSync(srcPath, destPath);
        }
    }
}

try {
    console.log(`Copying from ${src} to ${dest}`);
    if (fs.existsSync(dest)) {
        // fs.rmSync(dest, { recursive: true, force: true }); // Skip delete if it fails
    }
    copyDir(src, dest);
    console.log('Copy complete.');
} catch (e) {
    console.error('Copy failed:', e);
}

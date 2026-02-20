const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Configuration
const ROOT_DIR = __dirname;
// In the new structure, folders are direct subdirectories of the root (where this script is)
const BACKEND_DIR = path.join(ROOT_DIR, 'backend');
const ADMIN_DIR = path.join(ROOT_DIR, 'admin');
const VENDOR_DIR = path.join(ROOT_DIR, 'vendor');
const CLIENT_DIR = ROOT_DIR; // The main website IS the root folder now

const PUBLIC_DIR = path.join(BACKEND_DIR, 'public');

// Helper to copy directory
function copyDir(src, dest) {
    if (!fs.existsSync(src)) {
        console.error(`Source directory does not exist: ${src}`);
        return;
    }
    fs.mkdirSync(dest, { recursive: true });
    let entries = fs.readdirSync(src, { withFileTypes: true });

    for (let entry of entries) {
        let srcPath = path.join(src, entry.name);
        let destPath = path.join(dest, entry.name);

        if (entry.isDirectory()) {
            copyDir(srcPath, destPath);
        } else {
            fs.copyFileSync(srcPath, destPath);
        }
    }
}

// Helper to run command
function runCommand(command, cwd) {
    console.log(`Running: ${command} in ${cwd}`);
    try {
        execSync(command, { cwd, stdio: 'inherit' });
    } catch (error) {
        console.error(`Error executing ${command} in ${cwd}`);
        // We continue even if error, as user might want to fix manually
    }
}

// Main execution
(async () => {
    console.log('Starting Deployment Setup...');

    // 1. Ensure public directories exist
    if (fs.existsSync(PUBLIC_DIR)) {
        console.log('Cleaning existing public directory...');
        try {
            fs.rmSync(PUBLIC_DIR, { recursive: true, force: true });
        } catch (e) {
            console.log('Could not remove public dir, trying to overwrite...');
        }
    }
    fs.mkdirSync(path.join(PUBLIC_DIR, 'admin'), { recursive: true });
    fs.mkdirSync(path.join(PUBLIC_DIR, 'vendor'), { recursive: true });
    fs.mkdirSync(path.join(PUBLIC_DIR, 'client'), { recursive: true });

    // 2. Build Admin
    console.log('\n--- Building Admin Panel ---');
    if (fs.existsSync(ADMIN_DIR)) {
        runCommand('npm install', ADMIN_DIR);
        runCommand('npm run build', ADMIN_DIR);
        console.log('Copying Admin build...');
        copyDir(path.join(ADMIN_DIR, 'dist'), path.join(PUBLIC_DIR, 'admin'));
    } else {
        console.error('Admin directory not found!');
    }

    // 3. Build Vendor
    console.log('\n--- Building Vendor Panel ---');
    if (fs.existsSync(VENDOR_DIR)) {
        runCommand('npm install', VENDOR_DIR);
        runCommand('npm run build', VENDOR_DIR);
        console.log('Copying Vendor build...');
        copyDir(path.join(VENDOR_DIR, 'dist'), path.join(PUBLIC_DIR, 'vendor'));
    } else {
        console.error('Vendor directory not found!');
    }

    // 4. Build Client
    console.log('\n--- Building Main Website ---');
    // We are already in CLIENT_DIR, so we can just run commands here
    // But we need to be careful not to build backend/admin/vendor recursively if the build script does that?
    // Vite build usually ignores node_modules but we have subfolders now.
    // Vite config should be fine as it looks for src.
    
    runCommand('npm install', CLIENT_DIR);
    runCommand('npm run build', CLIENT_DIR);
    console.log('Copying Client build...');
    copyDir(path.join(CLIENT_DIR, 'dist'), path.join(PUBLIC_DIR, 'client'));

    console.log('\n--- Deployment Setup Complete ---');
    console.log(`All frontends have been built and merged into ${BACKEND_DIR}`);
    console.log(`\nTo run the merged application:`);
    console.log(`1. cd backend`);
    console.log(`2. npm install (if not already done)`);
    console.log(`3. npm start`);
    console.log(`\nRoutes:`);
    console.log(`- Main Website: http://localhost:3001/`);
    console.log(`- Admin Panel: http://localhost:3001/admin/`);
    console.log(`- Vendor Panel: http://localhost:3001/vendor/`);
    console.log(`- API Docs: http://localhost:3001/api-docs`);
})();

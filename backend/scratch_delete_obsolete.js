const fs = require('fs');
const path = require('path');

const filesToDelete = [
    path.join(__dirname, 'routes/authRoutes.js'),
    path.join(__dirname, 'routes/forumRoutes.js'),
    path.join(__dirname, 'routes/gamesRoutes.js'),
    path.join(__dirname, 'routes/profileRoutes.js'),
    path.join(__dirname, 'routes/rankingsRoutes.js'),
    path.join(__dirname, 'middlewares/auth.middleware.js'),
    path.join(__dirname, 'middlewares/authMiddleware.js'),
    path.join(__dirname, 'scratch_force_refresh.js') // Clean up other temporary scratch files too!
];

console.log('Starting cleanup of obsolete files...');
for (const file of filesToDelete) {
    if (fs.existsSync(file)) {
        try {
            fs.unlinkSync(file);
            console.log(`Deleted successfully: ${file}`);
        } catch (err) {
            console.error(`Error deleting ${file}:`, err.message);
        }
    } else {
        console.log(`File not found (already clean): ${file}`);
    }
}
console.log('Cleanup complete!');
process.exit(0);

// update-api-urls.js
// Run this with: node update-api-urls.js

const fs = require('fs');
const path = require('path');

const componentsDir = path.join(__dirname, 'components');
const files = fs.readdirSync(componentsDir);

const OLD_URL = 'http://localhost:3001';
const NEW_URL = 'https://codehunt-backend-xo52.onrender.com';

files.forEach(file => {
    if (file.endsWith('.js')) {
        const filePath = path.join(componentsDir, file);
        let content = fs.readFileSync(filePath, 'utf8');
        
        // Replace all localhost URLs with production URL
        const updatedContent = content.replace(
            /http:\/\/localhost:3001/g, 
            NEW_URL
        );
        
        if (content !== updatedContent) {
            fs.writeFileSync(filePath, updatedContent);
            console.log(`✅ Updated: ${file}`);
        }
    }
});

console.log('\n🎉 All files updated! Now add the API_URL import to each file.');
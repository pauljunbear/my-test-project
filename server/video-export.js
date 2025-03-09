const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const ffmpeg = require('ffmpeg-static');
const bodyParser = require('body-parser');

// Create Express app
const app = express();
const PORT = process.env.PORT || 3001;

// Configure middleware
app.use(cors());
app.use(bodyParser.json({ limit: '50mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// Ensure tmp directory exists
const TMP_DIR = path.join(__dirname, 'tmp');
if (!fs.existsSync(TMP_DIR)) {
  fs.mkdirSync(TMP_DIR, { recursive: true });
}

// Endpoint to create a MOV video from frames
app.post('/api/create-mov', async (req, res) => {
  const { frames, frameRate = 30, filename = 'output' } = req.body;
  
  if (!frames || !Array.isArray(frames) || frames.length === 0) {
    return res.status(400).json({ 
      success: false, 
      message: 'No frames provided or invalid format' 
    });
  }
  
  // Create a unique ID for this export
  const exportId = Date.now().toString();
  const exportDir = path.join(TMP_DIR, exportId);
  
  try {
    // Create directory for this export
    fs.mkdirSync(exportDir, { recursive: true });
    
    // Save each frame as an image
    console.log(`Processing ${frames.length} frames...`);
    for (let i = 0; i < frames.length; i++) {
      const frameData = frames[i].replace(/^data:image\/png;base64,/, '');
      const framePath = path.join(exportDir, `frame_${String(i).padStart(5, '0')}.png`);
      fs.writeFileSync(framePath, Buffer.from(frameData, 'base64'));
    }
    
    // Sanitize filename
    const safeFilename = filename.replace(/[^a-z0-9_-]/gi, '_').toLowerCase();
    const outputFilename = `${safeFilename}_${exportId}.mov`;
    const outputPath = path.join(exportDir, outputFilename);
    
    // Use FFmpeg to create MOV file
    console.log('Creating MOV file...');
    await new Promise((resolve, reject) => {
      const ffmpegCmd = `${ffmpeg} -framerate ${frameRate} -i "${path.join(exportDir, 'frame_%05d.png')}" -c:v prores_ks -profile:v 3 -pix_fmt yuv422p10le "${outputPath}"`;
      
      exec(ffmpegCmd, (error, stdout, stderr) => {
        if (error) {
          console.error(`FFmpeg error: ${error.message}`);
          return reject(error);
        }
        resolve();
      });
    });
    
    // Return the URL for downloading the file
    const downloadUrl = `/api/download-mov/${exportId}/${outputFilename}`;
    console.log(`MOV created successfully: ${downloadUrl}`);
    
    res.json({
      success: true,
      downloadUrl,
      frames: frames.length,
      exportId
    });
    
  } catch (error) {
    console.error('Error creating MOV:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to create MOV file', 
      error: error.message 
    });
    
    // Clean up on error
    try {
      fs.rmSync(exportDir, { recursive: true, force: true });
    } catch (cleanupError) {
      console.error('Error cleaning up after failure:', cleanupError);
    }
  }
});

// Endpoint to download a generated MOV file
app.get('/api/download-mov/:exportId/:filename', (req, res) => {
  const { exportId, filename } = req.params;
  const filePath = path.join(TMP_DIR, exportId, filename);
  
  // Check if file exists
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ 
      success: false, 
      message: 'File not found or has expired' 
    });
  }
  
  // Send the file
  res.download(filePath, filename, (err) => {
    if (err) {
      console.error('Error downloading file:', err);
      return res.status(500).json({ 
        success: false, 
        message: 'Error downloading file' 
      });
    }
    
    // Schedule cleanup after a delay to ensure download completes
    setTimeout(() => {
      try {
        fs.rmSync(path.join(TMP_DIR, exportId), { recursive: true, force: true });
        console.log(`Cleaned up export directory: ${exportId}`);
      } catch (error) {
        console.error('Error cleaning up export directory:', error);
      }
    }, 60000); // 1 minute delay
  });
});

// Start the server
app.listen(PORT, () => {
  console.log(`Video export server running on port ${PORT}`);
});

module.exports = app; // Export for testing 
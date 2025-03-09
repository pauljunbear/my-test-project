# Shader Effect Video Export Server

This server component provides backend functionality for exporting animated shader effects to MOV video format. It works alongside the WebGL Shader Studio frontend to enable high-quality video exports of shader animations.

## Features

- Receives frames from the client as base64-encoded PNG images
- Processes the frames using FFmpeg to create MOV video files
- Supports customizable frame rates and quality settings
- Handles temporary file cleanup automatically
- Provides secure download links for generated videos

## Requirements

- Node.js 14+ 
- FFmpeg (automatically installed as a dependency)

## Installation

1. Install dependencies:

```bash
cd server
npm install
```

## Usage

1. Start the server:

```bash
npm start
```

This will start the server on port 3001 by default.

2. For development with auto-reload:

```bash
npm run dev
```

## API Endpoints

### POST /api/create-mov

Creates a MOV video from a sequence of image frames.

**Request Body:**

```json
{
  "frames": ["data:image/png;base64,...", "data:image/png;base64,...", ...],
  "frameRate": 30,
  "filename": "my-shader-animation"
}
```

- `frames`: Array of base64-encoded PNG images
- `frameRate`: Frames per second (default: 30)
- `filename`: Output filename (default: "output")

**Response:**

```json
{
  "success": true,
  "downloadUrl": "/api/download-mov/1647975861234/my-shader-animation_1647975861234.mov",
  "frames": 24,
  "exportId": "1647975861234"
}
```

### GET /api/download-mov/:exportId/:filename

Downloads a generated MOV file.

## Configuration

You can configure the server by setting environment variables:

- `PORT`: Server port (default: 3001)
- `TMP_DIR`: Directory for temporary files (default: ./tmp)

## Important Notes

- Generated videos are temporarily stored and automatically cleaned up after download
- The server uses ProRes codec for high-quality video output
- Maximum request body size is limited to 50MB by default

## Troubleshooting

If you encounter issues:

1. Check that the server is running on the expected port
2. Ensure the client has proper CORS access to the server
3. Check server logs for detailed error messages
4. For large animations, you may need to increase the body parser limit

## License

MIT 
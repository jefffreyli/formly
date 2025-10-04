# Formly - Quick Setup Guide

This guide will help you get Formly running in **less than 10 minutes**.

---

## Prerequisites

- Node.js 18+ installed
- A webcam/camera device
- Internet connection

---

## Step 1: Install Dependencies

```bash
cd formly
npm install
```

This installs:

- Next.js, React, Tailwind CSS
- Ably SDK (WebSocket)
- ElevenLabs API
- Google Gemini SDK
- Other dependencies

---

## Step 2: Get API Keys

You need **3 API keys** to run Formly:

### 2.1 Google Gemini API Key (Required)

**Purpose**: Analyzes exercise form from video

1. Go to [Google AI Studio](https://aistudio.google.com/apikey)
2. Sign in with your Google account
3. Click "Create API Key"
4. Copy the key (starts with `AIza...`)

**Free Tier**: 15 requests/minute, 1500 requests/day

---

### 2.2 Ably API Key (Required)

**Purpose**: Real-time WebSocket communication

1. Go to [Ably](https://ably.com/signup)
2. Create a free account
3. Create a new app in the dashboard
4. Go to "API Keys" tab
5. Copy the API key (format: `app-id.key-id:key-secret`)

**Free Tier**: 6M messages/month, 200 concurrent connections

---

### 2.3 ElevenLabs API Key (Required for Voice)

**Purpose**: Text-to-speech for voice feedback

1. Go to [ElevenLabs](https://elevenlabs.io/signup)
2. Create a free account
3. Go to [Settings → API Keys](https://elevenlabs.io/app/settings)
4. Click "Generate API Key"
5. Copy the key

**Free Tier**: 10,000 characters/month

**Note**: If you don't have ElevenLabs, the app will still work but without voice feedback.

---

## Step 3: Configure Environment Variables

Create a file called `.env.local` in the project root:

```bash
touch .env.local
```

Open `.env.local` and add your API keys:

```bash
# Google Gemini API Key
NEXT_PUBLIC_GEMINI_API_KEY=AIza...your_key_here

# Ably API Key (format: app-id.key-id:key-secret)
ABLY_API_KEY=your_ably_key_here

# ElevenLabs API Key
ELEVENLABS_API_KEY=your_elevenlabs_key_here
```

**Important**:

- Replace `your_key_here` with your actual keys
- Don't commit `.env.local` to git (it's already in `.gitignore`)
- Keep these keys secret!

---

## Step 4: Run the Development Server

```bash
npm run dev
```

You should see:

```
  ▲ Next.js 15.5.4
  - Local:        http://localhost:3000
  - Ready in 2.5s
```

---

## Step 5: Open the App

1. Open [http://localhost:3000](http://localhost:3000) in your browser
2. Click "Start Camera"
3. Allow camera permissions when prompted
4. Select an exercise (Overhead Press or External Rotation)
5. Toggle "Auto-Detect: ON"
6. Perform the exercise!

---

## Troubleshooting

### "Camera access denied"

- **Fix**: Click the camera icon in your browser's address bar
- Grant permission to access the camera
- Refresh the page

### "Missing API key" error

- **Fix**: Check your `.env.local` file
- Make sure keys are correctly formatted
- Restart the dev server (`npm run dev`)

### "Failed to authenticate with Ably"

- **Fix**: Verify your `ABLY_API_KEY` is in the correct format
- Format should be: `app-id.key-id:key-secret` (includes colons and dots)

### "Failed to generate speech"

- **Fix**: Check your `ELEVENLABS_API_KEY`
- Or continue without voice (text feedback will still work)

### Video is choppy or slow

- **Fix**: Close other applications using your camera
- Check your internet connection
- The app captures frames every 10 seconds (this is normal)

### "Rate limit reached"

- **Fix**: Wait 60 seconds
- Gemini free tier allows 15 requests/minute
- The app automatically throttles requests

---

## Testing the Setup

### Test 1: Camera Access

1. Click "Start Camera"
2. You should see yourself in the video feed
3. ✅ Camera is working!

### Test 2: Exercise Detection

1. Toggle "Auto-Detect: ON"
2. Select "Overhead Press"
3. Raise your arms overhead
4. Wait 6-10 seconds
5. You should see a colored overlay with feedback
6. ✅ Detection is working!

### Test 3: Voice Feedback (Optional)

1. Make sure audio is unmuted
2. Perform an exercise with detection ON
3. You should hear voice feedback
4. ✅ TTS is working!

### Test 4: Real-time Sync

1. Open the app in two browser tabs
2. Make sure the same session is active
3. Perform an exercise
4. Both tabs should receive the same feedback
5. ✅ Ably is working!

---

## What's Next?

### Explore the Code

- `src/app/api/` - API routes
- `src/lib/api/` - Service integrations
- `src/components/` - UI components
- `src/hooks/` - React hooks

### Customize Exercises

- Edit prompts in `src/lib/api/visionModel.ts`
- Add new exercises in `src/types/exercise.ts`
- Update exercise library in `/api/exercises/route.ts`

### Deploy to Production

See `README.md` for deployment instructions using Vercel.

---

## Architecture Overview

```
User performs exercise
    ↓
Camera captures 10 frames (6 seconds)
    ↓
Frames sent to /api/analyze-video
    ↓
Gemini analyzes form → Returns feedback text
    ↓
ElevenLabs converts text → Returns audio
    ↓
Feedback published to Ably channel
    ↓
Web app receives feedback in real-time
    ↓
Audio plays + Visual overlay updates
```

For detailed architecture, see `ARCHITECTURE.md`.

---

## Support

### Common Issues

- See `ARCHITECTURE.md` for technical details
- See `README.md` for deployment guide

### API Documentation

- [Gemini Vision API](https://ai.google.dev/gemini-api/docs/vision)
- [Ably Realtime](https://ably.com/docs)
- [ElevenLabs TTS](https://elevenlabs.io/docs)

### Getting Help

- Check existing issues on GitHub
- Create a new issue with:
  - Error message
  - Browser console logs
  - Steps to reproduce

---

## Quick Commands Reference

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Check for TypeScript errors
npx tsc --noEmit

# Check for linting errors
npx next lint
```

---

## Environment Variables Quick Reference

| Variable                     | Required    | Purpose        | Where to get                                              |
| ---------------------------- | ----------- | -------------- | --------------------------------------------------------- |
| `NEXT_PUBLIC_GEMINI_API_KEY` | ✅ Yes      | Video analysis | [Google AI Studio](https://aistudio.google.com/apikey)    |
| `ABLY_API_KEY`               | ✅ Yes      | Real-time sync | [Ably Dashboard](https://ably.com/accounts)               |
| `ELEVENLABS_API_KEY`         | ⚠️ Optional | Voice feedback | [ElevenLabs Settings](https://elevenlabs.io/app/settings) |

---

## Success Checklist

- [ ] Dependencies installed (`npm install`)
- [ ] API keys obtained (Gemini, Ably, ElevenLabs)
- [ ] `.env.local` file created with all keys
- [ ] Dev server running (`npm run dev`)
- [ ] Camera permissions granted
- [ ] First exercise detected successfully
- [ ] Audio feedback received (optional)

**✅ You're all set! Start exercising with AI coaching!**

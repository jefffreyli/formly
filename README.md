# Formly - AI-Powered AR Physical Therapy Coach

Formly is an AR-powered physical therapy application that provides real-time form feedback during rehabilitation exercises using computer vision AI and voice guidance.

## Features

- 🎥 **Real-time Exercise Analysis** - Analyzes your form using Google Gemini Vision AI
- 🔊 **Voice Feedback** - Natural speech guidance using ElevenLabs TTS
- ⚡ **Real-time Communication** - Instant feedback delivery via Ably WebSocket
- 📱 **Multi-platform** - Web app and Vision OS support
- 🎯 **Exercise Library** - Pre-configured exercises with proper form guidance

## Tech Stack

### Frontend

- **Next.js 15** (App Router)
- **React 19**
- **Tailwind CSS 4**
- **Framer Motion** (animations)
- **TypeScript**

### Backend

- **Next.js API Routes** (serverless functions)
- **Ably Realtime** (WebSocket service)

### AI/ML

- **Google Gemini Vision API** (video analysis)
- **ElevenLabs API** (text-to-speech)

## Project Structure

```
formly/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── analyze-video/      # Video analysis endpoint
│   │   │   ├── exercises/          # Exercise library
│   │   │   └── ably/
│   │   │       └── auth/            # Ably authentication
│   │   ├── page.tsx                 # Main app page
│   │   └── layout.tsx
│   ├── components/
│   │   ├── camera/                  # Camera-related components
│   │   ├── CameraView.tsx
│   │   ├── ExerciseSelector.tsx
│   │   └── ...
│   ├── hooks/
│   │   ├── useCamera.ts             # Camera access hook
│   │   └── usePoseDetection.ts      # Pose detection hook
│   ├── lib/
│   │   ├── api/
│   │   │   ├── visionModel.ts       # Gemini Vision integration
│   │   │   ├── elevenLabs.ts        # Text-to-speech
│   │   │   ├── ablyService.ts       # Ably publishing
│   │   │   └── sessionService.ts    # Session management
│   │   ├── hooks/
│   │   │   ├── useFrameCapture.ts   # Video frame capture
│   │   │   ├── useAblyFeedback.ts   # Ably subscription
│   │   │   └── useRealtimeExerciseDetection.ts
│   │   └── utils/
│   │       └── imageProcessing.ts   # Image utilities
│   └── types/
│       ├── exercise.ts              # Exercise types
│       └── api.ts                   # API types
├── .env.example                     # Environment variables template
└── package.json
```

## Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment Variables

Copy `.env.example` to `.env.local` and add your API keys:

```bash
cp .env.example .env.local
```

Required API keys:

- **NEXT_PUBLIC_GEMINI_API_KEY** - [Get from Google AI Studio](https://aistudio.google.com/apikey)
- **ABLY_API_KEY** - [Get from Ably Dashboard](https://ably.com/accounts)
- **ELEVENLABS_API_KEY** - [Get from ElevenLabs](https://elevenlabs.io/app/settings)

### 3. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### 4. Grant Camera Permissions

When prompted, allow the app to access your camera for exercise analysis.

## How It Works

### Data Flow

1. **User performs exercise** → Camera captures video
2. **Frame capture** → App captures 10 frames over 6 seconds
3. **Send to server** → Frames sent to `/api/analyze-video`
4. **Gemini analysis** → Server calls Gemini Vision API for form analysis
5. **Generate speech** → Text feedback converted to audio via ElevenLabs
6. **Publish via Ably** → Feedback published to user's session channel
7. **Real-time delivery** → Web app (and Vision OS) receive feedback instantly
8. **User feedback** → Audio plays and visual overlay updates
9. **Loop continues** → Process repeats every 10 seconds

### API Routes

#### `POST /api/analyze-video`

Analyzes video frames and publishes feedback via Ably.

**Request:**

```json
{
  "sessionId": "unique-session-id",
  "videoFrames": ["base64-frame-1", "base64-frame-2", ...],
  "exerciseType": "overhead_press"
}
```

**Response:**

```json
{
  "success": true,
  "formFeedback": {
    "quality": "needs_improvement",
    "feedback": "Good arm extension but excessive back arch.",
    "corrections": ["Engage core more", "Keep ribcage down"],
    "isPerformingExercise": true
  },
  "audioUrl": "data:audio/mpeg;base64,..."
}
```

#### `GET /api/exercises`

Returns available exercises.

#### `POST /api/ably/auth`

Generates Ably authentication token for client.

### Real-time Communication (Ably)

Each user session gets a unique channel: `session:{sessionId}`

**Published messages:**

```json
{
  "sessionId": "abc123",
  "formFeedback": { ... },
  "audioUrl": "...",
  "timestamp": 1234567890
}
```

Clients subscribe to their session channel and receive feedback in real-time.

## Available Exercises

1. **Overhead Press** - Shoulder strengthening exercise
2. **External Rotation** - Rotator cuff exercise

More exercises can be added in `src/lib/api/visionModel.ts` with custom prompts.

## Development

### Adding New Exercises

1. Add exercise type to `src/types/exercise.ts`:

```typescript
export type ExerciseType =
  | "overhead_press"
  | "external_rotation"
  | "your_exercise";
```

2. Add prompt in `src/lib/api/visionModel.ts`:

```typescript
const YOUR_EXERCISE_PROMPT = `...`;
```

3. Update `getExercisePrompt()` function

4. Add to exercise library in `/api/exercises/route.ts`

### Testing

- **Manual Testing**: Use the web app with your camera
- **API Testing**: Use Postman/curl to test API routes
- **Ably Testing**: Monitor messages in Ably dashboard

## Deployment

### Deploy to Vercel

```bash
npm run build
vercel deploy
```

Add environment variables in Vercel dashboard:

- `NEXT_PUBLIC_GEMINI_API_KEY`
- `ABLY_API_KEY`
- `ELEVENLABS_API_KEY`

## License

MIT

## Support

For issues or questions, please open an issue on GitHub.

# Formly System Architecture

## Overview

Formly uses a **client-server architecture** with **real-time WebSocket communication** for instant feedback delivery. The system is designed to support both web and native Vision OS clients receiving synchronized feedback.

---

## System Components

### 1. Client Layer

#### Web App (Next.js + React)

- **Camera Access**: WebRTC API for video capture
- **Frame Capture**: Captures 10 frames over 6 seconds for analysis
- **UI Components**: Exercise selector, camera view, feedback overlay
- **Real-time Subscription**: Ably WebSocket client for feedback
- **Audio Playback**: Plays TTS audio feedback

#### Vision OS App (Future - Native Swift)

- **AR Overlay**: RealityKit for 3D ghost coach visualization
- **Spatial Audio**: 3D positioned audio feedback
- **Device Camera**: Native camera capture
- **Ably Swift SDK**: Same real-time channel subscription

---

### 2. Backend Layer (Next.js API Routes)

#### `/api/analyze-video` (POST)

**Purpose**: Orchestrates the entire analysis pipeline

**Flow**:

1. Receives video frames from client
2. Calls Gemini Vision API for form analysis
3. Calls ElevenLabs API for speech generation
4. Publishes feedback to Ably channel
5. Returns response to client

**Request**:

```typescript
{
  sessionId: string;
  videoFrames: string[]; // base64 encoded
  exerciseType: "overhead_press" | "external_rotation";
}
```

**Response**:

```typescript
{
  success: boolean;
  formFeedback: {
    quality: "good" | "needs_improvement" | "poor";
    feedback: string;
    corrections: string[];
    isPerformingExercise: boolean;
  };
  audioUrl: string | null;
}
```

#### `/api/exercises` (GET)

**Purpose**: Returns exercise library

**Response**:

```typescript
{
  exercises: Array<{
    id: string;
    name: string;
    description: string;
  }>;
}
```

#### `/api/ably/auth` (POST)

**Purpose**: Generates scoped Ably authentication token

**Flow**:

1. Validates session ID
2. Creates token with channel-specific permissions
3. Returns token request for client

**Security**: Token scoped to `session:{sessionId}` channel only

---

### 3. Real-time Communication (Ably)

#### Channel Structure

- **Format**: `session:{sessionId}`
- **Example**: `session:abc123xyz456`
- **Scope**: One channel per user session

#### Message Types

**`feedback` event**:

```typescript
{
  sessionId: string;
  formFeedback: FormFeedback;
  audioUrl: string | null;
  timestamp: number;
}
```

#### Pub/Sub Model

- **Publishers**: Next.js API route (`/api/analyze-video`)
- **Subscribers**: Web app, Vision OS app (multiple clients)
- **Delivery**: All subscribers receive same message simultaneously

#### Connection Flow

1. Client generates/retrieves session ID
2. Client requests auth token from `/api/ably/auth`
3. Client connects to Ably with token
4. Client subscribes to `session:{sessionId}` channel
5. Server publishes feedback to channel
6. All subscribed clients receive feedback instantly

---

### 4. AI/ML Services

#### Google Gemini Vision API

**Purpose**: Analyzes exercise form from video frames

**Model**: `gemini-2.5-flash` (fast, optimized for real-time)

**Input**: Array of base64-encoded JPEG images (10 frames)

**Output**: JSON with quality rating and corrections

**Prompts**: Custom prompts per exercise type with detailed form criteria

**Rate Limits**: 10 requests/minute (managed by client-side throttling)

#### ElevenLabs Text-to-Speech API

**Purpose**: Converts feedback text to natural speech

**Model**: `eleven_turbo_v2_5` (fastest for real-time)

**Voice**: "Adam" (professional, clear) - customizable

**Input**: Text feedback string

**Output**: Audio file (MP3) as base64 data URL

**Settings**:

- Stability: 0.5
- Similarity Boost: 0.75
- Speaker Boost: Enabled

---

## Data Flow Diagram

```
┌─────────────┐
│  User/      │
│  Camera     │
└──────┬──────┘
       │ Video Stream
       ▼
┌─────────────────────┐
│  Web App            │
│  ┌───────────────┐  │
│  │ Frame Capture │  │
│  │ (10 frames/   │  │
│  │  6 seconds)   │  │
│  └───────┬───────┘  │
│          │          │
└──────────┼──────────┘
           │ POST /api/analyze-video
           │ { sessionId, frames, exerciseType }
           ▼
┌─────────────────────────────────────┐
│  Next.js API Route                  │
│  ┌────────────────────────────────┐ │
│  │ 1. Receive frames              │ │
│  │ 2. ──────────┐                 │ │
│  └──────────────┼─────────────────┘ │
│                 │                   │
│                 ▼                   │
│  ┌──────────────────────────────┐  │
│  │  Gemini Vision API           │  │
│  │  - Analyze form              │  │
│  │  - Generate feedback         │  │
│  └──────────┬───────────────────┘  │
│             │ Form feedback         │
│             ▼                       │
│  ┌──────────────────────────────┐  │
│  │  ElevenLabs TTS API          │  │
│  │  - Convert text to speech    │  │
│  │  - Return audio URL          │  │
│  └──────────┬───────────────────┘  │
│             │ Audio URL             │
│             ▼                       │
│  ┌──────────────────────────────┐  │
│  │  Ably Publishing             │  │
│  │  - Publish to channel        │  │
│  │  - session:{sessionId}       │  │
│  └──────────┬───────────────────┘  │
└─────────────┼───────────────────────┘
              │ WebSocket message
              ▼
    ┌─────────────────────┐
    │  Ably Channel       │
    │  session:abc123     │
    └─────┬───────┬───────┘
          │       │
    ┌─────▼──┐  ┌▼──────────┐
    │  Web   │  │ Vision OS │
    │  App   │  │    App    │
    └────┬───┘  └───┬───────┘
         │          │
         ▼          ▼
    ┌────────────────────┐
    │  Play Audio        │
    │  Show Overlay      │
    │  Update UI         │
    └────────────────────┘
```

---

## Session Management

### Session ID Generation

- Generated client-side using `nanoid` (16 characters)
- Stored in `sessionStorage` for persistence
- Retrieved or created on app initialization

### Session Lifecycle

1. **Start**: User opens app → Session ID created
2. **Active**: User performs exercises → Feedback received
3. **End**: User closes app or clears session

### Multi-client Sync

- Multiple clients can subscribe to same session
- Example: Web app on laptop + Vision OS on headset
- Both receive identical feedback simultaneously

---

## Security Considerations

### API Keys

- **Gemini**: `NEXT_PUBLIC_*` (client-visible) - Move to server in production
- **Ably**: Server-only (token-based auth for clients)
- **ElevenLabs**: Server-only

### Ably Token Scoping

- Tokens limited to single session channel
- Subscribe-only permission (no publish from client)
- 1-hour TTL

### Rate Limiting

- Client-side: 10-second intervals between detections
- Gemini: 10 requests/minute quota management
- Error handling with exponential backoff

---

## Performance Optimizations

### Frame Capture

- Downscale to 640x480 for smaller payload
- JPEG compression (0.8 quality)
- Base64 encoding for transport

### Detection Interval

- 10 seconds between analyses (balance between real-time and cost)
- Captures full exercise repetition (6-second window)

### Caching

- Client-side: 12-second feedback cache
- Reduces redundant API calls

### Audio Delivery

- Current: Data URL (base64)
- Production: Upload to S3/R2, return public URL
- Reduces Ably message size

---

## Error Handling

### Network Errors

- Retry with exponential backoff
- User-friendly error messages
- Graceful degradation (continue without audio)

### API Failures

- Gemini quota exceeded → Show cooldown timer
- ElevenLabs failure → Continue with text-only feedback
- Ably disconnection → Auto-reconnect

### Client Errors

- Camera permission denied → Show instructions
- Frame capture failed → Retry on next interval
- Audio playback blocked → Manual play button

---

## Scalability

### Current Architecture

- Serverless (Next.js API Routes on Vercel)
- Auto-scaling based on traffic
- No persistent state required

### Future Enhancements

- **Database**: Store session history, user progress
- **Analytics**: Track form quality over time
- **Exercise Library**: User-uploaded exercises
- **Multi-user**: Coach-patient live sessions
- **S3/R2**: Audio file storage for production

---

## Monitoring & Logging

### Logs

- API route execution (Vercel logs)
- Gemini API responses and errors
- Ably connection status
- Client-side errors (console)

### Metrics to Monitor

- API response times
- Gemini API quota usage
- ElevenLabs API quota
- Ably message throughput
- Error rates per endpoint

---

## Development vs Production

### Development

- API keys in `.env.local`
- Audio as data URLs
- Console logging enabled
- Direct Ably connection

### Production

- Environment variables in Vercel
- Audio uploaded to S3/R2
- Structured logging (e.g., Datadog)
- CDN for static assets
- Rate limiting middleware
- User authentication (optional)

---

## Technology Decisions

### Why Ably over Socket.io?

- ✅ Managed service (no server maintenance)
- ✅ Built-in scaling and reliability
- ✅ Token-based authentication
- ✅ Swift SDK for Vision OS
- ✅ Message persistence and history

### Why Gemini over OpenAI Vision?

- ✅ Faster response times (Flash model)
- ✅ Better for real-time use cases
- ✅ Competitive pricing
- ✅ Reliable JSON output

### Why ElevenLabs over AWS Polly?

- ✅ More natural-sounding voices
- ✅ Faster turbo model
- ✅ Better for coach/instructor tone
- ✅ Easy voice customization

### Why Next.js API Routes over Express?

- ✅ Serverless (no server management)
- ✅ Auto-scaling
- ✅ Integrated with frontend
- ✅ TypeScript support
- ✅ Easy deployment to Vercel

---

## Future Vision OS Integration

### Planned Features

1. **AR Ghost Coach**: 3D skeleton overlay showing correct form
2. **Spatial Audio**: 3D positioned voice feedback
3. **Environment Mapping**: Detect workout space
4. **Hand Tracking**: Additional input for exercise detection

### Integration Points

- Same API routes (`/api/analyze-video`, `/api/exercises`)
- Same Ably channels (`session:{sessionId}`)
- Native camera capture instead of WebRTC
- RealityKit for AR rendering

---

## Quick Reference

### Environment Variables

```bash
NEXT_PUBLIC_GEMINI_API_KEY=     # Google Gemini API key
ABLY_API_KEY=                   # Ably API key (app-id.key-id:key-secret)
ELEVENLABS_API_KEY=             # ElevenLabs API key
```

### Key Files

- `src/app/api/analyze-video/route.ts` - Main analysis endpoint
- `src/lib/api/ablyService.ts` - Ably publishing
- `src/lib/hooks/useAblyFeedback.ts` - Ably subscription
- `src/lib/api/visionModel.ts` - Gemini integration
- `src/lib/api/elevenLabs.ts` - TTS integration

### Testing Endpoints

```bash
# Test exercise library
curl http://localhost:3000/api/exercises

# Test Ably auth
curl -X POST http://localhost:3000/api/ably/auth \
  -H "Content-Type: application/json" \
  -d '{"sessionId":"test123"}'

# Test video analysis (with actual base64 frames)
curl -X POST http://localhost:3000/api/analyze-video \
  -H "Content-Type: application/json" \
  -d '{"sessionId":"test123","videoFrames":["...base64..."],"exerciseType":"overhead_press"}'
```

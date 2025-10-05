# Pose Detection Setup

## Install Dependencies

Run the following command to install TensorFlow.js and pose detection models:

```bash
npm install @tensorflow-models/pose-detection@^2.1.3 @tensorflow/tfjs-core@^4.22.0 @tensorflow/tfjs-backend-webgl@^4.22.0
```

## How It Works

### Real-Time Pose Detection with MoveNet

- **MoveNet Lightning**: Ultra-fast pose estimation model (~50-60 FPS)
- **17 Keypoints**: Full body skeleton tracking
- **Local Processing**: All computation happens in the browser (no API calls!)

### Rep Detection & Analysis

1. **Automatic Rep Detection**: Detects when you start and complete a rep
2. **Keyframe Collection**: Captures poses throughout the movement
3. **Instant Analysis**: Analyzes form at peak of rep
4. **Immediate Feedback**: Audio feedback within 1-2 seconds

### Latency Comparison

**Gemini API (Old):**

```
Capture 5 frames (500ms) → Upload to API → Process (~1-2s) → Download response = ~3-4s total
```

**Pose Detection (New):**

```
Real-time tracking (16ms/frame) → Rep complete → Instant analysis (< 50ms) → Audio (~1s) = ~1-1.5s total
```

**Result: 50-70% faster feedback! ⚡**

## Benefits

✅ **Near-Zero Latency**: Feedback within 1-2 seconds after rep  
✅ **No API Costs**: Everything runs locally in browser  
✅ **No Rate Limits**: Unlimited analysis  
✅ **Works Offline**: No internet required after initial load  
✅ **Real-time Tracking**: 50-60 FPS skeleton overlay  
✅ **Better Accuracy**: Precise joint angle measurements

## Exercise-Specific Analysis

### Overhead Press

- Elbow extension (should be ~180° at top)
- Back arch detection (torso alignment)
- Arm symmetry
- Full range of motion

### Side Lateral Raise

- Arms raised to sides (not forward/back)
- Shoulder height check
- Shoulder shrug detection
- Elbow bend maintenance

### Front Lateral Raise

- Forward arm path
- Torso lean detection
- Arm symmetry
- Height consistency

### External Rotation

- Elbow pinned to side (not drifting)
- 90° elbow angle maintenance
- Forearm rotation outward
- Upper arm stability

## Architecture

```
usePoseFormAnalysis (High-level)
    ├── usePoseDetection (TensorFlow.js wrapper)
    │   └── MoveNet Lightning model
    ├── useAudioQueue (Audio feedback)
    └── poseAnalysis utilities (Form scoring)
```

## Usage in CameraView

Replace `useRealtimeExerciseDetection` with `usePoseFormAnalysis`:

```typescript
import { usePoseFormAnalysis } from "@/lib/hooks/usePoseFormAnalysis";

// In component:
const { formFeedback, isAnalyzing, error, fps } = usePoseFormAnalysis(
  videoRef.current,
  autoDetectEnabled && stream !== null,
  selectedExercise
);
```

## Performance Tips

1. **Good Lighting**: Helps with keypoint detection
2. **Full Body in Frame**: All joints visible
3. **Face the Camera**: Front-facing works best
4. **Stable Camera**: Mount or prop up device
5. **Clean Background**: Improves detection accuracy

## Troubleshooting

**Slow FPS (< 30)**:

- Close other tabs
- Use hardware acceleration in browser
- Reduce video resolution

**Keypoints Not Detected**:

- Improve lighting
- Ensure full body is visible
- Reduce distance from camera
- Wear contrasting clothing

**No Feedback After Rep**:

- Check that arms are going above shoulders
- Complete full range of motion
- Wait 2 seconds between reps

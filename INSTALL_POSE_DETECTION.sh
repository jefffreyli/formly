#!/bin/bash
echo "🚀 Installing Pose Detection Dependencies..."
npm install @tensorflow-models/pose-detection@^2.1.3 @tensorflow/tfjs-core@^4.22.0 @tensorflow/tfjs-backend-webgl@^4.22.0
echo "✅ Dependencies installed!"
echo ""
echo "📝 Next steps:"
echo "1. Update CameraView.tsx (see INTEGRATION_GUIDE.md)"
echo "2. Run: npm run dev"
echo "3. Toggle Auto-Detect ON and perform one rep"
echo "4. Get feedback in 1-2 seconds! ⚡"

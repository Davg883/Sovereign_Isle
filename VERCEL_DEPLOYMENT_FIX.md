# Vercel Deployment Fix Guide

## 1. Fix Google Maps API Key Issues

### In Google Cloud Console:
1. Go to https://console.cloud.google.com/
2. Navigate to "APIs & Services" → "Credentials"
3. Click on your Maps JavaScript API key (the one starting with `AIzaSyAfgp59...`)
4. Under "Application restrictions":
   - Select "HTTP referrers (websites)"
   - Add these referrers:
     ```
     https://your-app-name.vercel.app/*
     https://*.vercel.app/*
     http://localhost:*/*
     ```
   - Replace `your-app-name` with your actual Vercel deployment URL

### In Vercel Dashboard (Frontend Project):
1. Go to your project settings → "Environment Variables"
2. Add/verify these variables:
   ```
   VITE_GOOGLE_MAPS_API_KEY=AIzaSyAfgp59QyogoMoKAARpvC1uulnQg4K18e0
   VITE_GOOGLE_MAP_ID=e0df9c01f40e23d5b6c6f64a
   VITE_ENABLE_ADMIN=false
   ```
3. Redeploy your project

## 2. Fix Backend API 500 Errors

### In Vercel Dashboard (Backend/API):
Since your project has API routes in the same repo, add ALL backend variables:

1. Go to Project Settings → "Environment Variables"
2. Add these backend variables:
   ```
   # Backend Google API (for server-side operations)
   GOOGLE_API_KEY=AIzaSyDvrd2ScmIKRX0ycDq6ElTD8QteIHP3Lfs
   
# OpenAI
   OPENAI_API_KEY=[YOUR_OPENAI_API_KEY_HERE]
   OPENAI_ROUTER_MODEL=gpt-4o-mini
   OPENAI_CLASSIFIER_MODEL=gpt-4o-mini
   OPENAI_TEMPORAL_MODEL=gpt-4o-mini
   OPENAI_TEMPERATURE=0.7
   
   # Pinecone
   PINECONE_API_KEY=pcsk_2R3rbo_LET2CpCurdyEx3MG7mrD6HQy46RLUGCuYwbjCcCiG9W1z4dYcwLNGFKXmz7Zghy
   PINECONE_INDEX_NAME=sovereign-isle
   PINECONE_CLOUD=aws
   PINECONE_REGION=us-east-1
   PINECONE_TOP_K=4
   
   # ElevenLabs
   ELEVENLABS_API_KEY=cf86b1eba97b9ae5046a4e22740e1f83d26d897e3c832ff28f7d8fa1154cec78
   
   # Current Date for temporal queries
   CURRENT_DATE=2025-10-30
   ```

3. **Important**: Make sure to select "Production", "Preview", and "Development" environments when adding each variable

4. Trigger a new deployment

## 3. Quick Verification Steps

After redeploying:
1. Check browser console for any remaining errors
2. Verify the map loads correctly
3. Test the chat functionality
4. Check that API endpoints respond (e.g., `/api/health`)

## 4. If Issues Persist

### Check Vercel Function Logs:
1. Go to Vercel Dashboard → Functions tab
2. Look for error logs in the failed API calls
3. Common issues:
   - Missing environment variables
   - API key restrictions
   - CORS issues

### Verify API Keys are Active:
1. Google Cloud Console → Check API is enabled
2. OpenAI Dashboard → Check API key is active
3. Pinecone Dashboard → Verify index exists and API key is valid

## Security Note
After deployment is working, immediately:
1. Rotate your OpenAI API key (it's been exposed in commits)
2. Add domain restrictions to all API keys
3. Remove `VITE_ADMIN_PASSWORD` and `VITE_ADMIN_USERNAME` from frontend variables

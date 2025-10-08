# Vercel Deployment Checklist

## ✅ What I've Fixed in Code

1. **Created vercel.json** - Proper configuration for Vercel deployment
2. **Created .env.example** - Template for all required environment variables
3. **Fixed api/map-locations.ts** - Better error handling for missing env vars
4. **Fixed api/chat.ts** - Syntax error corrections (already pushed)

## 📋 What YOU Need to Do in Vercel Dashboard

### Step 1: Add ALL Environment Variables to Vercel
Go to your Vercel project → Settings → Environment Variables

Add these variables (copy from your local .env):

#### Frontend Variables (VITE_ prefixed):
```
VITE_GOOGLE_MAPS_API_KEY=AIzaSyAfgp59QyogoMoKAARpvC1uulnQg4K18e0
VITE_GOOGLE_MAP_ID=e0df9c01f40e23d5b6c6f64a
VITE_ENABLE_ADMIN=false
```

#### Backend Variables:
```
# Google APIs
GOOGLE_API_KEY=AIzaSyDvrd2ScmIKRX0ycDq6ElTD8QteIHP3Lfs
GOOGLE_CX=https://cse.google.com/cse.js?cx=27de2e5f03fc74b7a

# OpenAI
OPENAI_API_KEY=[YOUR_OPENAI_API_KEY_HERE]
OPENAI_ROUTER_MODEL=gpt-4o-mini
OPENAI_CLASSIFIER_MODEL=gpt-4o-mini
OPENAI_TEMPORAL_MODEL=gpt-4o-mini
OPENAI_TEMPERATURE=0.7

# Pinecone
# IMPORTANT: keep these names exactly as shown (PINECONE_*). Do NOT use "PINECODE_*".
PINECONE_API_KEY=pcsk_2R3rbo_LET2CpCurdyEx3MG7mrD6HQy46RLUGCuYwbjCcCiG9W1z4dYcwLNGFKXmz7Zghy
PINECONE_INDEX_NAME=sovereign-isle
PINECONE_CLOUD=aws
PINECONE_REGION=us-east-1
PINECONE_TOP_K=4

# ElevenLabs
ELEVENLABS_API_KEY=cf86b1eba97b9ae5046a4e22740e1f83d26d897e3c832ff28f7d8fa1154cec78

# Other
SERPER_API_KEY=9ecc15b60d528b0b076a9d2f5fce079b1cf2c2a2
CURRENT_DATE=2025-10-30
```

### Step 2: Fix Google Maps API Restrictions

1. Go to https://console.cloud.google.com/
2. Navigate to "APIs & Services" → "Credentials"
3. Find your Maps JavaScript API key (AIzaSyAfgp59...)
4. Click to edit it
5. Under "Application restrictions":
   - Select "HTTP referrers (websites)"
6. Add these referrers:
   ```
   https://*.vercel.app/*
   https://sovereign-isle.vercel.app/*
   https://your-custom-domain.com/*
   http://localhost:*/*
   ```

### Step 3: Verify APIs are Enabled in Google Cloud

Ensure these APIs are enabled:
- Maps JavaScript API ✓
- Places API ✓
- Routes API ✓
- Geocoding API ✓

### Step 4: Redeploy in Vercel

After adding all environment variables:
1. Go to Deployments tab
2. Click the three dots on the latest deployment
3. Select "Redeploy"
4. Wait for deployment to complete

## 🔍 Verification Steps

After deployment:
1. Check the deployment URL (e.g., https://sovereign-isle.vercel.app)
2. Open browser console (F12)
3. Verify no red errors
4. Test:
   - Map loads correctly ✓
   - Chat functionality works ✓
   - Markers appear on map ✓

## 🚨 Security Actions Required IMMEDIATELY

### 1. Rotate OpenAI API Key
Your OpenAI key is exposed in GitHub commits!
1. Go to https://platform.openai.com/api-keys
2. Create a NEW API key
3. Update it in Vercel env vars
4. Delete the old key

### 2. Remove Sensitive Data from Frontend
Remove these from VITE_ variables:
- VITE_ADMIN_PASSWORD
- VITE_ADMIN_USERNAME

## 📝 Common Issues & Solutions

### "InvalidKeyMapError" in Console
→ Google Maps API key not authorized for your domain. Check Step 2.

### API endpoints returning 500
→ Missing backend environment variables. Check Step 1.

### Map not loading
→ Check browser console for specific errors. Verify API keys.

### Chat not working
→ Verify OpenAI and Pinecone credentials are correct.

## 🎯 Final Checklist

- [ ] All environment variables added to Vercel
- [ ] Google Maps API restrictions updated
- [ ] Deployment successful
- [ ] Map loads without errors
- [ ] Chat functionality works
- [ ] OpenAI API key rotated
- [ ] Sensitive data removed from frontend vars

Once all boxes are checked, your deployment should be fully functional!

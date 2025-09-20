# Google Maps API Setup

This app requires a single Google Maps API key for iOS. Follow these steps to set up the API key securely.

## Step 1: Get API Key from Google Cloud Console

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the "Maps SDK for iOS" API
4. Go to "APIs & Credentials" > "Credentials"
5. Create an API key (no platform restrictions needed for Expo)

## Step 2: Set Up Environment Variables (Local Development)

Create a `.env` file in the frontend directory with your API key:

```bash
# Copy and paste your actual API key here
EXPO_PUBLIC_GOOGLE_MAPS_IOS_KEY=YOUR_ACTUAL_GOOGLE_MAPS_API_KEY
```

**Important:** The `.env` file is automatically ignored by git, so your API key won't be committed to version control.

## Step 3: Production Builds (EAS Build)

For production builds using [EAS Build](https://docs.expo.dev/build/introduction/), set the environment variable as a build secret:

```bash
eas build --platform ios --set-env-var EXPO_PUBLIC_GOOGLE_MAPS_IOS_KEY=your_api_key
```

Or set it permanently in your EAS project settings.

## How It Works

- **Local Development**: Uses `.env` file (git-ignored)
- **Production**: Uses EAS build secrets (secure)
- **Runtime**: The app reads from environment variables first, then falls back to `app.json`

## Security Benefits

✅ API key is never in version control
✅ Different keys can be used for development and production
✅ `.env` file is git-ignored by default

## Troubleshooting

If you see "Map unavailable" errors:

1. Check that your `.env` file exists and has the correct API key
2. Restart your development server after updating `.env`
3. Ensure the API key is valid at [Google Cloud Console](https://console.cloud.google.com/)

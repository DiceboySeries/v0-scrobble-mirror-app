# ScrobbleMirror

Automatically mirror Last.fm scrobbles from Account B to Account A.

## Setup

### 1. Environment Variables

Add the following environment variables to your Vercel project (Vars section in the sidebar):

\`\`\`bash
LASTFM_API_KEY=your_lastfm_api_key
LASTFM_SECRET=your_lastfm_secret
NEXT_PUBLIC_DOMAIN=https://your-domain.vercel.app
CRON_SECRET=your_random_secret (optional, for cron security)
\`\`\`

The Upstash Redis (KV) variables are already configured via the integration:
- `KV_REST_API_URL`
- `KV_REST_API_TOKEN`

### 2. Get Last.fm API Credentials

1. Go to https://www.last.fm/api/account/create
2. Create a new API account
3. Copy your API Key and Shared Secret
4. Add them to your environment variables in the **Vars** section of the in-chat sidebar

### 3. Deploy to Vercel

1. Click the "Publish" button in the top right
2. Or download the code and push to GitHub, then connect to Vercel
3. The cron job is configured in `vercel.json` to run every minute

## How It Works

1. **Authentication**: Users log in with Last.fm (Account A - destination)
2. **Configuration**: Users specify Account B (source) username
3. **Mirroring**: Every minute, a cron job:
   - Fetches recent tracks from Account B
   - Checks for new tracks not in history
   - Scrobbles them to Account A
   - Stores them in history to avoid duplicates

## Tech Stack

- **Next.js 14** (App Router)
- **TypeScript**
- **Tailwind CSS v4**
- **Upstash Redis** for state management
- **Vercel Cron Jobs** for background mirroring
- **Axios** for Last.fm API calls

## API Routes

- `/api/login` - Initiates Last.fm OAuth
- `/api/callback` - Handles OAuth callback
- `/api/start` - Starts mirroring
- `/api/stop` - Stops mirroring
- `/api/status` - Gets current config and history
- `/api/cron` - Background job (runs every minute)

## Security Notes

- Session keys are stored securely in Upstash Redis
- API keys and secrets are never exposed to the client
- All authentication happens server-side

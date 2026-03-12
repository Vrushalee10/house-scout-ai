# HouseScout Agent 🏠🤖

A headless AI agent that searches rental listings, ranks them by fit, and generates personalized outreach with optional SMS/voice capabilities.
Presentation link :https://www.canva.com/design/DAGyOp1XtEk/AAjY6VfeocN5WaiR1VC5HQ/view?utm_content=DAGyOp1XtEk&utm_campaign=designshare&utm_medium=link2&utm_source=uniquelinks&utlId=hb3c1cc4328

## Quick Start

### 1. Run with Mock Data (Offline)
```bash
# Basic search
node agent.mjs "Find rentals in 02115 under $2400, 1+ beds; top 8"

# Custom parameters
node agent.mjs "Cambridge under $3000, 2+ beds; top 5; September move-in"
```

### 2. Enable Live Data
```bash
# Copy environment template
cp .env.example .env

# Add your RentCast API key to .env
RENTCAST_API_KEY=your_key_here

# Run with live data
node agent.mjs "02115 under $2400, 1+ beds; top 8" --live
```

### 3. Enable SMS & Voice (Optional)

Add Twilio credentials to `.env`:
```
TWILIO_ACCOUNT_SID=your_sid
TWILIO_AUTH_TOKEN=your_token
TWILIO_FROM_NUMBER=+1234567890
```

Add ElevenLabs credentials for voice:
```
ELEVENLABS_API_KEY=your_key
ELEVENLABS_VOICE_ID=EXAVITQu4vr4xnSDxMaL
```

Then use flags:
```bash
# Generate voice files only
node agent.mjs "Boston under $2500, 1+ beds" --live --voice

# Send SMS messages
node agent.mjs "02115 under $2400, 1+ beds" --live --send

# Place voice calls (high-scoring listings only)
node agent.mjs "Cambridge under $3000, 2+ beds" --live --call-now

# All features combined
node agent.mjs "02115 under $2400, 1+ beds" --live --voice --send --call-now
```

## Features

- **Natural Language Parsing**: "Cambridge under $3000, 2+ beds; top 5"
- **Smart Scoring**: Budget fit (60pts) + Bedroom match (30pts) + Freshness (10pts)
- **Multi-Channel Outreach**: Email, SMS, and voice scripts
- **Live API Integration**: RentCast API with mock fallback
- **Voice Synthesis**: ElevenLabs TTS for voicemails
- **SMS/Voice Calls**: Twilio integration
- **CSV Export**: Detailed shortlist and outreach data

## API Keys & Services

### RentCast (Live Listings)
- Free tier available at [rentcast.io](https://rentcast.io)
- Add `RENTCAST_API_KEY` to `.env`

### Twilio (SMS/Voice)
- Trial account works at [twilio.com](https://twilio.com)
- Add account SID, auth token, and phone number

### ElevenLabs (Voice Synthesis)
- Free tier available at [elevenlabs.io](https://elevenlabs.io)
- Add API key and voice ID

## Command Line Options

- `--live`: Use RentCast API for real listings
- `--send`: Send SMS messages via Twilio
- `--voice`: Generate MP3 voicemails with ElevenLabs
- `--call-now`: Place voice calls for high-scoring listings (75+ score)

## Output Files

- `outputs/shortlist.csv`: Top listings with scores and contact info
- `outputs/outreach.csv`: Generated outreach content and tracking
- `outputs/voice/`: MP3 voicemail files (if `--voice` used)

## Compliance & Best Practices

- **1-to-1 Outreach Only**: Never mass blast
- **Respect Rate Limits**: Graceful API fallbacks
- **Privacy First**: No data storage beyond session
- **Local Laws**: Follow telecommunications regulations in your area

## Example Natural Language Queries

```bash
# Location-based
"Boston under $2500, 1+ beds"
"02115 under $2400, 2+ beds"
"Cambridge under $3000, 1+ beds"

# With timing
"Somerville under $2800, 2+ beds; October move-in"
"02139 under $2600, 1+ beds; September; top 5"

# Full specification
"Find 30 rentals near 02115 under $2400, 1+ beds; shortlist top 8; draft outreach; export"
```

## Error Handling

- API failures → automatic fallback to mock data
- Missing credentials → prepare outreach without sending
- Rate limits → graceful degradation
- Invalid phone numbers → skip SMS/voice actions

---

**⚠️ Important**: This tool is for personal apartment hunting only. Always respect website terms of service and local communication laws. Test with trial accounts before using production API keys.

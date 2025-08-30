#!/usr/bin/env node

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Default profile for outreach
const DEFAULT_PROFILE = {
  budget: 2400,
  moveIn: "September",
  roommates: "undecided",
  preferences: ["laundry", "parking"]
};

// Parse natural language query
function parseNL(input) {
  const defaults = {
    cityOrZip: "02115",
    maxRent: 2400,
    minBeds: 1,
    moveIn: "September",
    topN: 8
  };

  // Extract zip code (5 digits)
  const zipMatch = input.match(/\b(\d{5})\b/);
  if (zipMatch) defaults.cityOrZip = zipMatch[1];

  // Extract city names
  const cityMatch = input.match(/\b(Boston|Cambridge|Somerville|Brookline)\b/i);
  if (cityMatch && !zipMatch) defaults.cityOrZip = cityMatch[1];

  // Extract rent limit
  const rentMatch = input.match(/under\s*\$?(\d+)/i);
  if (rentMatch) defaults.maxRent = parseInt(rentMatch[1]);

  // Extract bedroom requirement
  const bedMatch = input.match(/(\d+)\+?\s*bed/i);
  if (bedMatch) defaults.minBeds = parseInt(bedMatch[1]);

  // Extract top N
  const topMatch = input.match(/top\s*(\d+)/i);
  if (topMatch) defaults.topN = parseInt(topMatch[1]);

  // Extract move-in month
  const monthMatch = input.match(/\b(January|February|March|April|May|June|July|August|September|October|November|December)\b/i);
  if (monthMatch) defaults.moveIn = monthMatch[1];

  return defaults;
}

// Fetch listings from RentCast API
async function fetchListingsLive(params) {
  const apiKey = process.env.RENTCAST_API_KEY;
  if (!apiKey) throw new Error("RENTCAST_API_KEY not found");

  const baseUrl = "https://api.rentcast.io/v1/listings/rental/long-term";
  const queryParams = new URLSearchParams({
    limit: '50',
    ...(params.cityOrZip.match(/^\d{5}$/) 
      ? { zipCode: params.cityOrZip }
      : { city: params.cityOrZip, state: 'MA' }
    ),
    maxRent: params.maxRent.toString(),
    bedrooms: params.minBeds.toString()
  });

  const response = await fetch(`${baseUrl}?${queryParams}`, {
    headers: {
      'X-Api-Key': apiKey,
      'Accept': 'application/json'
    }
  });

  if (!response.ok) {
    if (response.status === 429) throw new Error("Rate limited");
    throw new Error(`API error: ${response.status}`);
  }

  const data = await response.json();
  
  // Transform RentCast format to our format
  return (data.listings || []).map((listing, idx) => ({
    id: `RC-${listing.id || idx}`,
    address: listing.address || "Address not available",
    city: listing.city || "Boston",
    state: listing.state || "MA",
    zip: listing.zipCode || params.cityOrZip,
    rent: listing.rent || listing.price || 0,
    beds: listing.bedrooms || 0,
    baths: listing.bathrooms || 1,
    sqft: listing.squareFootage || 600,
    url: listing.url || "https://example.com/listing",
    lastSeenDate: new Date().toISOString().split('T')[0],
    amenities: listing.amenities || [],
    contact_name: listing.contactName || "Property Manager",
    contact_email: listing.contactEmail || "",
    contact_phone: listing.contactPhone || ""
  }));
}

// Load mock data
async function loadMock() {
  try {
    const data = await fs.readFile(path.join(__dirname, 'mock/listings.json'), 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error("Failed to load mock data:", error.message);
    return [];
  }
}

// Score listing against criteria
function score(listing, params) {
  let totalScore = 0;
  let reasons = [];

  // Budget fit (0-60 points)
  const maxAcceptable = params.maxRent * 1.3; // 30% over budget is 0 points
  if (listing.rent <= params.maxRent) {
    totalScore += 60;
    reasons.push("within budget");
  } else if (listing.rent <= maxAcceptable) {
    const budgetScore = Math.round(60 * (maxAcceptable - listing.rent) / (maxAcceptable - params.maxRent));
    totalScore += budgetScore;
    reasons.push(`${Math.round((listing.rent - params.maxRent) / params.maxRent * 100)}% over budget`);
  } else {
    reasons.push("too expensive");
  }

  // Beds fit (0-30 points)
  if (listing.beds >= params.minBeds) {
    totalScore += 30;
    if (listing.beds > params.minBeds) {
      reasons.push(`${listing.beds} beds (bonus)`);
    } else {
      reasons.push(`${listing.beds} beds`);
    }
  } else {
    reasons.push(`only ${listing.beds} beds`);
  }

  // Freshness (0-10 points)
  const today = new Date();
  const listingDate = new Date(listing.lastSeenDate);
  const daysDiff = Math.floor((today - listingDate) / (1000 * 60 * 60 * 24));
  
  if (daysDiff <= 1) {
    totalScore += 10;
    reasons.push("fresh listing");
  } else if (daysDiff <= 7) {
    totalScore += Math.round(10 * (7 - daysDiff) / 6);
    reasons.push(`${daysDiff} days old`);
  } else {
    reasons.push("older listing");
  }

  return {
    score: Math.min(100, totalScore),
    reason: reasons.join(", ")
  };
}

// Build email content
function buildEmail(profile, listing) {
  return `Subject: Apartment Inquiry - ${listing.address}

Hi ${listing.contact_name || 'there'},

I hope this email finds you well. I'm reaching out regarding your ${listing.beds}-bedroom apartment at ${listing.address} listed at $${listing.rent}/month.

I'm actively searching for a place in the ${listing.city} area with a budget of up to $${profile.budget}. I'm looking to move in ${profile.moveIn} and am still deciding on roommate arrangements (${profile.roommates}). 

What particularly caught my attention about your listing is ${listing.amenities.length > 0 ? `the ${listing.amenities[0]} amenities` : `the ${listing.sqft} sq ft layout`}. The location seems perfect for my needs.

Would it be possible to schedule a viewing this week or next? I'm flexible with timing and can accommodate your schedule. I have all necessary documentation ready and can provide references upon request.

Thank you for your time, and I look forward to hearing from you soon.

Best regards,
[Your name]

P.S. If you offer any student discounts or flexible lease terms, I'd be very interested to learn more about those options as well.`;
}

// Build SMS content
function buildSms(profile, listing) {
  const baseMsg = `Hi! Interested in your ${listing.beds}BR at ${listing.address} ($${listing.rent}). Available for a tour this week? Budget: $${profile.budget}, move-in: ${profile.moveIn}. Thanks!`;
  
  // Truncate if over 160 chars
  if (baseMsg.length <= 160) return baseMsg;
  
  return `Hi! Interested in ${listing.beds}BR at ${listing.address} ($${listing.rent}). Tour available? Budget $${profile.budget}. Thanks!`;
}

// Generate mailto link
function mailtoLink(listing, message) {
  if (!listing.contact_email) return "";
  
  const subject = encodeURIComponent(`Apartment Inquiry - ${listing.address}`);
  const body = encodeURIComponent(message);
  return `mailto:${listing.contact_email}?subject=${subject}&body=${body}`;
}

// Generate SMS link
function smsLink(listing, text) {
  if (!listing.contact_phone) return "";
  
  const phone = normalizePhone(listing.contact_phone);
  const message = encodeURIComponent(text);
  return `sms:${phone}?body=${message}`;
}

// Normalize phone number to E.164 format
function normalizePhone(phone) {
  if (!phone) return "";
  
  // Remove all non-digits
  const digits = phone.replace(/\D/g, '');
  
  // If it's 10 digits, assume US and add +1
  if (digits.length === 10) {
    return `+1${digits}`;
  }
  
  // If it's 11 digits starting with 1, add +
  if (digits.length === 11 && digits.startsWith('1')) {
    return `+${digits}`;
  }
  
  // Return as-is if already formatted or unknown format
  return phone;
}

// Send SMS via Twilio
async function sendSmsTwilio(to, text) {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const fromNumber = process.env.TWILIO_FROM_NUMBER;

  if (!accountSid || !authToken || !fromNumber) {
    return { error: "Missing Twilio credentials" };
  }

  try {
    const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
    const auth = Buffer.from(`${accountSid}:${authToken}`).toString('base64');
    
    const formData = new URLSearchParams({
      To: normalizePhone(to),
      From: fromNumber,
      Body: text
    });

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: formData
    });

    if (!response.ok) {
      const error = await response.text();
      return { error: `Twilio error: ${error}` };
    }

    const data = await response.json();
    return { sid: data.sid };
  } catch (error) {
    return { error: error.message };
  }
}

// Build call script
function buildCallScript(profile, listing) {
  return `Hi, this is calling about the ${listing.beds}-bedroom apartment at ${listing.address} listed for ${listing.rent} dollars per month. I'm looking for a place in ${listing.city} with a budget of up to ${profile.budget} dollars, planning to move in ${profile.moveIn}. The listing looks like a great fit for my needs. Could you please call me back at your earliest convenience to discuss a viewing? I'm flexible with timing and have all documentation ready. Thank you, and I look forward to hearing from you soon.`;
}

// Generate speech with ElevenLabs
async function synthesizeElevenLabs(script, listingId) {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  const voiceId = process.env.ELEVENLABS_VOICE_ID || 'EXAVITQu4vr4xnSDxMaL'; // Sarah

  if (!apiKey) return null;

  try {
    const url = `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'xi-api-key': apiKey,
        'Content-Type': 'application/json',
        'Accept': 'audio/mpeg'
      },
      body: JSON.stringify({
        text: script,
        model_id: 'eleven_multilingual_v2',
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75
        }
      })
    });

    if (!response.ok) {
      console.warn(`ElevenLabs error for ${listingId}:`, response.status);
      return null;
    }

    // Ensure voice directory exists
    const voiceDir = path.join(__dirname, 'outputs/voice');
    await fs.mkdir(voiceDir, { recursive: true });

    const audioPath = path.join(voiceDir, `${listingId}.mp3`);
    const buffer = await response.arrayBuffer();
    await fs.writeFile(audioPath, Buffer.from(buffer));

    return audioPath;
  } catch (error) {
    console.warn(`ElevenLabs synthesis failed for ${listingId}:`, error.message);
    return null;
  }
}

// Place call via Twilio
async function placeCallTwilioSay(to, script) {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const fromNumber = process.env.TWILIO_FROM_NUMBER;

  if (!accountSid || !authToken || !fromNumber) {
    return { error: "Missing Twilio credentials" };
  }

  try {
    const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Calls.json`;
    const auth = Buffer.from(`${accountSid}:${authToken}`).toString('base64');
    
    const twiml = `<Response><Say voice="alice">${script}</Say></Response>`;
    
    const formData = new URLSearchParams({
      To: normalizePhone(to),
      From: fromNumber,
      Twiml: twiml
    });

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: formData
    });

    if (!response.ok) {
      const error = await response.text();
      return { error: `Twilio call error: ${error}` };
    }

    const data = await response.json();
    return { sid: data.sid };
  } catch (error) {
    return { error: error.message };
  }
}

// Write CSV file
async function writeCSV(filePath, headers, rows) {
  const escapeCSV = (value) => {
    if (value === null || value === undefined) return '';
    const str = String(value);
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(escapeCSV).join(','))
  ].join('\n');

  await fs.writeFile(filePath, csvContent, 'utf8');
}

// Main function
async function main() {
  console.log('🏠 HouseScout Agent Starting...\n');
  
  // Parse command line arguments
  const args = process.argv.slice(2);
  const query = args.find(arg => !arg.startsWith('--')) || "Find 30 rentals near 02115 under $2400, 1+ beds; shortlist top 8; draft outreach; export.";
  const flags = {
    live: args.includes('--live'),
    send: args.includes('--send'),
    voice: args.includes('--voice'),
    callNow: args.includes('--call-now')
  };

  console.log(`Query: "${query}"`);
  console.log(`Flags: ${Object.entries(flags).filter(([k,v]) => v).map(([k,v]) => `--${k.replace(/([A-Z])/g, '-$1').toLowerCase()}`).join(' ') || 'none'}\n`);

  // Parse query parameters
  const params = parseNL(query);
  console.log(`Parsed: ${params.cityOrZip}, max $${params.maxRent}, ${params.minBeds}+ beds, top ${params.topN}\n`);

  // Fetch listings
  let listings = [];
  let dataSource = "Mock";
  
  if (flags.live && process.env.RENTCAST_API_KEY) {
    try {
      console.log('📡 Fetching live listings from RentCast...');
      listings = await fetchListingsLive(params);
      dataSource = "Live (RentCast)";
      console.log(`✅ Fetched ${listings.length} live listings\n`);
    } catch (error) {
      console.warn(`⚠️  Live API failed (${error.message}), falling back to mock data\n`);
      listings = await loadMock();
      dataSource = "Mock (Live API Failed)";
    }
  } else {
    console.log('📋 Using mock data...');
    listings = await loadMock();
    if (flags.live && !process.env.RENTCAST_API_KEY) {
      console.log('⚠️  RENTCAST_API_KEY not found, using mock data\n');
    }
  }

  if (listings.length === 0) {
    console.error('❌ No listings found');
    process.exit(1);
  }

  // Filter listings
  const filtered = listings.filter(listing => {
    const matchesLocation = params.cityOrZip.match(/^\d{5}$/) 
      ? listing.zip === params.cityOrZip
      : listing.city.toLowerCase().includes(params.cityOrZip.toLowerCase());
    
    return matchesLocation && 
           listing.rent <= params.maxRent * 1.3 && // Allow some flexibility
           listing.beds >= (params.minBeds === 0 ? 0 : params.minBeds);
  });

  console.log(`📊 Filtered to ${filtered.length} matches from ${listings.length} total\n`);

  // Score and rank
  const scored = filtered.map(listing => {
    const result = score(listing, params);
    return { ...listing, ...result };
  }).sort((a, b) => b.score - a.score);

  const shortlist = scored.slice(0, params.topN);
  
  // Ensure outputs directory
  await fs.mkdir(path.join(__dirname, 'outputs'), { recursive: true });

  // Generate outreach for shortlisted items
  const profile = { ...DEFAULT_PROFILE, budget: params.maxRent, moveIn: params.moveIn };
  const outreachData = [];
  
  let smsCount = 0;
  let callCount = 0;
  let voiceCount = 0;
  const callThreshold = parseInt(process.env.CALL_RECOMMEND_SCORE || '75');

  console.log('📝 Generating outreach content...\n');

  for (const listing of shortlist) {
    const email = buildEmail(profile, listing);
    const sms = buildSms(profile, listing);
    const mailto = mailtoLink(listing, email);
    const smsUri = smsLink(listing, sms);
    
    let voicePath = null;
    let smsSid = null;
    let callSid = null;

    // Generate voice file if requested and contact phone exists
    if (flags.voice && listing.contact_phone) {
      const script = buildCallScript(profile, listing);
      voicePath = await synthesizeElevenLabs(script, listing.id);
      if (voicePath) {
        voiceCount++;
        console.log(`🎵 Generated voice for ${listing.address}`);
      }
    }

    // Send SMS if requested
    if (flags.send && listing.contact_phone) {
      const result = await sendSmsTwilio(listing.contact_phone, sms);
      if (result.sid) {
        smsSid = result.sid;
        smsCount++;
        console.log(`📱 SMS sent to ${listing.address}: ${result.sid}`);
      } else if (result.error) {
        console.warn(`📱 SMS failed for ${listing.address}: ${result.error}`);
      }
    }

    // Place call if requested and score is high enough
    if (flags.callNow && listing.contact_phone && listing.score >= callThreshold) {
      const script = buildCallScript(profile, listing);
      const result = await placeCallTwilioSay(listing.contact_phone, script);
      if (result.sid) {
        callSid = result.sid;
        callCount++;
        console.log(`📞 Call placed to ${listing.address}: ${result.sid}`);
      } else if (result.error) {
        console.warn(`📞 Call failed for ${listing.address}: ${result.error}`);
      }
    }

    // Determine recommended action
    let actionRecommended = "email";
    if (listing.contact_phone) {
      actionRecommended = listing.score >= callThreshold ? "call+email" : "sms+email";
    }

    outreachData.push({
      listing_id: listing.id,
      address: listing.address,
      city: listing.city,
      zip: listing.zip,
      rent: listing.rent,
      beds: listing.beds,
      url: listing.url,
      contact_email: listing.contact_email,
      contact_phone: listing.contact_phone,
      mailto_link: mailto,
      sms_link: smsUri,
      message: email,
      sms_text: sms,
      voice_audio_path: voicePath || '',
      sms_sid: smsSid || '',
      call_sid: callSid || ''
    });
  }

  // Write CSV files
  console.log('\n📄 Writing output files...\n');

  const shortlistPath = path.join(__dirname, 'outputs/shortlist.csv');
  await writeCSV(shortlistPath, [
    'listing_id', 'address', 'city', 'zip', 'rent', 'beds', 'baths', 'sqft', 
    'url', 'contact_name', 'contact_email', 'contact_phone', 'score', 'reason', 'action_recommended'
  ], shortlist.map(listing => [
    listing.id, listing.address, listing.city, listing.zip, listing.rent,
    listing.beds, listing.baths, listing.sqft, listing.url, listing.contact_name,
    listing.contact_email, listing.contact_phone, listing.score, listing.reason,
    listing.contact_phone ? (listing.score >= callThreshold ? "call+email" : "sms+email") : "email"
  ]));

  const outreachPath = path.join(__dirname, 'outputs/outreach.csv');
  await writeCSV(outreachPath, [
    'listing_id', 'address', 'city', 'zip', 'rent', 'beds', 'url',
    'contact_email', 'contact_phone', 'mailto_link', 'sms_link', 'message',
    'sms_text', 'voice_audio_path', 'sms_sid', 'call_sid'
  ], outreachData.map(item => [
    item.listing_id, item.address, item.city, item.zip, item.rent, item.beds,
    item.url, item.contact_email, item.contact_phone, item.mailto_link,
    item.sms_link, item.message, item.sms_text, item.voice_audio_path,
    item.sms_sid, item.call_sid
  ]));

  // Print summary
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('📊 HOUSESCOUT AGENT SUMMARY');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log(`Data Source: ${dataSource}`);
  console.log(`Fetched: ${listings.length} listings`);
  console.log(`Filtered: ${filtered.length} matches`);
  console.log(`Shortlisted: ${shortlist.length} top candidates\n`);

  console.log('🎯 ACTIONS PERFORMED:');
  console.log(`📧 Outreach prepared: ${outreachData.length} listings`);
  if (flags.send) console.log(`📱 SMS sent: ${smsCount} messages`);
  if (flags.voice) console.log(`🎵 Voice files created: ${voiceCount} MP3s`);
  if (flags.callNow) console.log(`📞 Calls placed: ${callCount} calls`);
  console.log();

  console.log('🏆 TOP 3 RESULTS:');
  shortlist.slice(0, 3).forEach((listing, idx) => {
    console.log(`${idx + 1}. ${listing.address} — Score ${listing.score} — ${listing.reason}`);
  });
  console.log();

  console.log('📁 OUTPUT FILES:');
  console.log(`Shortlist: ${path.resolve(shortlistPath)}`);
  console.log(`Outreach:  ${path.resolve(outreachPath)}`);

  // Get file sizes
  try {
    const shortlistStats = await fs.stat(shortlistPath);
    const outreachStats = await fs.stat(outreachPath);
    console.log(`File sizes: ${shortlistStats.size} bytes, ${outreachStats.size} bytes`);
  } catch (error) {
    console.log('File sizes: Unable to determine');
  }

  console.log('\n✅ HouseScout Agent completed successfully!');
  
  if (!flags.live && !process.env.RENTCAST_API_KEY) {
    console.log('\n💡 NEXT STEPS:');
    console.log('• Add RENTCAST_API_KEY to .env and run with --live for real listings');
    if (!flags.send) console.log('• Add Twilio credentials and use --send to send SMS');
    if (!flags.voice) console.log('• Add ElevenLabs credentials and use --voice for MP3 voicemails');
    if (!flags.callNow) console.log('• Use --call-now to place actual voice calls');
  }

  process.exit(0);
}

// Handle errors
process.on('unhandledRejection', (error) => {
  console.error('❌ Unhandled error:', error.message);
  process.exit(1);
});

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}
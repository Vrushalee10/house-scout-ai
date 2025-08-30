// Geocoding utilities
interface Coordinates {
  lat: number;
  lon: number;
}

const geocodeCache = new Map<string, Coordinates>();

export const geocodeAddress = async (address: string): Promise<Coordinates | null> => {
  if (geocodeCache.has(address)) {
    return geocodeCache.get(address)!;
  }

  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1`,
      {
        headers: {
          'User-Agent': 'HouseScout-Agent/1.0'
        }
      }
    );
    
    if (!response.ok) throw new Error('Geocoding failed');
    
    const data = await response.json();
    if (data.length > 0) {
      const coords = { lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon) };
      geocodeCache.set(address, coords);
      return coords;
    }
  } catch (error) {
    console.error('Geocoding error:', error);
  }
  
  return null;
};

// Haversine distance calculation
export const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const R = 6371; // Earth's radius in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  const distance = R * c;
  return distance;
};

// Calculate walking and biking time estimates
export const calculateTravelTimes = (distanceKm: number) => {
  const walkingSpeedKmh = 5;
  const bikingSpeedKmh = 15;
  
  return {
    walkTime: Math.round((distanceKm / walkingSpeedKmh) * 60),
    bikeTime: Math.round((distanceKm / bikingSpeedKmh) * 60)
  };
};

// Enhanced query parsing
export const parseSearchQuery = (input: string) => {
  // Extract ZIP code or city
  const zipMatch = input.match(/\b(\d{5})\b/);
  const cityMatch = input.match(/\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\b/);
  
  // Extract rent
  const rentMatch = input.match(/under\s*\$?(\d+)/i);
  
  // Extract beds
  const bedMatch = input.match(/(\d+)\+?\s*bed/i);
  
  // Extract top N
  const topMatch = input.match(/top\s*(\d+)/i);
  
  // Extract move-in
  const moveInMatch = input.match(/move.?in\s+(\w+)/i);
  
  // Extract commute target
  const commuteMatch = input.match(/commute\s+([A-Z]{2,}|[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/i);
  
  // Extract preferences
  const petsMatch = input.match(/\bpets?\b/i);
  const furnishedMatch = input.match(/\bfurnished?\b/i);

  return {
    cityOrZip: zipMatch ? zipMatch[1] : (cityMatch ? cityMatch[1] : "02115"),
    maxRent: rentMatch ? parseInt(rentMatch[1]) : 2400,
    minBeds: bedMatch ? parseInt(bedMatch[1]) : 1,
    moveIn: moveInMatch ? moveInMatch[1] : "September",
    topN: topMatch ? parseInt(topMatch[1]) : 8,
    commuteTarget: commuteMatch ? commuteMatch[1] : null,
    pets: !!petsMatch,
    furnished: !!furnishedMatch
  };
};

// RentCast API integration
export const fetchLiveListings = async (params: any) => {
  const apiKey = import.meta.env.VITE_RENTCAST_API_KEY;
  if (!apiKey) {
    throw new Error('RentCast API key not configured');
  }

  const searchParams = new URLSearchParams({
    limit: '50',
    ...(params.cityOrZip.length === 5 ? { zipCode: params.cityOrZip } : { city: params.cityOrZip }),
    maxRent: params.maxRent.toString(),
    minBedrooms: params.minBeds.toString()
  });

  const response = await fetch(
    `https://api.rentcast.io/v1/listings/rental/long-term?${searchParams}`,
    {
      headers: {
        'X-Api-Key': apiKey
      }
    }
  );

  if (!response.ok) {
    throw new Error(`RentCast API error: ${response.status}`);
  }

  const data = await response.json();
  
  // Normalize the data structure
  return data.listings?.map((listing: any) => ({
    id: listing.id || `RC-${Math.random().toString(36).substr(2, 9)}`,
    address: listing.address || listing.formattedAddress,
    city: listing.city,
    state: listing.state,
    zip: listing.zipCode,
    rent: listing.price || listing.rent,
    beds: listing.bedrooms || listing.beds,
    baths: listing.bathrooms || listing.baths,
    sqft: listing.squareFootage || listing.sqft,
    url: listing.url,
    lastSeenDate: listing.listedDate || new Date().toISOString().split('T')[0],
    amenities: listing.amenities || [],
    contact_name: listing.contact?.name || "Property Manager",
    contact_email: listing.contact?.email || "",
    contact_phone: listing.contact?.phone || "",
    photoUrls: listing.photos || []
  })) || [];
};

// ElevenLabs TTS integration
export const synthesizeVoice = async (text: string, voiceId: string = "EXAVITQu4vr4xnSDxMaL") => {
  const apiKey = import.meta.env.VITE_ELEVENLABS_API_KEY;
  if (!apiKey) {
    throw new Error('ElevenLabs API key not configured');
  }

  const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
    method: 'POST',
    headers: {
      'Accept': 'audio/mpeg',
      'Content-Type': 'application/json',
      'xi-api-key': apiKey
    },
    body: JSON.stringify({
      text,
      model_id: "eleven_multilingual_v2",
      voice_settings: {
        stability: 0.5,
        similarity_boost: 0.5
      }
    })
  });

  if (!response.ok) {
    throw new Error(`ElevenLabs API error: ${response.status}`);
  }

  return response.blob();
};

// Twilio SMS integration
export const sendSMS = async (to: string, message: string) => {
  const accountSid = import.meta.env.VITE_TWILIO_ACCOUNT_SID;
  const authToken = import.meta.env.VITE_TWILIO_AUTH_TOKEN;
  const fromNumber = import.meta.env.VITE_TWILIO_FROM_NUMBER;

  if (!accountSid || !authToken || !fromNumber) {
    throw new Error('Twilio credentials not configured');
  }

  const formData = new FormData();
  formData.append('To', to);
  formData.append('From', fromNumber);
  formData.append('Body', message);

  const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${btoa(`${accountSid}:${authToken}`)}`
    },
    body: formData
  });

  if (!response.ok) {
    throw new Error(`Twilio API error: ${response.status}`);
  }

  return response.json();
};

// Twilio voice call integration
export const placeCall = async (to: string, script: string, mp3Url?: string) => {
  const accountSid = import.meta.env.VITE_TWILIO_ACCOUNT_SID;
  const authToken = import.meta.env.VITE_TWILIO_AUTH_TOKEN;
  const fromNumber = import.meta.env.VITE_TWILIO_FROM_NUMBER;

  if (!accountSid || !authToken || !fromNumber) {
    throw new Error('Twilio credentials not configured');
  }

  const twiml = mp3Url 
    ? `<Response><Play>${mp3Url}</Play></Response>`
    : `<Response><Say>${script}</Say></Response>`;

  const formData = new FormData();
  formData.append('To', to);
  formData.append('From', fromNumber);
  formData.append('Twiml', twiml);

  const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Calls.json`, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${btoa(`${accountSid}:${authToken}`)}`
    },
    body: formData
  });

  if (!response.ok) {
    throw new Error(`Twilio API error: ${response.status}`);
  }

  return response.json();
};
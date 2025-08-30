import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Home, Phone, Mail, MessageSquare, Play, Download, Settings } from "lucide-react";

// Mock listings data (same as agent.mjs)
const mockListings = [
  {"id":"BOS-101","address":"12 Park Dr","city":"Boston","state":"MA","zip":"02115","rent":2300,"beds":1,"baths":1,"sqft":620,"url":"https://example.com/l/101","lastSeenDate":"2025-08-28","amenities":["laundry","furnished"],"contact_name":"Ava Lee","contact_email":"ava@broker.com","contact_phone":"+1-617-555-1010"},
  {"id":"BOS-103","address":"401 Huntington Ave","city":"Boston","state":"MA","zip":"02115","rent":2000,"beds":1,"baths":1,"sqft":540,"url":"https://example.com/l/103","lastSeenDate":"2025-08-29","amenities":["laundry","pets"],"contact_name":"Maya Patel","contact_email":"maya@listings.co","contact_phone":"+1-617-555-1030"},
  {"id":"BOS-105","address":"1300 Commonwealth Ave","city":"Boston","state":"MA","zip":"02134","rent":2100,"beds":1,"baths":1,"sqft":600,"url":"https://example.com/l/105","lastSeenDate":"2025-08-23","amenities":["laundry","parking","pets"],"contact_name":"Sara Chen","contact_email":"sara@rentals.io","contact_phone":"+1-617-555-1050"},
  {"id":"BOS-109","address":"45 Hemenway St","city":"Boston","state":"MA","zip":"02115","rent":2400,"beds":2,"baths":1,"sqft":700,"url":"https://example.com/l/109","lastSeenDate":"2025-08-27","amenities":["laundry"],"contact_name":"Ruby Shaw","contact_email":"ruby@homes.io","contact_phone":"+1-617-555-1090"},
  {"id":"BOS-111","address":"33 St Stephen St","city":"Boston","state":"MA","zip":"02115","rent":1800,"beds":0,"baths":1,"sqft":420,"url":"https://example.com/l/111","lastSeenDate":"2025-08-28","amenities":["laundry"],"contact_name":"Kayla Green","contact_email":"kayla@rentright.com","contact_phone":"+1-617-555-1110"},
  {"id":"BOS-113","address":"1600 Washington St","city":"Boston","state":"MA","zip":"02118","rent":2350,"beds":1,"baths":1,"sqft":610,"url":"https://example.com/l/113","lastSeenDate":"2025-08-22","amenities":["laundry","pets"],"contact_name":"Zara Ali","contact_email":"","contact_phone":"+1-617-555-1130"},
  {"id":"BOS-114","address":"221 Longwood Ave","city":"Boston","state":"MA","zip":"02115","rent":2700,"beds":2,"baths":1,"sqft":780,"url":"https://example.com/l/114","lastSeenDate":"2025-08-17","amenities":["laundry","furnished"],"contact_name":"Ben Carter","contact_email":"ben@listingshub.com","contact_phone":"+1-617-555-1140"}
];

const Index = () => {
  const [query, setQuery] = useState("02115 under $2400 1+ beds; top 8; outreach");
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [customCriteria, setCustomCriteria] = useState({
    cityZip: "02115",
    maxRent: "2400",
    minBeds: "1",
    topN: "8"
  });

  // Parse natural language query (simplified version)
  const parseQuery = (input: string) => {
    const zipMatch = input.match(/\b(\d{5})\b/);
    const rentMatch = input.match(/under\s*\$?(\d+)/i);
    const bedMatch = input.match(/(\d+)\+?\s*bed/i);
    const topMatch = input.match(/top\s*(\d+)/i);

    return {
      zip: zipMatch ? zipMatch[1] : "02115",
      maxRent: rentMatch ? parseInt(rentMatch[1]) : 2400,
      minBeds: bedMatch ? parseInt(bedMatch[1]) : 1,
      topN: topMatch ? parseInt(topMatch[1]) : 8
    };
  };

  // Score listing (simplified version)
  const scoreListing = (listing: any, params: any) => {
    let score = 0;
    let reasons = [];

    // Budget fit (0-60)
    if (listing.rent <= params.maxRent) {
      score += 60;
      reasons.push("within budget");
    } else if (listing.rent <= params.maxRent * 1.3) {
      const budgetScore = Math.round(60 * (params.maxRent * 1.3 - listing.rent) / (params.maxRent * 0.3));
      score += budgetScore;
      reasons.push(`${Math.round((listing.rent - params.maxRent) / params.maxRent * 100)}% over budget`);
    }

    // Beds fit (0-30)
    if (listing.beds >= params.minBeds) {
      score += 30;
      reasons.push(`${listing.beds} beds`);
    }

    // Freshness (0-10)
    const daysDiff = Math.floor((new Date().getTime() - new Date(listing.lastSeenDate).getTime()) / (1000 * 60 * 60 * 24));
    if (daysDiff <= 1) {
      score += 10;
      reasons.push("fresh");
    } else if (daysDiff <= 7) {
      score += Math.round(10 * (7 - daysDiff) / 6);
      reasons.push(`${daysDiff}d old`);
    }

    return { score: Math.min(100, score), reason: reasons.join(", ") };
  };

  const generateEmail = (listing: any) => {
    return `Hi ${listing.contact_name},\n\nI'm interested in your ${listing.beds}-bedroom apartment at ${listing.address} listed at $${listing.rent}/month. I'm looking to move in September with a budget of up to $2400.\n\nWould it be possible to schedule a viewing? I'm flexible with timing and have all documentation ready.\n\nBest regards,\n[Your name]`;
  };

  const generateSms = (listing: any) => {
    return `Hi! Interested in your ${listing.beds}BR at ${listing.address} ($${listing.rent}). Tour available? Budget $2400. Thanks!`;
  };

  const runQuickPick = (queryString: string) => {
    setQuery(queryString);
    setLoading(true);
    
    setTimeout(() => {
      const params = parseQuery(queryString);
      
      // Filter and score listings
      const filtered = mockListings.filter(listing => 
        listing.zip.includes(params.zip.substring(0, 3)) && 
        listing.rent <= params.maxRent * 1.3 &&
        listing.beds >= (params.minBeds === 0 ? 0 : params.minBeds)
      );

      const scored = filtered.map(listing => {
        const result = scoreListing(listing, params);
        return { ...listing, ...result };
      }).sort((a, b) => b.score - a.score);

      setResults(scored.slice(0, params.topN));
      setLoading(false);
    }, 1500);
  };

  const handleCustomSearch = () => {
    const queryString = `${customCriteria.cityZip} under $${customCriteria.maxRent}, ${customCriteria.minBeds}+ beds; top ${customCriteria.topN}; outreach`;
    runQuickPick(queryString);
    setModalOpen(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-secondary/20">
      {/* Header */}
      <div className="bg-card/80 backdrop-blur-sm border-b">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center gap-3 mb-2">
            <Home className="w-8 h-8 text-primary" />
            <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              HouseScout Agent
            </h1>
          </div>
          <p className="text-muted-foreground">AI-powered rental property search with automated outreach</p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold mb-4">
            Spend time touring, not typing.
          </h1>
          <p className="text-xl text-muted-foreground mb-8">
            We find the best fits and write the first hello for you.
          </p>
          
          {/* Primary CTAs */}
          <div className="flex justify-center gap-4 mb-8">
            <Button size="lg" onClick={() => runQuickPick("02115 under $2400, 1+ beds; top 8; outreach")}>
              Get my top picks
            </Button>
            <Button size="lg" variant="outline" onClick={() => runQuickPick("02115 under $2400, 1+ beds; top 8; outreach")}>
              Prep my messages
            </Button>
            <Button size="lg" variant="secondary" onClick={() => runQuickPick("02115 under $2400, 1+ beds; top 8; outreach")}>
              Make a voicemail
            </Button>
          </div>

          {/* Quick Pick Buttons */}
          <div className="space-y-4 mb-8">
            <h3 className="font-semibold text-lg">Quick Picks</h3>
            <div className="grid md:grid-cols-3 gap-4">
              <Button 
                variant="outline" 
                className="h-auto p-4 text-left flex-col items-start space-y-1"
                onClick={() => runQuickPick("02115 under $2400, 1+ beds; top 8; outreach")}
                disabled={loading}
              >
                <div className="font-medium">Boston • ≤ $2400 • 1+ beds • Top 8</div>
              </Button>
              <Button 
                variant="outline" 
                className="h-auto p-4 text-left flex-col items-start space-y-1"
                onClick={() => runQuickPick("95112 under $2200, 0+ beds; top 8; outreach")}
                disabled={loading}
              >
                <div className="font-medium">San Jose 95112 • ≤ $2200 • Studios OK • Top 8</div>
              </Button>
              <Button 
                variant="outline" 
                className="h-auto p-4 text-left flex-col items-start space-y-1"
                onClick={() => runQuickPick("78705 under $1800, 1+ beds; top 10; outreach")}
                disabled={loading}
              >
                <div className="font-medium">Austin 78705 • ≤ $1800 • Roommate OK • Top 10</div>
              </Button>
            </div>
          </div>

          {/* Change Criteria Link */}
          <Dialog open={modalOpen} onOpenChange={setModalOpen}>
            <DialogTrigger asChild>
              <Button variant="ghost" size="sm">
                <Settings className="w-4 h-4 mr-2" />
                Change criteria
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Custom Search Criteria</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="cityZip">City/ZIP</Label>
                  <Input
                    id="cityZip"
                    value={customCriteria.cityZip}
                    onChange={(e) => setCustomCriteria({...customCriteria, cityZip: e.target.value})}
                  />
                </div>
                <div>
                  <Label htmlFor="maxRent">Max Rent</Label>
                  <Input
                    id="maxRent"
                    type="number"
                    value={customCriteria.maxRent}
                    onChange={(e) => setCustomCriteria({...customCriteria, maxRent: e.target.value})}
                  />
                </div>
                <div>
                  <Label htmlFor="minBeds">Min Beds</Label>
                  <Input
                    id="minBeds"
                    type="number"
                    value={customCriteria.minBeds}
                    onChange={(e) => setCustomCriteria({...customCriteria, minBeds: e.target.value})}
                  />
                </div>
                <div>
                  <Label htmlFor="topN">Top N Results</Label>
                  <Input
                    id="topN"
                    type="number"
                    value={customCriteria.topN}
                    onChange={(e) => setCustomCriteria({...customCriteria, topN: e.target.value})}
                  />
                </div>
                <Button onClick={handleCustomSearch} className="w-full">
                  Search
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          {/* Badges */}
          <div className="flex justify-center flex-wrap gap-2 mt-8">
            <Badge variant="secondary">Mock Data Mode</Badge>
            <Badge variant="outline">Smart Scoring</Badge>
            <Badge variant="outline">Multi-Channel Outreach</Badge>
          </div>
        </div>

        {loading && (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            <p className="mt-4 text-muted-foreground">Finding your perfect matches...</p>
          </div>
        )}

        {/* Results */}
        {results.length > 0 && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-semibold">Search Results ({results.length})</h2>
              <div className="flex gap-2">
                <Button variant="outline" size="sm">
                  <Download className="w-4 h-4 mr-2" />
                  Export CSV
                </Button>
              </div>
            </div>

            <div className="grid gap-6">
              {results.map((listing, idx) => (
                <Card key={listing.id} className="overflow-hidden">
                  <CardHeader className="pb-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-lg">{listing.address}</CardTitle>
                        <p className="text-muted-foreground">{listing.city}, {listing.state} {listing.zip}</p>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-primary">${listing.rent}</div>
                        <Badge variant={listing.score >= 80 ? "default" : listing.score >= 60 ? "secondary" : "outline"}>
                          Score: {listing.score}
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>
                  
                  <CardContent>
                    <div className="grid md:grid-cols-3 gap-6">
                      {/* Property Details */}
                      <div className="space-y-3">
                        <h4 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">Property Details</h4>
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <span>Beds/Baths:</span>
                            <span className="font-medium">{listing.beds}BR / {listing.baths}BA</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Square Feet:</span>
                            <span className="font-medium">{listing.sqft} sq ft</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Score Reason:</span>
                            <span className="font-medium text-sm">{listing.reason}</span>
                          </div>
                        </div>
                        {listing.amenities.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-3">
                            {listing.amenities.map((amenity: string) => (
                              <Badge key={amenity} variant="secondary" className="text-xs">{amenity}</Badge>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Contact Info */}
                      <div className="space-y-3">
                        <h4 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">Contact</h4>
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{listing.contact_name}</span>
                          </div>
                          {listing.contact_email && (
                            <div className="flex items-center gap-2 text-sm">
                              <Mail className="w-4 h-4" />
                              <span>{listing.contact_email}</span>
                            </div>
                          )}
                          {listing.contact_phone && (
                            <div className="flex items-center gap-2 text-sm">
                              <Phone className="w-4 h-4" />
                              <span>{listing.contact_phone}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Generated Outreach */}
                      <div className="space-y-3">
                        <h4 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">AI-Generated Outreach</h4>
                        <div className="space-y-2">
                          <Button variant="outline" size="sm" className="w-full justify-start">
                            <Mail className="w-4 h-4 mr-2" />
                            View Email Draft
                          </Button>
                          {listing.contact_phone && (
                            <>
                              <Button variant="outline" size="sm" className="w-full justify-start">
                                <MessageSquare className="w-4 h-4 mr-2" />
                                View SMS Draft
                              </Button>
                              <Button variant="outline" size="sm" className="w-full justify-start">
                                <Play className="w-4 h-4 mr-2" />
                                Voice Script
                              </Button>
                            </>
                          )}
                        </div>
                        
                        {/* Sample outreach preview */}
                        <div className="mt-4 p-3 bg-muted/50 rounded-lg">
                          <p className="text-xs text-muted-foreground mb-2">SMS Preview:</p>
                          <p className="text-sm">{generateSms(listing)}</p>
                        </div>
                      </div>
                    </div>
                    
                    <Separator className="my-4" />
                    
                    <div className="flex items-center justify-between text-sm text-muted-foreground">
                      <span>Rank #{idx + 1} of {results.length}</span>
                      <span>Last seen: {listing.lastSeenDate}</span>
                      <Badge variant={listing.score >= 75 ? "default" : "secondary"}>
                        {listing.score >= 75 ? "Call Recommended" : "Email/SMS"}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* CLI Instructions */}
            <Card className="mt-8">
              <CardHeader>
                <CardTitle>🚀 Run the Full CLI Agent</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <p className="text-muted-foreground">
                    This web demo shows the core functionality. For full features including live API data, SMS sending, and voice calls, use the CLI:
                  </p>
                  <div className="bg-muted p-4 rounded-lg font-mono text-sm">
                    <div className="space-y-2">
                      <div># Basic demo with mock data</div>
                      <div className="text-primary">node agent.mjs "02115 under $2400 1+ beds; top 8; outreach"</div>
                      <div className="mt-4"># With live data and SMS/voice</div>
                      <div className="text-primary">node agent.mjs "Boston under $2500" --live --send --voice</div>
                    </div>
                  </div>
                  <div className="grid md:grid-cols-3 gap-4 mt-6">
                    <div className="p-4 border rounded-lg">
                      <h4 className="font-semibold mb-2">🏠 RentCast API</h4>
                      <p className="text-sm text-muted-foreground">Live rental listings from RentCast.io free tier</p>
                    </div>
                    <div className="p-4 border rounded-lg">
                      <h4 className="font-semibold mb-2">📱 Twilio SMS/Voice</h4>
                      <p className="text-sm text-muted-foreground">Send SMS and place voice calls automatically</p>
                    </div>
                    <div className="p-4 border rounded-lg">
                      <h4 className="font-semibold mb-2">🎵 ElevenLabs TTS</h4>
                      <p className="text-sm text-muted-foreground">Generate MP3 voicemails with AI voices</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Getting Started */}
        {results.length === 0 && !loading && (
          <div className="grid md:grid-cols-2 gap-8">
            <Card>
              <CardHeader>
                <CardTitle>🤖 How It Works</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">1</div>
                    <div>
                      <p className="font-medium">Parse Natural Language</p>
                      <p className="text-sm text-muted-foreground">Extract location, budget, bedroom requirements</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">2</div>
                    <div>
                      <p className="font-medium">Smart Scoring</p>
                      <p className="text-sm text-muted-foreground">Rank by budget fit, bedroom match, and freshness</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">3</div>
                    <div>
                      <p className="font-medium">Generate Outreach</p>
                      <p className="text-sm text-muted-foreground">Create personalized emails, SMS, and call scripts</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">4</div>
                    <div>
                      <p className="font-medium">Export & Execute</p>
                      <p className="text-sm text-muted-foreground">Save to CSV or send SMS/voice automatically</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>📝 Example Queries</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="p-3 bg-muted/50 rounded-lg cursor-pointer hover:bg-muted/70 transition-colors"
                       onClick={() => setQuery("Boston under $2500, 1+ beds")}>
                    <code className="text-sm">Boston under $2500, 1+ beds</code>
                  </div>
                  <div className="p-3 bg-muted/50 rounded-lg cursor-pointer hover:bg-muted/70 transition-colors"
                       onClick={() => setQuery("02115 under $2400, 2+ beds; top 5")}>
                    <code className="text-sm">02115 under $2400, 2+ beds; top 5</code>
                  </div>
                  <div className="p-3 bg-muted/50 rounded-lg cursor-pointer hover:bg-muted/70 transition-colors"
                       onClick={() => setQuery("Cambridge under $3000, 1+ beds; September")}>
                    <code className="text-sm">Cambridge under $3000, 1+ beds; September</code>
                  </div>
                  <div className="p-3 bg-muted/50 rounded-lg cursor-pointer hover:bg-muted/70 transition-colors"
                       onClick={() => setQuery("Find rentals near 02115 under $2400; outreach")}>
                    <code className="text-sm">Find rentals near 02115 under $2400; outreach</code>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
        
        {/* Footer Micro-note */}
        <div className="text-center text-sm text-muted-foreground mt-16 mb-8">
          We prepare 1-to-1 outreach. You approve every send.
        </div>
      </div>
    </div>
  );
};

export default Index;

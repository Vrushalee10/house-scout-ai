import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Home, Download, Settings } from "lucide-react";
import { SearchBar } from "@/components/SearchBar";
import { OutreachStudio } from "@/components/OutreachStudio";
import { EnhancedResultCard } from "@/components/EnhancedResultCard";
import { parseSearchQuery, geocodeAddress, calculateDistance, calculateTravelTimes, fetchLiveListings } from "@/utils/apiUtils";

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
  const { toast } = useToast();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [outreachStudioOpen, setOutreachStudioOpen] = useState(false);
  const [selectedListing, setSelectedListing] = useState<any>(null);
  const [outreachTab, setOutreachTab] = useState<"email" | "sms" | "voicemail">("email");
  const [searchCriteria, setSearchCriteria] = useState<any>(null);
  const [commuteCoords, setCommuteCoords] = useState<{lat: number; lon: number} | null>(null);
  const [customCriteria, setCustomCriteria] = useState({
    cityZip: "02115",
    maxRent: "2400",
    minBeds: "1",
    topN: "8"
  });

  // Geocode commute target when criteria changes
  useEffect(() => {
    const geocodeCommute = async () => {
      if (searchCriteria?.commuteTarget) {
        try {
          const coords = await geocodeAddress(searchCriteria.commuteTarget);
          setCommuteCoords(coords);
        } catch (error) {
          console.error('Failed to geocode commute target:', error);
        }
      }
    };
    
    geocodeCommute();
  }, [searchCriteria?.commuteTarget]);

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

  // Calculate distance info for listings
  const calculateDistanceInfo = async (listing: any) => {
    if (!commuteCoords || !searchCriteria?.commuteTarget) return null;
    
    try {
      const listingCoords = await geocodeAddress(`${listing.address}, ${listing.city}, ${listing.state}`);
      if (!listingCoords) return null;
      
      const distance = calculateDistance(
        commuteCoords.lat, 
        commuteCoords.lon, 
        listingCoords.lat, 
        listingCoords.lon
      );
      
      const { walkTime, bikeTime } = calculateTravelTimes(distance);
      
      return {
        distance,
        walkTime,
        bikeTime,
        commuteTarget: searchCriteria.commuteTarget
      };
    } catch (error) {
      console.error('Failed to calculate distance:', error);
      return null;
    }
  };

  const runSearch = async (queryString: string) => {
    setQuery(queryString);
    setLoading(true);
    
    try {
      const criteria = parseSearchQuery(queryString);
      setSearchCriteria(criteria);
      
      let listings = mockListings; // Default to mock data
      
      // Try to fetch live data if available
      try {
        listings = await fetchLiveListings(criteria);
        toast({
          title: "Live data loaded",
          description: `Found ${listings.length} live listings`,
        });
      } catch (error) {
        console.log('Live data unavailable, using mock data');
        toast({
          title: "Using mock data", 
          description: "Add RENTCAST_API_KEY for live listings",
        });
      }
      
      // Filter and score listings
      const filtered = listings.filter(listing => {
        const zipMatch = criteria.cityOrZip.length === 5 
          ? listing.zip?.includes(criteria.cityOrZip.substring(0, 3))
          : listing.city?.toLowerCase().includes(criteria.cityOrZip.toLowerCase());
        
        return zipMatch && 
               listing.rent <= criteria.maxRent * 1.3 &&
               listing.beds >= (criteria.minBeds === 0 ? 0 : criteria.minBeds);
      });

      const scored = filtered.map(listing => {
        const result = scoreListing(listing, criteria);
        return { ...listing, ...result };
      }).sort((a, b) => b.score - a.score);

      setResults(scored.slice(0, criteria.topN));
      
      // Print demo script to console
      console.log(`Search parsed: ${criteria.cityOrZip}, $${criteria.maxRent}, ${criteria.minBeds}+ beds, Top ${criteria.topN}, Move-in ${criteria.moveIn}${criteria.commuteTarget ? `, Commute ${criteria.commuteTarget}` : ''}`);
      console.log(`Top 3 results:`, scored.slice(0, 3).map(l => `${l.address} - Score ${l.score} - ${l.reason}`));
      console.log("Open Outreach Studio → Email tab → edit → send (mailto)");
      console.log("Switch to SMS → copy/send");  
      console.log("Switch to Voicemail → Generate MP3 (if keys) → Place call (if keys)");
      
    } catch (error) {
      console.error('Search error:', error);
      toast({
        title: "Search failed",
        description: "Please try again",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCustomSearch = () => {
    const queryString = `${customCriteria.cityZip} under $${customCriteria.maxRent}, ${customCriteria.minBeds}+ beds; top ${customCriteria.topN}; outreach`;
    runSearch(queryString);
    setModalOpen(false);
  };

  const handleOutreachClick = (listing: any, tab: "email" | "sms" | "voicemail") => {
    setSelectedListing(listing);
    setOutreachTab(tab);
    setOutreachStudioOpen(true);
  };

  const handlePrimaryAction = (action: string) => {
    switch (action) {
      case 'picks':
        runSearch("02115 under $2400, 1+ beds; top 8; outreach");
        break;
      case 'messages':
        if (results.length > 0) {
          handleOutreachClick(results[0], "email");
        } else {
          runSearch("02115 under $2400, 1+ beds; top 8; outreach");
        }
        break;
      case 'voicemail':
        if (results.length > 0) {
          handleOutreachClick(results[0], "voicemail");
        } else {
          runSearch("02115 under $2400, 1+ beds; top 8; outreach");
        }
        break;
    }
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
            <Button size="lg" onClick={() => handlePrimaryAction('picks')}>
              Get my top picks
            </Button>
            <Button size="lg" variant="outline" onClick={() => handlePrimaryAction('messages')}>
              Prep my messages
            </Button>
            <Button size="lg" variant="secondary" onClick={() => handlePrimaryAction('voicemail')}>
              Make a voicemail
            </Button>
          </div>

          {/* Search Bar */}
          <SearchBar onSearch={runSearch} loading={loading} />

          {/* Quick Pick Buttons */}
          <div className="space-y-4 mb-8">
            <h3 className="font-semibold text-lg">Quick Picks</h3>
            <div className="grid md:grid-cols-3 gap-4">
              <Button 
                variant="outline" 
                className="h-auto p-4 text-left flex-col items-start space-y-1"
                onClick={() => runSearch("02115 under $2400, 1+ beds; top 8; outreach")}
                disabled={loading}
              >
                <div className="font-medium">Boston • ≤ $2400 • 1+ beds • Top 8</div>
              </Button>
              <Button 
                variant="outline" 
                className="h-auto p-4 text-left flex-col items-start space-y-1"
                onClick={() => runSearch("95112 under $2200, 0+ beds; top 8; outreach")}
                disabled={loading}
              >
                <div className="font-medium">San Jose 95112 • ≤ $2200 • Studios OK • Top 8</div>
              </Button>
              <Button 
                variant="outline" 
                className="h-auto p-4 text-left flex-col items-start space-y-1"
                onClick={() => runSearch("78705 under $1800, 1+ beds; top 10; outreach")}
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
              <div>
                <h2 className="text-2xl font-semibold">Search Results ({results.length})</h2>
                {searchCriteria && (
                  <p className="text-muted-foreground mt-1">
                    {searchCriteria.cityOrZip} • ≤ ${searchCriteria.maxRent} • {searchCriteria.minBeds}+ beds • Top {searchCriteria.topN}
                    {searchCriteria.commuteTarget && ` • Commute ${searchCriteria.commuteTarget}`}
                  </p>
                )}
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm">
                  <Download className="w-4 h-4 mr-2" />
                  Export CSV
                </Button>
              </div>
            </div>

            <div className="grid gap-6">
              {results.map(listing => (
                <EnhancedResultCard
                  key={listing.id}
                  listing={listing}
                  onOutreachClick={handleOutreachClick}
                />
              ))}
            </div>
          </div>
        )}

        {/* Outreach Studio */}
        {selectedListing && (
          <OutreachStudio
            isOpen={outreachStudioOpen}
            onClose={() => setOutreachStudioOpen(false)}
            listing={selectedListing}
            initialTab={outreachTab}
          />
        )}

        {/* Footer */}
        <footer className="mt-16 py-8 text-center">
          <p className="text-sm text-muted-foreground">
            We prepare 1-to-1 outreach. You approve every send.
          </p>
        </footer>
      </div>
    </div>
  );
};

export default Index;

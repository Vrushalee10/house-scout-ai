import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Mail, MessageSquare, Phone, ExternalLink, MapPin, Navigation, Clock } from "lucide-react";

interface EnhancedResultCardProps {
  listing: any;
  onOutreachClick: (listing: any, tab: "email" | "sms" | "voicemail") => void;
  distanceInfo?: {
    distance: number;
    walkTime: number;
    bikeTime: number;
    commuteTarget: string;
  };
}

export const EnhancedResultCard = ({ listing, onOutreachClick, distanceInfo }: EnhancedResultCardProps) => {
  const [imageError, setImageError] = useState(false);

  const openGoogleMaps = () => {
    const address = encodeURIComponent(`${listing.address}, ${listing.city}, ${listing.state} ${listing.zip}`);
    window.open(`https://www.google.com/maps?q=${address}`);
  };

  const openStreetView = () => {
    const address = encodeURIComponent(`${listing.address}, ${listing.city}, ${listing.state} ${listing.zip}`);
    window.open(`https://www.google.com/maps?q=${address}&layer=c`);
  };

  const openDirections = (mode: string) => {
    const address = encodeURIComponent(`${listing.address}, ${listing.city}, ${listing.state} ${listing.zip}`);
    const destination = encodeURIComponent(distanceInfo?.commuteTarget || "");
    window.open(`https://www.google.com/maps/dir/${destination}/${address}/?travelmode=${mode}`);
  };

  const formatAmenity = (amenity: string) => {
    switch (amenity.toLowerCase()) {
      case 'laundry':
        return 'Laundry (in-building)';
      case 'parking':
        return 'Parking available';
      case 'pets':
        return 'Pets allowed';
      case 'furnished':
        return 'Furnished';
      default:
        return amenity;
    }
  };

  const isIdealForStudents = distanceInfo && distanceInfo.distance <= 3;

  return (
    <Card className="card-interactive overflow-hidden">
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-lg text-foreground">{listing.address}</CardTitle>
            <p className="text-muted-foreground">{listing.city}, {listing.state} {listing.zip}</p>
            {isIdealForStudents && (
              <Badge variant="secondary" className="badge-interactive mt-1">
                Ideal for students
              </Badge>
            )}
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-primary">${listing.rent}</div>
            <Badge 
              variant={listing.score >= 80 ? "default" : listing.score >= 60 ? "secondary" : "outline"}
              className="badge-interactive"
            >
              Score: {listing.score}
            </Badge>
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        <div className="grid lg:grid-cols-4 gap-6">
          {/* Photo/Maps Section */}
          <div className="space-y-3">
            <h4 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">Photos & Maps</h4>
            
            {listing.photoUrls && listing.photoUrls.length > 0 && !imageError ? (
              <div className="aspect-square rounded-lg overflow-hidden">
                <img 
                  src={listing.photoUrls[0]}
                  alt={`${listing.address} photo`}
                  className="w-full h-full object-cover"
                  onError={() => setImageError(true)}
                />
              </div>
            ) : (
              <div className="aspect-square bg-muted rounded-lg flex items-center justify-center">
                <MapPin className="w-8 h-8 text-muted-foreground" />
              </div>
            )}
            
            <div className="space-y-2">
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full transition-all duration-200 hover:bg-accent/20" 
                onClick={openGoogleMaps}
              >
                <MapPin className="w-4 h-4 mr-2" />
                Google Maps
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full transition-all duration-200 hover:bg-accent/20" 
                onClick={openStreetView}
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                Street View
              </Button>
            </div>
          </div>

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
              <div className="space-y-2">
                <div className="text-sm font-medium">Amenities</div>
                <div className="space-y-1">
                  {listing.amenities.map((amenity: string) => (
                    <div key={amenity} className="text-sm">
                      {formatAmenity(amenity)}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {listing.url && (
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full transition-all duration-200 hover:bg-primary/10 hover:border-primary" 
                onClick={() => window.open(listing.url)}  
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                View Full Listing
              </Button>
            )}
          </div>

          {/* Distance & Commute */}
          {distanceInfo && (
            <div className="space-y-3">
              <h4 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">
                Distance to {distanceInfo.commuteTarget}
              </h4>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Distance:</span>
                  <span className="font-medium">{distanceInfo.distance.toFixed(1)} km</span>
                </div>
                <div className="flex justify-between">
                  <span>Walk time:</span>
                  <span className="font-medium">{distanceInfo.walkTime} min</span>
                </div>
                <div className="flex justify-between">
                  <span>Bike time:</span>
                  <span className="font-medium">{distanceInfo.bikeTime} min</span>
                </div>
              </div>
              
              <div className="space-y-1">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full transition-all duration-200 hover:bg-accent/20" 
                  onClick={() => openDirections('driving')}
                >
                  <Navigation className="w-4 h-4 mr-2" />
                  Drive
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full transition-all duration-200 hover:bg-accent/20" 
                  onClick={() => openDirections('transit')}
                >
                  <Clock className="w-4 h-4 mr-2" />
                  Transit
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full transition-all duration-200 hover:bg-accent/20" 
                  onClick={() => openDirections('walking')}
                >
                  <Navigation className="w-4 h-4 mr-2" />
                  Walk
                </Button>
              </div>
            </div>
          )}

          {/* AI Outreach */}
          <div className="space-y-3">
            <h4 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">AI Outreach</h4>
            <div className="space-y-2">
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full justify-start transition-all duration-200 hover:bg-blue-50 hover:border-primary hover:text-primary"
                onClick={() => onOutreachClick(listing, "email")}
              >
                <Mail className="w-4 h-4 mr-2" />
                Email
              </Button>
              {listing.contact_phone && (
                <>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="w-full justify-start transition-all duration-200 hover:bg-green-50 hover:border-green-500 hover:text-green-700"
                    onClick={() => onOutreachClick(listing, "sms")}
                  >
                    <MessageSquare className="w-4 h-4 mr-2" />
                    SMS
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="w-full justify-start transition-all duration-200 hover:bg-purple-50 hover:border-purple-500 hover:text-purple-700"
                    onClick={() => onOutreachClick(listing, "voicemail")}
                  >
                    <Phone className="w-4 h-4 mr-2" />
                    Voicemail
                  </Button>
                </>
              )}
            </div>

            {/* Contact Info */}
            <div className="pt-2 border-t">
              <div className="text-xs text-muted-foreground space-y-1">
                <div className="font-medium">{listing.contact_name}</div>
                {listing.contact_email && (
                  <div className="truncate">{listing.contact_email}</div>
                )}
                {listing.contact_phone && (
                  <div>{listing.contact_phone}</div>
                )}
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
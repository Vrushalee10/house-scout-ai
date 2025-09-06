import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { 
  MessageSquare, 
  Heart, 
  Trash2, 
  Clock, 
  MapPin,
  DollarSign,
  Bed,
  Star,
  BookmarkPlus,
  History
} from "lucide-react";

interface SearchHistory {
  id: string;
  query: string;
  timestamp: Date;
  resultCount: number;
}

interface SavedProperty {
  id: string;
  address: string;
  city: string;
  state: string;
  rent: number;
  beds: number;
  score: number;
  savedAt: Date;
}

interface ChatSidebarProps {
  searchHistory: SearchHistory[];
  savedProperties: SavedProperty[];
  onSelectHistory: (query: string) => void;
  onRemoveHistory: (id: string) => void;
  onRemoveSaved: (id: string) => void;
  onSelectProperty: (property: SavedProperty) => void;
}

export const ChatSidebar = ({ 
  searchHistory, 
  savedProperties, 
  onSelectHistory, 
  onRemoveHistory, 
  onRemoveSaved,
  onSelectProperty 
}: ChatSidebarProps) => {
  const [activeTab, setActiveTab] = useState<'history' | 'saved'>('history');

  const formatTimeAgo = (date: Date) => {
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return `${Math.floor(diffInMinutes / 1440)}d ago`;
  };

  return (
    <Card className="h-full bg-card/95 backdrop-blur-sm border-r">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-primary" />
          <CardTitle className="text-lg">Search Hub</CardTitle>
        </div>
        
        <div className="flex gap-1 mt-2">
          <Button
            variant={activeTab === 'history' ? 'default' : 'ghost'}
            size="sm"
            className="flex-1 h-8"
            onClick={() => setActiveTab('history')}
          >
            <History className="w-4 h-4 mr-1" />
            History
          </Button>
          <Button
            variant={activeTab === 'saved' ? 'default' : 'ghost'}
            size="sm"
            className="flex-1 h-8"
            onClick={() => setActiveTab('saved')}
          >
            <Heart className="w-4 h-4 mr-1" />
            Saved
          </Button>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        <ScrollArea className="h-[calc(100vh-200px)]">
          {activeTab === 'history' && (
            <div className="p-4 space-y-3">
              {searchHistory.length === 0 ? (
                <div className="text-center text-muted-foreground py-8">
                  <History className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No search history yet</p>
                  <p className="text-xs">Your searches will appear here</p>
                </div>
              ) : (
                searchHistory.map((search) => (
                  <Card 
                    key={search.id} 
                    className="p-3 hover:bg-accent/50 cursor-pointer transition-all duration-200 group"
                    onClick={() => onSelectHistory(search.query)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate group-hover:text-primary">
                          {search.query}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs text-muted-foreground">
                            {search.resultCount} results
                          </span>
                          <span className="text-xs text-muted-foreground">•</span>
                          <span className="text-xs text-muted-foreground">
                            {formatTimeAgo(search.timestamp)}
                          </span>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="opacity-0 group-hover:opacity-100 h-6 w-6 p-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          onRemoveHistory(search.id);
                        }}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </Card>
                ))
              )}
            </div>
          )}

          {activeTab === 'saved' && (
            <div className="p-4 space-y-3">
              {savedProperties.length === 0 ? (
                <div className="text-center text-muted-foreground py-8">
                  <Heart className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No saved properties</p>
                  <p className="text-xs">Click the heart icon on listings to save them</p>
                </div>
              ) : (
                savedProperties.map((property) => (
                  <Card 
                    key={property.id} 
                    className="p-3 hover:bg-accent/50 cursor-pointer transition-all duration-200 group"
                    onClick={() => onSelectProperty(property)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate group-hover:text-primary">
                          {property.address}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {property.city}, {property.state}
                        </p>
                        <div className="flex items-center gap-3 mt-2">
                          <Badge variant="secondary" className="text-xs px-2 py-0">
                            <DollarSign className="w-3 h-3 mr-1" />
                            ${property.rent}
                          </Badge>
                          <Badge variant="outline" className="text-xs px-2 py-0">
                            <Bed className="w-3 h-3 mr-1" />
                            {property.beds}BR
                          </Badge>
                          <Badge variant="outline" className="text-xs px-2 py-0">
                            <Star className="w-3 h-3 mr-1" />
                            {property.score}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          Saved {formatTimeAgo(property.savedAt)}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="opacity-0 group-hover:opacity-100 h-6 w-6 p-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          onRemoveSaved(property.id);
                        }}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </Card>
                ))
              )}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
};
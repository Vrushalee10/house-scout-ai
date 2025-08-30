import { useState, useRef, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Mail, MessageSquare, Phone, Copy, ExternalLink, Play, Mic, Square, Download } from "lucide-react";

interface OutreachStudioProps {
  isOpen: boolean;
  onClose: () => void;
  listing: any;
  initialTab?: "email" | "sms" | "voicemail";
}

export const OutreachStudio = ({ isOpen, onClose, listing, initialTab = "email" }: OutreachStudioProps) => {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState(initialTab);
  const [emailContent, setEmailContent] = useState("");
  const [smsContent, setSmsContent] = useState("");
  const [voiceScript, setVoiceScript] = useState("");
  const [voiceMode, setVoiceMode] = useState<"ai" | "record">("ai");
  const [isRecording, setIsRecording] = useState(false);
  const [recordedAudio, setRecordedAudio] = useState<string | null>(null);
  const [generatingMp3, setGeneratingMp3] = useState(false);
  const [mp3Path, setMp3Path] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    if (listing && isOpen) {
      // Generate initial content
      generateInitialContent();
    }
  }, [listing, isOpen]);

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  const generateInitialContent = () => {
    const email = `Hi ${listing.contact_name},

I'm interested in your ${listing.beds}-bedroom apartment at ${listing.address} listed at $${listing.rent}/month. I'm looking to move in September with a budget of up to $2400.

The property seems like a great fit based on the amenities and location. Would it be possible to schedule a viewing? I'm flexible with timing and have all documentation ready.

Looking forward to hearing from you.

Best regards,
[Your name]

P.S. I'm a responsible tenant and happy to discuss any student discounts or flexible lease terms if available.`;

    const sms = `Hi! Interested in your ${listing.beds}BR at ${listing.address} ($${listing.rent}). Tour available? Budget $2400. Thanks!`;

    const voice = `Hi ${listing.contact_name}, this is [Your name]. I'm calling about your ${listing.beds}-bedroom apartment at ${listing.address} listed for ${listing.rent} dollars per month. I'm looking for a place to move in September with a budget up to 2400 dollars. The property looks perfect for my needs. Could we schedule a quick tour? You can reach me back at [your number]. Thanks so much, have a great day!`;

    setEmailContent(email);
    setSmsContent(sms);
    setVoiceScript(voice);
  };

  const copyToClipboard = async (text: string, type: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({
        title: "Copied!",
        description: `${type} copied to clipboard`,
      });
    } catch (err) {
      toast({
        title: "Copy failed",
        description: "Please copy manually",
        variant: "destructive",
      });
    }
  };

  const openMailto = () => {
    if (!listing.contact_email) {
      toast({
        title: "No email available",
        description: "This listing doesn't have an email contact",
        variant: "destructive",
      });
      return;
    }
    
    const subject = encodeURIComponent(`Interested in ${listing.address} - $${listing.rent}/month`);
    const body = encodeURIComponent(emailContent);
    window.open(`mailto:${listing.contact_email}?subject=${subject}&body=${body}`);
  };

  const openSmsLink = () => {
    if (!listing.contact_phone) {
      toast({
        title: "No phone available",
        description: "This listing doesn't have a phone contact",
        variant: "destructive",
      });
      return;
    }
    
    const phone = listing.contact_phone.replace(/[^\d]/g, '');
    window.open(`sms:+1${phone}?body=${encodeURIComponent(smsContent)}`);
  };

  const sendSmsViaTwilio = async () => {
    // Check if Twilio credentials exist (would need to be in env)
    toast({
      title: "SMS Feature",
      description: "Add TWILIO credentials to enable direct SMS sending",
      variant: "destructive",
    });
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
        const audioUrl = URL.createObjectURL(audioBlob);
        setRecordedAudio(audioUrl);
      };

      mediaRecorder.start();
      setIsRecording(true);
      toast({
        title: "Recording started",
        description: "Speak your voicemail message",
      });
    } catch (err) {
      toast({
        title: "Recording failed",
        description: "Unable to access microphone",
        variant: "destructive",
      });
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      toast({
        title: "Recording stopped",
        description: "You can now preview your recording",
      });
    }
  };

  const generateMp3 = async () => {
    setGeneratingMp3(true);
    
    // Simulate MP3 generation (would integrate with ElevenLabs API)
    setTimeout(() => {
      const mockPath = `/outputs/voice/${listing.id}.mp3`;
      setMp3Path(mockPath);
      setGeneratingMp3(false);
      toast({
        title: "MP3 Generated",
        description: "Voicemail MP3 ready for download",
      });
    }, 2000);
  };

  const placeCall = async () => {
    // Would integrate with Twilio API
    toast({
      title: "Call Feature",
      description: "Add TWILIO credentials to enable voice calls",
      variant: "destructive",
    });
  };

  const openGoogleMaps = () => {
    const address = encodeURIComponent(`${listing.address}, ${listing.city}, ${listing.state} ${listing.zip}`);
    window.open(`https://www.google.com/maps?q=${address}`);
  };

  const openStreetView = () => {
    // Would need coordinates for proper street view
    const address = encodeURIComponent(`${listing.address}, ${listing.city}, ${listing.state} ${listing.zip}`);
    window.open(`https://www.google.com/maps?q=${address}&layer=c`);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Outreach Studio</DialogTitle>
        </DialogHeader>
        
        <div className="flex-1 grid grid-cols-3 gap-6 overflow-hidden">
          {/* Main Content Area */}
          <div className="col-span-2 flex flex-col">
            <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as "email" | "sms" | "voicemail")} className="flex-1 flex flex-col">
              <TabsList className="grid grid-cols-3 w-full">
                <TabsTrigger value="email" className="flex items-center gap-2">
                  <Mail className="w-4 h-4" />
                  Email
                </TabsTrigger>
                <TabsTrigger value="sms" className="flex items-center gap-2">
                  <MessageSquare className="w-4 h-4" />
                  SMS
                </TabsTrigger>
                <TabsTrigger value="voicemail" className="flex items-center gap-2">
                  <Phone className="w-4 h-4" />
                  Voicemail
                </TabsTrigger>
              </TabsList>

              <div className="flex-1 flex flex-col">
                <TabsContent value="email" className="flex-1 flex flex-col">
                  <div className="flex-1 space-y-4">
                    <Textarea
                      value={emailContent}
                      onChange={(e) => setEmailContent(e.target.value)}
                      className="flex-1 min-h-[300px] resize-none"
                      placeholder="Edit your email message..."
                    />
                    <div className="flex gap-2">
                      <Button onClick={() => copyToClipboard(emailContent, "Email")}>
                        <Copy className="w-4 h-4 mr-2" />
                        Copy
                      </Button>
                      <Button onClick={openMailto} variant="outline">
                        <ExternalLink className="w-4 h-4 mr-2" />
                        Open Mail App
                      </Button>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="sms" className="flex-1 flex flex-col">
                  <div className="flex-1 space-y-4">
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <Label>SMS Message</Label>
                        <Badge variant={smsContent.length <= 160 ? "secondary" : "destructive"}>
                          {smsContent.length}/160
                        </Badge>
                      </div>
                      <Textarea
                        value={smsContent}
                        onChange={(e) => setSmsContent(e.target.value)}
                        className="h-32"
                        placeholder="Edit your SMS message..."
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button onClick={() => copyToClipboard(smsContent, "SMS")}>
                        <Copy className="w-4 h-4 mr-2" />
                        Copy
                      </Button>
                      <Button onClick={openSmsLink} variant="outline">
                        <ExternalLink className="w-4 h-4 mr-2" />
                        Open SMS App
                      </Button>
                      <Button onClick={sendSmsViaTwilio} variant="secondary">
                        <MessageSquare className="w-4 h-4 mr-2" />
                        Send with Twilio
                      </Button>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="voicemail" className="flex-1 flex flex-col">
                  <div className="flex-1 space-y-4">
                    <RadioGroup value={voiceMode} onValueChange={(value) => setVoiceMode(value as "ai" | "record")}>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="ai" id="ai-script" />
                        <Label htmlFor="ai-script">Use AI script</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="record" id="record-voice" />
                        <Label htmlFor="record-voice">Record my voice</Label>
                      </div>
                    </RadioGroup>

                    {voiceMode === "ai" && (
                      <>
                        <Textarea
                          value={voiceScript}
                          onChange={(e) => setVoiceScript(e.target.value)}
                          className="h-32"
                          placeholder="Edit your voice script..."
                        />
                        <div className="flex gap-2 flex-wrap">
                          <Button onClick={generateMp3} disabled={generatingMp3}>
                            {generatingMp3 ? "Generating..." : "Generate MP3"}
                          </Button>
                          {mp3Path && (
                            <Button variant="outline">
                              <Play className="w-4 h-4 mr-2" />
                              Preview MP3
                            </Button>
                          )}
                          <Button onClick={placeCall} variant="secondary">
                            <Phone className="w-4 h-4 mr-2" />
                            Place Call
                          </Button>
                        </div>
                      </>
                    )}

                    {voiceMode === "record" && (
                      <div className="space-y-4">
                        <div className="flex gap-2">
                          {!isRecording ? (
                            <Button onClick={startRecording}>
                              <Mic className="w-4 h-4 mr-2" />
                              Start Recording
                            </Button>
                          ) : (
                            <Button onClick={stopRecording} variant="destructive">
                              <Square className="w-4 h-4 mr-2" />
                              Stop Recording
                            </Button>
                          )}
                        </div>
                        
                        {recordedAudio && (
                          <div className="space-y-2">
                            <audio controls src={recordedAudio} className="w-full" />
                            <div className="flex gap-2">
                              <Button variant="outline">
                                <Download className="w-4 h-4 mr-2" />
                                Save MP3
                              </Button>
                              <Button onClick={placeCall} variant="secondary">
                                <Phone className="w-4 h-4 mr-2" />
                                Place Call
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </TabsContent>
              </div>
            </Tabs>
          </div>

          {/* Listing Sidebar */}
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">{listing.address}</CardTitle>
                <p className="text-sm text-muted-foreground">{listing.city}, {listing.state} {listing.zip}</p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary">${listing.rent}</div>
                  <div className="text-sm text-muted-foreground">{listing.beds}BR / {listing.baths}BA • {listing.sqft} sq ft</div>
                </div>

                <Separator />

                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Contact:</span>
                    <span className="font-medium">{listing.contact_name}</span>
                  </div>
                  {listing.contact_email && (
                    <div className="flex justify-between text-sm">
                      <span>Email:</span>
                      <span className="font-medium text-xs">{listing.contact_email}</span>
                    </div>
                  )}
                  {listing.contact_phone && (
                    <div className="flex justify-between text-sm">
                      <span>Phone:</span>
                      <span className="font-medium">{listing.contact_phone}</span>
                    </div>
                  )}
                </div>

                <Separator />

                {listing.amenities?.length > 0 && (
                  <div>
                    <div className="text-sm font-medium mb-2">Amenities</div>
                    <div className="flex flex-wrap gap-1">
                      {listing.amenities.map((amenity: string) => (
                        <Badge key={amenity} variant="secondary" className="text-xs">
                          {amenity}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <Button variant="outline" size="sm" className="w-full" onClick={openGoogleMaps}>
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Google Maps
                  </Button>
                  <Button variant="outline" size="sm" className="w-full" onClick={openStreetView}>
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Street View
                  </Button>
                  {listing.url && (
                    <Button variant="outline" size="sm" className="w-full" onClick={() => window.open(listing.url)}>
                      <ExternalLink className="w-4 h-4 mr-2" />
                      View Listing
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
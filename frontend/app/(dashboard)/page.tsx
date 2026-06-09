import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Video, Scissors, FileText, Mic, PlayCircle } from "lucide-react";
import Link from "next/link";

export default function Home() {
  return (
    <div className="flex flex-col gap-8 max-w-5xl mx-auto py-6">
      <section>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-3xl font-semibold tracking-tight">What would you like to create?</h2>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card className="hover:bg-muted/50 transition-colors cursor-pointer border-border/50">
            <CardHeader className="flex flex-col gap-2 pb-2">
              <div className="p-2 bg-primary/10 w-fit rounded-lg">
                <Video className="w-5 h-5 text-primary" />
              </div>
              <CardTitle className="text-base">Upload a video</CardTitle>
              <CardDescription className="text-xs">Add video to your library for processing</CardDescription>
            </CardHeader>
          </Card>
          
          <Card className="hover:bg-muted/50 transition-colors cursor-pointer border-border/50">
            <CardHeader className="flex flex-col gap-2 pb-2">
              <div className="p-2 bg-primary/10 w-fit rounded-lg">
                <Scissors className="w-5 h-5 text-primary" />
              </div>
              <CardTitle className="text-base">Generate short clips</CardTitle>
              <CardDescription className="text-xs">Extract viral shorts from long videos</CardDescription>
            </CardHeader>
          </Card>

          <Card className="hover:bg-muted/50 transition-colors cursor-pointer border-border/50">
            <CardHeader className="flex flex-col gap-2 pb-2">
              <div className="p-2 bg-primary/10 w-fit rounded-lg">
                <FileText className="w-5 h-5 text-primary" />
              </div>
              <CardTitle className="text-base">Create transcript</CardTitle>
              <CardDescription className="text-xs">Generate highly accurate captions</CardDescription>
            </CardHeader>
          </Card>

          <Card className="hover:bg-muted/50 transition-colors cursor-pointer border-border/50 opacity-60">
            <CardHeader className="flex flex-col gap-2 pb-2">
              <div className="p-2 bg-primary/10 w-fit rounded-lg">
                <Mic className="w-5 h-5 text-primary" />
              </div>
              <CardTitle className="text-base flex items-center gap-2">
                Create voiceover
                <span className="text-[10px] bg-secondary px-1.5 py-0.5 rounded-sm uppercase font-semibold">Soon</span>
              </CardTitle>
              <CardDescription className="text-xs">Text-to-speech with AI voices</CardDescription>
            </CardHeader>
          </Card>
        </div>
      </section>

      <section>
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-semibold">Recent Projects</h3>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/media">View all</Link>
          </Button>
        </div>
        
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {/* Mock Recent Project */}
          <Card className="overflow-hidden border-border/50 hover:border-border transition-colors group cursor-pointer">
            <div className="aspect-video bg-muted relative flex items-center justify-center">
              <PlayCircle className="w-8 h-8 text-muted-foreground group-hover:text-primary transition-colors" />
            </div>
            <CardContent className="p-4">
              <h4 className="font-medium truncate">Product Launch Keynote.mp4</h4>
              <p className="text-xs text-muted-foreground mt-1">Edited 2 hours ago</p>
            </CardContent>
          </Card>

          <Card className="overflow-hidden border-border/50 hover:border-border transition-colors group cursor-pointer">
            <div className="aspect-video bg-muted relative flex items-center justify-center">
              <PlayCircle className="w-8 h-8 text-muted-foreground group-hover:text-primary transition-colors" />
            </div>
            <CardContent className="p-4">
              <h4 className="font-medium truncate">Customer Testimonial.mov</h4>
              <p className="text-xs text-muted-foreground mt-1">Edited yesterday</p>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}

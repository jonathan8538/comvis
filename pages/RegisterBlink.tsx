import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, CheckCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BlinkRecorder } from '@/components/BlinkRecorder';
import { useAuthContext } from '@/context/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabaseClient';

export default function RegisterBlink() {
  const [recordedVideo, setRecordedVideo] = useState<Blob | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const { updateUserBlink } = useAuthContext();
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleRecord = (videoBlob: Blob) => {
    setRecordedVideo(videoBlob);
  };

  const handleRetake = () => {
    setRecordedVideo(null);
  };
  

  const handleSave = async () => {
    if (!recordedVideo || !user) return;

    setIsSaving(true);

    try {
      // 1. Upload video ke Supabase Storage
      const fileName = `${user.id}/blink.webm`;

      const { error: uploadError } = await supabase.storage
        .from("blinks")
        .upload(fileName, recordedVideo, {
          cacheControl: "3600",
          upsert: true, // penting: biar bisa overwrite rekaman
        });

      if (uploadError) throw uploadError;

      // 2. Ambil public URL-nya
      const {
        data: { publicUrl },
      } = supabase.storage.from("blinks").getPublicUrl(fileName);

      // 3. Simpan URL di tabel users
      const { error: updateError } = await supabase
        .from("users")
        .update({ blink_video_url: publicUrl })
        .eq("id", user.id);

      if (updateError) throw updateError;

      // 4. Update context
      await updateUserBlink(publicUrl);

      toast({
        title: "Registration complete!",
        description: "Your blink pattern has been stored.",
      });

      navigate("/dashboard");
    } catch (err) {
      console.error(err);
      toast({
        title: "Failed to save",
        description: "Could not save blink data. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-background via-background to-accent/20">
      <Card className="w-full max-w-lg glass">
        <CardHeader className="text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary text-sm font-bold">
              <CheckCircle className="w-5 h-5" />
            </div>
            <div className="w-16 h-1 bg-primary rounded" />
            <div className="w-8 h-8 rounded-full gradient-primary flex items-center justify-center text-primary-foreground text-sm font-bold">
              2
            </div>
          </div>
          <CardTitle className="text-2xl flex items-center justify-center gap-2">
            <Eye className="w-6 h-6 text-primary" />
            Register Double Blink
          </CardTitle>
          <CardDescription>
            Record yourself blinking twice (double blink) for verification
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <BlinkRecorder
            onRecord={handleRecord}
            recordedVideo={recordedVideo}
            onRetake={handleRetake}
          />

          {recordedVideo && (
            <Button
              onClick={handleSave}
              className="w-full gradient-primary text-primary-foreground gap-2"
              disabled={isSaving}
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4" />
                  Complete Registration
                </>
              )}
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

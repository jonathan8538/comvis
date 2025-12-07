import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Camera, Eye, CheckCircle, XCircle, Loader2, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Layout } from '@/components/Layout';
import { WebcamCapture } from '@/components/WebcamCapture';
import { BlinkRecorder } from '@/components/BlinkRecorder';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabaseClient';
import { getEmbedding } from '@/lib/miniFaceNet';
import { base64ToImageData } from '@/lib/imageHelpers';

type Step = 'face' | 'blink' | 'complete';
type VerificationStatus = 'idle' | 'verifying' | 'success' | 'failed';

export default function CheckIn() {
  const [step, setStep] = useState<Step>('face');
  const [capturedFace, setCapturedFace] = useState<string | null>(null);
  const [recordedBlink, setRecordedBlink] = useState<Blob | null>(null);
  const [faceStatus, setFaceStatus] = useState<VerificationStatus>('idle');
  const [blinkStatus, setBlinkStatus] = useState<VerificationStatus>('idle');
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleFaceCapture = (imageData: string) => {
    setCapturedFace(imageData);
  };

  const handleFaceRetake = () => {
    setCapturedFace(null);
    setFaceStatus('idle');
  };

  const handleVerifyFace = async () => {
    setFaceStatus("verifying");
    
    try {
      const img = await base64ToImageData(capturedFace);
      const embedding = await getEmbedding(img);

      const { data: stored, error } = await supabase
        .from("user_face_embeddings")
        .select("embedding")
        .eq("user_id", user.id)
        .single();

      if (error) throw error;

      const dist = cosineDistance(embedding, stored.embedding);

      if (dist < 0.40) {
        setFaceStatus("success");
        setStep("blink");
      } else {
        setFaceStatus("failed");
      }
    } catch (e) {
      setFaceStatus("failed");
    }
  };

  const handleBlinkRecord = (videoBlob: Blob) => {
    setRecordedBlink(videoBlob);
  };

  const handleBlinkRetake = () => {
    setRecordedBlink(null);
    setBlinkStatus('idle');
  };

  const handleVerifyBlink = async () => {
    if (!recordedBlink) return;
    
    setBlinkStatus('verifying');
    
    // TODO: Send to your blink verification API/model
    // const result = await verifyBlink(recordedBlink, user.blinkSequence);
    
    // Simulated verification
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // For demo: randomly succeed (you'll replace with actual verification)
    const success = Math.random() > 0.2;
    
    if (success) {
      setBlinkStatus('success');
      setStep('complete');
      
      // TODO: Record attendance in database
      // await supabase.from('attendance').insert({ user_id: user.id, check_in_time: new Date() });
      
      toast({
        title: 'Check-in successful!',
        description: 'Your attendance has been recorded.',
      });
    } else {
      setBlinkStatus('failed');
      toast({
        title: 'Blink verification failed',
        description: 'Please try again with a clear double blink.',
        variant: 'destructive',
      });
    }
  };

  return (
    <Layout>
      <div className="max-w-lg mx-auto">
        {/* Progress indicator */}
        <div className="flex items-center justify-center gap-2 mb-8">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
            step === 'face' ? 'gradient-primary text-primary-foreground' :
            faceStatus === 'success' ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'
          }`}>
            {faceStatus === 'success' ? <CheckCircle className="w-5 h-5" /> : <Camera className="w-5 h-5" />}
          </div>
          <div className={`w-16 h-1 rounded ${faceStatus === 'success' ? 'bg-primary' : 'bg-border'}`} />
          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
            step === 'blink' ? 'gradient-primary text-primary-foreground' :
            blinkStatus === 'success' ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'
          }`}>
            {blinkStatus === 'success' ? <CheckCircle className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
          </div>
        </div>

        {step === 'face' && (
          <Card className="glass">
            <CardHeader className="text-center">
              <CardTitle className="flex items-center justify-center gap-2">
                <Camera className="w-5 h-5 text-primary" />
                Face Verification
              </CardTitle>
              <CardDescription>
                Position your face in the frame and capture a photo
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <WebcamCapture
                onCapture={handleFaceCapture}
                capturedImage={capturedFace}
                onRetake={handleFaceRetake}
              />
              
              {capturedFace && faceStatus !== 'success' && (
                <Button
                  onClick={handleVerifyFace}
                  className="w-full gradient-primary text-primary-foreground gap-2"
                  disabled={faceStatus === 'verifying'}
                >
                  {faceStatus === 'verifying' ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Verifying...
                    </>
                  ) : faceStatus === 'failed' ? (
                    'Try Again'
                  ) : (
                    <>
                      Verify Face
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </Button>
              )}
            </CardContent>
          </Card>
        )}

        {step === 'blink' && (
          <Card className="glass">
            <CardHeader className="text-center">
              <CardTitle className="flex items-center justify-center gap-2">
                <Eye className="w-5 h-5 text-primary" />
                Blink Verification
              </CardTitle>
              <CardDescription>
                Record yourself doing a double blink (blink twice)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <BlinkRecorder
                onRecord={handleBlinkRecord}
                recordedVideo={recordedBlink}
                onRetake={handleBlinkRetake}
              />
              
              {recordedBlink && blinkStatus !== 'success' && (
                <Button
                  onClick={handleVerifyBlink}
                  className="w-full gradient-primary text-primary-foreground gap-2"
                  disabled={blinkStatus === 'verifying'}
                >
                  {blinkStatus === 'verifying' ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Verifying...
                    </>
                  ) : blinkStatus === 'failed' ? (
                    'Try Again'
                  ) : (
                    <>
                      Verify Blink
                      <CheckCircle className="w-4 h-4" />
                    </>
                  )}
                </Button>
              )}
            </CardContent>
          </Card>
        )}

        {step === 'complete' && (
          <Card className="glass text-center">
            <CardContent className="py-12 space-y-6">
              <div className="w-20 h-20 rounded-full gradient-primary flex items-center justify-center mx-auto">
                <CheckCircle className="w-10 h-10 text-primary-foreground" />
              </div>
              <div>
                <h2 className="text-2xl font-bold mb-2">Check-in Complete!</h2>
                <p className="text-muted-foreground">
                  Your attendance has been recorded at {new Date().toLocaleTimeString()}
                </p>
              </div>
              <Button onClick={() => navigate('/dashboard')} variant="outline">
                Back to Dashboard
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  );
}

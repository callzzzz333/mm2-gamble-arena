import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Copy, Check } from "lucide-react";
import type { Session } from "@supabase/supabase-js";

const Auth = () => {
  const [robloxUsername, setRobloxUsername] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [generatedCode, setGeneratedCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<"generate" | "verify">("generate");
  const [copied, setCopied] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
        if (session) {
          navigate("/");
        }
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) {
        navigate("/");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleGenerateCode = async () => {
    if (!robloxUsername || robloxUsername.length < 3) {
      toast({
        title: "Invalid Username",
        description: "Please enter a valid Roblox username",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-verification-code');
      
      if (error) throw error;
      
      setGeneratedCode(data.code);
      setVerificationCode(data.code);
      setStep("verify");
      
      toast({
        title: "Code Generated!",
        description: "Add this code to your Roblox profile bio",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to generate code",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('verify-roblox', {
        body: { robloxUsername, verificationCode: generatedCode }
      });
      
      if (error) throw error;
      
      if (!data.success) {
        throw new Error(data.error);
      }

      // Set the session using the tokens from the response
      if (data.access_token && data.refresh_token) {
        const { error: sessionError } = await supabase.auth.setSession({
          access_token: data.access_token,
          refresh_token: data.refresh_token,
        });
        
        if (sessionError) {
          throw sessionError;
        }
      }

      toast({
        title: "Success!",
        description: "Your Roblox account has been verified",
      });
      
      // Wait a moment for session to be set, then navigate
      setTimeout(() => {
        navigate("/");
      }, 500);
    } catch (error: any) {
      toast({
        title: "Verification Failed",
        description: error.message || "Please make sure the code is in your Roblox bio",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const copyCode = () => {
    navigator.clipboard.writeText(generatedCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast({
      title: "Copied!",
      description: "Verification code copied to clipboard",
    });
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md p-8 bg-card border-border shadow-[0_0_20px_hsl(var(--glow-primary)/0.3)]">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Roblox Login
          </h1>
          <p className="text-muted-foreground">
            Verify your Roblox account to continue
          </p>
        </div>

        {step === "generate" ? (
          <div className="space-y-4">
            <div>
              <label className="text-sm text-muted-foreground">Roblox Username</label>
              <Input
                type="text"
                value={robloxUsername}
                onChange={(e) => setRobloxUsername(e.target.value)}
                placeholder="Enter your Roblox username"
                className="mt-1"
              />
            </div>

            <Button
              onClick={handleGenerateCode}
              className="w-full bg-primary hover:bg-primary/90 shadow-[0_0_10px_hsl(var(--glow-primary)/0.3)]"
              disabled={loading}
            >
              {loading ? "Generating..." : "Generate Verification Code"}
            </Button>

            <div className="mt-4 p-4 bg-muted/20 rounded-lg border border-border">
              <p className="text-sm text-muted-foreground">
                <strong className="text-foreground">How it works:</strong>
              </p>
              <ol className="text-sm text-muted-foreground mt-2 space-y-1 list-decimal list-inside">
                <li>Enter your Roblox username</li>
                <li>Copy the generated verification code</li>
                <li>Add the code to your Roblox profile bio</li>
                <li>Click verify to complete login</li>
              </ol>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="p-4 bg-muted/20 rounded-lg border border-primary">
              <p className="text-sm text-muted-foreground mb-2">
                Add this code to your Roblox profile bio:
              </p>
              <div className="flex items-center gap-2">
                <code className="flex-1 p-3 bg-background rounded text-primary font-mono font-bold text-center">
                  {generatedCode}
                </code>
                <Button
                  onClick={copyCode}
                  variant="outline"
                  size="icon"
                  className="border-primary hover:bg-primary/10"
                >
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </Button>
              </div>
            </div>

            <div className="p-4 bg-primary/10 rounded-lg border border-primary">
              <p className="text-sm font-medium text-foreground mb-2">Instructions:</p>
              <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
                <li>Go to <a href="https://www.roblox.com/my/account#!/info" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Roblox Settings</a></li>
                <li>Paste the code into your "About" section</li>
                <li>Click "Save" on Roblox</li>
                <li>Come back and click "Verify" below</li>
              </ol>
            </div>

            <Button
              onClick={handleVerify}
              className="w-full bg-primary hover:bg-primary/90 shadow-[0_0_10px_hsl(var(--glow-primary)/0.3)]"
              disabled={loading}
            >
              {loading ? "Verifying..." : "Verify Roblox Account"}
            </Button>

            <Button
              onClick={() => setStep("generate")}
              variant="outline"
              className="w-full border-border"
              disabled={loading}
            >
              Back
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
};

export default Auth;

import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";

export default function SetupUsername() {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    checkExistingUsername();
  }, []);

  const checkExistingUsername = async () => {
    try {
      const currentUser = await base44.auth.me();
      if (currentUser.username) {
        navigate(createPageUrl("Home"));
      }
    } catch (error) {
      console.error("Error checking username:", error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!username.trim()) {
      alert("Please enter a username");
      return;
    }

    setIsSaving(true);

    try {
      await base44.auth.updateMe({ username: username.trim() });
      navigate(createPageUrl("Home"));
    } catch (error) {
      console.error("Error saving username:", error);
      alert("Could not save username. Please try again.");
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: '#ffffff' }}>
      <Card className="w-full max-w-lg rounded-2xl p-8 border-2 shadow-2xl" style={{ borderColor: 'var(--sage-600)', backgroundColor: '#ffffff' }}>
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-3" style={{ color: '#000000' }}>
            Welcome to AcademiaAI! 🎉
          </h1>
          <p className="text-lg" style={{ color: '#4b5563' }}>
            Choose your username
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <Label className="mb-2 block text-lg font-semibold" style={{ color: '#000000' }}>Your Username</Label>
            <Input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter your username"
              className="rounded-xl border-2 text-lg h-14 px-4"
              style={{ borderColor: 'var(--sage-600)', backgroundColor: '#e2e8f0', color: '#000000' }}
              disabled={isSaving}
              autoFocus
            />
          </div>

          <Button
            type="submit"
            disabled={!username.trim() || isSaving}
            className="w-full rounded-xl py-7 text-white text-lg font-bold shadow-lg transition-all"
            style={{ 
              backgroundColor: '#10b981',
              opacity: (!username.trim() || isSaving) ? 0.5 : 1 
            }}
          >
            {isSaving ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Setting up...
              </>
            ) : (
              <>
                Submit Username
              </>
            )}
          </Button>
        </form>
      </Card>
    </div>
  );
}
import React from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { AlertCircle, Home, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export default function Error() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50">
      <Card className="max-w-md w-full p-8 text-center rounded-2xl border-2 shadow-lg bg-white" style={{ borderColor: '#15803d' }}>
        <div className="w-20 h-20 mx-auto mb-6 rounded-2xl flex items-center justify-center shadow-lg" style={{ backgroundColor: '#15803d' }}>
          <AlertCircle className="w-10 h-10 text-white" />
        </div>
        
        <h1 className="text-4xl font-bold mb-4 text-gray-900">
          Aw nuts! 😅
        </h1>
        
        <h2 className="text-2xl font-semibold mb-3" style={{ color: '#15803d' }}>
          Page Not Found
        </h2>
        
        <p className="text-gray-600 mb-6 leading-relaxed">
          Looks like this page decided to take a study break! It might have been moved, deleted, or never existed in the first place.
        </p>

        <div className="p-4 rounded-xl mb-6 border-2 bg-gray-50" style={{ borderColor: '#15803d' }}>
          <p className="text-sm text-gray-900 mb-2 font-semibold">
            💡 Here's what might have happened:
          </p>
          <ul className="text-sm text-gray-600 text-left space-y-1">
            <li>• The URL might have a typo</li>
            <li>• The page was moved or deleted</li>
            <li>• You don't have permission to view it</li>
          </ul>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <Button
            onClick={() => navigate(createPageUrl("Home"))}
            className="flex-1 rounded-xl text-white shadow-lg hover:opacity-90 transition-all"
            style={{ backgroundColor: '#15803d' }}
          >
            <Home className="w-4 h-4 mr-2" />
            Go Home
          </Button>
          
          <Button
            onClick={() => window.location.reload()}
            variant="outline"
            className="flex-1 rounded-xl border-2 hover:bg-gray-100 transition-all text-gray-900"
            style={{ borderColor: '#15803d', backgroundColor: 'white' }}
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh Page
          </Button>
        </div>

        <p className="text-xs text-gray-500 mt-6">
          Still having trouble? Contact support and we'll help you out! 🚀
        </p>
      </Card>
    </div>
  );
}
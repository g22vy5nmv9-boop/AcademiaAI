import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { ArrowLeft, Upload, Type, FileText, Presentation } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import ScreenshotUpload from "../components/addmaterial/ScreenshotUpload";
import ManualEntry from "../components/addmaterial/ManualEntry";
import StudyGuideImport from "../components/addmaterial/StudyGuideImport";
import SlideshowImport from "../components/addmaterial/SlideshowImport";

export default function AddMaterial() {
  const navigate = useNavigate();
  const urlParams = new URLSearchParams(window.location.search);
  const initialTab = urlParams.get("tab") || "screenshot";
  
  const [activeTab, setActiveTab] = useState(initialTab);
  const [lightMode, setLightMode] = useState(() => {
    return localStorage.getItem('lightMode') === 'true';
  });

  useEffect(() => {
    const handleStorageChange = () => {
      setLightMode(localStorage.getItem('lightMode') === 'true');
    };
    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('lightModeChange', handleStorageChange);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('lightModeChange', handleStorageChange);
    };
  }, []);

  return (
    <div className="min-h-screen p-4 md:p-8" style={{ backgroundColor: lightMode ? '#ffffff' : '#000000' }}>
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center gap-4 mb-6">
          <Button
            variant="outline"
            size="icon"
            onClick={() => navigate(createPageUrl("Library"))}
            className="rounded-xl"
            style={{ borderColor: 'var(--sage-600)', color: lightMode ? '#000000' : '#ffffff' }}
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div className="flex-1">
            <h1 className="text-4xl font-bold" style={{ color: lightMode ? '#000000' : '#ffffff' }}>Add to Your Library</h1>
            <p className="mt-1" style={{ color: lightMode ? '#4b5563' : '#a3a3a3' }}>Upload, type, or import study materials into folders</p>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4 mb-6 rounded-xl p-1 h-auto" style={{ backgroundColor: lightMode ? '#e2e8f0' : '#2a2a2a' }}>
            <TabsTrigger 
              value="screenshot" 
              className="rounded-lg py-3 transition-all duration-300"
              style={{
                backgroundColor: activeTab === 'screenshot' ? 'var(--sage-600)' : 'transparent',
                color: activeTab === 'screenshot' ? '#ffffff' : (lightMode ? '#000000' : '#ffffff')
              }}
            >
              <Upload className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">Screenshot</span>
              <span className="sm:hidden">Photo</span>
            </TabsTrigger>
            <TabsTrigger 
              value="manual" 
              className="rounded-lg py-3 transition-all duration-300"
              style={{
                backgroundColor: activeTab === 'manual' ? 'var(--sage-600)' : 'transparent',
                color: activeTab === 'manual' ? '#ffffff' : (lightMode ? '#000000' : '#ffffff')
              }}
            >
              <Type className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">Manual</span>
              <span className="sm:hidden">Type</span>
            </TabsTrigger>
            <TabsTrigger 
              value="studyguide" 
              className="rounded-lg py-3 transition-all duration-300"
              style={{
                backgroundColor: activeTab === 'studyguide' ? 'var(--sage-600)' : 'transparent',
                color: activeTab === 'studyguide' ? '#ffffff' : (lightMode ? '#000000' : '#ffffff')
              }}
            >
              <FileText className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">Study Guide</span>
              <span className="sm:hidden">Guide</span>
            </TabsTrigger>
            <TabsTrigger 
              value="slideshow" 
              className="rounded-lg py-3 transition-all duration-300"
              style={{
                backgroundColor: activeTab === 'slideshow' ? 'var(--sage-600)' : 'transparent',
                color: activeTab === 'slideshow' ? '#ffffff' : (lightMode ? '#000000' : '#ffffff')
              }}
            >
              <Presentation className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">Slideshow</span>
              <span className="sm:hidden">Slides</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="screenshot" className="mt-0">
            <ScreenshotUpload />
          </TabsContent>

          <TabsContent value="manual" className="mt-0">
            <ManualEntry />
          </TabsContent>

          <TabsContent value="studyguide" className="mt-0">
            <StudyGuideImport />
          </TabsContent>

          <TabsContent value="slideshow" className="mt-0">
            <SlideshowImport />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
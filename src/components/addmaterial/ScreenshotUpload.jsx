import React, { useState, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Upload, Loader2, CheckCircle, Camera, X, FileQuestion, Image as ImageIcon } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";

import ExtractedDataForm from "./ExtractedDataForm";

const MAX_FILES = 5;
const MAX_QUESTIONS_PER_SCREENSHOT = 50;

export default function ScreenshotUpload() {
  const navigate = useNavigate();
  const [files, setFiles] = useState([]);
  const [previews, setPreviews] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [extractedData, setExtractedData] = useState([]);
  const [currentEditIndex, setCurrentEditIndex] = useState(0);
  const [error, setError] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const [processingMode, setProcessingMode] = useState("extract"); // "extract" or "describe"
  const [includeImageInQuestion, setIncludeImageInQuestion] = useState(true);
  const [imageDescriptions, setImageDescriptions] = useState([]);
  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);
  const [lightMode, setLightMode] = useState(() => {
    return localStorage.getItem('lightMode') === 'true';
  });

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    const droppedFiles = Array.from(e.dataTransfer.files).filter(
      file => file.type.startsWith("image/") || file.type === "application/pdf"
    );
    
    if (droppedFiles.length > MAX_FILES) {
      setError(`Aw nuts! 😅 You can only upload ${MAX_FILES} screenshots at a time. Please select fewer files and try again.`);
      return;
    }
    
    if (droppedFiles.length > 0) {
      handleFileSelect(droppedFiles);
    }
  };

  const handleFileSelect = (selectedFiles) => {
    const fileArray = Array.isArray(selectedFiles) ? selectedFiles : Array.from(selectedFiles);
    
    // Limit to MAX_FILES
    if (fileArray.length > MAX_FILES) {
      setError(`Aw nuts! 😅 You can only upload ${MAX_FILES} screenshots at a time. Please select fewer files and try again.`);
      return;
    }
    
    setFiles(fileArray);
    setError(null);
    setExtractedData([]);
    setImageDescriptions([]); // Clear image descriptions on new file select
    
    const newPreviews = [];
    fileArray.forEach(file => {
      if (file.type.startsWith("image/")) {
        const reader = new FileReader();
        reader.onload = (e) => {
          newPreviews.push({ url: e.target.result, name: file.name });
          if (newPreviews.length === fileArray.filter(f => f.type.startsWith("image/")).length) {
            setPreviews(newPreviews);
          }
        };
        reader.readAsDataURL(file);
      }
    });
    
    if (fileArray.every(f => f.type === "application/pdf")) {
      setPreviews(fileArray.map(f => ({ url: null, name: f.name })));
    }
  };

  const removeFile = (index) => {
    const newFiles = files.filter((_, i) => i !== index);
    const newPreviews = previews.filter((_, i) => i !== index);
    setFiles(newFiles);
    setPreviews(newPreviews);
    if (newFiles.length === 0) {
      setExtractedData([]);
      setImageDescriptions([]); // Clear image descriptions if all files are removed
    }
  };

  const describeImages = async () => {
    if (files.length === 0) return;

    setIsProcessing(true);
    setProgress(0);
    setError(null);

    const progressInterval = setInterval(() => {
      setProgress(prev => Math.min(prev + 10, 90));
    }, 300);

    try {
      const descriptions = [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const { file_url } = await base44.integrations.Core.UploadFile({ file });
        
        const result = await base44.integrations.Core.InvokeLLM({
          prompt: `Analyze this image and provide a detailed description of what you see. Include:
- Main subjects or topics visible
- Key concepts or information presented
- Any text, diagrams, charts, or visual elements
- Academic subject area if identifiable
- Potential study material or educational content

Be thorough and detailed in your description.`,
          file_urls: [file_url]
        });

        descriptions.push({
          file_url,
          description: result,
          fileName: file.name
        });
      }

      clearInterval(progressInterval);
      setProgress(100);
      setImageDescriptions(descriptions);
    } catch (err) {
      clearInterval(progressInterval);
      setError(`Aw nuts! 😅 We couldn't describe the images. ${err.message || "This might be due to poor image quality or network issues. Try taking clearer photos with better lighting, or check your internet connection and try again."}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const processScreenshots = async () => {
    if (files.length === 0) return;

    setIsProcessing(true);
    setProgress(0);
    setError(null);

    const progressInterval = setInterval(() => {
      setProgress(prev => Math.min(prev + 5, 90));
    }, 300);

    try {
      const extractedResults = [];

      const studyMaterialSchema = {
        type: "object",
        properties: {
          questions: {
            type: "array",
            maxItems: MAX_QUESTIONS_PER_SCREENSHOT,
            items: {
              type: "object",
              properties: {
                question: { 
                  type: "string",
                  description: "The question text. Can be a traditional question (What is...?), a math problem (Solve: 2x² + 5x - 3 = 0), or an instruction (Explain...). PRESERVE ALL MATH SYMBOLS EXACTLY: ×÷±√²³π∫∑∆θαβγ≈≤≥≠ etc."
                },
                answer: { 
                  type: "string",
                  description: "KEEP ANSWER MINIMAL - just what it equals. For math: 'x = 5' NOT 'x = 5. Solution: 2x = 10...'. For definitions: just the key term/concept. PRESERVE ALL MATH SYMBOLS EXACTLY."
                },
                needs_image: {
                  type: "boolean",
                  description: "Set to true if the question requires the image to be understood (e.g., diagrams, graphs, charts, visual problems, 'What is shown in the image?'). Set to false if the question can be understood from text alone."
                },
                subject: { type: "string" },
                topic: { type: "string" },
                difficulty: { 
                  type: "string",
                  enum: ["easy", "medium", "hard"]
                }
              },
              required: ["question", "answer", "needs_image"]
            }
          }
        },
        required: ["questions"]
      };

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const { file_url } = await base44.integrations.Core.UploadFile({ file });
        
        const extractionPrompt = `Extract study material questions and answers from this image.

CRITICAL RULES FOR EXTRACTION:
1. ONLY extract UNIQUE questions - do not include repeated or similar questions
2. If you see variations of the same question (e.g., "Solve 2x + 3 = 7" and "Solve 2x + 3 = 9"), only extract ONE of them
3. Skip questions that are just branches or slight variations of questions already extracted
4. Only extract questions that are CLEARLY VISIBLE and READABLE
5. Each question must be DISTINCT and test a different concept or skill
6. PRESERVE ALL MATH SYMBOLS EXACTLY: ×÷±√²³π∫∑∆θαβγ≈≤≥≠ etc.
7. Keep answers MINIMAL - just the final answer, not the work

IMPORTANT - IMAGE DEPENDENCY:
8. Set needs_image = ${includeImageInQuestion ? "true" : "false"} for ALL questions since user wants ${includeImageInQuestion ? "images included" : "text-only questions"}

Examples of what NOT to extract together:
- "What is 5 + 3?" and "What is 5 + 4?" (same concept, different numbers)
- "Define photosynthesis" and "Explain photosynthesis" (same question, different wording)
- Multiple choice questions with the same question but different answer options

Examples of what TO extract together:
- "What is photosynthesis?" and "What are the stages of cellular respiration?" (different concepts)
- "Solve: 2x + 3 = 7" and "Factor: x² - 5x + 6" (different math skills)

Extract only the UNIQUE, DISTINCT questions available in the image.`;

        const result = await base44.integrations.Core.InvokeLLM({
          prompt: extractionPrompt,
          file_urls: [file_url],
          response_json_schema: studyMaterialSchema
        });

        // Check for specific error from the extraction process
        if (result.status === "error") {
          clearInterval(progressInterval);
          throw new Error(result.details || `Failed to extract data from ${file.name}.`);
        }

        // Handle multiple possible response formats
        let questions = [];
        
        if (result.status === "success" && result.output && result.output.questions) {
          questions = result.output.questions;
        } else if (result.output && Array.isArray(result.output)) {
          questions = result.output;
        } else if (result.questions && Array.isArray(result.questions)) {
          questions = result.questions;
        } else if (Array.isArray(result)) {
          questions = result;
        }
        
        // Process extracted questions
        const processedQuestions = questions.slice(0, MAX_QUESTIONS_PER_SCREENSHOT);
        processedQuestions.forEach(question => {
          extractedResults.push({ 
            ...question, 
            image_url: file_url,
            question_image: includeImageInQuestion ? file_url : null
          });
        });
      }

      clearInterval(progressInterval);
      setProgress(100);

      if (extractedResults.length > 0) {
        setExtractedData(extractedResults);
        setCurrentEditIndex(0);
      } else {
        setError("Aw nuts! 😅 We couldn't extract any questions from your images. This might mean the text is too blurry or unclear. Try these fixes:\n\n• Take clearer photos with better lighting\n• Make sure text is large and readable\n• Use the 'Describe Image' mode instead\n• Or create questions manually");
      }
    } catch (err) {
      clearInterval(progressInterval);
      
      let errorMessage = "Aw nuts! 😅 Something went wrong while processing your screenshots. ";
      
      if (err.message) {
        errorMessage = `Aw nuts! 😅 ${err.message}\n\n`;
        
        if (err.message.toLowerCase().includes("blur") || err.message.toLowerCase().includes("quality")) {
          errorMessage += "💡 Fix: Take a clearer photo with better lighting and focus.";
        } else if (err.message.toLowerCase().includes("text") || err.message.toLowerCase().includes("read")) {
          errorMessage += "💡 Fix: Make sure the text is clear and large enough to read. Avoid handwriting if possible.";
        } else if (err.message.toLowerCase().includes("content") || err.message.toLowerCase().includes("found") || err.message.toLowerCase().includes("no questions")) {
          errorMessage += "💡 Fix: Make sure your screenshot contains clear question-answer pairs or study material. You can also try using 'Describe Image' mode or manual entry.";
        } else {
          errorMessage += "💡 Fix: Check your internet connection and try again. If this keeps happening, try using manual entry instead.";
        }
      } else {
        errorMessage += "Please try again with clearer images or use manual entry instead.";
      }
      
      setError(errorMessage);
    }

    setIsProcessing(false);
  };

  const handleProcess = () => {
    if (processingMode === "describe") {
      describeImages();
    } else {
      processScreenshots();
    }
  };

  const handleSave = async (data) => {
    await base44.entities.StudyMaterial.create(data);
    
    // Move to next item or go to library
    if (currentEditIndex < extractedData.length - 1) {
      setCurrentEditIndex(currentEditIndex + 1);
    } else {
      navigate(createPageUrl("Library"));
    }
  };

  const handleSkip = () => {
    if (currentEditIndex < extractedData.length - 1) {
      setCurrentEditIndex(currentEditIndex + 1);
    } else {
      navigate(createPageUrl("Library"));
    }
  };

  const handleSaveAll = async () => {
    // Show warning that folder selection is required
    alert("Please review each item individually to select Subject and Topic folders. Use the 'Save All' button in the progress bar above to skip items you don't want.");
  };

  return (
    <div className="space-y-6">
      {extractedData.length === 0 && imageDescriptions.length === 0 ? (
        <>
          <Card 
            className="rounded-2xl border-2 border-dashed transition-all duration-300"
            style={{ 
              borderColor: dragActive ? 'var(--sage-600)' : 'var(--sage-200)',
              backgroundColor: '#1a1a1a'
            }}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <div className="p-12 text-center">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,.pdf"
                multiple
                onChange={(e) => handleFileSelect(e.target.files)}
                className="hidden"
              />
              <input
                ref={cameraInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                multiple
                onChange={(e) => handleFileSelect(e.target.files)}
                className="hidden"
              />
              
              {files.length === 0 ? (
                <>
                  <div className="w-20 h-20 mx-auto mb-6 rounded-full flex items-center justify-center" style={{ backgroundColor: 'var(--sage-600)' }}>
                    <Upload className="w-10 h-10 text-white" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2 text-white">Upload Screenshots</h3>
                  <p className="text-white mb-2 max-w-md mx-auto">
                    Drag and drop multiple screenshots here, or click to browse
                  </p>
                  <p className="text-sm font-medium mb-8 text-white">
                    Maximum {MAX_FILES} screenshots • Up to {MAX_QUESTIONS_PER_SCREENSHOT} questions per screenshot
                  </p>
                  <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    <Button
                      onClick={() => fileInputRef.current?.click()}
                      className="rounded-xl px-6"
                      style={{ backgroundColor: 'var(--sage-600)', color: '#ffffff' }}
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      Choose Files
                    </Button>
                    <Button
                      onClick={() => cameraInputRef.current?.click()}
                      variant="outline"
                      className="rounded-xl px-6"
                      style={{ borderColor: 'var(--sage-600)', backgroundColor: 'transparent', color: '#ffffff' }}
                    >
                      <Camera className="w-4 h-4 mr-2" />
                      Take Photos
                    </Button>
                  </div>
                  <p className="text-xs text-white mt-6">
                    Supports: PNG, JPG, JPEG, PDF
                  </p>
                </>
              ) : (
                <>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
                    {previews.map((preview, index) => (
                      <div key={index} className="relative rounded-xl overflow-hidden border-2" style={{ borderColor: 'var(--sage-600)', backgroundColor: '#000000' }}>
                        {preview.url ? (
                          <img src={preview.url} alt={`Preview ${index + 1}`} className="w-full h-32 object-cover" />
                        ) : (
                          <div className="w-full h-32 flex items-center justify-center" style={{ backgroundColor: '#000000' }}>
                            <p className="text-xs text-white px-2 text-center">{preview.name}</p>
                          </div>
                        )}
                        <button
                          onClick={() => removeFile(index)}
                          className="absolute top-2 right-2 w-6 h-6 bg-red-500 hover:bg-red-600 rounded-full flex items-center justify-center transition-colors"
                        >
                          <X className="w-4 h-4 text-white" />
                        </button>
                      </div>
                    ))}
                  </div>
                  
                  <div className="flex items-center gap-2 justify-center mb-6">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                    <p className="font-medium text-white">{files.length} file{files.length > 1 ? 's' : ''} selected</p>
                  </div>

                  {/* Processing Mode Selection */}
                  <Card className="p-6 mb-6 max-w-2xl mx-auto" style={{ backgroundColor: '#000000', borderColor: 'var(--sage-600)' }}>
                    <Label className="text-base font-semibold text-white mb-4 block">
                      How would you like to process these images?
                    </Label>
                    <RadioGroup value={processingMode} onValueChange={setProcessingMode} className="space-y-3">
                      <label 
                        htmlFor="extract"
                        className="flex items-start space-x-3 p-4 rounded-lg border-2 cursor-pointer transition-colors" 
                        style={{ 
                          borderColor: processingMode === 'extract' ? 'var(--sage-600)' : (lightMode ? '#d1d5db' : '#666666'),
                          backgroundColor: processingMode === 'extract' ? (lightMode ? '#e2e8f0' : '#2a2a2a') : (lightMode ? '#ffffff' : '#1a1a1a')
                        }}>
                        <RadioGroupItem value="extract" id="extract" style={{ marginTop: '2px' }} />
                        <div className="flex-1">
                          <div className="font-semibold cursor-pointer flex items-center gap-2" style={{ color: lightMode ? '#000000' : '#ffffff' }}>
                            <FileQuestion className="w-4 h-4" style={{ color: 'var(--sage-600)' }} />
                            Extract Questions (AI)
                          </div>
                          <p className="text-sm mt-1" style={{ color: lightMode ? '#000000' : '#ffffff', opacity: 0.7 }}>
                            AI will automatically extract questions and answers from the images
                          </p>
                        </div>
                      </label>
                      <label 
                        htmlFor="describe"
                        className="flex items-start space-x-3 p-4 rounded-lg border-2 cursor-pointer transition-colors" 
                        style={{ 
                          borderColor: processingMode === 'describe' ? 'var(--sage-600)' : (lightMode ? '#d1d5db' : '#666666'),
                          backgroundColor: processingMode === 'describe' ? (lightMode ? '#e2e8f0' : '#2a2a2a') : (lightMode ? '#ffffff' : '#1a1a1a')
                        }}>
                        <RadioGroupItem value="describe" id="describe" style={{ marginTop: '2px' }} />
                        <div className="flex-1">
                          <div className="font-semibold cursor-pointer flex items-center gap-2" style={{ color: lightMode ? '#000000' : '#ffffff' }}>
                            <ImageIcon className="w-4 h-4" style={{ color: 'var(--sage-600)' }} />
                            Describe Images (AI)
                          </div>
                          <p className="text-sm mt-1" style={{ color: lightMode ? '#000000' : '#ffffff', opacity: 0.7 }}>
                            AI will describe what's in the images, then you manually create questions
                          </p>
                        </div>
                      </label>
                    </RadioGroup>

                    {processingMode === 'extract' && (
                      <div className="mt-4 p-4 rounded-lg" style={{ backgroundColor: lightMode ? '#d9f99d' : '#1a1a1a', borderColor: 'var(--sage-600)', borderWidth: '1px', borderStyle: 'solid' }}>
                        <Label className="text-sm font-semibold mb-2 block" style={{ color: lightMode ? '#000000' : '#ffffff' }}>
                          Include images in questions?
                        </Label>
                        <RadioGroup value={includeImageInQuestion ? "yes" : "no"} onValueChange={(val) => setIncludeImageInQuestion(val === "yes")} className="space-y-2">
                          <label htmlFor="include-yes" className="flex items-center space-x-2 cursor-pointer">
                            <RadioGroupItem value="yes" id="include-yes" />
                            <span className="text-sm" style={{ color: lightMode ? '#000000' : '#ffffff' }}>
                              Yes - Show images with questions (for diagrams, graphs, visual problems)
                            </span>
                          </label>
                          <label htmlFor="include-no" className="flex items-center space-x-2 cursor-pointer">
                            <RadioGroupItem value="no" id="include-no" />
                            <span className="text-sm" style={{ color: lightMode ? '#000000' : '#ffffff' }}>
                              No - Text-only questions (for text-based content)
                            </span>
                          </label>
                        </RadioGroup>
                      </div>
                    )}
                  </Card>
                  
                  {isProcessing ? (
                    <div className="max-w-md mx-auto">
                      <div className="flex items-center justify-center gap-2 mb-3">
                        <Loader2 className="w-5 h-5 animate-spin" style={{ color: 'var(--sage-600)' }} />
                        <span className="text-white">
                          {processingMode === 'describe' ? 'Describing images...' : 'Extracting questions and answers...'}
                        </span>
                      </div>
                      <Progress value={progress} className="h-2" />
                    </div>
                  ) : (
                    <div className="flex gap-3 justify-center">
                      <Button
                        onClick={() => {
                          setFiles([]);
                          setPreviews([]);
                          setError(null);
                          setImageDescriptions([]);
                        }}
                        variant="outline"
                        className="rounded-xl"
                        style={{ borderColor: 'var(--sage-600)', backgroundColor: 'transparent', color: '#ffffff' }}
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={handleProcess}
                        className="rounded-xl px-6"
                        style={{ backgroundColor: 'var(--sage-600)', color: '#ffffff' }}
                      >
                        {processingMode === 'describe' ? 'Describe Images' : 'Extract Questions'}
                      </Button>
                    </div>
                  )}
                </>
              )}
            </div>
          </Card>

          {error && (
            <Alert variant="destructive" className="rounded-xl">
              <AlertDescription className="whitespace-pre-line">{error}</AlertDescription>
            </Alert>
          )}
        </>
      ) : imageDescriptions.length > 0 ? (
        <div className="space-y-6">
          <Card className="rounded-2xl p-6 shadow-sm border" style={{ borderColor: 'var(--sage-600)', backgroundColor: '#1a1a1a' }}>
            <h3 className="font-semibold text-white mb-2">
              Image Descriptions
            </h3>
            <p className="text-sm text-white mb-4" style={{ opacity: 0.7 }}>
              Review the AI descriptions below. You can now manually create questions based on these images.
            </p>
            <Button
              onClick={() => navigate(createPageUrl("AddMaterial") + "?tab=manual")}
              className="rounded-xl"
              style={{ backgroundColor: 'var(--sage-600)', color: '#ffffff' }}
            >
              Create Questions Manually
            </Button>
          </Card>

          {imageDescriptions.map((desc, index) => (
            <Card key={index} className="rounded-2xl p-6 shadow-sm border" style={{ borderColor: 'var(--sage-600)', backgroundColor: '#1a1a1a' }}>
              <div className="mb-4">
                <img src={desc.file_url} alt={desc.fileName} className="w-full max-h-64 object-contain rounded-lg border" style={{ borderColor: 'var(--sage-600)' }} />
              </div>
              <h4 className="font-semibold text-white mb-2">{desc.fileName}</h4>
              <p className="text-white whitespace-pre-wrap">{desc.description}</p>
            </Card>
          ))}

          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => {
                setImageDescriptions([]);
                setFiles([]);
                setPreviews([]);
              }}
              className="flex-1 rounded-xl"
              style={{ borderColor: 'var(--sage-600)', backgroundColor: 'transparent', color: '#ffffff' }}
            >
              Upload Different Images
            </Button>
            <Button
              onClick={() => navigate(createPageUrl("AddMaterial") + "?tab=manual")}
              className="flex-1 rounded-xl"
              style={{ backgroundColor: 'var(--sage-600)', color: '#ffffff' }}
            >
              Create Questions Manually
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          <Card className="rounded-2xl p-6 shadow-sm border" style={{ borderColor: 'var(--sage-600)', backgroundColor: '#1a1a1a' }}>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-white mb-1">
                  Reviewing Item {currentEditIndex + 1} of {extractedData.length}
                </h3>
                <p className="text-sm text-white" style={{ opacity: 0.7 }}>
                  Review and edit each extracted question, or save all at once
                </p>
              </div>
              <Button
                onClick={handleSaveAll}
                variant="outline"
                className="rounded-xl"
                style={{ borderColor: 'var(--sage-600)', backgroundColor: 'transparent', color: '#ffffff' }}
              >
                Save All {extractedData.length} Items
              </Button>
            </div>
            <Progress value={((currentEditIndex + 1) / extractedData.length) * 100} className="mt-4 h-2" />
          </Card>

          <ExtractedDataForm
            initialData={extractedData[currentEditIndex]}
            onSave={handleSave}
            onCancel={handleSkip}
          />
        </div>
      )}
    </div>
  );
}
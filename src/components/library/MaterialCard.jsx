import React, { useState } from "react";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp, Trash2, Tag, Clock, ExternalLink, Video } from "lucide-react";

const difficultyColors = {
  easy: "bg-emerald-100 text-emerald-700 border-emerald-200",
  medium: "bg-yellow-100 text-yellow-700 border-yellow-200",
  hard: "bg-red-100 text-red-700 border-red-200"
};

export default function MaterialCard({ material, onDelete }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showResources, setShowResources] = useState(false);

  const hasResources = material.learning_resources && (
    (material.learning_resources.websites && material.learning_resources.websites.length > 0) ||
    (material.learning_resources.videos && material.learning_resources.videos.length > 0)
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3 }}
    >
      <Card className="overflow-hidden rounded-2xl shadow-sm hover:shadow-md transition-all duration-300 border h-full flex flex-col" style={{ borderColor: 'var(--sage-200)' }}>
        <div className="p-5 flex-1 flex flex-col">
          {material.image_url && (
            <div className="mb-3 rounded-xl overflow-hidden border -mx-5 -mt-5 mb-4" style={{ borderColor: 'var(--sage-200)' }}>
              <img 
                src={material.image_url} 
                alt="Study material" 
                className="w-full h-32 object-cover"
              />
            </div>
          )}

          <div className="flex justify-between items-start mb-3">
            <div className="flex gap-2 flex-wrap flex-1">
              {material.grade_level && (
                <Badge className="border rounded-lg px-2 py-0.5 text-xs bg-purple-100 text-purple-700 border-purple-200">
                  {material.grade_level}
                </Badge>
              )}
              {material.time_period && (
                <Badge className="border rounded-lg px-2 py-0.5 text-xs bg-indigo-100 text-indigo-700 border-indigo-200">
                  <Clock className="w-3 h-3 mr-1" />
                  {material.time_period}
                </Badge>
              )}
              <Badge className={`${difficultyColors[material.difficulty]} border rounded-lg px-2 py-0.5 text-xs`}>
                {material.difficulty}
              </Badge>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onDelete(material.id)}
              className="text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors flex-shrink-0 h-8 w-8"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>

          <h3 className="text-base font-semibold text-gray-900 mb-3 leading-snug line-clamp-2">
            {material.question}
          </h3>

          {material.tags && material.tags.length > 0 && (
            <div className="flex gap-1.5 mb-3 flex-wrap">
              {material.tags.slice(0, 3).map((tag, index) => (
                <span 
                  key={index}
                  className="text-xs px-2 py-0.5 rounded-full flex items-center gap-1"
                  style={{ backgroundColor: 'var(--sage-100)', color: 'var(--sage-700)' }}
                >
                  <Tag className="w-2.5 h-2.5" />
                  {tag}
                </span>
              ))}
              {material.tags.length > 3 && (
                <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: 'var(--sage-100)', color: 'var(--sage-700)' }}>
                  +{material.tags.length - 3}
                </span>
              )}
            </div>
          )}

          <div className="mt-auto space-y-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
              className="w-full justify-between rounded-xl hover:bg-sage-50 transition-colors h-9"
            >
              <span className="font-medium text-sm" style={{ color: 'var(--sage-700)' }}>
                {isExpanded ? "Hide Answer" : "Show Answer"}
              </span>
              {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </Button>

            {hasResources && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowResources(!showResources)}
                className="w-full justify-between rounded-xl hover:bg-sage-50 transition-colors h-9"
              >
                <span className="font-medium text-sm" style={{ color: 'var(--sage-700)' }}>
                  {showResources ? "Hide Resources" : "Resources"}
                </span>
                {showResources ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </Button>
            )}
          </div>

          {isExpanded && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
              className="mt-3 p-3 rounded-xl"
              style={{ backgroundColor: 'var(--sage-50)' }}
            >
              <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                {material.answer || "No answer provided"}
              </p>
            </motion.div>
          )}

          {showResources && hasResources && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
              className="mt-3 space-y-3"
            >
              {material.learning_resources.websites && material.learning_resources.websites.length > 0 && (
                <div className="p-3 rounded-xl bg-blue-50 border border-blue-200">
                  <h4 className="font-semibold text-blue-900 mb-2 flex items-center gap-2 text-sm">
                    <ExternalLink className="w-3.5 h-3.5" />
                    Websites
                  </h4>
                  <div className="space-y-2">
                    {material.learning_resources.websites.slice(0, 2).map((site, index) => (
                      <a
                        key={index}
                        href={site.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block p-2 bg-white rounded-lg hover:shadow-sm transition-all duration-200"
                      >
                        <p className="font-medium text-blue-700 text-xs mb-0.5">{site.title}</p>
                        <p className="text-xs text-gray-600 line-clamp-1">{site.description}</p>
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {material.learning_resources.videos && material.learning_resources.videos.length > 0 && (
                <div className="p-3 rounded-xl bg-purple-50 border border-purple-200">
                  <h4 className="font-semibold text-purple-900 mb-2 flex items-center gap-2 text-sm">
                    <Video className="w-3.5 h-3.5" />
                    Videos
                  </h4>
                  <div className="space-y-2">
                    {material.learning_resources.videos.slice(0, 2).map((video, index) => (
                      <a
                        key={index}
                        href={video.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block p-2 bg-white rounded-lg hover:shadow-sm transition-all duration-200"
                      >
                        <p className="font-medium text-purple-700 text-xs mb-0.5">{video.title}</p>
                        <p className="text-xs text-gray-600 line-clamp-1">{video.description}</p>
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </div>
      </Card>
    </motion.div>
  );
}
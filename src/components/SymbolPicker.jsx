import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Omega, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const SYMBOL_CATEGORIES = {
  basic: {
    name: "Basic Math",
    symbols: [
      { symbol: "+", name: "Plus" },
      { symbol: "-", name: "Minus" },
      { symbol: "×", name: "Multiply" },
      { symbol: "÷", name: "Divide" },
      { symbol: "=", name: "Equals" },
      { symbol: "≠", name: "Not Equal" },
      { symbol: "≈", name: "Approximately" },
      { symbol: "±", name: "Plus/Minus" },
      { symbol: "%", name: "Percent" },
      { symbol: "°", name: "Degree" },
    ]
  },
  powers: {
    name: "Powers & Roots",
    symbols: [
      { symbol: "²", name: "Squared" },
      { symbol: "³", name: "Cubed" },
      { symbol: "⁴", name: "4th Power" },
      { symbol: "⁵", name: "5th Power" },
      { symbol: "⁶", name: "6th Power" },
      { symbol: "⁷", name: "7th Power" },
      { symbol: "⁸", name: "8th Power" },
      { symbol: "⁹", name: "9th Power" },
      { symbol: "√", name: "Square Root" },
      { symbol: "∛", name: "Cube Root" },
      { symbol: "∜", name: "4th Root" },
      { symbol: "ⁿ", name: "nth Power" },
    ]
  },
  greek: {
    name: "Greek Letters",
    symbols: [
      { symbol: "α", name: "Alpha" },
      { symbol: "β", name: "Beta" },
      { symbol: "γ", name: "Gamma" },
      { symbol: "δ", name: "Delta" },
      { symbol: "ε", name: "Epsilon" },
      { symbol: "θ", name: "Theta" },
      { symbol: "λ", name: "Lambda" },
      { symbol: "μ", name: "Mu" },
      { symbol: "π", name: "Pi" },
      { symbol: "σ", name: "Sigma" },
      { symbol: "τ", name: "Tau" },
      { symbol: "φ", name: "Phi" },
      { symbol: "ω", name: "Omega" },
      { symbol: "Δ", name: "Delta (Cap)" },
      { symbol: "Σ", name: "Sigma (Cap)" },
      { symbol: "Ω", name: "Omega (Cap)" },
    ]
  },
  calculus: {
    name: "Calculus",
    symbols: [
      { symbol: "∫", name: "Integral" },
      { symbol: "∮", name: "Contour Integral" },
      { symbol: "∂", name: "Partial Derivative" },
      { symbol: "∇", name: "Nabla/Gradient" },
      { symbol: "∞", name: "Infinity" },
      { symbol: "→", name: "Approaches" },
      { symbol: "lim", name: "Limit" },
      { symbol: "∑", name: "Sum" },
      { symbol: "∏", name: "Product" },
      { symbol: "d/dx", name: "Derivative" },
    ]
  },
  inequalities: {
    name: "Inequalities",
    symbols: [
      { symbol: "<", name: "Less Than" },
      { symbol: ">", name: "Greater Than" },
      { symbol: "≤", name: "Less or Equal" },
      { symbol: "≥", name: "Greater or Equal" },
      { symbol: "≪", name: "Much Less" },
      { symbol: "≫", name: "Much Greater" },
      { symbol: "≺", name: "Precedes" },
      { symbol: "≻", name: "Succeeds" },
    ]
  },
  sets: {
    name: "Sets & Logic",
    symbols: [
      { symbol: "∈", name: "Element of" },
      { symbol: "∉", name: "Not Element of" },
      { symbol: "⊂", name: "Subset" },
      { symbol: "⊃", name: "Superset" },
      { symbol: "⊆", name: "Subset or Equal" },
      { symbol: "⊇", name: "Superset or Equal" },
      { symbol: "∪", name: "Union" },
      { symbol: "∩", name: "Intersection" },
      { symbol: "∅", name: "Empty Set" },
      { symbol: "∀", name: "For All" },
      { symbol: "∃", name: "Exists" },
      { symbol: "∴", name: "Therefore" },
    ]
  },
  arrows: {
    name: "Arrows",
    symbols: [
      { symbol: "←", name: "Left Arrow" },
      { symbol: "→", name: "Right Arrow" },
      { symbol: "↑", name: "Up Arrow" },
      { symbol: "↓", name: "Down Arrow" },
      { symbol: "↔", name: "Left-Right Arrow" },
      { symbol: "⇒", name: "Implies" },
      { symbol: "⇔", name: "If and Only If" },
      { symbol: "↦", name: "Maps To" },
    ]
  },
  chemistry: {
    name: "Chemistry",
    symbols: [
      { symbol: "⁺", name: "Plus (superscript)" },
      { symbol: "⁻", name: "Minus (superscript)" },
      { symbol: "⇌", name: "Equilibrium" },
      { symbol: "→", name: "Yields" },
      { symbol: "↑", name: "Gas" },
      { symbol: "↓", name: "Precipitate" },
      { symbol: "₁", name: "Subscript 1" },
      { symbol: "₂", name: "Subscript 2" },
      { symbol: "₃", name: "Subscript 3" },
      { symbol: "₄", name: "Subscript 4" },
      { symbol: "H₂O", name: "Water" },
      { symbol: "CO₂", name: "Carbon Dioxide" },
    ]
  },
  fractions: {
    name: "Fractions",
    symbols: [
      { symbol: "¼", name: "One Quarter" },
      { symbol: "½", name: "One Half" },
      { symbol: "¾", name: "Three Quarters" },
      { symbol: "⅓", name: "One Third" },
      { symbol: "⅔", name: "Two Thirds" },
      { symbol: "⅕", name: "One Fifth" },
      { symbol: "⅖", name: "Two Fifths" },
      { symbol: "⅗", name: "Three Fifths" },
      { symbol: "⅘", name: "Four Fifths" },
      { symbol: "⅙", name: "One Sixth" },
      { symbol: "⅛", name: "One Eighth" },
      { symbol: "⅜", name: "Three Eighths" },
    ]
  }
};

export default function SymbolPicker({ onSelect, buttonVariant = "outline" }) {
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("basic");

  const handleSymbolClick = (symbol) => {
    onSelect(symbol);
    // Keep the popover open for multiple selections
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant={buttonVariant}
          size="sm"
          className="rounded-xl border-2"
          style={{ borderColor: 'var(--sage-600)', backgroundColor: 'transparent', color: '#ffffff' }}
        >
          <Omega className="w-4 h-4 mr-2" style={{ color: '#ffffff' }} />
          <span style={{ color: '#ffffff' }}>Insert Symbol</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent 
        className="w-96 p-0" 
        style={{ backgroundColor: '#1a1a1a', borderColor: 'var(--sage-600)', borderWidth: '2px' }}
        align="start"
      >
        <div className="flex items-center justify-between p-4 border-b" style={{ borderColor: 'var(--sage-600)' }}>
          <div className="flex items-center gap-2">
            <Omega className="w-5 h-5" style={{ color: 'var(--sage-600)' }} />
            <h3 className="font-semibold text-white">Scientific Symbols</h3>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setOpen(false)}
            className="h-6 w-6 rounded-lg"
          >
            <X className="w-4 h-4" style={{ color: '#ffffff' }} />
          </Button>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="w-full grid grid-cols-3 p-2 gap-1 rounded-none" style={{ backgroundColor: '#000000' }}>
            <TabsTrigger 
              value="basic" 
              className="text-xs rounded-lg"
              style={{
                backgroundColor: activeTab === 'basic' ? 'var(--sage-600)' : 'transparent',
                color: '#ffffff'
              }}
            >
              Math
            </TabsTrigger>
            <TabsTrigger 
              value="greek" 
              className="text-xs rounded-lg"
              style={{
                backgroundColor: activeTab === 'greek' ? 'var(--sage-600)' : 'transparent',
                color: '#ffffff'
              }}
            >
              Greek
            </TabsTrigger>
            <TabsTrigger 
              value="chemistry" 
              className="text-xs rounded-lg"
              style={{
                backgroundColor: activeTab === 'chemistry' ? 'var(--sage-600)' : 'transparent',
                color: '#ffffff'
              }}
            >
              Chemistry
            </TabsTrigger>
          </TabsList>

          <div className="px-2 py-2">
            <div className="flex gap-1 mb-2 overflow-x-auto pb-2">
              {Object.entries(SYMBOL_CATEGORIES).map(([key, category]) => (
                <Badge
                  key={key}
                  variant="outline"
                  className="cursor-pointer rounded-lg whitespace-nowrap text-xs"
                  style={{
                    backgroundColor: activeTab === key ? 'var(--sage-600)' : '#000000',
                    borderColor: 'var(--sage-600)',
                    color: '#ffffff'
                  }}
                  onClick={() => setActiveTab(key)}
                >
                  {category.name}
                </Badge>
              ))}
            </div>
          </div>

          {Object.entries(SYMBOL_CATEGORIES).map(([key, category]) => (
            <TabsContent key={key} value={key} className="m-0 p-4 max-h-80 overflow-y-auto">
              <div className="grid grid-cols-4 gap-2">
                {category.symbols.map((item, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => handleSymbolClick(item.symbol)}
                    className="p-3 rounded-lg border-2 hover:scale-105 transition-all duration-200 group"
                    style={{
                      backgroundColor: '#000000',
                      borderColor: 'var(--sage-600)',
                      color: '#ffffff'
                    }}
                    title={item.name}
                  >
                    <div className="text-center">
                      <div className="text-2xl mb-1" style={{ color: '#ffffff' }}>
                        {item.symbol}
                      </div>
                      <div className="text-xs opacity-70 group-hover:opacity-100 transition-opacity" style={{ color: '#ffffff' }}>
                        {item.name}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </TabsContent>
          ))}
        </Tabs>

        <div className="p-3 border-t text-center" style={{ borderColor: 'var(--sage-600)', backgroundColor: '#000000' }}>
          <p className="text-xs" style={{ color: '#ffffff', opacity: 0.7 }}>
            Click any symbol to insert it
          </p>
        </div>
      </PopoverContent>
    </Popover>
  );
}
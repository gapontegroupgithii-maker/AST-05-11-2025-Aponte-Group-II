import { useState } from "react";
import { Bot, Sparkles, X, Send, TrendingUp, Code, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";

interface AIPanelProps {
  isOpen: boolean;
  onToggle: () => void;
  isMarketPanelOpen?: boolean;
  forceShowFloating?: boolean;
}

interface Message {
  role: "user" | "assistant";
  content: string;
}

const AIPanel = ({ isOpen, onToggle, isMarketPanelOpen, forceShowFloating }: AIPanelProps) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: "Hello! I'm your AI trading assistant powered by Gemini. I can help you analyze charts, generate indicators, and optimize strategies. How can I assist you today?",
    },
  ]);
  const [input, setInput] = useState("");
  const [isGrokActive, setIsGrokActive] = useState(false);
  const [apiKey, setApiKey] = useState("");
  const [showApiInput, setShowApiInput] = useState(false);

  const handleSend = () => {
    if (!input.trim()) return;

    const userMessage: Message = { role: "user", content: input };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");

    // Simulate AI response
    setTimeout(() => {
      const aiResponse: Message = {
        role: "assistant",
        content: `I understand you want to: "${input}". ${
          isGrokActive
            ? "Using Grok AI to analyze your request..."
            : "Using Gemini AI to analyze your request..."
        } (Full AI integration coming soon!)`,
      };
      setMessages((prev) => [...prev, aiResponse]);
    }, 1000);
  };

  const activateGrok = () => {
    if (!apiKey.trim()) {
      alert("Please enter your xAI API key");
      return;
    }
    setIsGrokActive(true);
    setShowApiInput(false);
    setMessages((prev) => [
      ...prev,
      {
        role: "assistant",
        content: "Grok AI activated! I'm now using the xAI API for enhanced analysis.",
      },
    ]);
  };

  // When the AI panel is closed we render a floating button. If the MarketPanel
  // is open, we skip the global floating button because MarketPanel renders its
  // own floating-style AI button (anchored under Securities Lending per Option B).
  if (!isOpen) {
    // If forceShowFloating is true we show the global floating button even when market panel is open
    if (isMarketPanelOpen && !forceShowFloating) return null;
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              onClick={onToggle}
              // ensure button is above chart overlays (chart uses very large z-index)
              style={{ zIndex: 200000, pointerEvents: 'auto' }}
              className="fixed right-4 top-20 bg-panel-bg border border-border hover:bg-secondary shadow-lg"
              title="Open AI Assistant"
              aria-label="Open AI Assistant"
            >
              <Bot className="w-5 h-5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="left">
            <p className="text-xs">Open AI Assistant</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <div className="fixed right-0 top-14 bottom-0 w-96 border-l border-border bg-panel-bg/98 backdrop-blur-md flex flex-col shadow-2xl z-40 animate-in slide-in-from-right duration-300">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-border">
        <div className="flex items-center gap-2">
          {isGrokActive ? (
            <Sparkles className="w-5 h-5 text-primary" />
          ) : (
            <Bot className="w-5 h-5 text-primary" />
          )}
          <span className="font-semibold">
            {isGrokActive ? "Grok AI" : "Gemini AI"}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {!isGrokActive && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowApiInput(!showApiInput)}
              className="text-xs"
            >
              Activate Grok
            </Button>
          )}
          <Button variant="ghost" size="icon" onClick={onToggle}>
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Grok API Key Input */}
      {showApiInput && (
        <div className="p-3 bg-secondary/50 border-b border-border">
          <div className="text-xs text-muted-foreground mb-2">
            Enter your xAI API key to activate Grok:
          </div>
          <div className="flex gap-2">
            <Input
              type="password"
              placeholder="xai-..."
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              className="text-xs"
            />
            <Button size="sm" onClick={activateGrok}>
              Activate
            </Button>
          </div>
        </div>
      )}

      {/* AI Tabs */}
      <Tabs defaultValue="chat" className="flex-1 flex flex-col">
        <TabsList className="w-full grid grid-cols-3 rounded-none border-b border-border">
          <TabsTrigger value="chat" className="text-xs">
            <Bot className="w-3 h-3 mr-1" />
            Chat
          </TabsTrigger>
          <TabsTrigger value="analysis" className="text-xs">
            <TrendingUp className="w-3 h-3 mr-1" />
            Analysis
          </TabsTrigger>
          <TabsTrigger value="generator" className="text-xs">
            <Code className="w-3 h-3 mr-1" />
            Generator
          </TabsTrigger>
        </TabsList>

        {/* Chat Tab */}
        <TabsContent value="chat" className="flex-1 flex flex-col mt-0">
          <ScrollArea className="flex-1 p-3">
            <div className="space-y-4">
              {messages.map((message, index) => (
                <div
                  key={index}
                  className={`flex ${
                    message.role === "user" ? "justify-end" : "justify-start"
                  }`}
                >
                  <div
                    className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${
                      message.role === "user"
                        ? "bg-primary text-primary-foreground"
                        : "bg-secondary text-secondary-foreground"
                    }`}
                  >
                    {message.content}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>

          {/* Input */}
          <div className="p-3 border-t border-border">
            <div className="flex gap-2">
              <Input
                placeholder="Ask me anything..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && handleSend()}
              />
              <Button size="icon" onClick={handleSend}>
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </TabsContent>

        {/* Analysis Tab */}
        <TabsContent value="analysis" className="flex-1 p-3 mt-0">
          <div className="space-y-4">
            <div className="p-3 bg-secondary/50 rounded border border-border">
              <div className="text-sm font-semibold mb-2">Chart Analysis</div>
              <div className="text-xs text-muted-foreground">
                Real-time analysis of indicators, patterns, and price structures.
              </div>
            </div>
            <div className="p-3 bg-secondary/50 rounded border border-border">
              <div className="text-sm font-semibold mb-2">Strategy Analysis</div>
              <div className="text-xs text-muted-foreground">
                Review entry/exit points and optimize TP/SL settings.
              </div>
            </div>
            <Button className="w-full">
              <BarChart3 className="w-4 h-4 mr-2" />
              Analyze Current Chart
            </Button>
          </div>
        </TabsContent>

        {/* Generator Tab */}
        <TabsContent value="generator" className="flex-1 p-3 mt-0">
          <div className="space-y-4">
            <div className="p-3 bg-secondary/50 rounded border border-border">
              <div className="text-sm font-semibold mb-2">Indicator Generator</div>
              <div className="text-xs text-muted-foreground mb-3">
                Describe what indicator you want to create, and I'll generate Star Script code for you.
              </div>
              <Input placeholder="E.g., RSI with moving average crossover..." />
            </div>
            <Button className="w-full">
              <Code className="w-4 h-4 mr-2" />
              Generate Star Script
            </Button>
            <div className="text-xs text-muted-foreground text-center">
              Powered by {isGrokActive ? "Grok AI (xAI)" : "Gemini AI (Google)"}
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AIPanel;

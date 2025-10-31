import { useState, useEffect } from "react";
import { ChevronUp, Code, BarChart3, ArrowLeftRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";

interface BottomPanelProps {
  starScriptEditId?: string|null;
  starScriptContent?: string;
  setStarScriptContent?: (content: string) => void;
  onSaveStarScript?: (content: string) => void;
  onCloseStarScript?: () => void;
}

const BottomPanel = ({ starScriptEditId, starScriptContent, setStarScriptContent, onSaveStarScript, onCloseStarScript }: BottomPanelProps) => {
  const [isCollapsed, setIsCollapsed] = useState(false);

  useEffect(() => {
    // If a script is requested to edit, ensure panel is open
    if (starScriptEditId) setIsCollapsed(false);
  }, [starScriptEditId]);

  if (isCollapsed) {
    return (
      <div className="h-8 bg-panel-bg border-t border-border flex items-center justify-center">
        <Button
          variant="ghost"
          size="sm"
          className="h-6 w-6 p-0"
          onClick={() => setIsCollapsed(false)}
        >
          <ChevronUp className="w-4 h-4 rotate-180" />
        </Button>
      </div>
    );
  }

  return (
    <div className="h-64 bg-panel-bg border-t border-border flex flex-col shrink-0">
      {/* Collapse Button */}
      <div className="h-8 border-b border-border flex items-center justify-center shrink-0">
        <Button
          variant="ghost"
          size="sm"
          className="h-6 w-6 p-0"
          onClick={() => setIsCollapsed(true)}
        >
          <ChevronUp className="w-4 h-4" />
        </Button>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="script" className="flex-1 flex flex-col">
        <TabsList className="w-full justify-start rounded-none bg-toolbar-bg border-b border-border h-10 shrink-0">
          <TabsTrigger value="script" className="gap-2">
            <Code className="w-4 h-4" />
            Star Script Editor
          </TabsTrigger>
          <TabsTrigger value="tester" className="gap-2">
            <BarChart3 className="w-4 h-4" />
            Strategy Tester
          </TabsTrigger>
          <TabsTrigger value="translator" className="gap-2">
            <ArrowLeftRight className="w-4 h-4" />
            Translator
          </TabsTrigger>
        </TabsList>

        <TabsContent value="script" className="flex-1 p-4 m-0 overflow-auto">
          <div className="space-y-2 h-full flex flex-col">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">Star Script Editor</h3>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" className="h-7 text-xs">
                  Load Script
                </Button>
                <Button size="sm" className="h-7 text-xs">
                  Run on Chart
                </Button>
              </div>
            </div>
            {starScriptEditId ? (
              <>
                <Textarea
                  value={starScriptContent}
                  onChange={e => setStarScriptContent?.(e.target.value)}
                  className="flex-1 font-mono text-xs bg-background border-border resize-none"
                />
                <div className="flex gap-2 mt-2">
                  <Button size="sm" variant="default" onClick={() => onSaveStarScript?.(starScriptContent || '')}>Guardar</Button>
                  <Button size="sm" variant="ghost" onClick={() => onCloseStarScript?.()}>Cerrar</Button>
                </div>
              </>
            ) : (
              <Textarea
                placeholder="// Star Script - Identical to Pine Script v5&#x0A;// Use star() instead of strategy() or indicator()&#x0A;&#x0A;//@version=5&#x0A;star('My Strategy', overlay=true)&#x0A;&#x0A;// Your trading logic here..."
                className="flex-1 font-mono text-xs bg-background border-border resize-none"
              />
            )}
          </div>
        </TabsContent>

        <TabsContent value="tester" className="flex-1 p-4 m-0 overflow-auto">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">Strategy Tester</h3>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" className="h-7 text-xs">
                  Configure
                </Button>
                <Button size="sm" className="h-7 text-xs">
                  Start Backtest
                </Button>
              </div>
            </div>
            
            <div className="grid grid-cols-4 gap-4">
              <div className="bg-secondary rounded p-3">
                <div className="text-xs text-muted-foreground mb-1">Total Profit</div>
                <div className="text-lg font-bold text-bullish">+0.00%</div>
              </div>
              <div className="bg-secondary rounded p-3">
                <div className="text-xs text-muted-foreground mb-1">Win Rate</div>
                <div className="text-lg font-bold">0.00%</div>
              </div>
              <div className="bg-secondary rounded p-3">
                <div className="text-xs text-muted-foreground mb-1">Max Drawdown</div>
                <div className="text-lg font-bold text-bearish">0.00%</div>
              </div>
              <div className="bg-secondary rounded p-3">
                <div className="text-xs text-muted-foreground mb-1">Trades</div>
                <div className="text-lg font-bold">0</div>
              </div>
            </div>

            <p className="text-xs text-muted-foreground">
              Run a Star Script strategy to see backtest results here.
            </p>
          </div>
        </TabsContent>

        <TabsContent value="translator" className="flex-1 p-4 m-0 overflow-auto">
          <div className="space-y-4 h-full flex flex-col">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">Bidirectional Translator</h3>
              <Button size="sm" className="h-7 text-xs">
                Translate
              </Button>
            </div>
            
            <div className="flex-1 grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-medium">Pine Script Input</label>
                <Textarea
                  placeholder="// Paste Pine Script code here..."
                  className="h-full font-mono text-xs bg-background border-border resize-none"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-medium">Star Script Output</label>
                <Textarea
                  placeholder="// Converted Star Script will appear here..."
                  className="h-full font-mono text-xs bg-background border-border resize-none"
                  readOnly
                />
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default BottomPanel;

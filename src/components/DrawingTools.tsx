import { 
  MousePointer2, 
  TrendingUp, 
  Minus, 
  Ruler, 
  Triangle,
  Square,
  Circle,
  Crosshair,
  Type,
  Pencil,
  Eraser,
  Trash2
} from "lucide-react";
import React from 'react';
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { DrawingTool } from "@/hooks/useDrawingTools";
import { useDrawingStore } from "@/store/drawingStore";

interface DrawingToolsProps {
  activeTool: DrawingTool;
  onToolChange: (tool: DrawingTool) => void;
  onClear: () => void;
}

const DrawingTools = ({ activeTool, onToolChange, onClear }: DrawingToolsProps) => {
  const { dragState, setActiveTool: setStoreTool } = useDrawingStore();
  const storeActive = useDrawingStore(state => state.activeTool);

  const handleToolClick = (toolId: DrawingTool) => {
    // Toggle tool: clicking active tool deselects it. Use store as source-of-truth.
    const currently = storeActive ?? activeTool;
    const next = currently === toolId ? 'select' : toolId;
    onToolChange(next as DrawingTool);
    // Sync with drawing store (used by advanced drawing engine)
    setStoreTool(next === 'select' ? null : next);
  };

  const tools: { id: DrawingTool; icon: React.ComponentType<React.SVGProps<SVGSVGElement>>; label: string }[] = [
    { id: "select", icon: MousePointer2, label: "Select" },
    { id: "trendline", icon: TrendingUp, label: "Trend Line" },
    { id: "horizontal", icon: Minus, label: "Horizontal Line" },
    { id: "vertical", icon: Minus, label: "Vertical Line" },
    { id: "ruler", icon: Ruler, label: "Ruler / Measure" },
    { id: "fibonacci", icon: Triangle, label: "Fibonacci Retracement" },
    { id: "rectangle", icon: Square, label: "Rectangle" },
    { id: "circle", icon: Circle, label: "Circle" },
    { id: "text", icon: Type, label: "Text Annotation" },
    { id: "draw", icon: Pencil, label: "Free Drawing" },
    { id: "eraser", icon: Eraser, label: "Eraser" },
  ];

  return (
    <div className="w-14 bg-panel-bg border-r border-border flex flex-col items-center py-3 gap-1 shrink-0">
      <TooltipProvider>
        {/* Cursor selector: three separate buttons (Arrow, Cross, Dot) */}
        <div className="flex flex-col gap-1 items-center">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button size="sm" variant={activeTool === 'cursor-arrow' ? 'default' : 'ghost'} className={`w-10 h-10 p-0 ${dragState.isDragging ? 'animate-pulse' : ''}`} onClick={() => handleToolClick('cursor-arrow')}>
                <MousePointer2 className="w-5 h-5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right"><p className="text-xs">Pointer</p></TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button size="sm" variant={activeTool === 'cursor-cross' ? 'default' : 'ghost'} className="w-10 h-10 p-0" onClick={() => handleToolClick('cursor-cross')}>
                <Crosshair className="w-5 h-5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right"><p className="text-xs">Crosshair</p></TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button size="sm" variant={activeTool === 'cursor-dot' ? 'default' : 'ghost'} className="w-10 h-10 p-0" onClick={() => handleToolClick('cursor-dot')}>
                <Circle className="w-5 h-5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right"><p className="text-xs">Dot</p></TooltipContent>
          </Tooltip>
        </div>

        {tools.map((tool, index) => (
          <div key={tool.id}>
            {index === 1 && <Separator className="my-1 w-8" />}
            {index === 6 && <Separator className="my-1 w-8" />}
            
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={activeTool === tool.id ? "default" : "ghost"}
                  size="sm"
                  className={`w-10 h-10 p-0 transition-all ${
                    activeTool === tool.id 
                      ? 'scale-110 shadow-lg ring-2 ring-primary ring-offset-2 ring-offset-background' 
                      : 'hover:scale-110'
                  } ${
                    dragState.isDragging && activeTool === tool.id 
                      ? 'animate-pulse' 
                      : ''
                  }`}
                  onClick={() => handleToolClick(tool.id)}
                >
                  {/* Rotate the minus icon for vertical line visually */}
                  <tool.icon className={`w-5 h-5 ${tool.id === 'vertical' ? 'rotate-90' : ''}`} />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">
                <p className="text-xs font-medium">{tool.label}</p>
                {tool.id === 'trendline' && <p className="text-xs text-muted-foreground mt-1">Alt+T</p>}
                {tool.id === 'horizontal' && <p className="text-xs text-muted-foreground mt-1">Alt+H</p>}
                {tool.id === 'fibonacci' && <p className="text-xs text-muted-foreground mt-1">Alt+F</p>}
                {tool.id === 'ruler' && <p className="text-xs text-muted-foreground mt-1">Shift+Click</p>}
              </TooltipContent>
            </Tooltip>
          </div>
        ))}
        
        <Separator className="my-1 w-8" />
        
        {/* Clear All Button */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="w-10 h-10 p-0 transition-all hover:scale-110 hover:text-destructive"
              onClick={onClear}
            >
              <Trash2 className="w-5 h-5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right">
            <p className="text-xs">Clear All Drawings</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
};

export default DrawingTools;

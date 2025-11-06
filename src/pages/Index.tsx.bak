// Limpia claves locales de preview de IA al cargar la app
if (typeof window !== 'undefined') {
  [
    'ai_h_offset',
    'ai_v_percent',
    'ai_tooltip',
    'ai_anim',
    'ai_show_both',
  ].forEach(k => {
  try { window.localStorage.removeItem(k); } catch (e) { /* ignore */ }
  });
}
import { useState } from "react";
import { toast } from "@/components/ui/use-toast";
import TopToolbar from "@/components/TopToolbar";
import IndicatorsModal from '@/components/IndicatorsModal';
import AlertsModal from '@/components/AlertsModal';
import ReplayModal from '@/components/ReplayModal';
import DrawingTools from "@/components/DrawingTools";
import TradingChart from "@/components/TradingChart";
import MarketPanel from "@/components/MarketPanel";
import BottomPanel from "@/components/BottomPanel";
import AIPanel from "@/components/AIPanel";
import { useDrawingTools } from "@/hooks/useDrawingTools";

const Index = () => {
  // Try to load saved user configuration (persisted between sessions)
  const loadSavedConfig = () => {
    if (typeof window === 'undefined') return null;
    try {
      const raw = window.localStorage.getItem('ast_user_config');
      if (!raw) return null;
      return JSON.parse(raw);
    } catch (err) {
      return null;
    }
  };

  const saved = loadSavedConfig();
  const [symbol, setSymbol] = useState<string>(saved?.symbol ?? "ETHUSDT");
  // use canonical timeframe ids in lowercase where appropriate
  // Default app open timeframe: 5 minutes (or saved value)
  const [timeframe, setTimeframe] = useState<string>(saved?.timeframe ?? "5m");
  // Abrimos el MarketPanel por defecto para que sea visible al cargar la app
  const [isMarketPanelOpen, setIsMarketPanelOpen] = useState(true);
  const [isAIPanelOpen, setIsAIPanelOpen] = useState(false);
  const [isIndicatorsOpen, setIsIndicatorsOpen] = useState(false);
  const [isAlertsOpen, setIsAlertsOpen] = useState(false);
  const [isReplayOpen, setIsReplayOpen] = useState(false);
  // Estado para edición avanzada Star Script en panel inferior
  const [starScriptEditId, setStarScriptEditId] = useState<string|null>(null);
  const [starScriptContent, setStarScriptContent] = useState<string>('');
  
  const drawingTools = useDrawingTools();

  // Save current UI configuration to localStorage (manual save triggered from toolbar)
  const saveConfig = () => {
    if (typeof window === 'undefined') return;
    try {
      // Leer chartSettings si existe
      let chartSettings = null;
      try {
        const raw = window.localStorage.getItem('chartSettings');
        if (raw) chartSettings = JSON.parse(raw);
      } catch (err) { chartSettings = null; }

      // Filtrar activeTool para evitar modos transitorios
      let activeTool = drawingTools.activeTool;
      if (activeTool === 'ruler') activeTool = 'cursor-cross';

      const cfg = {
        symbol,
        timeframe,
        isMarketPanelOpen,
        isAIPanelOpen,
        activeTool,
        chartSettings,
      } as Record<string, unknown>;
      window.localStorage.setItem('ast_user_config', JSON.stringify(cfg));
      try { window.dispatchEvent(new CustomEvent('astConfigSaved', { detail: cfg })); } catch (err) { /* ignore */ }
      toast({
        title: 'Configuración guardada',
        description: 'Tus preferencias se han guardado correctamente.',
        duration: 3000,
      });
      console.log('[Index] saved user config', cfg);
    } catch (err) {
      toast({
        title: 'Error al guardar',
        description: 'No se pudo guardar la configuración.',
        duration: 3000,
        variant: 'destructive',
      });
      console.warn('[Index] failed to save user config', err);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-background overflow-hidden">
      {/* Top Toolbar */}
      <TopToolbar
        symbol={symbol}
        timeframe={timeframe}
        onSymbolChange={setSymbol}
        onTimeframeChange={setTimeframe}
        onOpenIndicators={() => setIsIndicatorsOpen(true)}
        onOpenAlerts={() => setIsAlertsOpen(true)}
        onOpenReplay={() => setIsReplayOpen(true)}
      />

      {/* Main Content Area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Drawing Tools */}
        <DrawingTools 
          activeTool={drawingTools.activeTool}
          onToolChange={drawingTools.setActiveTool}
          onClear={drawingTools.clearDrawings}
        />

        {/* Center Chart Area */}
        <div className="flex-1 flex flex-col min-w-0">
          <TradingChart 
            symbol={symbol} 
            timeframe={timeframe}
            drawingTools={drawingTools}
            isMarketPanelOpen={isMarketPanelOpen}
          />
          
          {/* Bottom Panel */}
          <BottomPanel
            starScriptEditId={starScriptEditId}
            starScriptContent={starScriptContent}
            setStarScriptContent={setStarScriptContent}
            onSaveStarScript={(content) => {
              // Guardar el contenido editado en el indicador correspondiente
              try {
                const raw = window.localStorage.getItem('star_script_indicators');
                const indicators = raw ? JSON.parse(raw) : [];
                const updated = indicators.map((i: any) =>
                  i.id === starScriptEditId ? { ...i, params: { params: content } } : i
                );
                window.localStorage.setItem('star_script_indicators', JSON.stringify(updated));
              } catch (err) { /* ignore */ }
              setStarScriptEditId(null);
            }}
            onCloseStarScript={() => setStarScriptEditId(null)}
          />
        </div>

        {/* Right Market Panel */}
        <MarketPanel 
          isOpen={isMarketPanelOpen}
          onToggle={() => setIsMarketPanelOpen(!isMarketPanelOpen)}
          onOpenAI={() => setIsAIPanelOpen(true)}
        />
      </div>

      {/* AI Panel - Overlays the chart when open */}
      {/* read ai_show_both from localStorage to allow overriding hide behaviour */}
      <AIPanel
        isOpen={isAIPanelOpen}
        onToggle={() => setIsAIPanelOpen(!isAIPanelOpen)}
        isMarketPanelOpen={isMarketPanelOpen}
        forceShowFloating={Boolean(typeof window !== 'undefined' && window.localStorage?.getItem('ai_show_both') === '1')}
      />

        {/* Modals triggered from TopToolbar */}
        <IndicatorsModal isOpen={isIndicatorsOpen} onOpenChange={setIsIndicatorsOpen} onOpenStarScriptEditor={(id, content) => {
          setIsIndicatorsOpen(false);
          setStarScriptEditId(id);
          setStarScriptContent(content || '');
        }} />
        <AlertsModal isOpen={isAlertsOpen} onOpenChange={setIsAlertsOpen} />
        <ReplayModal isOpen={isReplayOpen} onOpenChange={setIsReplayOpen} />
    </div>
  );
};

export default Index;

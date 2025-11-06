import { Search, TrendingUp, Bell, Clock, Settings, BarChart3, Building2, PlayCircle, Save } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import ChartSettingsDialog from './ChartSettingsDialog';
import { useState } from "react";

interface TopToolbarProps {
  symbol: string;
  timeframe: string;
  onSymbolChange: (symbol: string) => void;
  onTimeframeChange: (timeframe: string) => void;
  onExchangeChange?: (exchange: string) => void;
  onOpenIndicators?: () => void;
  onOpenAlerts?: () => void;
  onOpenReplay?: () => void;
  onSaveConfig?: () => void;
}

const TopToolbar = ({ symbol, timeframe, onSymbolChange, onTimeframeChange, onExchangeChange, onOpenIndicators, onOpenAlerts, onOpenReplay, onSaveConfig }: TopToolbarProps) => {
  // canonical timeframes: id -> display label
  const timeframes = [
    { id: '1m', label: '1m' },
    { id: '5m', label: '5m' },
    { id: '15m', label: '15m' },
    { id: '30m', label: '30m' },
    { id: '1h', label: '1H' },
    { id: '12h', label: '12H' },
    { id: '1d', label: '1D' },
    { id: '1w', label: '1W' },
    { id: '1M', label: '1M' },
  ];
  const [exchange, setExchange] = useState("Binance");

  const exchanges = [
    "Binance",
    "Bitget",
    "Bybit",
    "Deribit",
    "TradeStation",
    "Interactive Brokers",
    "Saxo Bank",
    "IG Group"
  ];

  const handleExchangeChange = (value: string) => {
    setExchange(value);
    onExchangeChange?.(value);
  };

  return (
    <div className="h-12 bg-toolbar-bg border-b border-border flex items-center px-3 gap-3 shrink-0">
      {/* AST Logo */}
      <div className="flex items-center gap-2 mr-2">
        <TrendingUp className="w-5 h-5 text-primary" />
        <span className="font-bold text-sm">AST</span>
      </div>

      {/* Symbol Search */}
      <div className="relative w-48">
        <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          value={symbol}
          onChange={(e) => onSymbolChange(e.target.value)}
          className="pl-8 h-8 bg-secondary border-border text-sm"
          placeholder="Search symbol..."
        />
      </div>

      {/* Exchange/Broker Selector */}
      <Select value={exchange} onValueChange={handleExchangeChange}>
        <SelectTrigger className="w-48 h-8 bg-secondary border-border text-sm">
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4" />
            <SelectValue />
          </div>
        </SelectTrigger>
        <SelectContent>
          {exchanges.map((ex) => (
            <SelectItem key={ex} value={ex}>
              {ex}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Timeframe Selector (separate buttons) */}
      <div className="flex items-center gap-1">
        {timeframes.map(tf => (
          <Button
            key={tf.id}
            size="sm"
            variant={timeframe === tf.id ? 'default' : 'ghost'}
            className="h-8 text-xs px-2"
            onClick={() => { console.log('[TopToolbar] select timeframe', tf.id); onTimeframeChange(tf.id); }}
            aria-pressed={timeframe === tf.id}
          >
            {tf.label}
          </Button>
        ))}
      </div>

      {/* Inline tools right after timeframes: Indicators, Alerts, Replay */}
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
          title="Indicators & Strategies"
          onClick={() => { console.log('[TopToolbar] open indicators'); onOpenIndicators?.(); }}
        >
          <BarChart3 className="w-4 h-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
          title="Alerts"
          onClick={() => { console.log('[TopToolbar] open alerts'); onOpenAlerts?.(); }}
        >
          <Bell className="w-4 h-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
          title="Replay"
          onClick={() => { console.log('[TopToolbar] open replay'); onOpenReplay?.(); }}
        >
          <PlayCircle className="w-4 h-4" />
        </Button>
      </div>

      {/* Spacer */}
      <div className="flex-1" />
      {/* Settings dialog: desplazado a la izquierda para no quedar tapado por el panel flotante */}
      <div style={{ marginRight: 56, display: 'flex', gap: 8, alignItems: 'center' }}>
        {/* Save configuration button (persists UI state) */}
        <Button variant="ghost" size="sm" className="h-8 w-8 p-0" title="Guardar configuración" onClick={() => onSaveConfig?.()}>
          <Save className="w-4 h-4" />
        </Button>
        <div>
          <ChartSettingsDialog onSave={(s) => {
            // when settings change, emit to console and localStorage already handled
            console.log('Chart settings saved', s);
            // optionally, dispatch a custom event so other components can react
            try { window.dispatchEvent(new CustomEvent('chartSettingsChange', { detail: s })); } catch (err) { /* ignore */ }
          }} />
        </div>
      </div>
    </div>
  );
};

export default TopToolbar;

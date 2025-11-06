import React, { useState, useEffect } from 'react';
import { Settings, Check, X } from 'lucide-react';
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription, DialogClose } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';

interface ChartSettings {
  symbolColorBody: string;
  symbolColorWick: string;
  showBody: boolean;
  showBullishBody?: boolean;
  showBearishBody?: boolean;
  precision: number;
  timezone: string;
  statusLine: boolean;
  scalesAndLines: boolean;
  canvas: boolean;
  trading: boolean;
  alerts: boolean;
  events: boolean;
  bullishColor?: string;
  bearishColor?: string;
  chartBg?: string;
  uiAccent?: string;
  iconColor?: string;
  bullishBody?: string;
  bearishBody?: string;
  bullishWick?: string;
  bearishWick?: string;
  showBullishBody: boolean;
  showBearishBody: boolean;
}

const defaultSettings: ChartSettings = {
  symbolColorBody: '#1e90ff',
  symbolColorWick: '#ffffff',
  showBody: true,
  precision: 2,
  timezone: 'UTC',
  statusLine: true,
  scalesAndLines: true,
  canvas: true,
  trading: true,
  alerts: true,
  events: true,
  bullishColor: '#22c55e',
  bearishColor: '#ef4444',
  chartBg: '#0f1724',
  uiAccent: '#5b21b6',
  iconColor: '#ffffff',
  bullishBody: '#22c55e',
  bearishBody: '#ef4444',
  bullishWick: '#16a34a',
  bearishWick: '#dc2626',
  showBullishBody: true,
  showBearishBody: true,
};

const ChartSettingsDialog = ({ onSave }: { onSave?: (s: ChartSettings) => void }) => {
  const [open, setOpen] = useState(false);
  const [settings, setSettings] = useState<ChartSettings>(defaultSettings);
  const [tab, setTab] = useState<'general' | 'advanced'>('general');
  const [profiles, setProfiles] = useState<Record<string, ChartSettings>>({});
  const [activeProfile, setActiveProfile] = useState<string | null>(null);
  const [newProfileName, setNewProfileName] = useState('');
  const [showNewProfile, setShowNewProfile] = useState(false);

  const presets: Array<{ id: string; label: string; values: Partial<ChartSettings> }> = [
    { id: 'dark', label: 'Dark', values: { bullishColor: '#22c55e', bearishColor: '#ef4444', chartBg: '#0f1724', uiAccent: '#7c3aed', iconColor: '#ffffff' } },
    { id: 'light', label: 'Light', values: { bullishColor: '#16a34a', bearishColor: '#dc2626', chartBg: '#f8fafc', uiAccent: '#2563eb', iconColor: '#0f1724' } },
    { id: 'solarized', label: 'Solar', values: { bullishColor: '#2aa198', bearishColor: '#b58900', chartBg: '#002b36', uiAccent: '#859900', iconColor: '#fdf6e3' } },
  ];

  useEffect(() => {
    try {
      const raw = localStorage.getItem('chartSettings');
      const rawProfiles = localStorage.getItem('chartSettingsProfiles');
      const active = localStorage.getItem('activeChartProfile');
      if (rawProfiles) setProfiles(JSON.parse(rawProfiles));
      if (active) setActiveProfile(active);
      // priority: if there's an active named profile, load it; otherwise load legacy chartSettings
      if (active) {
        const p = JSON.parse(rawProfiles || '{}');
        if (p && p[active]) {
          setSettings(p[active]);
          return;
        }
      }
      if (raw) setSettings(JSON.parse(raw));
    } catch (err) {
      // ignore
    }
  }, []);

  // apply settings to CSS variables (extracted to simplify nested try/catch)
  const applySettingsToCss = (settings: ChartSettings) => {
    try {
      const hexToHsl = (hex: string) => {
        if (!hex) return '';
        const h = hex.replace('#', '');
        const bigint = parseInt(h, 16);
        const r = (bigint >> 16) & 255;
        const g = (bigint >> 8) & 255;
        const b = bigint & 255;
        const rf = r / 255;
        const gf = g / 255;
        const bf = b / 255;
        const max = Math.max(rf, gf, bf);
        const min = Math.min(rf, gf, bf);
        let hDeg = 0;
        let s = 0;
        const l = (max + min) / 2;
        if (max !== min) {
          const d = max - min;
          s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
          switch (max) {
            case rf:
              hDeg = (gf - bf) / d + (gf < bf ? 6 : 0);
              break;
            case gf:
              hDeg = (bf - rf) / d + 2;
              break;
            case bf:
              hDeg = (rf - gf) / d + 4;
              break;
          }
          hDeg *= 60;
        }
        const hs = Math.round(hDeg);
        const ss = Math.round(s * 100);
        const ls = Math.round(l * 100);
        return `${hs} ${ss}% ${ls}%`;
      };

      if (settings.bullishColor) document.documentElement.style.setProperty('--bullish', hexToHsl(settings.bullishColor));
      if (settings.bearishColor) document.documentElement.style.setProperty('--bearish', hexToHsl(settings.bearishColor));
      if (settings.bullishBody) document.documentElement.style.setProperty('--bullish-body', hexToHsl(settings.bullishBody));
      if (settings.bearishBody) document.documentElement.style.setProperty('--bearish-body', hexToHsl(settings.bearishBody));
      if (settings.bullishWick) document.documentElement.style.setProperty('--bullish-wick', hexToHsl(settings.bullishWick));
      if (settings.bearishWick) document.documentElement.style.setProperty('--bearish-wick', hexToHsl(settings.bearishWick));
      if (settings.chartBg) document.documentElement.style.setProperty('--chart-bg', hexToHsl(settings.chartBg));
      if (settings.iconColor) document.documentElement.style.setProperty('--icon-color', hexToHsl(settings.iconColor));
      if (settings.uiAccent) {
        const hsl = hexToHsl(settings.uiAccent);
        document.documentElement.style.setProperty('--accent', hsl);
        document.documentElement.style.setProperty('--primary', hsl);
        document.documentElement.style.setProperty('--ring', hsl);
        try {
          const parts = hsl.split(' ');
          const lPart = parts[2] || '50%';
          const l = Number(String(lPart).replace('%', ''));
          const primaryForeground = l < 60 ? '222 15% 98%' : '210 40% 12%';
          document.documentElement.style.setProperty('--primary-foreground', primaryForeground);
        } catch (e) {
          document.documentElement.style.setProperty('--primary-foreground', '222 15% 12%');
        }
      }
    } catch (err) {
      // ignore CSS variable failures
    }
  };

  // Live preview: when the dialog is open and settings change, apply CSS vars
  // immediately so the user sees color changes before hitting Save.
  useEffect(() => {
    try {
      if (open) applySettingsToCss(settings);
    } catch (err) {
      // ignore
    }
  }, [settings, open]);

  const handleSave = () => {
    try {
      localStorage.setItem('chartSettings', JSON.stringify(settings));
      // if there's an active profile, persist it there as well and mark active
      if (activeProfile) {
        const next = { ...profiles, [activeProfile]: settings };
        localStorage.setItem('chartSettingsProfiles', JSON.stringify(next));
        localStorage.setItem('activeChartProfile', activeProfile);
        setProfiles(next);
      }
    } catch (err) {
      // ignore
    }
    // apply CSS variables via helper
    applySettingsToCss(settings);
    onSave?.(settings);
    setOpen(false);
  };

  const handleSaveAsProfile = () => {
    const name = newProfileName.trim();
    if (!name) return alert('Please provide a profile name');
    const next = { ...profiles, [name]: settings };
    try {
      localStorage.setItem('chartSettingsProfiles', JSON.stringify(next));
      localStorage.setItem('activeChartProfile', name);
    } catch (e) {
      // ignore
    }
    setProfiles(next);
    setActiveProfile(name);
    setShowNewProfile(false);
    setNewProfileName('');
    alert(`Profile "${name}" saved`);
  };

  const handleLoadProfile = (name: string) => {
    const p = profiles[name];
    if (!p) return;
    setSettings(p);
    setActiveProfile(name);
    try {
      localStorage.setItem('activeChartProfile', name);
  } catch (e) { console.debug('failed to persist active profile', e); }
  };

  const handleDeleteProfile = (name: string) => {
    if (!profiles[name]) return;
    const { [name]: _removed, ...rest } = profiles;
    try {
      localStorage.setItem('chartSettingsProfiles', JSON.stringify(rest));
      // if deleted profile was active, clear active
      if (activeProfile === name) {
        localStorage.removeItem('activeChartProfile');
        setActiveProfile(null);
      }
  } catch (e) { console.debug('failed to set activeChartProfile', e); }
    setProfiles(rest);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
          <Settings className="w-4 h-4" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Chart Settings</DialogTitle>
          <DialogDescription>Customize symbol appearance, precision and global UI toggles.</DialogDescription>
        </DialogHeader>

    <div className="grid gap-4 py-2">
            {/* Profile management (save/load named profiles) */}
            <div className="flex items-center gap-2">
              <label className="text-sm">Profile</label>
              <select
                value={activeProfile ?? ''}
                onChange={(e) => handleLoadProfile(e.target.value)}
                className="bg-popover p-1 rounded"
              >
                <option value="">(none)</option>
                {Object.keys(profiles).map((k) => (
                  <option key={k} value={k}>{k}</option>
                ))}
              </select>
              <Button variant="ghost" size="sm" onClick={() => setShowNewProfile(!showNewProfile)}>Save As</Button>
              <Button variant="ghost" size="sm" onClick={() => activeProfile && handleDeleteProfile(activeProfile)}>Delete</Button>
            </div>
            {showNewProfile && (
              <div className="flex items-center gap-2">
                <Input placeholder="profile name" value={newProfileName} onChange={(e) => setNewProfileName(e.target.value)} />
                <Button onClick={handleSaveAsProfile}>Create</Button>
                <Button variant="ghost" onClick={() => { setShowNewProfile(false); setNewProfileName(''); }}>Cancel</Button>
              </div>
            )}
            {/* Preset palettes for quick theming */}
            <div className="flex items-center gap-2">
              {presets.map(p => (
                <button
                  key={p.id}
                  title={`Apply ${p.label} preset`}
                  className="w-8 h-8 rounded focus:outline-none"
                  onClick={() => setSettings(s => ({ ...s, ...p.values }))}
                  style={{ background: p.values.chartBg ?? '#000', border: '1px solid rgba(255,255,255,0.06)' }}
                />
              ))}
            </div>
          <div className="grid grid-cols-2 gap-2 items-center">
            {/* Removed generic Color Body / Color Wick controls to avoid confusion.
                Users should use Bullish/Bearish specific controls below. */}
            <label className="text-sm">Bullish (up) color</label>
            <label className="text-sm">Bullish (up) body</label>
            <input type="color" value={settings.bullishBody} onChange={(e) => setSettings(s => ({ ...s, bullishBody: e.target.value }))} />
            <label className="text-sm">Bullish (up) wick</label>
            <input type="color" value={settings.bullishWick} onChange={(e) => setSettings(s => ({ ...s, bullishWick: e.target.value }))} />
            <label className="text-sm">Bearish (down) body</label>
            <input type="color" value={settings.bearishBody} onChange={(e) => setSettings(s => ({ ...s, bearishBody: e.target.value }))} />
            <label className="text-sm">Bearish (down) wick</label>
            <input type="color" value={settings.bearishWick} onChange={(e) => setSettings(s => ({ ...s, bearishWick: e.target.value }))} />
            <label className="text-sm">Chart Background</label>
            <input type="color" value={settings.chartBg} onChange={(e) => setSettings(s => ({ ...s, chartBg: e.target.value }))} />
            <label className="text-sm">UI Accent</label>
            <input type="color" value={settings.uiAccent} onChange={(e) => setSettings(s => ({ ...s, uiAccent: e.target.value }))} />
            <label className="text-sm">Show Body</label>
            <Switch checked={settings.showBody} onCheckedChange={(v: boolean) => setSettings(s => ({ ...s, showBody: v }))} />
            <label className="text-sm">Show Bullish Body</label>
            <Switch checked={settings.showBullishBody} onCheckedChange={(v: boolean) => setSettings(s => ({ ...s, showBullishBody: v }))} />
            <label className="text-sm">Show Bearish Body</label>
            <Switch checked={settings.showBearishBody} onCheckedChange={(v: boolean) => setSettings(s => ({ ...s, showBearishBody: v }))} />
            <label className="text-sm">Precision (decimals)</label>
            <Input type="number" value={String(settings.precision)} onChange={(e) => setSettings(s => ({ ...s, precision: Math.max(0, Math.min(8, Number(e.target.value) || 0)) }))} />
            <label className="text-sm">Timezone</label>
            <select value={settings.timezone} onChange={(e) => setSettings(s => ({ ...s, timezone: e.target.value }))} className="bg-popover p-1 rounded">
              <option value="UTC">UTC</option>
              <option value="Local">Local</option>
              <option value="America/New_York">America/New_York</option>
              <option value="Europe/London">Europe/London</option>
              <option value="Asia/Tokyo">Asia/Tokyo</option>
            </select>
          </div>

          {/* simple tab switcher */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setTab('general')}
              className={`px-3 py-1 rounded ${tab === 'general' ? 'bg-primary text-primary-foreground' : 'bg-secondary'}`}
            >
              General
            </button>
            <button
              type="button"
              onClick={() => setTab('advanced')}
              className={`px-3 py-1 rounded ${tab === 'advanced' ? 'bg-primary text-primary-foreground' : 'bg-secondary'}`}
            >
              Advanced
            </button>
          </div>

          {tab === 'general' ? (
            <div className="grid gap-2">
              <div className="flex items-center justify-between"><span>Status Line</span><Switch checked={settings.statusLine} onCheckedChange={(v: boolean) => setSettings(s => ({ ...s, statusLine: v }))} /></div>
              <div className="flex items-center justify-between"><span>Scales and Lines</span><Switch checked={settings.scalesAndLines} onCheckedChange={(v: boolean) => setSettings(s => ({ ...s, scalesAndLines: v }))} /></div>
              <div className="flex items-center justify-between"><span>Canvas</span><Switch checked={settings.canvas} onCheckedChange={(v: boolean) => setSettings(s => ({ ...s, canvas: v }))} /></div>
              <div className="flex items-center justify-between"><span>Trading</span><Switch checked={settings.trading} onCheckedChange={(v: boolean) => setSettings(s => ({ ...s, trading: v }))} /></div>
            </div>
          ) : (
            <div className="grid gap-2">
              <div className="flex items-center justify-between"><span>Alerts</span><Switch checked={settings.alerts} onCheckedChange={(v: boolean) => setSettings(s => ({ ...s, alerts: v }))} /></div>
              <div className="flex items-center justify-between"><span>Events</span><Switch checked={settings.events} onCheckedChange={(v: boolean) => setSettings(s => ({ ...s, events: v }))} /></div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={handleSave}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ChartSettingsDialog;

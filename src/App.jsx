import React, { useState, useEffect } from 'react';
import { 
  Search, Globe, Smartphone, Monitor, ChevronRight, CheckCircle2, 
  AlertCircle, History, Layout, Clock, X, Trash2, Hash, 
  HelpCircle, ShieldCheck, Zap, Download, ExternalLink, Activity
} from 'lucide-react';

const COUNTRIES = [
  { code: 'us', name: 'USA' },
  { code: 'tr', name: 'Türkiye' },
  { code: 'gb', name: 'Birleşik Krallık' },
  { code: 'de', name: 'Almanya' },
  { code: 'fr', name: 'Fransa' },
  { code: 'es', name: 'İspanya' },
  { code: 'it', name: 'İtalya' },
  { code: 'ca', name: 'Kanada' },
  { code: 'au', name: 'Avustralya' },
  { code: 'br', name: 'Brezilya' },
  { code: 'nl', name: 'Hollanda' },
  { code: 'ru', name: 'Rusya' },
  { code: 'jp', name: 'Japonya' },
  { code: 'kr', name: 'Güney Kore' },
  { code: 'in', name: 'Hindistan' },
  { code: 'ae', name: 'BAE' },
  { code: 'sa', name: 'Suudi Arabistan' },
  { code: 'mx', name: 'Meksika' }
];

const LANGUAGES = [
  { code: 'en', name: 'English' },
  { code: 'tr', name: 'Türkçe' },
  { code: 'de', name: 'Deutsch' },
  { code: 'fr', name: 'Français' },
  { code: 'es', name: 'Español' },
  { code: 'it', name: 'Italiano' },
  { code: 'pt', name: 'Português' },
  { code: 'ru', name: 'Pусский' },
  { code: 'ja', name: '日本語' },
  { code: 'ko', name: '한국어' },
  { code: 'zh-CN', name: '简体中文' },
  { code: 'ar', name: 'العربية' },
  { code: 'hi', name: 'हिन्दी' },
  { code: 'nl', name: 'Nederlands' }
];

function App() {
  const [activeTab, setActiveTab ] = useState('serp');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [history, setHistory] = useState([]);
  const [modalData, setModalData] = useState(null);

  // --- SERP Tracker State ---
  const [serpKeyword, setSerpKeyword] = useState('');
  const [targetDomain, setTargetDomain] = useState('gamevgames.com');
  const [serpDevice, setSerpDevice] = useState('desktop');
  const [serpCountry, setSerpCountry] = useState('us');
  const [serpLanguage, setSerpLanguage] = useState('en');
  const [serpHeaded, setSerpHeaded] = useState(false);
  const [serpDepth, setSerpDepth] = useState(10);
  const [serpResults, setSerpResults] = useState([]);

  // --- Keyword Explorer State ---
  const [exploreKeyword, setExploreKeyword] = useState('');
  const [exploreLang, setExploreLang] = useState('en');
  const [exploreResults, setExploreResults] = useState([]);

  // --- PAA Miner State ---
  const [paaKeyword, setPaaKeyword] = useState('');
  const [paaLang, setPaaLang] = useState('en');
  const [paaResults, setPaaResults] = useState([]);

  // --- Site Auditor State ---
  const [auditUrl, setAuditUrl] = useState('');
  const [auditResults, setAuditResults] = useState(null);

  // --- Update State ---
  const [updateStatus, setUpdateStatus] = useState(null);

  useEffect(() => {
    if (activeTab === 'history') loadHistory();
  }, [activeTab]);

  useEffect(() => {
    if (window.electronAPI.onUpdateAvailable) {
      window.electronAPI.onUpdateAvailable(() => setUpdateStatus('available'));
    }
    if (window.electronAPI.onUpdateDownloaded) {
      window.electronAPI.onUpdateDownloaded(() => setUpdateStatus('downloaded'));
    }
  }, []);

  const loadHistory = async () => {
    try {
      const data = await window.electronAPI.getHistory();
      setHistory(data);
    } catch (err) { console.error(err); }
  };

  const handleDeleteHistory = async (e, id) => {
    e.stopPropagation();
    if (!confirm('Bu kaydı silmek istediğine emin misin?')) return;
    try {
      await window.electronAPI.deleteScan(id);
      loadHistory();
    } catch (err) { console.error(err); }
  };

  const handleHistoryClick = async (item) => {
    try {
      const results = await window.electronAPI.getScanResults(item.id);
      setModalData({ ...item, results });
    } catch (err) { console.error(err); }
  };

  const handleSerpScan = async (e) => {
    e.preventDefault();
    if (!serpKeyword) return;
    setLoading(true); setError(null); setSerpResults([]);
    try {
      const resp = await window.electronAPI.runScraper({
        keyword: serpKeyword, device: serpDevice, country: serpCountry,
        language: serpLanguage, targetDomain, headed: serpHeaded, depth: serpDepth
      });
      if (resp.success) setSerpResults(resp.results);
      else setError(resp.error === 'CAPTCHA_DETECTED' ? 'Google Captcha çıkardı. Tarayıcıyı Gör modunu dene.' : resp.error);
    } catch (err) { setError('Sistem hatası!'); } finally { setLoading(false); }
  };

  const handleKeywordExplore = async (e) => {
    e.preventDefault();
    if (!exploreKeyword) return;
    setLoading(true); setError(null); setExploreResults([]);
    try {
      const resp = await window.electronAPI.runKeywordExplorer({ keyword: exploreKeyword, language: exploreLang });
      if (resp.success) setExploreResults(resp.results);
      else setError(resp.error);
    } catch (err) { setError('Hata oluştu!'); } finally { setLoading(false); }
  };

  const handlePAAMiner = async (e) => {
    e.preventDefault();
    if (!paaKeyword) return;
    setLoading(true); setError(null); setPaaResults([]);
    try {
      const resp = await window.electronAPI.runPAAMiner({ keyword: paaKeyword, country: 'tr', language: paaLang, headed: false });
      if (resp.success) setPaaResults(resp.results);
      else setError(resp.error);
    } catch (err) { setError('Hata oluştu!'); } finally { setLoading(false); }
  };

  const handleSiteAudit = async (e) => {
    e.preventDefault();
    if (!auditUrl) return;
    setLoading(true); setError(null); setAuditResults(null);
    try {
      const resp = await window.electronAPI.runSiteAuditor({ url: auditUrl });
      if (resp.success) setAuditResults(resp.results);
      else setError(resp.error);
    } catch (err) { setError('Hata oluştu!'); } finally { setLoading(false); }
  };

  const isTarget = (domain) => targetDomain && domain.toLowerCase().includes(targetDomain.toLowerCase());

  const renderTabs = () => (
    <div className="tabs-container">
      {[
        { id: 'serp', label: 'SERP Takip', icon: Search },
        { id: 'explorer', label: 'Kelime Kaşifi', icon: Hash },
        { id: 'paa', label: 'PAA Miner', icon: HelpCircle },
        { id: 'audit', label: 'Site Analiz', icon: ShieldCheck },
        { id: 'history', label: 'Geçmiş', icon: History }
      ].map(tab => (
        <button 
          key={tab.id}
          className={`tab-btn glass ${activeTab === tab.id ? 'active' : ''}`}
          onClick={() => { setActiveTab(tab.id); setError(null); }}
        >
          <tab.icon size={18} /> {tab.label}
        </button>
      ))}
    </div>
  );

  return (
    <div className="container">
      <div className="drag-handle"></div>
      <header>
        <h1>SEO Stealth Suite</h1>
        <p className="subtitle">Gizli, Yerel ve Sınırsız SEO Araç Takımı</p>
      </header>

      {renderTabs()}

      <main className="glass main-content">
        {error && (
          <div className="alert danger">
            <AlertCircle size={20} /> {error}
          </div>
        )}

        {/* --- SERP TRACKER VIEW --- */}
        {activeTab === 'serp' && (
          <div className="view">
            <form onSubmit={handleSerpScan} className="controls-grid">
              <div className="input-group full">
                <label>Anahtar Kelime</label>
                <input type="text" value={serpKeyword} onChange={e => setSerpKeyword(e.target.value)} placeholder="e.g. best indie games 2025" />
              </div>
              <div className="input-group">
                <label>Hedef Domain</label>
                <input type="text" value={targetDomain} onChange={e => setTargetDomain(e.target.value)} placeholder="gamevgames.com" />
              </div>
              <div className="input-group">
                <label>Derinlik</label>
                <select value={serpDepth} onChange={e => setSerpDepth(Number(e.target.value))}>
                  <option value={10}>10</option><option value={20}>20</option><option value={50}>50</option><option value={100}>100</option>
                </select>
              </div>
              <div className="input-group">
                <label>Cihaz</label>
                <select value={serpDevice} onChange={e => setSerpDevice(e.target.value)}>
                  <option value="desktop">Masaüstü</option>
                  <option value="mobile">Mobil</option>
                </select>
              </div>
              <div className="input-group">
                <label>Ülke / Dil</label>
                <div style={{ display: 'flex', gap: '5px' }}>
                  <select value={serpCountry} onChange={e => setSerpCountry(e.target.value)} style={{ flex: 1 }}>
                    {COUNTRIES.map(c => <option key={c.code} value={c.code}>{c.name}</option>)}
                  </select>
                  <select value={serpLanguage} onChange={e => setSerpLanguage(e.target.value)} style={{ flex: 1 }}>
                    {LANGUAGES.map(l => <option key={l.code} value={l.code}>{l.name}</option>)}
                  </select>
                </div>
              </div>
              <div className="input-group center-row">
                <input type="checkbox" id="headed" checked={serpHeaded} onChange={e => setSerpHeaded(e.target.checked)} />
                <label htmlFor="headed">Tarayıcıyı Gör</label>
              </div>
              <button type="submit" className="btn-primary full" disabled={loading}>
                {loading ? <div className="loading-spinner"></div> : <Search size={20} />} 
                {loading ? 'Tarama Yapılıyor...' : 'Sıralamayı Getir'}
              </button>
            </form>

            <div className="results-area">
              {serpResults.map(res => (
                <div key={res.rank} className={`result-card glass ${isTarget(res.domain) ? 'target-highlight' : ''}`}>
                  <div className="rank">#{res.rank}</div>
                  <div className="result-info">
                    <div className="result-title">{res.title}</div>
                    <div className="result-link">{res.domain}</div>
                    <p className="result-snippet">{res.snippet}</p>
                  </div>
                  {isTarget(res.domain) && <CheckCircle2 size={24} color="var(--success)" />}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* --- KEYWORD EXPLORER VIEW --- */}
        {activeTab === 'explorer' && (
          <div className="view">
            <form onSubmit={handleKeywordExplore} className="controls-grid">
              <div className="input-group" style={{ gridColumn: 'span 3' }}>
                <label>Tohum Kelime (Alt dalları bulur)</label>
                <input type="text" value={exploreKeyword} onChange={e => setExploreKeyword(e.target.value)} placeholder="e.g. browser games" />
              </div>
              <div className="input-group">
                <label>Dil</label>
                <select value={exploreLang} onChange={e => setExploreLang(e.target.value)}>
                  {LANGUAGES.map(l => <option key={l.code} value={l.code}>{l.name}</option>)}
                </select>
              </div>
              <button type="submit" className="btn-primary full" disabled={loading}>
                {loading ? <div className="loading-spinner"></div> : <Zap size={20} />}
                Kelimeleri Keşfet
              </button>
            </form>
            <div className="keyword-list grid">
              {exploreResults.map((word, i) => (
                <div key={i} className="keyword-tag glass">{word}</div>
              ))}
            </div>
          </div>
        )}

        {/* --- PAA MINER VIEW --- */}
        {activeTab === 'paa' && (
          <div className="view">
            <form onSubmit={handlePAAMiner} className="controls-grid">
              <div className="input-group" style={{ gridColumn: 'span 3' }}>
                <label>Soru Aranacak Kelime</label>
                <input type="text" value={paaKeyword} onChange={e => setPaaKeyword(e.target.value)} placeholder="e.g. how to play free games" />
              </div>
              <div className="input-group">
                <label>Dil</label>
                <select value={paaLang} onChange={e => setPaaLang(e.target.value)}>
                   {LANGUAGES.map(l => <option key={l.code} value={l.code}>{l.name}</option>)}
                </select>
              </div>
              <button type="submit" className="btn-primary full" disabled={loading}>
                {loading ? <div className="loading-spinner"></div> : <HelpCircle size={20} />}
                Soruları Getir
              </button>
            </form>
            <div className="results-area">
              {paaResults.map((item, idx) => (
                <div key={idx} className="paa-item glass">
                  <div className="paa-question">
                    <HelpCircle size={18} className="text-primary" />
                    <span style={{ fontWeight: '600' }}>{item.question}</span>
                  </div>
                  <div className="paa-answer" style={{ 
                    marginTop: '12px', 
                    fontSize: '0.9rem', 
                    lineHeight: '1.5',
                    color: '#cbd5e1', 
                    backgroundColor: 'rgba(255,255,255,0.03)',
                    padding: '12px',
                    borderRadius: '8px',
                    borderLeft: '3px solid var(--primary)' 
                  }}>
                    {item.answer}
                  </div>
                  {item.link && (
                    <a href={item.link} target="_blank" rel="noreferrer" className="paa-link" style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '6px', 
                      marginTop: '10px', 
                      fontSize: '0.8rem', 
                      color: 'var(--primary)', 
                      textDecoration: 'none',
                      fontWeight: '500'
                    }}>
                      <ExternalLink size={14} /> Kaynak: {new URL(item.link).hostname}
                    </a>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* --- SITE AUDITOR VIEW --- */}
        {activeTab === 'audit' && (
          <div className="view">
            <form onSubmit={handleSiteAudit} className="controls-grid">
              <div className="input-group" style={{ gridColumn: 'span 4' }}>
                <label>Analiz Edilecek URL</label>
                <input type="url" value={auditUrl} onChange={e => setAuditUrl(e.target.value)} placeholder="https://gamevgames.com" />
              </div>
              <button type="submit" className="btn-primary full" disabled={loading}>
                {loading ? <div className="loading-spinner"></div> : <Activity size={20} />}
                Hızlı Analiz Yap
              </button>
            </form>
            {auditResults && (
              <div className="audit-results glass">
                <div className="audit-item"><strong>Title:</strong> {auditResults.title}</div>
                <div className="audit-item"><strong>Description:</strong> {auditResults.description}</div>
                <div className="audit-stats grid">
                   <div className="stat-card"><span>H1</span>{auditResults.h1Count}</div>
                   <div className="stat-card"><span>H2</span>{auditResults.h2Count}</div>
                   <div className="stat-card"><span>Görsel</span>{auditResults.imageCount}</div>
                   <div className="stat-card danger"><span>Eksik ALT</span>{auditResults.imagesMissingAlt}</div>
                </div>
                <div className="audit-sub"><strong>H1 Listesi:</strong> {auditResults.h1s.join(', ') || 'Yok'}</div>
              </div>
            )}
          </div>
        )}

        {/* --- HISTORY VIEW --- */}
        {activeTab === 'history' && (
          <div className="history-list">
             {history.map(item => (
               <div key={item.id} className="history-card glass" onClick={() => handleHistoryClick(item)} style={{ cursor: 'pointer' }}>
                 <div className="h-info">
                   <div className="h-title">{item.keyword}</div>
                   <div className="h-meta">{item.country.toUpperCase()} • {item.device} • {new Date(item.created_at).toLocaleDateString()}</div>
                 </div>
                 <div className="h-rank">#{item.target_rank || 'N/A'}</div>
                 <button className="btn-icon danger" onClick={(e) => handleDeleteHistory(e, item.id)} style={{ marginLeft: '15px', background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer' }}>
                   <Trash2 size={18} />
                 </button>
               </div>
             ))}
          </div>
        )}
      </main>

      <style>{`
        :root {
          --primary: #6366f1;
          --success: #10b981;
          --danger: #ef4444;
          --warning: #f59e0b;
          --bg-dark: #0f172a;
          --card-bg: rgba(30, 41, 59, 0.7);
          --text: #f1f5f9;
          --text-muted: #94a3b8;
        }

        .container { max-width: 1000px; margin: 0 auto; padding: 20px; color: var(--text); }
        .glass { background: var(--card-bg); backdrop-filter: blur(12px); border: 1px solid rgba(255,255,255,0.1); border-radius: 16px; }
        .drag-handle { height: 20px; -webkit-app-region: drag; }
        
        header { text-align: center; margin-bottom: 30px; }
        h1 { font-size: 2.5rem; background: linear-gradient(to right, #818cf8, #c084fc); -webkit-background-clip: text; -webkit-text-fill-color: transparent; margin-bottom: 5px; }
        .subtitle { color: var(--text-muted); font-size: 1rem; }

        .tabs-container { display: flex; gap: 10px; margin-bottom: 20px; overflow-x: auto; padding-bottom: 5px; }
        .tab-btn { flex: 1; min-width: 120px; display: flex; align-items: center; justify-content: center; gap: 8px; padding: 12px; cursor: pointer; border: 1px solid transparent; transition: 0.3s; color: white; }
        .tab-btn.active { background: var(--primary); border-color: var(--primary); font-weight: 600; }
        .tab-btn:hover:not(.active) { background: rgba(255,255,255,0.05); }

        .main-content { padding: 25px; min-height: 500px; }
        .controls-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px; margin-bottom: 30px; }
        .input-group { display: flex; flex-direction: column; gap: 8px; }
        .input-group.full { grid-column: span 4; }
        .input-group.center-row { flex-direction: row; align-items: center; grid-column: span 1; padding-top: 25px; }
        
        label { font-size: 0.85rem; color: var(--text-muted); font-weight: 500; }
        input, select { background: rgba(0,0,0,0.2); border: 1px solid rgba(255,255,255,0.1); padding: 10px; border-radius: 8px; color: white; transition: 0.3s; }
        input:focus, select:focus { border-color: var(--primary); outline: none; }
        
        .btn-primary { background: var(--primary); color: white; border: none; padding: 12px; border-radius: 8px; font-weight: 600; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 10px; transition: 0.3s; }
        .btn-primary:hover { filter: brightness(1.2); transform: translateY(-2px); }
        .btn-primary:disabled { opacity: 0.6; cursor: not-allowed; transform: none; }

        .results-area { display: flex; flex-direction: column; gap: 12px; }
        .result-card { display: flex; gap: 20px; padding: 20px; align-items: flex-start; transition: 0.3s; }
        .result-card.target-highlight { border: 2px solid var(--success); background: rgba(16, 185, 129, 0.05); }
        .rank { font-size: 1.5rem; font-weight: 800; color: var(--primary); opacity: 0.8; min-width: 50px; }
        .result-title { font-weight: 600; font-size: 1.1rem; margin-bottom: 4px; }
        .result-link { color: var(--primary); font-size: 0.85rem; text-decoration: none; word-break: break-all; margin-bottom: 8px; }
        .result-snippet { font-size: 0.9rem; color: var(--text-muted); line-height: 1.5; }

        .keyword-list { grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 10px; }
        .keyword-tag { padding: 10px; text-align: center; font-size: 0.9rem; border-radius: 8px; }
        
        .paa-item { padding: 15px; margin-bottom: 10px; }
        .paa-question { display: flex; align-items: center; gap: 10px; font-weight: 500; }

        .audit-results { padding: 20px; }
        .audit-item { margin-bottom: 15px; padding-bottom: 10px; border-bottom: 1px solid rgba(255,255,255,0.05); }
        .audit-stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px; margin: 20px 0; }
        .stat-card { padding: 15px; text-align: center; border: 1px solid rgba(255,255,255,0.05); border-radius: 12px; font-size: 1.5rem; font-weight: bold; }
        .stat-card span { display: block; font-size: 0.75rem; color: var(--text-muted); margin-bottom: 5px; font-weight: normal; }
        .stat-card.danger { color: var(--danger); border-color: rgba(239, 68, 68, 0.2); }

        .history-list { display: flex; flex-direction: column; gap: 10px; }
        .history-card { display: flex; align-items: center; justify-content: space-between; padding: 15px 20px; border-radius: 12px; }
        .h-info { flex: 1; }
        .h-title { font-weight: 600; font-size: 1.1rem; }
        .h-meta { font-size: 0.8rem; color: var(--text-muted); margin-top: 4px; }
        .h-rank { font-weight: bold; color: var(--success); font-size: 1.2rem; min-width: 40px; text-align: right; }

        .loading-spinner { width: 18px; height: 18px; border: 3px solid rgba(255,255,255,0.3); border-top-color: white; border-radius: 50%; animation: spin 1s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }

        .alert { display: flex; align-items: center; gap: 10px; padding: 15px; border-radius: 10px; margin-bottom: 20px; }
        .alert.danger { background: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.2); color: #fca5a5; }

        .grid { display: grid; }
        ::-webkit-scrollbar { width: 8px; }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 10px; }

        .modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.8); backdrop-filter: blur(8px); display: flex; align-items: center; justify-content: center; z-index: 1000; padding: 40px; }
        .modal-content { max-width: 800px; width: 100%; max-height: 85vh; overflow-y: auto; padding: 30px; position: relative; }
        .modal-close { position: absolute; top: 15px; right: 15px; cursor: pointer; color: var(--text-muted); transition: 0.3s; }
        .modal-close:hover { color: white; }
        .modal-header { margin-bottom: 25px; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 15px; }

        .result-item-mini { display: flex; gap: 15px; padding: 12px; border-bottom: 1px solid rgba(255,255,255,0.05); }
        .result-item-mini:last-child { border-bottom: none; }
        .rank-mini { min-width: 30px; font-weight: 800; color: var(--primary); }
        .details-mini { flex: 1; overflow: hidden; }
        .title-mini { font-weight: 600; margin-bottom: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-size: 0.95rem; }
        .link-mini { font-size: 0.75rem; color: var(--text-muted); overflow: hidden; text-overflow: ellipsis; }

        .update-notification {
          position: fixed;
          bottom: 20px;
          right: 20px;
          display: flex;
          align-items: center;
          gap: 15px;
          padding: 15px 20px;
          z-index: 1000;
          animation: slideIn 0.3s ease-out;
          border-left: 4px solid var(--warning);
        }

        @keyframes slideIn {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
      `}</style>

      {modalData && (
        <div className="modal-overlay" onClick={() => setModalData(null)}>
          <div className="modal-content glass" onClick={e => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setModalData(null)} style={{ background: 'none', border: 'none' }}>
              <X size={24} />
            </button>
            <div className="modal-header">
              <h2 style={{ fontSize: '1.5rem', marginBottom: '5px' }}>{modalData.keyword}</h2>
              <div className="subtitle">{modalData.country.toUpperCase()} • {modalData.device} • {new Date(modalData.created_at).toLocaleString()}</div>
            </div>
            
            <div className="results-area">
              <div className="audit-item" style={{ marginBottom: '20px', padding: '15px', background: 'rgba(99, 102, 241, 0.1)', borderRadius: '10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>Hedef Domain: <strong>{modalData.target_domain}</strong></span>
                    <span style={{ fontSize: '1.2rem', fontWeight: 'bold', color: 'var(--success)' }}>#{modalData.target_rank || 'N/A'}</span>
                </div>
              </div>

              {modalData.results && modalData.results.length > 0 ? (
                modalData.results.map(r => (
                  <div key={r.id} className={`result-item-mini ${isTarget(r.domain) ? 'target-highlight' : ''}`} style={isTarget(r.domain) ? { padding: '12px', border: '1px solid var(--success)', borderRadius: '8px', background: 'rgba(16, 185, 129, 0.05)' } : {}}>
                    <div className="rank-mini">{r.rank}</div>
                    <div className="details-mini">
                      <div className="title-mini">{r.title}</div>
                      <div className="link-mini">{r.link}</div>
                    </div>
                  </div>
                ))
              ) : (
                <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>Sonuç bulunamadı.</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* --- UPDATE NOTIFICATION --- */}
      {updateStatus && (
        <div className="update-notification glass">
          <Zap size={20} color="var(--warning)" />
          <span>
            {updateStatus === 'available' ? 'Yeni versiyon indiriliyor...' : 'Yeni versiyon hazır!'}
          </span>
          {updateStatus === 'downloaded' && (
            <button className="btn-primary" onClick={() => window.electronAPI.quitAndInstall()} style={{ padding: '5px 15px', fontSize: '0.8rem' }}>
              Yükle ve Yeniden Başlat
            </button>
          )}
          <button className="btn-icon" onClick={() => setUpdateStatus(null)}><X size={16} /></button>
        </div>
      )}
    </div>
  );
}

export default App;

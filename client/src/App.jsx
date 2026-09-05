import { useEffect, useRef, useState } from 'react';
import { ArrowRight, Check, Clipboard, Download, History, Link2, LoaderCircle, Menu, MessageCircle, RefreshCw, Sparkles, Trash2, X, Zap } from 'lucide-react';
import { toPng } from 'html-to-image';

const examples = [
  { subject: 'Computer Science', tag: 'CS', doubt: 'Why does recursion need a base case?' },
  { subject: 'Mathematics', tag: 'MATH', doubt: "Why can't we divide by zero?" },
  { subject: 'Physics', tag: 'PHYSICS', doubt: 'Why does a heavier object not fall faster?' },
  { subject: 'DBMS', tag: 'DBMS', doubt: 'Why do we need normalization?' },
  { subject: 'AI', tag: 'AI', doubt: 'What is overfitting?' },
];
const loadingMessages = ['Understanding your doubt...', 'Asking Gemini...', 'Finding the perfect meme...', 'Making the explanation simpler...', 'Almost ready...'];
const initialForm = { doubt: '', subject: 'Computer Science', difficulty: 'Beginner', style: 'Student Life' };
const visualVariants = [
  { className: 'visual-coral', emoji: '😵‍💫', background: 'linear-gradient(145deg, #ff765d, #f2b85b)', desk: '#714d45' },
  { className: 'visual-cyan', emoji: '🤯', background: 'linear-gradient(145deg, #8de5ee, #4c8fc2)', desk: '#316c72' },
  { className: 'visual-lime', emoji: '🧠', background: 'linear-gradient(145deg, #d4f36a, #68b98d)', desk: '#416e59' },
  { className: 'visual-blue', emoji: '👀', background: 'linear-gradient(145deg, #91b7f4, #6e72bb)', desk: '#414679' },
  { className: 'visual-pink', emoji: '😭', background: 'linear-gradient(145deg, #f4a5bf, #d783a9)', desk: '#87536d' },
];

function getVisualVariant(result, doubt) {
  const source = `${result?.concept || ''}${doubt || ''}`.toLowerCase();
  const subjectIndex = ['math', 'physics', 'chem', 'biology', 'computer', 'program', 'dbms', 'ai'].findIndex((term) => source.includes(term));
  if (subjectIndex >= 0) return visualVariants[subjectIndex % visualVariants.length];
  const hash = [...source].reduce((total, character) => total + character.charCodeAt(0), 0);
  return visualVariants[hash % visualVariants.length];
}

function App() {
  const [form, setForm] = useState(initialForm);
  const [result, setResult] = useState(null);
  const [history, setHistory] = useState(() => JSON.parse(localStorage.getItem('doubt-meme-history') || '[]'));
  const [loading, setLoading] = useState(false);
  const [loadingIndex, setLoadingIndex] = useState(0);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [mobileNav, setMobileNav] = useState(false);
  const memeRef = useRef(null);

  useEffect(() => {
    localStorage.setItem('doubt-meme-history', JSON.stringify(history));
  }, [history]);

  useEffect(() => {
    if (!loading) return undefined;
    const timer = setInterval(() => setLoadingIndex((index) => (index + 1) % loadingMessages.length), 1800);
    return () => clearInterval(timer);
  }, [loading]);

  const updateForm = (event) => setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  const chooseExample = (doubt, subject) => {
    setForm((current) => ({ ...current, doubt, subject }));
    document.getElementById('translate')?.scrollIntoView({ behavior: 'smooth' });
  };

  async function generateMeme(event) {
    event?.preventDefault();
    if (!form.doubt.trim()) { setError('Give us a doubt first. The blank page is already doing enough thinking.'); return; }
    if (form.doubt.trim().length < 8) { setError('Add a little more detail so Gemini can make the explanation useful.'); return; }
    setError(''); setLoading(true); setLoadingIndex(0);
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
      const response = await fetch(`${apiUrl}/api/generate-meme`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
      const contentType = response.headers.get('content-type') || '';
      
      if (!response.ok) {
        let message = 'Something went wrong';
        if (contentType.includes('application/json')) {
          try {
            const errorData = await response.json();
            message = errorData.error || errorData.message || message;
          } catch {
            message = 'Backend error (invalid response format)';
          }
        } else {
          try {
            const text = await response.text();
            message = text.slice(0, 300) || message;
          } catch {
            message = `Server returned an error (${response.status})`;
          }
        }
        throw new Error(message);
      }
      if (!contentType.includes('application/json')) {
        try {
          const text = await response.text();
          throw new Error(`Backend returned a non-JSON response: ${text.slice(0, 300)}`);
        } catch {
          throw new Error('Backend returned an invalid response format');
        }
      }
      
      const data = await response.json();
      setResult(data);
      const entry = { ...data, doubt: form.doubt, subject: form.subject, createdAt: new Date().toISOString(), form: { ...form } };
      setHistory((current) => [entry, ...current.filter((item) => item.doubt !== form.doubt)].slice(0, 8));
      setTimeout(() => document.getElementById('result')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 80);
    } catch (requestError) {
      setError(requestError.message || 'Oops. Gemini could not translate that right now. Please try again.'); 
    }
    finally { setLoading(false); }
  }

  const copy = async (text, message) => { await navigator.clipboard.writeText(text); setNotice(message); setTimeout(() => setNotice(''), 2200); };
  const copyExplanation = () => result && copy(`${result.concept}\n\n${result.simpleExplanation}\n\nKey point: ${result.keyPoint}`, 'Explanation copied');
  const copyMeme = () => result && copy(`${result.memeSetup}\n${result.memePunchline}`, 'Meme text copied');
  const share = async () => {
    if (!result) return;
    const text = `${result.concept}: ${result.memePunchline}`;
    if (navigator.share) await navigator.share({ title: 'Doubt to Meme Translator', text });
    else await copy(text, 'Share text copied');
  };
  const downloadMeme = async () => {
    if (!memeRef.current) return;
    const dataUrl = await toPng(memeRef.current, { pixelRatio: 2, cacheBust: true });
    const link = document.createElement('a'); link.download = `${result.concept.replace(/\\W+/g, '-').toLowerCase()}-meme.png`; link.href = dataUrl; link.click(); setNotice('Meme downloaded'); setTimeout(() => setNotice(''), 2200);
  };
  const reopen = (item) => { setResult(item); setForm(item.form || { ...initialForm, doubt: item.doubt, subject: item.subject }); document.getElementById('result')?.scrollIntoView({ behavior: 'smooth' }); };
  const visual = getVisualVariant(result, form.doubt);

  return <div className="app-shell">
    <div className="grain" aria-hidden="true" />
    <header className="navbar">
      <a className="brand" href="#top" aria-label="Doubt to Meme Translator home"><span className="brand-mark"><MessageCircle size={18} /><span>✦</span></span><span>Doubt to Meme</span></a>
      <button className="menu-button" onClick={() => setMobileNav(!mobileNav)} aria-label="Toggle navigation">{mobileNav ? <X /> : <Menu />}</button>
      <nav className={mobileNav ? 'nav-links is-open' : 'nav-links'}><a href="#how-it-works" onClick={() => setMobileNav(false)}>How it works</a><a href="#examples" onClick={() => setMobileNav(false)}>Examples</a><a href="#history" onClick={() => setMobileNav(false)}>History</a><a className="nav-cta" href="#translate" onClick={() => setMobileNav(false)}>Try it <ArrowRight size={15} /></a></nav>
    </header>

    <main id="top">
      <section className="hero section-wrap">
        <div className="hero-copy reveal"><div className="eyebrow"><span className="pulse-dot" /> AI-powered learning, with a punchline</div><h1>Turn your <em>doubt</em><br />into a <strong>meme.</strong></h1><p className="hero-subtitle">Confused? Let AI explain it...<br /><span>but make it funny.</span></p><p className="hero-description">Your toughest academic questions, decoded into simple explanations and relatable student humor.</p><a className="button button-primary" href="#translate">Translate my doubt <Zap size={16} fill="currentColor" /></a><div className="trust-row"><span>Powered by</span><b><span className="gemini-spark">✦</span> Gemini AI</b><span className="trust-divider" /><span>Built for curious minds</span></div></div>
        <div className="hero-art reveal delay-1" aria-label="Abstract illustration of a thought bubble becoming a meme"><div className="orbit orbit-one" /><div className="orbit orbit-two" /><div className="art-card art-card-back">?</div><div className="art-card art-card-main"><span className="art-emoji">😂</span><span className="art-label">aha!</span><div className="art-lines"><i /><i /><i /></div></div><div className="art-card art-card-small">✦</div><span className="spark spark-a">✦</span><span className="spark spark-b">+</span><span className="spark spark-c">✳</span></div>
      </section>

      <section className="how-section" id="how-it-works"><div className="section-wrap"><div className="section-heading"><span className="section-kicker">THE FORMULA</span><h2>Less head-scratching.<br /><span>More aha moments.</span></h2></div><div className="steps"><div className="step"><span className="step-number">01</span><h3>Ask anything</h3><p>Drop your academic doubt. No question is too basic.</p></div><div className="step-arrow"><ArrowRight /></div><div className="step"><span className="step-number">02</span><h3>AI gets to work</h3><p>Gemini breaks it down into words that actually make sense.</p></div><div className="step-arrow"><ArrowRight /></div><div className="step"><span className="step-number">03</span><h3>Get the meme</h3><p>Seal the learning with a joke your brain will remember.</p></div></div></div></section>

      <section className="translate-section section-wrap" id="translate"><div className="section-heading centered"><span className="section-kicker">YOUR TURN</span><h2>What’s got you <span>stuck?</span></h2><p>Ask it plainly. We’ll make it click.</p></div><form className="doubt-form" onSubmit={generateMeme}><div className="form-top"><label htmlFor="doubt">Your academic doubt <span>required</span></label><span className="char-count">{form.doubt.length} / 500</span></div><textarea id="doubt" name="doubt" maxLength="500" value={form.doubt} onChange={updateForm} placeholder="e.g. Why does a binary search require a sorted array?" /><div className="form-grid"><label>Subject<select name="subject" value={form.subject} onChange={updateForm}>{['Computer Science', 'Mathematics', 'Physics', 'Chemistry', 'Biology', 'Electronics', 'General', 'Other'].map((item) => <option key={item}>{item}</option>)}</select></label><label>Difficulty<select name="difficulty" value={form.difficulty} onChange={updateForm}>{['Beginner', 'Intermediate', 'Advanced'].map((item) => <option key={item}>{item}</option>)}</select></label><label>Meme energy<select name="style" value={form.style} onChange={updateForm}>{['Student Life', 'Exam Panic', 'Procrastination', 'Teacher vs Student', 'Programming', 'Engineering', 'Relatable', 'Sarcastic but Friendly'].map((item) => <option key={item}>{item}</option>)}</select></label></div>{error && <p className="error-message" role="alert">{error}</p>}<button className="button button-submit" disabled={loading}>{loading ? <><LoaderCircle className="spin" size={18} /> Translating...</> : <>Translate my doubt <ArrowRight size={17} /></>}</button></form></section>

      <section className="examples-section section-wrap" id="examples"><div className="examples-intro"><span className="section-kicker">NEED A STARTER?</span><h2>Try these <span>🔥</span></h2><p>Popular questions, pre-loaded and ready to go.</p></div><div className="example-list">{examples.map((example) => <button className="example-item" key={example.doubt} onClick={() => chooseExample(example.doubt, example.subject)}><span className="example-tag">{example.tag}</span><span>{example.doubt}</span><ArrowRight size={16} /></button>)}</div></section>

      {loading && <section className="loading-state"><div className="loader-orbit"><Sparkles size={24} /></div><p>{loadingMessages[loadingIndex]}</p><div className="loading-progress"><i /></div></section>}
      {result && !loading && <section className="result-section section-wrap" id="result"><div className="result-heading"><div><span className="section-kicker">TRANSLATION COMPLETE</span><h2>Here’s what you <span>meant.</span></h2></div><button className="button button-quiet" onClick={() => { setResult(null); document.getElementById('translate')?.scrollIntoView({ behavior: 'smooth' }); }}><RefreshCw size={15} /> New doubt</button></div><div className="result-grid"><div className="explanation-column"><article className="concept-card"><div className="card-icon blue-icon">✦</div><div><span className="card-label">THE CONCEPT</span><h3>{result.concept}</h3><p>{result.simpleExplanation}</p></div></article><article className="keypoint-card"><span className="card-label">THE ONE THING TO REMEMBER</span><p>{result.keyPoint}</p></article><button className="text-action" onClick={copyExplanation}><Clipboard size={15} /> Copy explanation</button></div><div className="meme-column"><div className="meme-title"><span>😂</span><h3>Your meme</h3><span className="meme-style">{form.style}</span></div><div className={`meme-card ${visual.className}`} ref={memeRef}>{result.image ? <img className="generated-meme-image" src={result.image} alt={`Educational meme about ${result.concept}`} style={{ display: 'block', width: '100%', height: 'auto', aspectRatio: '1 / 1', objectFit: 'cover' }} /> : <><div className="meme-top-text">{result.memeSetup}</div><div className="meme-visual" style={{ background: visual.background }}><div className="visual-sun" /><div className="visual-face">{visual.emoji}</div><div className="visual-desk" style={{ background: visual.desk }} /></div><div className="meme-bottom-text">{result.memePunchline}</div></>} </div>{result.fallback && <p className="image-fallback" role="status">Image generation was unavailable, so the text meme is shown instead.</p>}<div className="caption"><span className="card-label">CAPTION</span><p>{result.memeCaption}</p><div className="hashtags">{result.hashtags?.map((tag) => <span key={tag}>{tag}</span>)}</div></div><div className="meme-actions"><button onClick={copyMeme}><Clipboard size={15} /> Copy text</button><button onClick={downloadMeme}><Download size={15} /> Download</button><button onClick={share}><Link2 size={15} /> Share</button></div></div></div></section>}

      <section className="history-section section-wrap" id="history"><div className="history-heading"><div><span className="section-kicker">YOUR TRAIL</span><h2>Recent <span>doubts.</span></h2></div>{history.length > 0 && <button className="text-action danger" onClick={() => setHistory([])}><Trash2 size={14} /> Clear history</button>}</div>{history.length === 0 ? <div className="empty-history"><History size={24} /><p>Your translations will hang out here.</p><span>Ask your first doubt to start a trail of aha moments.</span></div> : <div className="history-list">{history.map((item) => <button className="history-item" key={item.createdAt + item.doubt} onClick={() => reopen(item)}><span className="history-icon">✦</span><span className="history-doubt">{item.doubt}<small>{item.subject} · {new Date(item.createdAt).toLocaleDateString()}</small></span><span className="history-concept">{item.concept}</span><ArrowRight size={15} /></button>)}</div>}</section>
    </main>
    <footer><div className="footer-brand"><span className="brand-mark"><MessageCircle size={18} /><span>✦</span></span><b>Doubt to Meme</b></div><span>Make learning stick. Make it funny.</span><span className="footer-right">© 2025 · Made for curious minds</span></footer>
    {notice && <div className="toast"><Check size={15} /> {notice}</div>}
  </div>;
}

export default App;

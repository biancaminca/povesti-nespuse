import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from './config.js';
const { createClient } = window.supabase;

const configured = Boolean(SUPABASE_URL && SUPABASE_PUBLISHABLE_KEY);
const supabase = configured
  ? createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
      auth: { autoRefreshToken: true, persistSession: true, detectSessionInUrl: true },
    })
  : null;

const app = document.querySelector('#app');
const categories = {
  antrenament: 'Sport & antrenori',
  corp: 'Relația cu corpul',
  alimentatie: 'Mâncare & echilibru',
  intrebare: 'O întrebare pentru Bianca',
  alta: 'Altceva',
};
const statuses = { noua: 'Nouă', citita: 'Citită', selectata: 'Pentru episod', arhivata: 'Arhivată' };
const initialView = new URLSearchParams(location.search).get('view') || 'home';
const state = {
  view: initialView,
  user: null,
  admin: false,
  loading: configured,
  stories: [],
  profiles: [],
  adminTab: 'stories',
  filter: 'toate',
  selectedStory: null,
  notice: null,
  receipt: null,
};

const icon = (name, size = 20) => {
  const paths = {
    arrow: '<path d="M5 12h14m-6-6 6 6-6 6"/>',
    chevron: '<path d="m9 18 6-6-6-6"/>',
    lock: '<rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/>',
    heart: '<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z"/>',
    mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>',
    pen: '<path d="m12 19 7-7 2 2-7 7-4 1 1-4L19 10l2 2M4 4h9M4 9h6M4 14h4"/>',
    users: '<path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2m7.5-10a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm10 10v-2a4 4 0 0 0-3-3.9M15.5 3.1a4 4 0 0 1 0 7.8"/>',
    check: '<path d="m5 12 4 4L19 6"/>',
    spark: '<path d="m12 2 1.8 7.2L21 11l-7.2 1.8L12 20l-1.8-7.2L3 11l7.2-1.8L12 2Zm7 16v4m-2-2h4"/>',
    menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
    close: '<path d="M5 5 19 19M19 5 5 19"/>',
    trash: '<path d="M4 7h16M10 11v6m4-6v6M6 7l1 14h10l1-14M9 7V4h6v3"/>',
  };
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name]}</svg>`;
};

function esc(value = '') {
  return String(value).replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
}

function date(value) {
  return new Intl.DateTimeFormat('ro-RO', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(value));
}

function notice(message, type = 'success') {
  state.notice = { message, type };
  render();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function go(view) {
  const allowed = ['home', 'about', 'project', 'write', 'account', 'reset', 'admin', 'privacy'];
  state.view = allowed.includes(view) ? view : 'home';
  state.notice = null;
  state.receipt = null;
  history.pushState({}, '', state.view === 'home' ? location.pathname : `?view=${state.view}`);
  render();
  window.scrollTo({ top: 0, behavior: 'smooth' });
  if (state.view === 'admin' && state.admin) loadAdmin();
}

function navLink(view, label) {
  return `<a href="${view === 'home' ? '/' : `?view=${view}`}" data-go="${view}" class="nav-link ${state.view === view ? 'active' : ''}" ${state.view === view ? 'aria-current="page"' : ''}>${label}</a>`;
}

function shell(content) {
  const accountLabel = state.user ? 'Contul meu' : 'Intră în cont';
  return `
    <div class="site-shell">
      <aside class="sidebar" id="sidebar">
        <a href="./" data-go="home" class="brand" aria-label="Povești nespuse, pagina de început">
          <span class="brand-mark">pn<span>.</span></span>
          <span class="brand-name">Povești<br/><em>nespuse</em></span>
        </a>
        <div class="sidebar-rule"></div>
        <nav class="main-nav" aria-label="Navigare principală">
          <span class="nav-caption">EXPLOREAZĂ</span>
          ${navLink('home', 'Acasă')}
          ${navLink('about', 'Despre mine')}
          ${navLink('project', 'Despre proiect')}
          ${navLink('write', 'Scrie povestea ta')}
          <span class="nav-caption nav-caption-space">CONTUL TĂU</span>
          ${navLink('account', accountLabel)}
          ${state.admin ? navLink('admin', 'Panou de administrare') : ''}
        </nav>
        <div class="sidebar-bottom">
          <span class="little-flower">✳</span>
          <p>Fiecare poveste merită<br/>un loc în care să fie auzită.</p>
          <span class="small-signature">cu grijă, Bianca</span>
        </div>
      </aside>
      <div class="mobile-header">
        <a href="./" data-go="home" class="mobile-brand">povești <em>nespuse.</em></a>
        <button class="menu-button" data-action="menu" aria-label="Deschide meniul" aria-expanded="false">${icon('menu', 24)}</button>
      </div>
      <div class="mobile-overlay" data-action="close-menu"></div>
      <div class="page-column">
        <header class="topbar">
          <span>UN SPAȚIU PENTRU VOCEA TA</span>
          <a href="?view=write" data-go="write" class="topbar-link">Spune-ți povestea ${icon('arrow', 16)}</a>
        </header>
        ${state.notice ? `<div class="notice ${state.notice.type}" role="status">${esc(state.notice.message)}<button data-action="dismiss" aria-label="Închide mesajul">${icon('close', 16)}</button></div>` : ''}
        <main id="main-content">${content}</main>
        <footer class="footer"><span>© ${new Date().getFullYear()} Povești nespuse · creat cu grijă de Bianca</span><div><a href="?view=privacy" data-go="privacy">Confidențialitate</a><a href="?view=project" data-go="project">Despre proiect</a></div></footer>
      </div>
    </div>`;
}

function home() {
  return `<section class="hero page-pad">
      <div class="hero-copy">
        <div class="eyebrow"><span class="eyebrow-line"></span> BINE AI VENIT AICI</div>
        <h1>Unele povești au nevoie doar de un loc în care să fie <em>ascultate.</em></h1>
        <p class="hero-intro">Despre sport, despre corp, despre zilele în care nu știi de unde să începi. Aici poți spune ce ai pe suflet, în ritmul tău, fără să-ți apară numele lângă poveste.</p>
        <div class="hero-actions"><a href="?view=write" data-go="write" class="button button-dark">Scrie povestea ta ${icon('arrow', 18)}</a><a href="?view=project" data-go="project" class="text-link">Cum funcționează ${icon('chevron', 16)}</a></div>
        <div class="hero-note">${icon('lock', 16)} Poveștile sunt vizibile doar în panoul meu privat.</div>
      </div>
      <div class="hero-art" aria-hidden="true"><div class="art-orbit orbit-one"></div><div class="art-orbit orbit-two"></div><div class="paper paper-back"></div><div class="paper paper-front"><span class="paper-asterisk">✳</span><p>dragă<br/><em>poveste,</em></p><div class="paper-lines"><i></i><i></i><i></i><i></i></div><span class="paper-end">te ascult.</span></div><div class="art-caption">o pagină albă, fără judecată.</div></div>
    </section>
    <section class="soft-band page-pad"><div class="band-label">01 / UN ÎNCEPUT</div><p>Nu trebuie să ai cuvintele perfecte.<br/><em>Începe de oriunde.</em></p><span class="band-flower">✳</span></section>
    <section class="how page-pad"><div class="section-top"><span class="eyebrow">LOC PENTRU ORICE EXPERIENȚĂ</span><h2>Ce poți povesti <em>aici?</em></h2><p>Poate e un lucru pe care îl porți cu tine de mult. Poate e doar o întrebare pe care încă nu ai îndrăznit s-o pui.</p></div><div class="topic-grid">
      <article class="topic-card"><span class="topic-number">01</span><span class="topic-icon">${icon('heart', 25)}</span><h3>Corpul tău</h3><p>Cum te simți în corpul tău, presiunea comparațiilor și drumul spre mai multă acceptare.</p></article>
      <article class="topic-card"><span class="topic-number">02</span><span class="topic-icon">${icon('spark', 25)}</span><h3>Sportul & sala</h3><p>Experiențe cu antrenori, începuturi, momente bune și lucruri care te-au pus pe gânduri.</p></article>
      <article class="topic-card"><span class="topic-number">03</span><span class="topic-icon">${icon('pen', 25)}</span><h3>Mâncarea & echilibrul</h3><p>Relația cu mâncarea, întrebări și încercarea de a găsi o cale care ți se potrivește.</p></article>
    </div></section>
    <section class="about-teaser page-pad"><div class="teaser-photo"><img src="./public/bianca.jpg" alt="Bianca la sală" /></div><div class="teaser-copy"><span class="eyebrow">OMUL DIN SPATELE PAGINII</span><h2>Bună, eu sunt <em>Bianca.</em></h2><p>Sportul face parte din viața mea de mulți ani. Am cunoscut și bucuria progresului, și presiunea de a arăta într-un anumit fel. De aici a pornit dorința de a asculta poveștile pe care oamenii le țin, uneori, doar pentru ei.</p><a href="?view=about" data-go="about" class="text-link dark-link">Citește povestea mea ${icon('arrow', 18)}</a></div></section>
    <section class="closing page-pad"><span class="eyebrow">CÂND EȘTI PREGĂTITĂ SAU PREGĂTIT</span><h2>Începem cu <em>povestea ta?</em></h2><p>Poți scrie fără nume. Tu alegi dacă vrei ca experiența ta să inspire, anonim, un episod viitor.</p><a href="?view=write" data-go="write" class="button button-dark">Vreau să scriu ${icon('arrow', 18)}</a></section>`;
}

function about() {
  return `<section class="inner-hero page-pad"><span class="eyebrow">CINE SUNT EU</span><h1>În spatele proiectului,<br/>un om care încă <em>învață.</em></h1><p>Sunt Bianca și cred că o conversație sinceră poate schimba felul în care privim un început.</p></section>
    <section class="about-layout page-pad"><div class="portrait-wrap"><img src="./public/bianca.jpg" alt="Bianca, în sala de sport" /><span>Bianca · dincolo de sală</span></div><div class="about-story"><span class="eyebrow">POVESTEA MEA</span><h2>Nu am avut mereu toate <em>răspunsurile.</em></h2><p>Am crescut cu sportul în viața mea: am jucat tenis nouă ani și apoi am descoperit sala. De-a lungul timpului am învățat cât de mult contează nu doar antrenamentul, ci și felul în care vorbești cu tine atunci când lucrurile nu ies perfect.</p><p>Mi-am dorit să creez un loc în care cineva să poată vorbi sincer despre sport, despre relația cu propriul corp sau cu mâncarea, despre un antrenor care l-a ajutat ori l-a rănit. Fără teama că va fi judecat.</p><p>Voi citi poveștile cu atenție. Unele întrebări pot deveni punctul de plecare pentru un episod video, doar dacă îmi dai acordul și fără detalii prin care ai putea fi recunoscut.</p><div class="quote-card"><span>“</span><p>Mi-aș dori ca aici să te simți auzit, nu evaluat.</p></div><a href="?view=write" data-go="write" class="button button-dark">Spune-mi povestea ta ${icon('arrow', 18)}</a></div></section>`;
}

function project() {
  return `<section class="inner-hero page-pad"><span class="eyebrow">DESPRE PROIECT</span><h1>Povești reale.<br/><em>Fără filtre.</em></h1><p>Un spațiu în care experiențele despre sport și corp pot fi spuse, ascultate și, uneori, discutate mai departe cu grijă.</p></section>
    <section class="project-layout page-pad"><div class="project-intro"><span class="eyebrow">DE CE EXISTĂ</span><h2>Uneori, primul pas este să <em>spui.</em></h2><p>Poate nu știi de unde să începi cu sportul. Poate relația cu mâncarea a devenit complicată. Poate o experiență din sală încă te apasă. Aici poți pune în cuvinte ce trăiești sau poți lăsa o întrebare.</p><p>Poveștile trimise nu sunt afișate pe site. Le pot citi doar eu în panoul privat.</p></div><div class="steps"><div><span>01</span><h3>Îți creezi un cont</h3><p>Cu adresa ta de email, pe care o confirmi. Contul este folosit pentru acces, nu apare lângă poveste.</p></div><div><span>02</span><h3>Scrii, fără nume</h3><p>Alegi un subiect și scrii cât vrei. Nu cere nimeni numele tău în formular.</p></div><div><span>03</span><h3>Alegi ce urmează</h3><p>Bifezi separat dacă ești de acord să discut povestea anonim într-un episod YouTube. Fără acord, nu o voi folosi în video.</p></div></div></section>
    <section class="promise page-pad"><div><span class="eyebrow">PROMISIUNEA ACESTUI LOC</span><h2>Cu grijă pentru <em>povestea ta.</em></h2></div><div class="promise-list"><p>${icon('check', 19)} Nu public automat nicio poveste pe site.</p><p>${icon('check', 19)} Nu afișez nume sau adrese de email lângă povești.</p><p>${icon('check', 19)} Pentru video este nevoie de acordul tău separat.</p><p>${icon('check', 19)} Poți cere ștergerea folosind codul primit la trimitere.</p></div></section>
    <section class="closing page-pad"><span class="eyebrow">AI CEVA DE SPUS?</span><h2>Suntem aici să <em>ascultăm.</em></h2><p>Începe cu primul gând. Restul poate veni pe parcurs.</p><a href="?view=write" data-go="write" class="button button-dark">Scrie povestea ta ${icon('arrow', 18)}</a></section>`;
}

function setupPanel() {
  return `<div class="setup-panel" role="status"><span>${icon('spark', 24)}</span><div><strong>Pregătim deschiderea platformei.</strong><p>Designul poate fi explorat acum. Conturile și trimiterea poveștilor devin disponibile după conectarea proiectului Supabase și configurarea emailurilor.</p></div></div>`;
}

function write() {
  return `<section class="inner-hero page-pad write-hero"><span class="eyebrow">SPAȚIUL TĂU</span><h1>Povestea ta începe <em>aici.</em></h1><p>Scrie așa cum îți vine. Nu există o formă corectă de a povesti.</p></section>
    <section class="form-section page-pad"><div class="form-main"><div class="form-heading"><span class="form-step">01 / POVESTEA TA</span><h2>Te <em>ascult.</em></h2><p>Nu trece nume, date de contact sau detalii care te identifică pe tine ori alte persoane.</p></div>
      ${!configured ? setupPanel() : !state.user ? `<div class="auth-gate">${icon('lock', 26)}<h3>Mai întâi, intră în cont.</h3><p>Îți confirmi adresa de email, apoi poți trimite povestea fără nume. Contul nu este legat de textul trimis.</p><button class="button button-dark" data-go="account">Creează un cont / Intră în cont ${icon('arrow', 18)}</button></div>` : `
      <form id="story-form" class="story-form">
        <label for="category">Despre ce vrei să povestești? <span>*</span></label><select id="category" name="category" required><option value="">Alege un subiect</option>${Object.entries(categories).map(([value, label]) => `<option value="${value}">${label}</option>`).join('')}</select>
        <label for="title">Un titlu pentru povestea ta <span>*</span></label><input id="title" name="title" maxlength="120" required placeholder="De exemplu: Am luat-o de la capăt" />
        <label for="body">Povestea ta <span>*</span></label><textarea id="body" name="body" minlength="40" maxlength="10000" required placeholder="Scrie de unde vrei tu să începi..." rows="10"></textarea><div class="field-hint">Minimum 40 de caractere · maximum 10.000</div>
        <label for="question">Ai o întrebare pentru mine? <span class="optional">opțional</span></label><textarea id="question" name="question" maxlength="1000" rows="3" placeholder="Dacă vrei să discutăm și o întrebare..."></textarea>
        <div class="consent-box"><label class="check-row"><input type="checkbox" name="consent" /><span>Sunt de acord ca Bianca să povestească despre experiența mea într-un episod YouTube, fără nume și fără detalii care m-ar putea identifica.</span></label><p>Este opțional. Dacă nu bifezi, povestea rămâne doar în panoul privat. Chiar și cu acord, Bianca va decide dacă și cum discută povestea.</p></div>
        <button class="button button-dark submit-button" type="submit">Trimite povestea ${icon('arrow', 18)}</button><p class="form-fine">Prin trimitere confirmi că ai citit <a href="?view=privacy" data-go="privacy">informațiile despre confidențialitate</a>.</p>
      </form>`}
      ${state.receipt ? `<div class="receipt-panel"><span>${icon('check', 24)}</span><h3>Povestea ta a ajuns la mine.</h3><p>Îți mulțumesc pentru încredere. Salvează acest cod dacă vei dori să ștergi povestea mai târziu:</p><strong>${esc(state.receipt)}</strong><button data-action="copy-receipt" class="text-link">Copiază codul</button></div>` : ''}
    </div><aside class="form-aside"><div class="aside-card"><span class="asterisk">✳</span><h3>Un mic gând înainte să începi</h3><p>Nu trebuie să explici totul sau să găsești o concluzie. Acesta este un loc pentru ce simți acum.</p><div class="aside-rule"></div><span>POȚI SCRIE ÎN RITMUL TĂU</span></div><div class="aside-private">${icon('lock', 17)} Doar eu pot citi textul trimis.</div></aside></section>`;
}

function account() {
  if (!configured) return `<section class="inner-hero page-pad"><span class="eyebrow">CONTUL TĂU</span><h1>Un loc al <em>tău.</em></h1></section><section class="narrow-content page-pad">${setupPanel()}</section>`;
  if (state.loading) return `<section class="narrow-content page-pad"><p>Se verifică sesiunea...</p></section>`;
  if (state.user) return `<section class="inner-hero page-pad"><span class="eyebrow">CONTUL TĂU</span><h1>Bine ai revenit <em>aici.</em></h1><p>Ești conectat cu ${esc(state.user.email || 'contul tău')}.</p></section><section class="account-dashboard page-pad"><div class="account-card"><span class="small-icon">${icon('pen', 25)}</span><h2>Ai o poveste de spus?</h2><p>Poți trimite o experiență fără ca adresa ta de email să fie stocată în poveste.</p><button class="button button-dark" data-go="write">Scrie povestea ${icon('arrow', 18)}</button></div><div class="account-card"><span class="small-icon">${icon('trash', 25)}</span><h2>Șterge o poveste</h2><p>Introdu codul primit la trimitere. După ștergere, textul nu mai poate fi recuperat.</p><form id="delete-own-form"><label for="receipt">Codul poveștii</label><input id="receipt" name="receipt" required placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" /><button class="button button-outline" type="submit">Șterge povestea</button></form></div><div class="account-card wide"><span class="small-icon">${icon('lock', 25)}</span><h2>Setările contului</h2><p>Poți schimba parola oricând. Vei primi un email cu un link securizat.</p><button class="button button-outline" data-action="self-reset">Trimite email de resetare</button><button class="quiet-button" data-action="signout">Ieși din cont</button></div></section>`;
  return `<section class="inner-hero page-pad"><span class="eyebrow">CONTUL TĂU</span><h1>Intră într-un spațiu <em>al tău.</em></h1><p>Creează un cont pentru a trimite o poveste. Formularul nu îți cere numele.</p></section><section class="auth-section page-pad"><div class="auth-panel"><div class="auth-tabs"><button data-action="auth-tab" data-tab="login" class="active" type="button">Intră în cont</button><button data-action="auth-tab" data-tab="signup" type="button">Creează cont</button><button data-action="auth-tab" data-tab="forgot" type="button">Am uitat parola</button></div><div id="auth-form-slot">${authForm('login')}</div></div><aside class="auth-aside"><span>✳</span><h2>Scrii în ritmul tău.<br/><em>Eu citesc cu grijă.</em></h2><p>Confirmarea emailului protejează accesul la cont. Înregistrarea nu apare lângă poveștile trimise.</p></aside></section>`;
}

function authForm(tab) {
  const title = { login: 'Bine ai revenit', signup: 'Bine ai venit', forgot: 'Recuperează accesul' }[tab];
  return `<form id="auth-form" data-mode="${tab}"><h2>${title}<em>.</em></h2><p>${tab === 'signup' ? 'După înregistrare, verifică mesajul de confirmare din email.' : tab === 'forgot' ? 'Îți trimitem un link de resetare dacă adresa are un cont.' : 'Intră în cont pentru a scrie o poveste.'}</p><label for="auth-email">Adresa de email</label><input id="auth-email" name="email" type="email" autocomplete="email" required placeholder="nume@exemplu.ro" />${tab !== 'forgot' ? `<label for="auth-password">Parola</label><input id="auth-password" name="password" type="password" autocomplete="${tab === 'signup' ? 'new-password' : 'current-password'}" minlength="8" required placeholder="Minimum 8 caractere" />` : ''}<button type="submit" class="button button-dark">${tab === 'login' ? 'Intră în cont' : tab === 'signup' ? 'Creează contul' : 'Trimite linkul'} ${icon('arrow', 18)}</button>${tab === 'login' ? `<button type="button" class="quiet-button" data-action="resend">Nu ai primit confirmarea? Retrimite emailul</button>` : ''}</form>`;
}

function reset() {
  return `<section class="inner-hero page-pad"><span class="eyebrow">SECURITATEA CONTULUI</span><h1>Alege o parolă <em>nouă.</em></h1></section><section class="narrow-content page-pad">${!configured ? setupPanel() : !state.user ? `<div class="auth-gate"><h3>Deschide linkul primit pe email.</h3><p>Acesta îți permite să setezi o parolă nouă.</p><button class="button button-dark" data-go="account">Înapoi la cont</button></div>` : `<form id="new-password-form" class="auth-panel simple-form"><h2>Parola nouă</h2><label for="new-password">Parolă</label><input id="new-password" name="password" type="password" autocomplete="new-password" minlength="8" required /><label for="confirm-password">Confirmă parola</label><input id="confirm-password" name="confirm" type="password" autocomplete="new-password" minlength="8" required /><button class="button button-dark" type="submit">Salvează parola ${icon('arrow', 18)}</button></form>`}</section>`;
}

function privacy() {
  return `<section class="inner-hero page-pad"><span class="eyebrow">CONFIDENȚIALITATE</span><h1>Grijă pentru ceea ce <em>împărtășești.</em></h1><p>Te rog să citești aceste informații înainte de a trimite o poveste.</p></section><section class="privacy-content page-pad"><h2>Cum funcționează contul și poveștile</h2><p>La înregistrare, serviciul Supabase păstrează adresa ta de email pentru confirmarea contului și recuperarea parolei. Formularul nu solicită numele, iar textul poveștii este stocat separat de lista conturilor, fără un identificator al autorului. Eu văd poveștile în panoul privat de administrare și văd separat adresele de email ale conturilor. Nu există o funcție care să îmi arate ce cont a trimis o anumită poveste.</p><p>Anonimitatea nu este absolută: textul poate conține detalii prin care cineva te-ar putea recunoaște, iar furnizorii tehnici pot prelucra date precum IP-ul și ora accesării. Nu include nume complete, date de contact ori detalii sensibile ale altor persoane.</p><h2>Folosirea într-un episod</h2><p>Poveștile nu sunt publicate automat. Doar dacă bifezi acordul opțional, Bianca poate alege să discute experiența într-un episod YouTube, fără nume și fără detalii de identificare. Răspunsurile oferite exprimă perspectiva ei personală și nu înlocuiesc ajutorul unui medic, psiholog sau dietetician.</p><h2>Ștergere</h2><p>După trimitere primești un cod unic. Îl poți introduce în cont pentru a șterge povestea din baza de date. Păstrează-l în siguranță, fiindcă povestea nu este legată de cont și codul nu poate fi recuperat din cont.</p><h2>Acces și păstrare</h2><p>Poveștile rămân în baza de date până când sunt șterse de tine prin cod sau de administrator. Pentru lansarea publică, pagina va fi completată cu datele de contact ale operatorului și perioada de păstrare.</p></section>`;
}

function storyCard(story) {
  return `<button class="story-row ${state.selectedStory === story.id ? 'selected' : ''}" data-action="select-story" data-id="${esc(story.id)}"><span class="row-top"><span class="status-pill ${story.status}">${statuses[story.status] || story.status}</span><span>${date(story.created_at)}</span></span><strong>${esc(story.title)}</strong><span class="row-bottom">${esc(categories[story.category] || story.category)} · ${story.youtube_consent ? 'Acord video' : 'Fără acord video'}</span></button>`;
}

function storyDetail(story) {
  if (!story) return `<div class="empty-detail"><span>✳</span><h3>Alege o poveste din listă.</h3><p>O vei putea citi aici, în spațiul tău privat.</p></div>`;
  return `<article class="story-detail"><div class="detail-top"><span class="eyebrow">${esc(categories[story.category] || story.category)}</span><span>${date(story.created_at)}</span></div><h2>${esc(story.title)}</h2><div class="consent-indicator ${story.youtube_consent ? 'yes' : 'no'}">${icon(story.youtube_consent ? 'check' : 'lock', 17)} ${story.youtube_consent ? 'Acord pentru discuție anonimă pe YouTube' : 'Fără acord pentru YouTube'}</div><div class="story-body">${esc(story.body).replace(/\n/g, '<br/>')}</div>${story.question ? `<div class="question-box"><span>ÎNTREBAREA PENTRU TINE</span><p>${esc(story.question).replace(/\n/g, '<br/>')}</p></div>` : ''}<div class="story-actions"><label for="story-status">Starea poveștii</label><select id="story-status" data-action="status" data-id="${esc(story.id)}"><option value="noua" ${story.status === 'noua' ? 'selected' : ''}>Nouă</option><option value="citita" ${story.status === 'citita' ? 'selected' : ''}>Citită</option>${story.youtube_consent ? `<option value="selectata" ${story.status === 'selectata' ? 'selected' : ''}>Pentru episod</option>` : ''}<option value="arhivata" ${story.status === 'arhivata' ? 'selected' : ''}>Arhivată</option></select><form id="notes-form" data-id="${esc(story.id)}"><label for="admin-notes">Notițe private</label><textarea id="admin-notes" name="notes" rows="3" placeholder="Idei pentru răspuns sau episod...">${esc(story.admin_notes || '')}</textarea><button class="button button-outline" type="submit">Salvează notițele</button></form><button class="danger-link" data-action="delete-story" data-id="${esc(story.id)}">${icon('trash', 16)} Șterge definitiv povestea</button></div></article>`;
}

function admin() {
  if (!configured) return `<section class="inner-hero page-pad"><span class="eyebrow">ADMINISTRARE</span><h1>Panoul tău <em>privat.</em></h1></section><section class="narrow-content page-pad">${setupPanel()}</section>`;
  if (state.loading) return `<section class="narrow-content page-pad"><p>Se verifică accesul...</p></section>`;
  if (!state.user || !state.admin) return `<section class="inner-hero page-pad"><span class="eyebrow">ACCES PRIVAT</span><h1>Panoul este <em>protejat.</em></h1><p>Doar contul administratoarei poate deschide această pagină.</p><button class="button button-dark" data-go="account">Intră în cont ${icon('arrow', 18)}</button></section>`;
  const filtered = state.stories.filter((s) => state.filter === 'toate' || s.status === state.filter);
  const selected = state.stories.find((s) => s.id === state.selectedStory);
  return `<section class="admin-heading page-pad"><span class="eyebrow">PANOU DE ADMINISTRARE</span><h1>Bună, <em>Bianca.</em></h1><p>Un loc privat pentru poveștile primite și conturile comunității.</p></section><section class="admin-content page-pad"><div class="stats-grid"><div><span>POVEȘTI PRIMITE</span><strong>${state.stories.length}</strong></div><div><span>NECITITE</span><strong>${state.stories.filter((s) => s.status === 'noua').length}</strong></div><div><span>PENTRU EPISOD</span><strong>${state.stories.filter((s) => s.status === 'selectata').length}</strong></div><div><span>CONTURI</span><strong>${state.profiles.length}</strong></div></div><div class="admin-tabs"><button class="${state.adminTab === 'stories' ? 'active' : ''}" data-action="admin-tab" data-tab="stories">${icon('pen', 18)} Povești</button><button class="${state.adminTab === 'users' ? 'active' : ''}" data-action="admin-tab" data-tab="users">${icon('users', 18)} Conturi</button><button class="refresh-button" data-action="refresh">Reîncarcă</button></div>${state.adminTab === 'stories' ? `<div class="admin-stories"><div class="story-list"><div class="list-head"><h2>Povești</h2><select aria-label="Filtrează poveștile" id="story-filter"><option value="toate" ${state.filter === 'toate' ? 'selected' : ''}>Toate</option>${Object.entries(statuses).map(([value,label]) => `<option value="${value}" ${state.filter === value ? 'selected' : ''}>${label}</option>`).join('')}</select></div><div class="story-list-scroll">${filtered.length ? filtered.map(storyCard).join('') : '<p class="empty-list">Nu sunt povești în această categorie.</p>'}</div></div><div class="story-detail-wrap">${storyDetail(selected)}</div></div>` : `<div class="users-list"><div class="users-head"><h2>Conturi</h2><p>Poți trimite un email de resetare. Parola nu îți este vizibilă.</p></div>${state.profiles.length ? state.profiles.map((profile) => `<div class="user-row"><div><strong>${esc(profile.email)}</strong><span>Înregistrat pe ${date(profile.created_at)}</span></div><button class="button button-outline" data-action="reset-user" data-id="${esc(profile.id)}">Trimite resetare</button></div>`).join('') : '<p class="empty-list">Nu există conturi încă.</p>'}</div>`}</section>`;
}

function render() {
  const pages = { home, about, project, write, account, reset, admin, privacy };
  app.innerHTML = shell((pages[state.view] || home)());
  document.title = `${state.view === 'home' ? 'Povești nespuse' : ({ about: 'Despre mine', project: 'Despre proiect', write: 'Scrie povestea ta', account: 'Contul meu', reset: 'Parolă nouă', admin: 'Administrare', privacy: 'Confidențialitate' }[state.view] || 'Povești nespuse') + ' · Povești nespuse'}`;
}

async function refreshIdentity() {
  if (!supabase) return;
  const { data, error } = await supabase.auth.getUser();
  state.user = error ? null : data.user;
  state.admin = false;
  if (state.user) {
    const result = await supabase.rpc('is_admin');
    state.admin = !result.error && result.data === true;
  }
  state.loading = false;
  render();
  if (state.view === 'admin' && state.admin) loadAdmin();
}

async function loadAdmin() {
  if (!state.admin || !supabase) return;
  const [stories, profiles] = await Promise.all([
    supabase.from('stories').select('*').order('created_at', { ascending: false }).limit(500),
    supabase.from('profiles').select('id,email,created_at').order('created_at', { ascending: false }).limit(500),
  ]);
  if (stories.error || profiles.error) return notice('Nu am putut încărca datele. Verifică SQL-ul și permisiunile Supabase.', 'error');
  state.stories = stories.data || [];
  state.profiles = profiles.data || [];
  render();
}

function friendlyError(error) {
  const message = error?.message || '';
  const code = String(error?.code || '').toLowerCase();
  const status = Number(error?.status || 0);
  if (/invalid login credentials/i.test(message)) return 'Emailul sau parola nu sunt corecte.';
  if (/email not confirmed/i.test(message)) return 'Verifică mai întâi emailul de confirmare.';
  if (code === 'email_address_not_authorized') return 'Acest email nu poate primi confirmarea. Verifică dacă Custom SMTP este activ în Supabase.';
  if (status === 429 || /rate limit|too many/i.test(message)) return 'Au fost prea multe încercări. Încearcă puțin mai târziu.';
  if (/error sending (confirmation|recovery) email|smtp|mail send/i.test(message)) return 'Emailul nu a putut fi trimis. Verifică setările SMTP și Auth Logs în Supabase.';
  if (/database error saving new user/i.test(message)) return 'Contul nu a putut fi salvat. Verifică Auth Logs în Supabase.';
  if (/password/i.test(message)) return 'Verifică parola (minimum 8 caractere) și încearcă din nou.';
  if (code || status) return `Nu am putut finaliza acțiunea (${code || `HTTP ${status}`}). Verifică Auth Logs în Supabase.`;
  return 'Nu am putut finaliza acțiunea. Verifică Auth Logs în Supabase.';
}

app.addEventListener('click', async (event) => {
  const link = event.target.closest('[data-go]');
  if (link) { event.preventDefault(); document.querySelector('.site-shell')?.classList.remove('menu-open'); go(link.dataset.go); return; }
  const button = event.target.closest('[data-action]');
  if (!button) return;
  const { action, id, tab } = button.dataset;
  if (action === 'menu' || action === 'close-menu') { const shell = document.querySelector('.site-shell'); const open = action === 'menu' && !shell.classList.contains('menu-open'); shell.classList.toggle('menu-open', open); document.querySelector('.menu-button')?.setAttribute('aria-expanded', String(open)); return; }
  if (action === 'dismiss') { state.notice = null; render(); return; }
  if (action === 'auth-tab') { document.querySelectorAll('.auth-tabs button').forEach((b) => b.classList.toggle('active', b.dataset.tab === tab)); document.querySelector('#auth-form-slot').innerHTML = authForm(tab); return; }
  if (action === 'resend') {
    const email = document.querySelector('#auth-email')?.value.trim();
    if (!email) return notice('Scrie mai întâi adresa de email.', 'error');
    const { error } = await supabase.auth.resend({ type: 'signup', email, options: { emailRedirectTo: `${location.origin}${location.pathname}?view=account` } });
    return notice(error ? friendlyError(error) : 'Dacă înregistrarea așteaptă confirmarea, vei primi un email nou.', error ? 'error' : 'success');
  }
  if (action === 'signout') { await supabase.auth.signOut(); state.user = null; state.admin = false; go('home'); return; }
  if (action === 'self-reset' || action === 'reset-user') {
    const email = action === 'self-reset' ? state.user?.email : state.profiles.find((p) => p.id === id)?.email;
    if (!email || (action === 'reset-user' && !state.admin)) return;
    button.disabled = true;
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${location.origin}${location.pathname}?view=reset` });
    return notice(error ? friendlyError(error) : `Dacă adresa ${email} are un cont, va primi un email pentru resetarea parolei.`, error ? 'error' : 'success');
  }
  if (action === 'admin-tab') { state.adminTab = tab; render(); return; }
  if (action === 'refresh') { await loadAdmin(); return; }
  if (action === 'select-story') { state.selectedStory = id; render(); return; }
  if (action === 'delete-story' && state.admin) {
    if (!window.confirm('Ștergi definitiv această poveste? Acțiunea nu poate fi anulată.')) return;
    const { error } = await supabase.from('stories').delete().eq('id', id);
    if (error) return notice(friendlyError(error), 'error');
    state.selectedStory = null; await loadAdmin(); notice('Povestea a fost ștearsă.'); return;
  }
  if (action === 'copy-receipt' && state.receipt) { await navigator.clipboard.writeText(state.receipt); notice('Codul a fost copiat. Păstrează-l în siguranță.'); }
});

app.addEventListener('change', async (event) => {
  if (event.target.id === 'story-filter') { state.filter = event.target.value; render(); return; }
  if (event.target.dataset.action === 'status' && state.admin) {
    const id = event.target.dataset.id;
    const status = event.target.value;
    const { error } = await supabase.from('stories').update({ status }).eq('id', id);
    if (error) return notice(friendlyError(error), 'error');
    const item = state.stories.find((s) => s.id === id); if (item) item.status = status;
    render();
  }
});

app.addEventListener('submit', async (event) => {
  const form = event.target;
  if (!['story-form', 'auth-form', 'new-password-form', 'notes-form', 'delete-own-form'].includes(form.id)) return;
  event.preventDefault();
  const submit = form.querySelector('[type="submit"]'); if (submit) submit.disabled = true;
  try {
    const values = new FormData(form);
    if (form.id === 'auth-form') {
      const email = String(values.get('email') || '').trim();
      const password = String(values.get('password') || '');
      const mode = form.dataset.mode;
      if (mode === 'forgot') {
        const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${location.origin}${location.pathname}?view=reset` });
        return notice(error ? friendlyError(error) : 'Dacă adresa are un cont, vei primi un email cu linkul de resetare.', error ? 'error' : 'success');
      }
      if (mode === 'signup') {
        const { error } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: `${location.origin}${location.pathname}?view=account` } });
        return notice(error ? friendlyError(error) : 'Verifică emailul pentru a confirma contul. Uită-te și în Spam.', error ? 'error' : 'success');
      }
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) return notice(friendlyError(error), 'error');
      await refreshIdentity(); go('write'); return;
    }
    if (form.id === 'story-form') {
      if (!state.user) return notice('Intră în cont înainte de trimitere.', 'error');
      const receipt_code = crypto.randomUUID();
      const payload = {
        category: String(values.get('category') || ''),
        title: String(values.get('title') || '').trim(),
        body: String(values.get('body') || '').trim(),
        question: String(values.get('question') || '').trim() || null,
        youtube_consent: values.get('consent') === 'on',
        receipt_code,
      };
      const { error } = await supabase.from('stories').insert(payload);
      if (error) return notice('Povestea nu a fost trimisă. Verifică lungimea textului și încearcă din nou.', 'error');
      state.receipt = receipt_code;
      form.reset(); render(); document.querySelector('.receipt-panel')?.scrollIntoView({ behavior: 'smooth' }); return;
    }
    if (form.id === 'new-password-form') {
      if (values.get('password') !== values.get('confirm')) return notice('Parolele nu coincid.', 'error');
      const { error } = await supabase.auth.updateUser({ password: String(values.get('password')) });
      if (error) return notice(friendlyError(error), 'error');
      go('account'); notice('Parola a fost schimbată.'); return;
    }
    if (form.id === 'notes-form' && state.admin) {
      const { error } = await supabase.from('stories').update({ admin_notes: String(values.get('notes') || '').slice(0, 2000) }).eq('id', form.dataset.id);
      if (error) return notice(friendlyError(error), 'error');
      const story = state.stories.find((s) => s.id === form.dataset.id); if (story) story.admin_notes = String(values.get('notes') || '').slice(0, 2000);
      notice('Notițele au fost salvate.'); return;
    }
    if (form.id === 'delete-own-form') {
      const code = String(values.get('receipt') || '').trim();
      if (!window.confirm('Ștergi definitiv povestea cu acest cod?')) return;
      const { data, error } = await supabase.rpc('delete_story_by_receipt', { p_code: code });
      return notice(error ? friendlyError(error) : data ? 'Povestea a fost ștearsă.' : 'Codul nu a fost găsit.', error || !data ? 'error' : 'success');
    }
  } catch (error) { notice('A apărut o eroare. Încearcă din nou.', 'error'); }
  finally { if (submit?.isConnected) submit.disabled = false; }
});

window.addEventListener('popstate', () => { state.view = new URLSearchParams(location.search).get('view') || 'home'; render(); if (state.view === 'admin' && state.admin) loadAdmin(); });
render();
if (supabase) {
  supabase.auth.onAuthStateChange((event) => {
    if (event === 'PASSWORD_RECOVERY') state.view = 'reset';
    setTimeout(refreshIdentity, 0);
  });
  refreshIdentity();
}

# Povești nespuse — varianta pentru VS Code și GitHub Pages

Acesta este site-ul în fișiere HTML, CSS și JavaScript. Nu ai nevoie de Node.js, npm sau un pas de compilare. Pentru editare locală folosește VS Code și Live Server. GitHub Pages publică direct fișierele din folderul principal.

## Ce conține

- `index.html` — pagina de intrare și încărcarea fișierelor.
- `src/style.css` — culori, fonturi și aspect.
- `src/main.js` — pagini, formulare și panoul de admin.
- `src/config.js` — URL-ul și cheia **publică** Supabase. Nu pune aici o cheie secretă sau `service_role`.
- `public/bianca.jpg` — fotografia folosită de site.
- `vendor/supabase.js` — biblioteca Supabase, inclusă local pentru ca site-ul să nu depindă de un CDN.
- `supabase/schema.sql` — schema bazei de date deja aplicată în proiectul tău; **nu o rula din nou**.

## 1. Deschide proiectul pe calculator

1. Dezarhivează ZIP-ul. Intră în folderul `Povesti-nespuse-GitHub`, cel care conține `index.html`.
2. În VS Code: **File → Open Folder** și alege acel folder.
3. Deschide `index.html` cu extensia **Live Server**: click dreapta → **Open with Live Server** sau **Go Live** jos. Nu deschide direct fișierul cu dublu click din Explorer, fiindcă modulele JavaScript trebuie servite prin HTTP.
4. Verifică paginile Acasă, Despre mine și Contul meu. Poți schimba textul în `src/main.js`, aspectul în `src/style.css`, apoi salvezi cu **Ctrl+S** și reîncarci pagina.

## 2. Publică fișierele pe GitHub

1. În VS Code, apasă pictograma **Source Control** din stânga (sau **Ctrl+Shift+G**).
2. Apasă **Initialize Repository**. Scrie mesajul `Prima versiune` în câmpul de commit, apoi apasă **Commit**. Dacă îți cere să salvezi/stagezi toate fișierele, acceptă.
3. Apasă **Publish to GitHub**. Autentifică-te la GitHub dacă ți se cere.
4. Alege numele `povesti-nespuse` și vizibilitatea **Public**. Pe GitHub Free, Pages pentru acest tip de proiect cere un repository public.
5. Deschide repository-ul creat pe github.com. Intră la **Settings → Pages**. La **Build and deployment → Source** alege **Deploy from a branch**. La **Branch** alege `main` și `/(root)`, apoi **Save**.
6. După publicare, în aceeași pagină **Settings → Pages** apare butonul **Visit site**. Adresa va fi de forma `https://NUMELE-TAU.github.io/povesti-nespuse/`. Nu va conține `chatgpt.site`.

## 3. Actualizează linkurile de confirmare în Supabase

După ce afli adresa exactă GitHub Pages, în Supabase mergi la **Authentication → URL Configuration**:

- **Site URL**: `https://NUMELE-TAU.github.io/povesti-nespuse/`
- **Redirect URLs**: adaugă separat:
  - `https://NUMELE-TAU.github.io/povesti-nespuse/?view=account`
  - `https://NUMELE-TAU.github.io/povesti-nespuse/?view=reset`

Înlocuiește `NUMELE-TAU` cu numele real de utilizator GitHub. Folosește exact adresa afișată în **Settings → Pages**. Nu schimba URL-ul sau cheia Supabase din `src/config.js`.

## 4. Modificări ulterioare

Editezi fișierele în VS Code și le salvezi. În **Source Control**, scrii un mesaj scurt (de exemplu `Am schimbat pagina Despre mine`), apeși **Commit**, apoi **Sync Changes** sau **Push**. GitHub Pages publică noua versiune automat după câteva minute.

## Ce mai trebuie rezolvat înainte să inviți vizitatori

Contul de admin și formularul au fost testate. Înscrierea unui utilizator nou încă nu funcționează: Gmail respinge autentificarea SMTP cu `535 5.7.8`. Mutarea pe GitHub Pages schimbă adresa site-ului, dar **nu repară trimiterea emailurilor Supabase**. Nu prezenta înscrierea drept funcțională până nu testăm un email de confirmare și resetarea parolei cu o adresă din afara echipei Supabase.

Pagina **Confidențialitate** are încă un text provizoriu la datele de contact și la perioada de păstrare. Completeaz-o înainte să primești povești reale.

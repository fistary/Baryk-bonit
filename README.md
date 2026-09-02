# Baryton · Bonit

Mobilní přehled obsazení baryton saxofonu. Každý, kdo otevře odkaz aplikace, může plán pouze číst. Upravovat jej může pouze účet uvedený v tabulce `editors` v Supabase.

## Jednorázové zprovoznění

1. Založ bezplatný projekt na [Supabase](https://supabase.com/). V **SQL Editor** spusť celý soubor [supabase.sql](supabase.sql).
2. V **Authentication → Sign In / Providers** ponech zapnuté přihlašování přes e-mail a heslo.
3. V **Connect → JavaScript** zkopíruj `Project URL` a **publishable key** do [config.js](config.js). Doplň také svoje přihlašovací jméno a e-mail správce. Heslo do souboru nikdy neukládej. Veřejný klíč je určený pro web; nikdy sem nevkládej `secret` nebo `service_role` klíč.
4. Aplikaci vystav přes **GitHub Pages**: vytvoř repozitář, nahraj všechny soubory této složky a v **Settings → Pages** vyber větev `main` a složku `/ (root)`. Výsledná adresa bude například `https://uzivatel.github.io/baryton-bonit/`.
5. V Supabase vytvoř uživatele s e-mailem a heslem. V **Authentication → Users** zkopíruj jeho `User UID` a spusť v SQL Editoru:

   ```sql
   insert into public.editors (user_id) values ('SEM_VLOZ_SVE_USER_UID');
   ```

   Po obnovení stránky uvidíš ovládání pro úpravy.

## Používání

- Data jsou uložena v Supabase, nikoliv v prohlížeči. Jsou tedy shodná na telefonu i počítači.
- Bez přihlášení je aplikace automaticky jen pro čtení. I kdyby někdo obešel skryté prvky rozhraní, databáze jeho změnu odmítne pravidly RLS.
- **Exportovat PDF** otevře systémový tiskový dialog; na telefonu či počítači v něm zvol „Uložit jako PDF“ / „Sdílet jako PDF“.
- Na telefonu otevři veřejný odkaz a přidej jej na plochu. Aplikace se pak chová jako samostatná aplikace.

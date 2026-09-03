# Baryton - Bonit

Jednoduchá webová aplikace pro plánování obsazení baryton saxofonu v Big Bandu Bonit.

Aplikace zobrazuje přehled koncertů, jejich datum, den v týdnu, místo, název akce a informaci o tom, kdo daný koncert hraje. Proběhlé koncerty se automaticky přesunou do samostatné sekce **Odehráno**.

## Funkce

- přehled budoucích i odehraných koncertů,
- rozdělení koncertů podle hráče,
- počítadla jednotlivých kategorií,
- vlastní jména hráčů,
- poznámky k jednotlivým akcím,
- export přehledu do PDF,
- responzivní zobrazení pro mobilní telefon i počítač,
- možnost přidání aplikace na plochu telefonu,
- bezpečné přihlášení správce pomocí uživatelského jména a hesla.

## Přístup a zabezpečení

Veřejní návštěvníci mohou celý plán pouze prohlížet. Přidávat, upravovat a mazat koncerty může jen přihlášený správce.

Data jsou uložena v databázi Supabase a oprávnění k jejich změně chrání pravidla Row Level Security. Samotné skrytí ovládacích prvků proto není jedinou ochranou — databáze odmítne změny od neoprávněných uživatelů.

## Použité technologie

- HTML
- CSS
- JavaScript
- Supabase
- GitHub Pages

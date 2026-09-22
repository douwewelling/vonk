<p align="center">
  <img src="icons/icon-192.png" width="96" height="96" alt="Vonk-icoon">
</p>

<h1 align="center">Vonk</h1>

<p align="center"><b>Woordjes leren als een spel.</b><br>
Combo's, kisten, activiteitsringen en eindbazen, en je onthoudt de woorden ook echt dankzij slimme herhaling.</p>

---

Vonk is een webapp in Apple-stijl om woordjes te leren voor Engels, Frans, Duits, Spaans, Latijn en meer. Plak je lijst uit StudyGo, Quizlet, Word of Excel en begin meteen. Alles draait in je browser en werkt ook offline. Op je telefoon kun je Vonk op je beginscherm zetten.

## Waarom leer je hier meer dan met gewoon overhoren?

| Wat Vonk doet | Waarom het werkt |
| --- | --- |
| **Gespreide herhaling.** Een woord dat je kent komt terug na 1, 3, 8, 21… dagen, precies op het moment dat je het bijna vergeet. | Het *spacing*-effect: verspreid oefenen onthoud je veel langer dan alles in één avond stampen. |
| **Oplopende moeilijkheid.** Een nieuw woord gaat van kennismaken → meerkeuze → letterblokjes → zelf typen. | Eerst herkennen, dan zelf ophalen. Zelf ophalen (*retrieval practice*) is de sterkste manier van leren. |
| **Fouten komen meteen terug.** Wat je fout had, krijg je een paar beurten later opnieuw. | Een fout direct herstellen voorkomt dat je hem inslijpt. |
| **Slimme afleiders.** De foute opties bij meerkeuze lijken op het goede antwoord (zelfde lidwoord, zelfde lengte). | Je moet echt nadenken in plaats van te raden. |
| **Letter-voor-letter feedback.** Bij een spelfout zie je precies welke letters anders moesten. | Je leert de spelling, niet alleen de betekenis. |
| **Beide richtingen + uitspraak.** NL → vreemde taal en andersom, met de ingebouwde stemmen van je apparaat. | Zo leer je het woord gebruiken én herkennen, en weet je hoe je het uitspreekt. |
| **Eindbaas = toets.** Alles zelf typen, net als op een echte toets, met aan het eind een geschat cijfer. | Jezelf toetsen vóór de toets laat zien wat je nog niet kent. |

## Waarom het verslavend leuk is

- **Combo's.** Elke 5 goed op rij tellen je XP zwaarder (×1,5 → ×2 → ×2,5 → ×3), en elke goede beurt klinkt een toontje hoger.
- **Kritieke treffers en gouden kaarten.** Soms krijg je zomaar dubbele XP, en in elke sessie zit ergens één gouden kaart verstopt.
- **Kisten.** Na elke sessie open je een kist met drie tikken: gewoon, zeldzaam, episch of legendarisch.
- **Activiteitsringen.** Sluit elke dag je XP-, goed- en minutenring, net als op een Apple Watch.
- **Reeks.** Leer elke dag om je vlam brandend te houden. Een reeksbevriezer redt je als je een dag mist.
- **25 medailles, levels en titels**, van *Beginner* tot *Legende*.
- **Winkel en thema's.** Verdien vonken en koop een combo-schild, een XP-boost of een nieuw kleurthema (Aurora, Goud, Holografisch…).
- **Geluid en trillingen** bij alles wat je doet (ook op iPhone met iOS 18 of nieuwer).

## Spelmodi

| Modus | Wat je doet |
| --- | --- |
| **Leren** | De hoofdmodus: slimme herhaling met oplopende moeilijkheid. Hier gaan woorden echt een niveau omhoog. |
| **Blitz** | Zoveel mogelijk goed in 60 seconden. Een fout kost 2 seconden. |
| **Koppel** | Tik woord en vertaling bij elkaar, zo snel als je kunt. |
| **Eindbaas** | Toets-simulatie tegen een monster. Elke fout kost een hart, 5 goed op rij geeft er één terug. Je krijgt een geschat cijfer. |

## Je eigen woordjes toevoegen

Ga naar **Lijsten → +** en plak je woorden. Vonk herkent zelf hoe ze gescheiden zijn (`=`, tab, `;`, `-` of `:`). Kopieer je uit StudyGo, Quizlet, Excel of Word, dan werkt het meestal meteen.

```text
house = huis
to run = rennen
(the) teacher = (de) leraar / (de) docent
aujourd'hui = vandaag
```

- Tekst **tussen haakjes** mag je weglaten: `(de) leraar` rekent ook `leraar` goed.
- Met **/** geef je meerdere goede antwoorden: `leraar / docent`.
- Een **komma** telt standaard ook als synoniem. Zet dat per lijst uit voor rijtjes als `go, went, gone`.
- Staat de vertaling links? Zet dan **Kolommen omdraaien** aan.
- Kleine tikfouten en vergeten accenten worden goed gerekend, maar je ziet wel de juiste spelling. Hoe streng dat is, stel je in bij **Profiel**.

## Op je telefoon spelen

**Thuis via wifi (snelst):** start Vonk op je computer met `npm start`. In het venster verschijnt ook een adres zoals `http://192.168.1.23:5173`. Open dat op je telefoon (die moet op hetzelfde wifi-netwerk zitten). Vraagt Windows om toegang voor Node.js, kies dan *Privénetwerken*.

**Overal en offline:** zet de map online op een gratis statische host met https, bijvoorbeeld GitHub Pages (werkt gratis als de repo publiek is), Netlify of Cloudflare Pages. Open de link daarna op je telefoon:

1. iPhone: open de link in **Safari**, tik op **Deel** → **Zet op beginscherm**.
2. Android: open de link in **Chrome**, tik op **⋮** → **App installeren**.
3. Vonk opent nu als een echte app en werkt ook zonder internet.

> Je voortgang wordt per apparaat en per adres bewaard. Wil je verder op een ander apparaat? Gebruik **Profiel → Back-up downloaden** en zet die daar terug.

## Lokaal draaien

Vonk heeft geen build-stap en geen afhankelijkheden: het zijn gewone HTML-, CSS- en JavaScript-bestanden. Omdat de code uit ES-modules bestaat, moet je hem via een webserver openen (dubbelklikken op `index.html` werkt niet).

```bash
npm start
```

Daarna staat Vonk op <http://localhost:5173>. Elke andere statische server werkt ook, bijvoorbeeld `npx serve .`.

## Hoe het in elkaar zit

```text
index.html            app-shell
css/                  base (tokens, navigatie, sheets) · views (schermen) · game (spellen)
js/main.js            navigatie, tabbalk, welkomstscherm
js/store.js           alle voortgang (localStorage), dagringen en reeks
js/srs.js             gespreide herhaling en het samenstellen van een sessie
js/check.js           nakijken: alternatieven, haakjes, tikfouten, accenten, verschil per letter
js/parse.js           geplakte lijsten herkennen
js/rewards.js         levels, kisten, winkel, thema's en medailles
js/games/             leren, blitz, koppel, eindbaas, oefenvormen en het eindscherm
js/fx/                geluid (Web Audio), trillingen, confetti, uitspraak
js/views/             Vandaag, Lijsten, Prestaties, Profiel
sw.js                 offline-ondersteuning
```

## Privacy

Vonk heeft geen account en geen server. Je lijsten en voortgang staan alleen in de browser op je eigen apparaat. Wissel je van apparaat, maak dan bij **Profiel → Back-up downloaden** een back-up en zet die op het nieuwe apparaat terug.

## Licentie

[MIT](LICENSE)

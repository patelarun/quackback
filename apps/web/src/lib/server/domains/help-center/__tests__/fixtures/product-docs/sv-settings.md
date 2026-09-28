
# Inställningar

## Vad är det?

Inställningar är där du konfigurerar hur BOS fungerar för hela ditt företag — bokföringsintegrationer, SMS, försäljningskonton, arbetsregler, kundportalen, behörigheter och vilka funktionsmoduler som är påslagna.

Du hittar den genom att klicka på din avatar uppe i höger hörn och sedan **Inställningar**. Det är en enda sida med skrollning och en sektionsmeny längs sidan.

> **Obs!** Endast ägare och administratörer med åtkomst till inställningar ser den här sidan — medarbetare ser den aldrig.

---

## Bild

![Inställningssida](images/settings.png)

1. Sidopanel med sektioner
2. Integration
3. Kundportal
4. Behörigheter / Allmänt

---

## Hur gör jag?

### Anslut ett bokföringssystem

1. Gå till **Inställningar → Integration**.
2. Klicka på **Integrera** bredvid **Fortnox** eller **Visma**.
3. Följ instruktionerna för att ansluta ditt konto.

När det är anslutet visar raden statusen "Integrerad". Klicka på **Ta bort integration** och bekräfta för att koppla bort den.

> **Obs!** Du kan bara ansluta en av de två åt gången — när en är ansluten döljs det andra alternativet tills du tar bort den.

### Aktivera extern API-åtkomst

1. Gå till **Inställningar → Integration**, och klicka på **Integrera** bredvid **API**.
2. Om denna tilläggstjänst inte redan är aktiv på ditt abonnemang skickas du till **Min prenumeration** för att aktivera den först.
3. När den är aktiv, klicka på **API-nycklar** för att skapa och hantera dina API-nycklar.

> **Obs!** Kräver abonnemanget Standard eller högre, samt tilläggstjänsten Extern API.

### Aktivera SMS

1. Gå till **Inställningar → SMS**.
2. Klicka på **Aktivera** bredvid **Order-SMS** eller **Förslags-SMS** — dessa slås på var för sig.
3. Ange ett avsändarnamn — endast bokstäver, siffror och mellanslag, 1 till 11 tecken.

Raden visar **Aktiv** när den godkänts, eller **Väntar på godkännande** medan din begäran behandlas. Klicka på **Öppna inställningar** för att ändra avsändarnamnet, eller redigera den SMS-typens meddelandemallar från dess egen inställningssida. Klicka på **SMS-historik** för att se vad som skickats.

> **Obs!** SMS är inte tillgängligt medan ditt företag är på en provperiod.

### Ange ditt standardförsäljningskonto

> **Obs!** Kräver en Fortnox-anslutning och ägaråtkomst.

1. Gå till **Inställningar → Försäljningskonto / Arbetskoder**.
2. Klicka på **Standardförsäljningskonto**, och välj ett konto.

En varningsikon visas på denna rad om inget standardkonto har angetts ännu. Klicka på **Konton** för att bläddra bland hela din lista av Fortnox-konton.

### Hantera lönetidkoder

Gå till **Inställningar → Försäljningskonto / Arbetskoder**, och klicka på **Arbetskoder** för att öppna sidan för tidkoder, där du kan slå på eller stänga av enskilda koder och välja om medarbetare ska kunna se dem.

### Skapa en regel för OB-tillägg

1. Gå till **Inställningar → OB-tillägg**, och aktivera det om det inte redan är påslaget.
2. Klicka på **Öppna inställningar**.
3. Klicka på **Skapa ny**, och ge regeln ett namn.
4. Ange en **Starttid** och **Sluttid** för när tillägget ska gälla.
5. Välj vilken **Typ** (tidkod) de extra timmarna ska registreras under.
6. Välj vilka veckodagar det ska gälla för, eller kryssa i **Endast röda dagar** för att tillämpa det på helgdagar istället.

> **Obs!** Kräver abonnemanget Standard eller högre.

### Skapa en veckoarbetsplan

1. Gå till **Inställningar → Veckoarbetsplaner**, och klicka på **Öppna inställningar**.
2. Klicka på **Skapa ny**, och ge planen ett namn.
3. Ange det totala antalet **Timmar/vecka**.
4. Kryssa i varje arbetsdag och ange dess timmar.

En bock- eller varningsikon visar om dina dagliga timmar summerar till veckototalen.

### Hantera bilagor och lagring

Gå till **Inställningar → Bilagor**, och klicka på **Öppna inställningar** för att öppna bilagehanteraren, där du kan söka, bläddra och ta bort uppladdade filer, samt se hur mycket av din lagringsplan som används.

> **Obs!** Kräver abonnemanget Standard eller högre.

### Kontrollera vad kunder kan göra i sin portal

1. Gå till **Inställningar → Kundportal**.
2. Slå på **Inaktivera alla kundändringar** för att blockera alla självbetjäningsförfrågningar på en gång — detta åsidosätter de två alternativen nedanför.
3. Annars, välj individuellt:
   - **Tillåt begäran om datumändring**
   - **Tillåt begäran om avbokning**
4. För var och en du tillåter, klicka på **Redigera regel**, slå på den, och ange hur många dagar innan orderns datum en kund fortfarande kan skicka in den begäran.
5. Slå på **Visa fakturor** om kunder ska se en fakturaflik i sin portal.
6. Öppna **Synliga fält**, och lägg till eller ta bort vilka orderdetaljer — som adress, pris, medarbetarnamn eller anteckningar — kunder kan se.

### Ange allmänna företagsregler

Gå till **Inställningar → Behörigheter / Allmänt** för att nå inställningarna nedan. **Modulsynlighet** beskrivs separat längre ner.

#### Organisationsinställning

Två oberoende reglage:
- **Uppdatera automatiskt bokningens fakturatid när medarbetare uppdaterar tid** — håller en bokningens fakturatid synkroniserad automatiskt när en medarbetare ändrar sin arbetade tid.
- **Tillåt uppdatering av kund i bokningar** — gör att kunden på en befintlig bokning kan ändras.

#### Organisationens schemainställning

> **Obs!** Kräver abonnemanget Standard eller högre.

Styr hur långt fram i tiden medarbetare kan se kommande ordrar och arbetspass i medarbetarappen.

1. Slå på inställningen.
2. Ange ett antal dagar (1 till 365).

> **Obs!** Medarbetare kan alltid se upp till 90 dagar bakåt i tiden, oavsett denna inställning.

#### Inställning för stämpling av tid

> **Obs!** Kräver abonnemanget Standard eller högre.

Styr hur tidigt en medarbetare får stämpla in innan sitt arbetspass schemalagda starttid.

- Välj **När som helst under orderdagen** för ingen begränsning, eller
- Välj **Ange tid för tidig incheckning** och ange hur tidigt (upp till 1 timme).

#### Inställning för rasttid

Kallas även **Automatiskt rastavdrag**. En lista med regler som automatiskt drar av obetald rasttid baserat på hur många timmar en medarbetare har arbetat — till exempel dras 30 minuters rast automatiskt av när de stämplar ut efter att ha arbetat 6 timmar.

1. För varje regel, ange **tröskelvärde för arbetstid** (ett reglage) och **rastens längd** som ska dras av.
2. Slå regeln på eller av, och spara.

Du kan ha flera regler aktiva samtidigt, en för varje antal arbetade timmar.

#### Bokningsuppdatering (Meddelandemallar)

Två fasta meddelandemallar som visas för kunder, vars text du kan redigera — du kan inte lägga till fler än dessa två:
- **Avbokningsmeddelande** — visas när en bokning avbokas.
- **Datumändringsmeddelande** — visas när en bokning byter datum.

#### Röda dagar / Helgdagar

Välj hur röda dagar (helgdagar) hanteras:
- **Standard** — BOS inbyggda helgdagskalender, som kan bläddras år för år.
- **Anpassad** — lägg till egna helgdagar med ett namn (upp till 50 tecken) och ett datum, och ta bort de du har lagt till.

Oavsett vilket kan du också välja en markeringsfärg för röda dagar, och separat välja att markera lördagar och/eller söndagar med sin egen färg.

#### Betalningsvillkor

En lista med betalningsvillkor du kan koppla till fakturor — till exempel "30 dagar netto."

1. Klicka på **Skapa ny**.
2. Ange en **Titel** (till exempel "30 dagar netto") och en **Kod** (bokstäver och siffror, upp till 10 tecken).
3. Spara.

Markera ett villkor som ditt **Standard**. Om du är ansluten till Visma måste koden vara en av ett fast antal som Visma accepterar, och du kan inte skapa nya villkor manuellt — klicka istället på **Synka med Fortnox** om du använder Fortnox, för att skapa och synka ett villkor i ett steg.

> **Obs!** Systemvillkor och Visma-synkade villkor kan inte redigeras eller tas bort, och ett villkor som är inaktivt eller osynkat kan inte anges som standard.

### Slå på eller av en modul

1. Gå till **Inställningar → Behörigheter / Allmänt → Modulsynlighet**.
2. Slå moduler på eller av. En grupp med flera relaterade moduler kan slås på/av alla på en gång med gruppens reglage, eller expanderas för att slå på/av varje enskilt.
3. Klicka på **Bekräfta** för att spara dina ändringar.

> **Viktigt!** Att stänga av en modul döljer den funktionen omedelbart — det finns inget varningssteg innan du bekräftar.

Om en modul är avstängd och någon ändå öppnar den funktionen, ser de meddelandet "Modul inaktiverad". Endast ägaren ser en genväg tillbaka till Modulsynlighet för att slå på den igen — alla andra ser bara ett meddelande om att kontakta sin företagsägare.

### Granska företagsaktivitet

Gå till **Inställningar → Historik** för att öppna en sida med tre flikar.

#### Historik

En logg över ändringar som gjorts i ditt företagskonto. Varje rad visar datum och tid, vem som gjorde ändringen, vilket område i BOS det skedde i ("Program"), ett post-ID, och en kort beskrivning av vad som hände.

Filtrera loggen efter datumintervall, kund, boknings-ID, program och — när du har valt ett program — en mer specifik rubrik inom det.

> **Obs!** Hur långt tillbaka du kan filtrera beror på ditt abonnemang: 30 dagar på Basic, 180 dagar på Standard, 365 dagar på Pro.

#### Integrationsfel

En logg över misslyckade integrationsförfrågningar — till exempel anrop till ditt anslutna bokföringssystem som inte gick igenom. Varje rad visar integrationen, vilket område som påverkades, en felkod och ett meddelande, samt när det inträffade. Du kan filtrera efter datumintervall.

> **Obs!** Detta är en skrivskyddad logg — det finns inget sätt att försöka igen eller avfärda ett fel härifrån.

#### E-posthistorik

En logg över e-postmeddelanden som skickats från BOS. Varje rad visar vad e-postmeddelandet gäller, dess ID, leveransstatus, eventuella avvisnings- eller studsdetaljer, vem det skickades från, mottagarens adress, och när det skickades. Filtrera efter datumintervall och en generell status **Skickat** / **Misslyckades**.

> **Obs!** Du kan inte se ett e-postmeddelandes fullständiga innehåll eller skicka om det från den här sidan.

### Hitta arkiverade / äldre sidor

Om ditt företag fortfarande använder vissa äldre funktioner, länkar en sektion för **Arkiv** ut till: Bokningsmigrering, Bokningar, Tidshantering och Rapporter.

---

## Vad betyder fälten?

### Integrationsstatus

**Integrerad** när ansluten; annars visas en åtgärd "Integrera". Endast en av Fortnox eller Visma kan vara ansluten åt gången.

### Avsändarnamn

Namnet som visas för kunder när de tar emot ett SMS från ditt företag. Endast bokstäver, siffror och mellanslag, upp till 11 tecken.

### SMS-status

**Aktiv** när godkänd, eller **Väntar på godkännande** medan en ny aktiveringsbegäran behandlas.

### Standardförsäljningskonto

Fortnox-kontot som dina fakturor bokförs mot som standard.

### OB-tilläggsregel

Ett namn, ett tidsintervall och antingen specifika veckodagar eller "Endast röda dagar" (helgdagar), kopplat till tidkoden som registrerar de extra timmarna.

### Veckoarbetsplan

En namngiven mall med ett totalt antal veckotimmar, och timmar angivna för varje enskild arbetsdag.

### Inaktivera alla kundändringar

En huvudbrytare som åsidosätter inställningarna för datumändring och avbokning nedanför, och blockerar alla kundens självbetjäningsförfrågningar när den är påslagen.

### Tillåt begäran om datumändring / Tillåt begäran om avbokning

Om kunder kan begära en datumändring eller en avbokning på sina egna ordrar från kundportalen. Var och en har sin egen regel för hur många dagar innan ordern det fortfarande går att begära.

### Synliga fält

De orderdetaljer kunder kan se på sina egna bokningar i kundportalen — till exempel adress, pris, medarbetarnamn eller anteckningar. Om inget är angett är alla fält synliga.

### Modul

Ett helt funktionsområde i BOS (till exempel Förslag, Frånvaro eller Eboka) som kan slås på eller av för ditt företag.

### Tröskelvärde för arbetstid / Rastens längd

För varje regel om automatiskt rastavdrag: antalet timmar en medarbetare måste arbeta innan en rast dras av, och hur mycket rasttid som dras av när de når det.

### Betalningsvillkorskod

En kort kod (bokstäver och siffror, upp till 10 tecken) som identifierar betalningsvillkoret — krävs tillsammans med dess titel, och används för matchning mot din bokföringsintegration om du har en ansluten.

---

## Bra att veta

- Endast ägare och administratörer med åtkomst till inställningar kan öppna Inställningar; vissa rader är endast för ägare, och andra ser dem som skrivskyddade eller helt dolda.
- Flera sektioner — Organisationens schemainställning, Inställning för stämpling av tid, OB-tillägg, Bilagor och Extern API — kräver abonnemanget Standard eller högre.
- SMS och tilläggstjänsten Extern API är betalfunktioner och inte tillgängliga under en provperiod.
- Att redigera inställningarna för Organisationens schema, Stämpling av tid och Rasttid kräver behörigheten "uppdatera inställningar" — ägare kan alltid redigera dem oavsett.
- Ändringar i Modulsynlighet sparas som utkast tills du klickar på **Bekräfta** — men när de väl är bekräftade gäller de omedelbart utan en ångra-fråga.
- **Arkiv** visas endast för företag som fortfarande använder en äldre version av vissa funktioner, och länkar bara ut till dessa äldre sidor snarare än att erbjuda arkiverings-/återställningsåtgärder själv.
- Sektionerna **Förslag** och **Notiser** som visas här beskrivs i egna dedikerade guider.

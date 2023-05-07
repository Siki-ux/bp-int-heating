# Systém pre inteligentnú reguláciu kúrenia
Tento repozitár obsahuje kódy a konfigurácie pre moju bakalársku prácu *Sytém pre inteligentnú reguláciu kúrenia*.
## Popis
Cieľom tejto bakalárskej práce bolo navrhnúť a implementovať systém regulácie ústredného kúrenia so zameraním na reguláciu jednotlivých miestností. Tento systém je diaľkovo ovládateľný platformou Logimic Smart City a automaticky regulouje vytápanie adaptívnym spôsobom. Tento spôsob prináša značné úspory do domácností, ktoré sú takýmto systémom vybavené. Toto riešenie sa oproti existujúcim riešeniam líšiť hlavne tým, že si do systému zadáme požadovanú teplotu miestnosti a systém ovláda výhrevné telesá tak, aby požadovanú teplotu miestnosti docielili a udržali.
## Obsah:
### BP
V tomto priečinku sa nachádzajú zdrojové súbory LaTeX a vygenerované PDF bakalárskej práce.
### Chirpstack-codec
Tento priečinok obsahuje dva skripty (`decode.js` a `encode.js`), ktoré používa LNS Chirpstack na preklad surových dát na formátované a opačne. K ním sú vytvorené JSON súbory opisujúce testovacie vstupy a výstupy týchto skriptov.
### IotDevice
V tomto priečinku sa nachádza konfiguračný súbor zariadenia **RisingHF1S001**. V ňom je z bezpečnostných a NDA dôvodov prepísaný `"appkey"`.
### Obsluha
V tomto priečinku sa nachádza riešnie ovládania kúrenia. Súbor `main.ts`, obsahuje pripojenie do databáze a inizializáciu ovládania kúrenia. Súbor `HeatingControl.ts` obsahuje zvyšok riešenia služby ovládania kúrenia.<br>**Riešenie nie je spustiteľné nakoľko mu chýbajú závislosti, ktoré ale podliehajú podpísanému NDA s firmou Logimic s.r.o**.
### Simulation
V tomto priečinku sa nachádza simulačný program použitý nad mierne editovaným skrpitom ovládania kúrenia `HeatingControl.ts`, nachádzajucom sa v priečinku *src*. Skript `index.ts` je zdrojovým súborom pre simuláciu.<br>
Tento skript simuluje priebeh teploty v čase. V každom cykle sa postupne hýbe na pseudonáhodne upravenej sínusovke roztiahnutej na 24 hodín, čo simuluje reálny vývoj teploty. Počiatok reprezentuje čas 8:00. Ďalej sa hýbe v 5 minútovom intervale až po nastavený čas behu simulácie. V každom cykle je volaná aj obsluha. Tá upravuje pohyb teploty na základe získaného otvorenia motora.
#### Ovládanie 
Príkazom `make install` sa nainštalujú potrebné závislosti a príkazom `make run` sa simulácia spustí. Pre editovanie vstupných parametrov simulácie je nutné ich upraviť v súbore *Makefile* V ňom premenné reprezentujú konkrétne premenné simulácie.<br>
 Konkrétne:<br>
**TARGET** - reprezentuje cieľovú teplotu ktorú po systéme požadujeme,<br>
**START** - reprezentuje počiatočnú teplotu,<br>
**RANGE** - reprezentuje maximálny rozsah motora (Ten musí byť z intervalu 0-800),<br>
**COEFICIENT** - reprezentuje koeficient výpočtu pozície motora (Ten musí byť z intervalu 1-20),<br>
**MINUTES** - reprezentuje čas ako dlho simulácia beží (ideálne násobky čísla 5, nakoľko obsluha je spúšťaná každých 5 minút),<br><br> 
#### Výstup
Výstup simulácie je v priečinku *output* a súbore `output.txt`. Obsahom súboru sú dáta ktoré reprezentujú vývoj teploty a pozície motora v čase. Jedná sa o tabuľku so stĺpcami: PID (pre pôvodné testovacie účely), teplotu v miestnosti a pozíciu motora. Dáta sú oddelené tabulátormi, pre vizualizáciu odporučam využiť napríklad MS Excel.<br>
Príklad výstupu je následovný:
```
PID	Temp  MotorPosition
800	21.03 640
800	21.68 562
800	22.07 562
800	22.62 562
800	22.80 562
```



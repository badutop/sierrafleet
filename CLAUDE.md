# Notes techniques — pièges connus

## Overlay plein écran custom ouvert depuis un `<Dialog>` (Radix/shadcn)

Si un composant custom en `position: fixed` occupant tout l'écran (scanner
caméra, lecteur plein écran, etc.) est ouvert **depuis l'intérieur d'un
`<Dialog>`** shadcn/Radix — même via un portail React
(`createPortal(..., document.body)`) — trois pièges distincts peuvent
apparaître, indépendants les uns des autres. Rencontré et corrigé sur
`src/components/drivers/DocumentScanner.jsx` (utilisé par
`DriverDocuments.jsx`, `VehicleDocuments.jsx`, `RotationSheetEntry.jsx`,
`FuelSupplyDialog.jsx`, `GarageOrderDialog.jsx` — tous des `<Dialog>`).

### 1. Le composant se retrouve confiné à la boîte du Dialog

`<DialogContent>` a un `transform` CSS (`translate-x-[-50%] translate-y-[-50%]`
pour se centrer). Par la spec CSS, un élément avec `transform` devient le
*containing block* de tout descendant en `position: fixed` — donc un
"plein écran" nché à l'intérieur se retrouve confiné à la petite boîte du
Dialog (~448px pour un `max-w-md`) au lieu du vrai viewport.

**Solution** : `createPortal(contenu, document.body)` — sort complètement
de cette hiérarchie DOM, garantit un vrai plein écran quel que soit
l'appelant.

### 2. Plus rien n'est cliquable à l'intérieur, même après le portail

Un Dialog Radix **modal** (`modal=true`, le défaut, non passé explicitement
dans ce projet) désactive `pointer-events` sur **tout `document.body`**
tant qu'il est ouvert, et ne le réactive que pour ses propres calques
reconnus (`DismissableLayer`, un mécanisme interne à Radix). Un portail
custom n'est pas un calque Radix : il hérite donc silencieusement de ce
`pointer-events: none`. Le rendu visuel n'est pas affecté (d'où l'illusion
que "ça marche" à l'œil — vidéo, boutons, tout s'affiche normalement) mais
**aucun clic ne traverse**, y compris sur un bouton de fermeture visible.
Symptôme caractéristique : rien n'est cliquable nulle part dans l'overlay,
pas seulement une action précise.

**Solution** : `pointer-events-auto` sur l'élément racine du portail, pour
annuler l'héritage.

### 3. Un clic dans le portail ferme le Dialog hôte

Le Dialog reste "ouvert" en arrière-plan pendant que le composant portalé
s'affiche par-dessus. Le contenu portalé n'étant plus reconnu comme
descendant logique du Dialog, Radix peut traiter un clic dessus comme un
clic "en dehors" du Dialog et le fermer entièrement (et avec lui, tout ce
qui dépend de son état monté — y compris l'overlay portalé, qui disparaît
du même coup).

**Solution** : sur le `<DialogContent>` hôte, ajouter
`onPointerDownOutside`/`onInteractOutside` avec `event.preventDefault()` —
idéalement conditionné à "le composant custom est actuellement ouvert",
pour ne pas casser le clic-en-dehors-pour-fermer normal du Dialog le reste
du temps.

### En résumé

Les 3 correctifs sont indépendants et cumulatifs — un seul ne suffit pas :
portail (taille), `pointer-events-auto` (interactivité), et
`onPointerDownOutside`/`onInteractOutside` (ne pas fermer le Dialog hôte).
Un composant ouvert **hors** d'un Dialog (ex: `CollecteurBonsPage.jsx`,
qui rend le scanner directement dans la page) n'a jamais ce problème.

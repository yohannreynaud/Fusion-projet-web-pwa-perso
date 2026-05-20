# -Projet_web_pam

### Paris'PAM

Ce projet a été réalisé par Yohann Reynaud, Pierre Dubrez et Lisa Chauffour.

Il s'intitule "Paris' PAM" pour Paris Adventure in Memory, c'est également "map" à l'envers.

Il s'agit d'une carte de Paris, interactive, dans laquelle il est possible de naviguer et d'y ajouter des points d'intérêts enrichis (photos, texte, tags) afin de retracer un trajet effectué par exemple.

L'application se révèlerait particulièrement pratique dans un intérêt touristique notamment, afin de se souvenir de ses voyages, ainsi que des endroits visités. 

Le principe est simple : on peut naviguer sur la carte à la manière d'une carte virtuelle classique. Par le moyen d'un simple appui long, on a la possibilité d'ajouter un "point d'intérêt". Un tag qui nous permet de stocker image, texte et autres détails.

### 3. Comment lancer le projet

Pour lancer le projet, il faut effectuer les commandes suivantes : 
  - Ouvrir le dossier `Fusion-projet-web-pwa-perso`.
  - Utiliser un serveur local :
    - `python -m http.server 8000`
    - ou `npx serve .` avec `npm`.
  - Puis ouvrir `http://localhost:8000` dans le navigateur.

  Aucun gestionnaire de paquets n'est requis pour ce projet. Il ne requiert qu'un navigateur du type Chrome, Edge, Firefox ou encore Safari.
  Pour les fonctionnalités PWA/offline, un navigateur supportant les service workers et les manifests est nécessaire.

Le point d'entrée principal est `index.html` à la racine du projet et les scripts principaux sont `app.js` et `db.js`, avec `sw.js` pour le service worker.

#### Pour la version desktop

- Ouvrir le projet dans un navigateur sur un ordinateur.
- En local, `index.html` est le point d'accès.

#### Pour la version mobile

- Accéder à l'application depuis un navigateur mobile sur le même réseau local via `http://<adresse-ip>:8000`.
- Le site est conçu pour être responsive et compatible PWA.
- Le manifest `manifest.json` et le service worker `sw.js` permettent d'installer l'application sur mobile si le navigateur le propose.
- Sur mobile, l'expérience est la même : navigation carte + appui long pour ajouter un lieu.

### 4. Les difficultés rencontrées

Sur ordinateur, ajouter les points d'intérêts était très facile et cela a tout de suite fonctionné. En revanche, nous avons eu beaucoup de mal pour rendre cela possible sur l'application Mobile. Pierre s'est chargé de comprendre ce qui ne fonctionnait pas ce qui a permis de faire fonctionner l'app mobile aussi bien que sur ordinateur.

Yohann tu peux compléter 

### 5. Usage ou non de l'IA

Nous avons utilisé l'IA tout au long du projet. Cela nous a aidés à comprendre la structure interne d'une application, comment y intégrer une carte OpenStreetMap via la bibliothèque *Leaflet*, et à mieux organiser le fonctionnement du front-end et du service worker.

Nous l'avons utilisée pour :
- comprendre comment structurer le projet autour de `index.html`, `app.js`, `db.js`, et `sw.js`.
- identifier les éléments nécessaires pour rendre le projet faisable sur mobile et PWA.
- clarifier le flux de données et le comportement des points d'intérêt sur la carte.


Aujourd'hui, l'application fonctionne, aussi bien sur l'ordinateur que sur mobile, et il est possible, par un appui long, de faire apparaître un pop-up permettant d'ajouter un point d'intérêt avec au choix : une description, une catégorie, un ou plusieurs tags et une ou plusieurs photos. L'application centre la carte sur Paris, mais il est possible de créer des points d'intérêt partout dans le monde. Il est également possible de trier les points d'intérêt déjà existant à l'aide des catégories répertoriées en haut de l'écran.

### 7. Améliorations potentielles

On pourrait par exemple imaginer une fonctionnalité permettant, en plus d'enregistrer les points d'intérêt, d'enregristrer ses différents trajets, associés à ces points d'intérêts, les stocker et pouvoir les revoir. Cela pourrait permettre par exemple de créer des sortes de carnets de voyage ou de stocker ses souvenirs.

On pourrait, dans la même optique, ajouter un fonctionnement en réseau, permettant aux utilisateurs de se partager leurs trajets. 

L'idée de l'application ayant émergé autour de la ville de Paris, on pourrait se limiter uniquement à Paris. *Pour l'instant on reprend simplement la carte d'OpenStreetMap, centrée sur Paris, mais on peut techniquement enregistrer des lieux partout dans le monde.* On pourrait se restreindre mais finalement garder toute la carte permet d'enregistrer encore plus de souvenirs donc ce n'est pas prioritaire.

Lisa s'est chargée de générer l'apparence de l'application ainsi que l'intégration de la carte OpenStreetMap via *Leaflet*.

Yohann a effectué tous les changements nécessaires pour permettre à l'application de tourner également sur mobile. *Yohann je veux bien que tu écrives ça mieux*.

Pierre a corrigé les problèmes que nous avons rencontrés, notamment pour permettre d'ajouter les points d'intérêts sur la version mobile, ce qui ne fonctionnait pas à l'origine.

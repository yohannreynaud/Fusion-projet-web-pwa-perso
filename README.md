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

Sur ordinateur, ajouter les points d'intérêts était très facile et cela a tout de suite fonctionné. En revanche, nous avons eu beaucoup de mal pour rendre cela possible sur l'application Mobile. Yohann s'est chargé de comprendre ce qui ne fonctionnait pas ce qui a permis de faire fonctionner l'app mobile aussi bien que sur ordinateur.

- choix compliqués
- parties qui ont pris du temps

### 5. Usage ou non de l'IA

- si vous avez utilisé de l'IA, dites **où**, **comment** et **pour quoi**
- si vous ne l'avez pas utilisée, dites-le explicitement

### 6. Ce qui est fait fonctionnellement

- ce qui marche réellement aujourd'hui

### 7. Ce qui manque

- fonctionnalités incomplètes
- bugs connus
- idées non terminées

Fonctionnalité pour enregristrer ses différents trajets, les stocker et pouvoir les revoir.

Se limiter uniquement à Paris (pour l'instant on reprend simplement la carte d'OpenStreetMap, centrée sur Paris, mais on peut techniquement enregistrer des lieux partout dans le monde)

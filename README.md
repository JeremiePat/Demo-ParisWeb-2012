Demo-ParisWeb-2012
==================

Depot de la démo faite à Paris Web 2012

Cette démo est un "blind test" video qui repose sur une application à base de WebSocket.

Pour pouvoir faire tourner cette démo, vous avez besoin d'installer NodeJS

* http://nodejs.org/

Une fois que NodeJS est installé, vous devez utiliser l'utilitaire en ligne de commande `npm` pour installer les dépendances necessaires à l'application. Pour cela, rendez-vous dans le répertoir de l'application (là ou se trouve le fichier `app.js`) et executez la commande suivante :

``npm install``

L'application nécessite l'installation des dépendances suivantes :

* express
* socket.io
* underscore
* mustache

Plus d'information sur `npm` :

* https://npmjs.org
* https://npmjs.org/doc

Une fois tout installé, rendez vous dans le dossier de l'application et lancez celle-ci avec la commande :

``node app.js``

Suite à cela, vous pouvez ouvrir l'application dans votre navigateur à l'adresse : 

``http://localhost:8888``

L'interface pour lancer l'enchainement des vidéos est accessible à l'adresse :

``http://localhost:8888/control.html``
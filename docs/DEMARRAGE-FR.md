# Guide de démarrage en français

## Prérequis

- Windows 10 ou 11, 64 bits, avec .NET Framework 4.8.
- Runtime Microsoft Edge WebView2 (généralement déjà installé avec Windows 11 ou Edge).
- GTA V installé et CodeWalker pour extraire les modèles du jeu.

MLO Creator ne fournit aucun fichier de GTA V. Importez uniquement les fichiers que vous êtes autorisé à utiliser.

## Créer un intérieur

1. Ouvrez l’onglet **Importer** et ajoutez les fichiers `.ydr`, `.ytd`, `.ybn` et `.ymap` du bâtiment.
2. Indiquez la position du bâtiment en jeu, puis sélectionnez le bâtiment et alignez la grille sur son sol et ses murs.
3. Tracez les pièces avec **Ajouter une pièce**. Les portes, fenêtres et ouvertures doivent être découpées dans les faces du bâtiment.
4. Retirez les éléments gênants et corrigez les collisions. Les modèles de portes et fenêtres `.glb` peuvent être placés manuellement.
5. Ajoutez les textures et lumières, puis utilisez **Vérifier le cheminement** pour repérer les collisions bloquantes.
6. Dans **Exporter**, définissez le nom de ressource, le préfixe et l’emplacement en jeu, puis exportez.

## Installer sur le serveur FiveM

Copiez le dossier de ressource exporté dans le dossier `resources` de votre serveur. Dans la console serveur, exécutez `refresh`, puis `ensure nom_du_dossier`. Vous pouvez aussi ajouter `ensure nom_du_dossier` à `server.cfg`.

Un seul resource peut remplacer un fichier de jeu donné. Vérifiez également la README créée dans le dossier exporté : elle liste les fichiers remplacés et un emplacement de test.

## Limites à connaître

- Testez toujours le résultat en jeu. Le streaming, l’éclairage, les portails, la collision et les portes doivent être validés dans FiveM.
- Les ressources exportées remplacent certains fichiers du jeu, ce qui peut entrer en conflit avec une autre ressource qui remplace les mêmes fichiers.
- Les salles sont rectangulaires et sur un seul niveau intérieur par intérieur.
- Les changements apportés aux modèles de GTA nécessitent l’export de fichiers de jeu : ils ne sont pas générés directement en jeu par FiveM.

Pour le détail de chaque outil, consultez `HOW-IT-WORKS.md` (documentation technique d’origine, en anglais).

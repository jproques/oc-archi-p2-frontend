# EtudiantFrontend

## Connexion

La page `/login` permet de saisir un identifiant
et un mot de passe obligatoires. Le service envoie le DTO `{ login, password }`
à `POST /api/login` et reçoit le JWT au format texte. Le token est accessible
via `UserService.token()` et reste en mémoire jusqu’au rechargement de la page.
L’écran affiche le chargement, les erreurs serveur et la confirmation de connexion.
Après une inscription réussie, l’application ouvre la page de connexion.
Après connexion, l'application ouvre la liste des étudiants ou la page protégée
initialement demandée. `/` redirige vers cette liste et demande la connexion si nécessaire.

Pour vérifier avec le backend :

1. Démarrer le backend sur `http://localhost:8080` avec sa base MySQL.
2. Lancer `npm start`, puis ouvrir `http://localhost:4200/login`.
3. Créer un compte via `/register`, puis utiliser ces identifiants pour se connecter.
4. Vérifier le message de succès et la réponse contenant le token dans l’onglet
   Réseau du navigateur (`POST /api/login`). Tester également un mauvais mot de passe.

Le serveur Angular relaie `/api` au backend grâce à `proxy.conf.json`.
Exécuter les tests avec `npm test -- --runInBand` et compiler avec `npm run build`.

## Gestion des étudiants

| Écran | Route |
| --- | --- |
| Liste | `/students` |
| Création | `/students/new` |
| Détail et confirmation de suppression | `/students/:id` |
| Modification | `/students/:id/edit` |

Les routes sont protégées par `authGuard`, qui vérifie la présence et l'expiration
du JWT. `authInterceptor` l'ajoute aux appels `/api/students` uniquement. Le
backend vérifie sa signature et les autorisations ; le guard contrôle l'accès
aux écrans. Une réponse `401` efface la session et renvoie à la connexion.
Le bouton de déconnexion efface également le token. Un rechargement de page
demande de se reconnecter puisque le token reste en mémoire.

Le service `StudentService` appelle les cinq routes CRUD du backend. Le modèle
`Student` correspond au DTO : `firstName`, `lastName`, `email`, `dateOfBirth`
au format `YYYY-MM-DD`, `placeOfBirth` et l'identifiant renvoyé par la base.
L'identifiant n'est jamais envoyé dans les corps de création et de modification.
Les cinq champs sont obligatoires, l'email et la date sont validés, les champs
texte sont limités à 255 caractères et une date future est refusée.

Pour vérifier : se connecter, ajouter un étudiant, ouvrir son détail, modifier
ses champs puis confirmer sa suppression. Vérifier également les erreurs
serveur, une session expirée et l'accès direct à une route sans connexion.
Chaque écran affiche les états de chargement et d'erreur, et les opérations
réussies affichent une confirmation. La suppression peut être annulée avant
l'appel au backend.

This project was generated using [Angular CLI](https://github.com/angular/angular-cli) version 19.2.16.

## Development server

To start a local development server, run:

```bash
ng serve
```

Once the server is running, open your browser and navigate to `http://localhost:4200/`. The application will automatically reload whenever you modify any of the source files.

## Code scaffolding

Angular CLI includes powerful code scaffolding tools. To generate a new component, run:

```bash
ng generate component component-name
```

For a complete list of available schematics (such as `components`, `directives`, or `pipes`), run:

```bash
ng generate --help
```

## Building

To build the project run:

```bash
ng build
```

This will compile your project and store the build artifacts in the `dist/` directory. By default, the production build optimizes your application for performance and speed.

## Running unit tests

To execute unit tests with the [Jest](https://jestjs.io/) test runner, use the following command:

```bash
jest
```

## Running end-to-end tests

For end-to-end (e2e) testing, run:

```bash
ng e2e
```

Angular CLI does not come with an end-to-end testing framework by default. You can choose one that suits your needs.

## Additional Resources

For more information on using the Angular CLI, including detailed command references, visit the [Angular CLI Overview and Command Reference](https://angular.dev/tools/cli) page.

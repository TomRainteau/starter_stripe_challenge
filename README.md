# My App

Application Next.js avec authentification et base de données PostgreSQL.

## Prérequis

- Node.js (v18+)
- Docker & Docker Compose

## Installation

```bash
npm install
```

## Lancer le projet

### 1. Démarrer la base de données

```bash
docker compose up -d
```

- **PostgreSQL** : `localhost:5432`
- **Adminer** (interface BDD) : [http://localhost:8080](http://localhost:8080)

### 2. Appliquer le schéma Prisma

```bash
npx prisma db push
```

### 3. Générer le client Prisma

```bash
npx prisma generate
```

### 4. Lancer le serveur de développement

```bash
npm run dev
```

L'application est accessible sur [http://localhost:3000](http://localhost:3000).

## Commandes utiles

| Commande | Description |
|---|---|
| `docker compose up -d` | Démarrer PostgreSQL + Adminer |
| `docker compose down` | Arrêter les conteneurs |
| `npx prisma db push` | Synchroniser le schéma avec la BDD |
| `npx prisma generate` | Régénérer le client Prisma |
| `npx prisma studio` | Interface visuelle Prisma |
| `npm run dev` | Serveur de développement |
| `npm run build` | Build de production |

## Stripe

Le projet utilise [Stripe](https://stripe.com) pour la gestion des paiements et des abonnements. En développement local, la [Stripe CLI](https://docs.stripe.com/stripe-cli) est nécessaire pour tester le checkout et recevoir les webhooks.

### 1. Installer la Stripe CLI

```bash
# macOS
brew install stripe/stripe-cli/stripe

# Autres plateformes : https://docs.stripe.com/stripe-cli#install
```

Vérifier l'installation :

```bash
stripe --version
```

### 2. Se connecter à son compte Stripe

```bash
stripe login
```

Une page s'ouvre dans le navigateur pour autoriser la CLI à accéder au compte Stripe (mode test).

### 3. Récupérer les clés d'API

Dans le [dashboard Stripe](https://dashboard.stripe.com/test/apikeys) (mode **test**), copier :

- `STRIPE_SECRET_KEY` → clé secrète (`sk_test_...`)
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` → clé publique (`pk_test_...`)

Les ajouter au fichier `.env` à la racine du projet.

### 4. Écouter les webhooks en local

Dans un terminal dédié, lancer :

```bash
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

La CLI affiche alors un **webhook signing secret** (`whsec_...`) à copier dans `.env` sous la variable `STRIPE_WEBHOOK_SECRET`. Laisser la commande tourner pendant toute la session de développement.

### 5. Déclencher des événements de test

Dans un autre terminal, on peut simuler des événements Stripe sans passer par l'UI :

```bash
stripe trigger checkout.session.completed
stripe trigger customer.subscription.created
stripe trigger customer.subscription.updated
stripe trigger customer.subscription.deleted
stripe trigger invoice.payment_succeeded
```

### 6. Cartes de test

Pour tester un paiement dans l'application, utiliser les [cartes de test Stripe](https://docs.stripe.com/testing#cards) :

| Carte | Comportement |
|---|---|
| `4242 4242 4242 4242` | Paiement accepté |
| `4000 0025 0000 3155` | Nécessite une authentification 3DS |
| `4000 0000 0000 9995` | Paiement refusé (fonds insuffisants) |

Date d'expiration : n'importe quelle date future. CVC : n'importe quel nombre à 3 chiffres.

### Commandes Stripe utiles

| Commande | Description |
|---|---|
| `stripe login` | Authentification de la CLI avec le compte Stripe |
| `stripe logout` | Déconnexion de la CLI |
| `stripe listen --forward-to localhost:3000/api/stripe/webhook` | Forward des webhooks vers l'app locale |
| `stripe trigger <event>` | Déclencher un événement de test |
| `stripe events resend <event_id>` | Rejouer un événement déjà reçu |
| `stripe logs tail` | Suivre les logs d'API en temps réel |

## TODO — Évolution des abonnements

Actuellement, l'application propose un seul abonnement. L'objectif est de passer à **deux plans** (`Premium` et `Max`), chacun disponible en **mensuel** ou **annuel** (soit 4 prix au total).

### Issues à intégrer

- [ ] **#1 — Stripe : créer les produits et prix**
  Créer 2 produits (`Premium`, `Max`) avec chacun 2 prix récurrents (mensuel + annuel). Récupérer les `price_id` et les exposer via les variables d'environnement.

- [ ] **#2 — Back : adapter le modèle de données**
  Mettre à jour le schéma Prisma pour stocker le plan (`PREMIUM` / `MAX`) et la période (`MONTHLY` / `YEARLY`) de l'utilisateur abonné. Migration à prévoir.
  
- [ ] **#3 — Back : mise à jour du checkout**
  Modifier la route de création de session Stripe Checkout pour accepter un `priceId` dynamique (en fonction du plan et de la période choisis par l'utilisateur).

- [ ] **#4 — Back : gestion du webhook Stripe**
  Adapter le handler webhook pour identifier le plan et la période à partir du `priceId` reçu, et mettre à jour l'utilisateur en base en conséquence.

- [ ] **#5 — Back : changement de plan (upgrade / downgrade)**
  Ajouter une route permettant à un utilisateur déjà abonné de changer de plan ou de période via l'API Stripe (`subscription.update`).

- [ ] **#6 — Front : page de pricing**
  Créer une page `/pricing` affichant les deux plans côte à côte, avec un toggle mensuel / annuel, la liste des fonctionnalités et un CTA d'abonnement par plan.

- [ ] **#7 — Front : page de gestion de l'abonnement**
  Afficher le plan actuel de l'utilisateur, permettre de changer de plan / période, et donner accès au portail client Stripe.

- [ ] **#8 — Front : protection d'accès par plan**
  Mettre en place un garde côté front (et vérif côté back) pour restreindre certaines fonctionnalités aux utilisateurs `Max` uniquement.

- [ ] **#9 — Tests & QA**
  Tester le parcours complet avec les cartes de test Stripe : souscription Premium/Max mensuel/annuel, upgrade, downgrade, annulation, réception des webhooks.

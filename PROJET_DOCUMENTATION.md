# PROJET : APPROBATION DE FACTURES & COMPTES DE DÉPENSES — DOCUMENTATION TECHNIQUE COMPLÈTE

> Document de référence exhaustif destiné à permettre à une instance d'IA (ou un développeur) de reprendre le projet à 100% sans contexte préalable. Source de vérité : le code du repo GitHub `JulienJCE/approbation-factures-v2` (lu directement, pas de mémoire). Dernière mise à jour : 2026-07-29.

---

## 0. RÉSUMÉ EXÉCUTIF EN UNE PHRASE

Application web interne (Conteneurs Experts Inc.) qui remplace l'approbation de factures par courriel : la comptabilité téléverse un PDF, l'assigne à un approbateur, l'approbateur approuve/rejette en un clic, le PDF est tamponné « APPROUVÉ POUR PAIEMENT » et un courriel de confirmation avec pièce jointe est renvoyé à l'émetteur.

---

## 1. IDENTIFIANTS & LOCALISATION DU PROJET

| Élément | Valeur |
|---|---|
| **Nom projet** | approbation-factures-v2 |
| **URL production** | https://approbation-factures-v2.vercel.app |
| **URL login** | https://approbation-factures-v2.vercel.app/login |
| **Repo GitHub** | https://github.com/JulienJCE/approbation-factures-v2 (branche `main`) |
| **Hébergement** | Vercel (déploiement auto sur push `main`) |
| **Base de données** | Neon PostgreSQL (serverless) |
| **Stockage fichiers** | Vercel Blob |
| **Envoi courriel** | Resend |
| **Version** | 2.0.0 |
| **Propriétaire** | Julien Jacques (julien.j@conteneursexperts.com) |

---

## 2. STACK TECHNIQUE (dépendances réelles, package.json)

- **Framework** : Next.js 14 (App Router — PAS Pages Router)
- **Runtime** : React 18.2, TypeScript 5.2, Node.js
- **Base de données** : `postgres` (npm, v3.4.9) — client SQL tag-template, connexion via `postgres(process.env.DATABASE_URL!)`
- **PDF** : `pdf-lib` v1.17.1 (tamponnage côté serveur)
- **Stockage** : `@vercel/blob` v0.27.0 (`put()` pour uploader PDF, access public)
- **Courriel** : `resend` v4.0.0
- **Auth Microsoft (partiel/inactif)** : `@azure/msal-browser` v5.17.1, `@azure/msal-react` v5.5.3 — SCAFFOLDING seulement, non utilisé en production (voir §9)

---

## 3. ARCHITECTURE — FLUX DE DONNÉES COMPLET

### 3.1 Flux Volet 1 (Factures — ACTIF)
```
1. Comptable se connecte (/login) → auth via table `users` (SHA-256)
2. Comptable va sur /volet1/comptabilite
3. Sélectionne PDF + choisit approbateur (liste `personnes` en mémoire)
4. POST /api/documents :
   - Upload PDF vers Vercel Blob → originals/{timestamp}-{filename} → pdfUrl public
   - INSERT dans table `documents` (status='pending', submitted_by_name/email)
   - sendApprovalRequestEmail() → courriel violet à l'approbateur
5. Approbateur reçoit courriel → clique → /approbateur
6. Approbateur voit factures pending → visualise PDF → Approuve/Rejette
7. POST /api/documents/[id]/approve :
   - updateDocumentStatus() → status='approved'|'rejected'
   - Si approuvé : fetch PDF original → applyStamp('approved') → re-upload Blob stamped/{...} → saveStampedPdfUrl()
   - sendApprovalEmail() → courriel à submitted_by_email AVEC PDF tamponné en pièce jointe (base64)
   - logEmail() → INSERT journal_courriels (pour page /notifications)
```

### 3.2 Flux Volet 2 (Visa/dépenses — NON DÉVELOPPÉ, voir §8)
Idée seulement. Scaffolding présent : routage visa en mémoire, tampon 'visa', page /volet2/employe (coquille).

---

## 4. SCHÉMA BASE DE DONNÉES (Neon PostgreSQL)

### 4.1 Table `documents`
```sql
CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type VARCHAR(50) NOT NULL CHECK (type IN ('invoice', 'visa')),
  file_name VARCHAR(255) NOT NULL,
  volet INTEGER NOT NULL CHECK (volet IN (1, 2)),
  status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  approuveur_id VARCHAR(50) NOT NULL,        -- réfère à personnes[] en mémoire, PAS de FK
  visa_code VARCHAR(50),
  pdf_url VARCHAR(1024),                       -- écrasé par version tamponnée après approbation
  pdf_url_stamped VARCHAR(1024),              -- présent dans migrate-v2 mais code écrase pdf_url à la place
  stamps_applied TEXT[],
  submitted_by_name VARCHAR(255),            -- ajouté tardivement (migrate-v3 / migrate-submitted-by)
  submitted_by_email VARCHAR(255),           -- idem
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  approved_at TIMESTAMP
);
```
**NOTE CRITIQUE** : `approuveur_id` n'a PAS de contrainte FK. Les personnes (approbateurs) sont codées en dur dans `lib/db.ts` (tableau `personnes`), pas stockées en DB. Seule la table `users` (auth) est en DB.

### 4.2 Table `users` (authentification)
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) NOT NULL UNIQUE,
  name VARCHAR(255) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,       -- SHA-256 hex (crypto.createHash)
  role VARCHAR(50) NOT NULL CHECK (role IN ('admin', 'approbateur', 'comptabilite')),
  can_approve BOOLEAN NOT NULL DEFAULT false,
  must_change_password BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 4.3 Table `journal_courriels`
```sql
CREATE TABLE journal_courriels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL,
  approuveur_id VARCHAR(50) NOT NULL,
  to_email VARCHAR(255) NOT NULL,
  subject VARCHAR(512) NOT NULL,
  status VARCHAR(50) NOT NULL CHECK (status IN ('sent', 'failed')),
  sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 4.4 INCOHÉRENCE DE MODÈLE À CONNAÎTRE
Il existe DEUX représentations des personnes :
1. **`users` (DB)** : rôles `admin`/`approbateur`/`comptabilite` — sert à l'AUTH (login).
2. **`personnes` (mémoire, lib/db.ts)** : rôles `approuveur`/`employe_visa`/`comptable` — sert au ROUTAGE des documents (approuveur_id).
Ces deux listes ne sont PAS synchronisées automatiquement. Les IDs de `personnes` sont des chaînes '1'..'10'. Les IDs de `users` sont des UUID. `approuveur_id` dans `documents` réfère aux IDs mémoire ('1'..'10').

---

## 5. VARIABLES D'ENVIRONNEMENT (configurées dans Vercel → Settings → Environment Variables)

| Variable | Usage | Où utilisée |
|---|---|---|
| `DATABASE_URL` | Connexion Neon PostgreSQL | lib/db.ts, lib/auth.ts, tous les /api/migrate* |
| `RESEND_API_KEY` | Clé API Resend | lib/email.ts |
| `COMPTA_EMAIL` | Email compta (fallback destinataire) | app/api/documents/[id]/approve/route.ts (défaut: julien.j@conteneursexperts.com) |
| `BLOB_READ_WRITE_TOKEN` | Auto-injecté par Vercel Blob | @vercel/blob put() |
| `NEXT_PUBLIC_AZURE_CLIENT_ID` | Azure AD (inactif) | lib/azure-config.ts |
| `NEXT_PUBLIC_AZURE_TENANT_ID` | Azure AD (inactif) | lib/azure-config.ts |

**Resend "from"** actuellement : `onboarding@resend.dev` (domaine test Resend, hardcodé dans lib/email.ts). À REMPLACER par domaine @conteneursexperts.com vérifié (voir §8, tâche courriel pro).

---

## 6. INVENTAIRE COMPLET DES FICHIERS

### 6.1 Pages (app/*/page.tsx)
| Route | Fichier | Rôle |
|---|---|---|
| `/` | app/page.tsx | Racine (redirection) |
| `/login` | app/login/page.tsx | Connexion |
| `/change-password` | app/change-password/page.tsx | Changement mot de passe (1er login) |
| `/forgot-password` | app/forgot-password/page.tsx | Mot de passe oublié |
| `/dashboard` | app/dashboard/page.tsx | Tableau de bord (4 boutons) |
| `/volet1/comptabilite` | app/volet1/comptabilite/page.tsx | Upload factures (Volet 1) |
| `/volet2/employe` | app/volet2/employe/page.tsx | Coquille Volet 2 (non fonctionnel) |
| `/approbateur` | app/approbateur/page.tsx | Liste factures à approuver |
| `/documents/[id]` | app/documents/[id]/page.tsx | Visualisation document |
| `/documents/[id]/approve` | app/documents/[id]/approve/page.tsx | Page approbation directe |
| `/notifications` | app/notifications/page.tsx | Historique notifications |
| `/auth/callback` | app/auth/callback/page.tsx | Callback Azure (inactif) |

### 6.2 Endpoints API (app/api/*/route.ts)
| Endpoint | Méthode | Rôle |
|---|---|---|
| `/api/documents` | POST/GET | Créer document (upload+email) / lister |
| `/api/documents/[id]` | GET | Détail document |
| `/api/documents/[id]/approve` | POST | Approuver/rejeter (tampon+email+log) |
| `/api/auth/login` | POST | Authentification |
| `/api/auth/change-password` | POST | Changer mot de passe |
| `/api/auth/reset-password` | POST | Réinitialiser mot de passe |
| `/api/approuveurs` | GET | Liste approbateurs (mémoire) |
| `/api/notifications` | GET | Historique courriels |
| `/api/check-schema` | GET | DIAGNOSTIC : colonnes table documents + info DB |
| `/api/list-users` | GET | DIAGNOSTIC : liste users |

### 6.3 Endpoints de MIGRATION (à usage unique, app/api/migrate*)
| Endpoint | Effet | ⚠️ DANGER |
|---|---|---|
| `/api/migrate` | DROP+CREATE documents & journal_courriels (schéma v1, sans pdf_url_stamped) | DÉTRUIT les données documents |
| `/api/migrate-v2` | DROP+CREATE documents & journal_courriels (avec pdf_url_stamped) | DÉTRUIT les données documents |
| `/api/migrate-v3` | ALTER ADD submitted_by_name + submitted_by_email (IF NOT EXISTS) | Non destructif |
| `/api/migrate-submitted-by` | Identique à migrate-v3 + index + UPDATE 'Unknown' | Non destructif. DOUBLON de migrate-v3 |
| `/api/migrate-users` | DROP+CREATE table users | DÉTRUIT les données users |
| `/api/seed-users` | DELETE users + INSERT 9 users avec mots de passe générés aléatoires | Réinitialise tous les users |
| `/api/reset-all-passwords` | Réinitialise tous les mots de passe | Force changement |
| `/api/admin-reset` | Reset admin | — |
| `/api/fix-email` | Correction email | — |

**NOTE** : `migrate-submitted-by` (créé le 2026-07-29) fait doublon avec `migrate-v3` qui existait déjà. Les deux ajoutent les mêmes colonnes. À nettoyer éventuellement.

### 6.4 Librairies (lib/*.ts)
| Fichier | Contenu |
|---|---|
| lib/db.ts | Client postgres, tableau `personnes` (10, en mémoire), `routageVisa`, CRUD documents, logEmail |
| lib/auth.ts | hashPassword (SHA-256), authenticateUser, changePassword |
| lib/email.ts | sendResetEmail, sendApprovalEmail, sendApprovalRequestEmail (Resend, HTML inline) |
| lib/pdf-stamp.ts | applyStamp (pdf-lib), STAMP_CONFIGS (visa/approved), generateStampSVG |
| lib/types.ts | Interfaces TS : Personne, Document, JournalCourriel, DocumentStatus, etc. |
| lib/constants.ts | Constantes : statuts, types, couleurs tampons, messages |
| lib/azure-config.ts | Config MSAL Azure (INACTIF) |
| lib/useAuth.ts | Hook auth côté client |
| lib/utils.ts | Utilitaires |

---

## 7. DONNÉES CODÉES EN DUR (lib/db.ts)

### 7.1 Tableau `personnes` (routage documents — IDs mémoire)
```
id=1  Julien Jacques      julien.j@conteneursexperts.com    approuveur
id=2  Emre Keskin         emre.k@conteneursexperts.com      approuveur
id=3  Pierjean Savard     pierjean@conteneursexperts.com    approuveur
id=4  Patrick Parent      patrick.p@conteneursexperts.com   approuveur
id=5  Michel Villeneuve   michel.v@conteneursexperts.com    approuveur
id=6  Karine Fournelle    karine@conteneursexperts.com      approuveur
id=7  Franco Di Chiccio   franco.d@conteneursexperts.com    approuveur
id=8  Yanick Tremblay     yanick.t@conteneursexperts.com    employe_visa
id=9  Marco Chappadeau    marco.c@conteneursexperts.com     employe_visa
id=10 Eric Cloutier       eric.c@conteneursexperts.com      employe_visa
```

### 7.2 Table `routageVisa` (Volet 2 — logique prévue)
```
'PS-2026' → employé 3, approuveur 3, autoApprove=true   (Pierjean, auto)
'EK-2026' → employé 2, approuveur 2, autoApprove=true   (Emre, auto)
'YT-2026' → employé 8, approuveur 7, autoApprove=false  (Yanick → Franco)
'MC-2026' → employé 9, approuveur 5, autoApprove=false  (Marco → Michel)
'EC-2026' → employé 10, approuveur 4, autoApprove=false (Eric → Patrick)
```

### 7.3 Users réels en DB (créés via seed-users, rôles auth)
```
julien.j@conteneursexperts.com        Julien Jacques                admin        can_approve=true
emre.k@conteneursexperts.com          Emre Keskin                   approbateur  can_approve=true
pierjean@conteneursexperts.com        Pierjean Savard               approbateur  can_approve=true
patrick.p@conteneursexperts.com       Patrick Parent                approbateur  can_approve=true
michel.v@conteneursexperts.com        Michel Villeneuve             approbateur  can_approve=true
karine@conteneursexperts.com          Karine Fournelle              approbateur  can_approve=true
franco.d@conteneursexperts.com        Franco Di Chiccio             approbateur  can_approve=true
payable@conteneursexperts.com         Christine (Comptes payables)  comptabilite can_approve=false
comptabilite@conteneursexperts.com    Martine (Comptabilité)        comptabilite can_approve=false
```
⚠️ INCOHÉRENCE : le guide de formation liste `payables@` (avec s) mais seed-users crée `payable@` (sans s). À vérifier/corriger.

### 7.4 Configuration des tampons PDF (lib/pdf-stamp.ts)
```
VISA     : couleur RGB(30,144,255) bleu, taille 72, rotation -45°, opacité 0.25, bordure oui
APPROVED : couleur RGB(197,80,79) rouge/brun, taille 32, rotation -30°, opacité 0.35, texte "APPROUVÉ POUR PAIEMENT"
```
Le tampon est appliqué UNIQUEMENT sur la première page. Sous le texte principal : "{approbateur} · {date}".

---

## 8. PROCÉDURES D'INTERVENTION TECHNIQUE (LE CŒUR — comment modifier l'app)

### 8.1 PRINCIPE GÉNÉRAL DU DÉPLOIEMENT
Vercel est connecté au repo GitHub. **Tout push sur `main` déclenche un redéploiement automatique.** Il n'y a PAS besoin de toucher Vercel manuellement pour déployer du code — seulement pour les variables d'environnement.

### 8.2 MODIFIER LE CODE (GitHub → Vercel automatique)
```bash
# 1. Cloner (si pas déjà fait)
git clone https://github.com/JulienJCE/approbation-factures-v2.git
cd approbation-factures-v2

# 2. Faire les modifications dans les fichiers

# 3. Commit + push
git add -A
git commit -m "description du changement"
git push origin main

# 4. Vercel redéploie automatiquement (~2-3 min)
```
**AUTHENTIFICATION GIT** : le push nécessite un GitHub Personal Access Token (PAT) avec scope `repo`. Configuration via ~/.git-credentials :
```
https://JulienJCE:<GITHUB_PAT>@github.com
```
(SSH ne fonctionne PAS dans l'environnement d'exécution Claude — utiliser HTTPS+PAT.)

### 8.3 RÈGLE CRITIQUE — STRUCTURE DES ENDPOINTS API (Next.js App Router)
Un endpoint API DOIT être un fichier nommé `route.ts` DANS un dossier portant le nom de la route.
- ✅ CORRECT : `app/api/mon-endpoint/route.ts` → accessible à `/api/mon-endpoint`
- ❌ FAUX : `app/api/mon-endpoint.ts` → donne un 404
(Erreur commise le 2026-07-29 : fichier placé directement → 404 → corrigé en le déplaçant dans un dossier /route.ts.)

Un fichier route.ts exporte des fonctions nommées par méthode HTTP :
```typescript
import { NextRequest, NextResponse } from 'next/server';
import postgres from 'postgres';

export async function GET(req: NextRequest) {
  const db = postgres(process.env.DATABASE_URL!);
  try {
    // ... logique ...
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
```

### 8.4 MODIFIER LA BASE DE DONNÉES NEON — 2 méthodes

**MÉTHODE A — Via endpoint de migration (recommandée, pas d'accès direct requis)**
1. Créer `app/api/ma-migration/route.ts` avec une fonction GET qui exécute le SQL.
2. TOUJOURS utiliser `IF NOT EXISTS` / `ADD COLUMN IF NOT EXISTS` pour l'idempotence.
3. Push sur GitHub → attendre redéploiement.
4. Appeler l'URL dans un navigateur : `https://approbation-factures-v2.vercel.app/api/ma-migration`
5. Vérifier le JSON de retour.
6. Optionnel : supprimer l'endpoint après usage (sécurité — ces endpoints sont PUBLICS, non protégés).

Exemple d'ajout de colonne (non destructif) :
```typescript
await db`ALTER TABLE documents ADD COLUMN IF NOT EXISTS ma_colonne VARCHAR(255)`;
```

**MÉTHODE B — Via console Neon directe**
1. https://console.neon.tech → sélectionner le projet → SQL Editor.
2. Écrire/coller le SQL → Run.
3. Effet immédiat (pas de déploiement requis).
Utiliser cette méthode pour les opérations ponctuelles ou destructives contrôlées.

**DIAGNOSTIC DU SCHÉMA** : toujours appeler `/api/check-schema` pour voir l'état réel des colonnes de `documents` avant/après une migration.

### 8.5 MODIFIER LES VARIABLES D'ENVIRONNEMENT (Vercel)
1. https://vercel.com → projet approbation-factures-v2 → Settings → Environment Variables.
2. Ajouter/modifier → sélectionner les environnements (Production/Preview/Development).
3. **IMPORTANT** : après modification d'une variable, il faut REDÉPLOYER pour qu'elle prenne effet (Deployments → dernier → Redeploy, ou pousser un commit).

### 8.6 MODIFIER LE ROUTAGE / LES PERSONNES
Les approbateurs et le routage visa sont EN DUR dans `lib/db.ts` (tableaux `personnes` et `routageVisa`). Pour ajouter/retirer un approbateur du routage : éditer `lib/db.ts` + push. Pour l'AUTH (login), c'est la table `users` en DB : utiliser un endpoint ou la console Neon.

### 8.7 DÉCLENCHER UN REDÉPLOIEMENT SANS CHANGEMENT DE CODE
Vercel Dashboard → Deployments → menu "..." du dernier déploiement → Redeploy. (Ou commit vide : `git commit --allow-empty -m "redeploy" && git push`.)

### 8.8 ACCÈS API VERCEL PAR TOKEN
Un token Vercel (vcp_...) peut être scopé de façon limitée. Observé le 2026-07-29 : un token donné ne retournait ni projets ni teams via l'API REST (`/v9/projects`, `/v2/teams` vides), et échouait avec la CLI. Pour l'automatisation Vercel, s'assurer que le token a le scope complet du compte/team. Le déploiement passe de toute façon par GitHub, donc l'API Vercel n'est pas nécessaire pour déployer.

---

## 9. AUTHENTIFICATION — ÉTAT RÉEL

- **Méthode active** : email + mot de passe. Hash SHA-256 (lib/auth.ts). Table `users`.
- ⚠️ SÉCURITÉ : SHA-256 simple SANS sel (salt) — faible pour du stockage de mots de passe. Amélioration recommandée : bcrypt/argon2 + sel.
- **Premier login** : `must_change_password=true` force la redirection vers /change-password.
- **Mot de passe oublié** : /forgot-password → génère un mot de passe temporaire → sendResetEmail (Resend).
- **Azure AD / MSAL** : présent dans lib/azure-config.ts + dépendances @azure/msal-*, mais redirectUri hardcodé `http://localhost:3000/dashboard` → NON fonctionnel en production. Scaffolding pour un futur SSO Microsoft 365 (l'entreprise est sur M365). Décision à prendre : activer le SSO Azure (aligné avec l'écosystème M365 de CE) ou rester sur auth maison.
- **Pas de session/JWT serveur** : l'app retourne l'objet user au client après login. Gestion d'état côté client (useAuth). Pas de middleware de protection des routes serveur observé → les endpoints /api/* sont PUBLICS (y compris les migrations). RISQUE à corriger avant usage large.

---

## 10. VOLET 2 — COMPTES DE DÉPENSES / VISA (À DÉVELOPPER — idée, rien de construit)

### 10.1 Intention
Chaîne d'approbation distincte pour les dépenses par carte Visa corporative. Un employé soumet une dépense via un code d'accès personnel (format XX-2026), le système route vers le bon approbateur, applique un tampon VISA, et selon le cas auto-approuve ou demande approbation.

### 10.2 Ce qui existe déjà (scaffolding)
- `routageVisa` (lib/db.ts) : 5 codes mappés employé→approbateur avec flag autoApprove.
- Tampon 'visa' configuré (lib/pdf-stamp.ts) : bleu, "VISA", -45°.
- `getStampsToApply()` gère la logique volet 2 + type visa → tampon visa.
- `createDocument()` accepte type='visa', visaCode, et applique auto-approbation si routing.autoApprove.
- Page coquille `/volet2/employe`.
- Type `employe_visa` dans personnes (Yanick, Marco, Eric).

### 10.3 Ce qu'il reste à construire (backlog Volet 2)
- [ ] Interface employé fonctionnelle (/volet2/employe) : upload reçu + saisie code visa + montant.
- [ ] Validation du code visa côté UI (format XX-2026, isValidVisaCode existe déjà).
- [ ] Champ montant $ (absent du schéma documents — ADD COLUMN amount NUMERIC requis).
- [ ] Catégorisation de dépense (repas, déplacement, matériel...) — nouvelle colonne/table.
- [ ] Flux auto-approbation (PS-2026, EK-2026) vs approbation requise.
- [ ] Tampon VISA + éventuel double tampon (visa puis approuvé).
- [ ] Adapter la page /approbateur pour distinguer factures (volet 1) et dépenses (volet 2).
- [ ] Rapport de dépenses / export comptable.
- [ ] Codes visa réels par employé (les 5 actuels sont des exemples).

---

## 11. BACKLOG GLOBAL & PROCHAINES ÉTAPES (priorisé)

### PRIORITÉ 1 — Stabilisation Phase 1 (Volet 1)
- [ ] Corriger l'incohérence email `payable@` vs `payables@` (seed-users vs guide formation).
- [ ] Synchroniser ou unifier les deux modèles de personnes (`users` DB ↔ `personnes` mémoire). Risque de bugs de routage.
- [ ] Sécuriser les endpoints /api/migrate*, /api/seed-users, /api/reset-all-passwords (actuellement PUBLICS — n'importe qui avec l'URL peut détruire la DB). Ajouter un secret/header d'auth ou les supprimer après usage.
- [ ] Nettoyer les doublons de migration (migrate-v3 == migrate-submitted-by).

### PRIORITÉ 2 — Restrictions par rôle
- [ ] Sur /approbateur : chaque approbateur ne voit QUE les factures qui lui sont assignées (filtrer par approuveur_id = user courant). Actuellement, logique de restriction à vérifier/implémenter.
- [ ] Middleware de protection des routes (empêcher accès direct aux pages/endpoints sans auth).

### PRIORITÉ 3 — Courriel professionnel
- [ ] Vérifier le domaine conteneursexperts.com dans Resend (DNS : SPF, DKIM).
- [ ] Remplacer `onboarding@resend.dev` par `approbation@conteneursexperts.com` (ou similaire) dans lib/email.ts (3 occurrences).
- [ ] ⚠️ Rappel infra CE : Checkpoint réécrit les URLs dans les courriels sortants — tester le rendu des liens.

### PRIORITÉ 4 — Historique & filtres
- [ ] Page historique complète avec filtres (date, statut, approbateur, volet).
- [ ] Recherche par nom de fichier / émetteur.

### PRIORITÉ 5 — Volet 2 (voir §10.3)

### PRIORITÉ 6 — Sécurité & robustesse
- [ ] Remplacer SHA-256 par bcrypt/argon2 + sel.
- [ ] Envisager SSO Azure AD (M365) — décision à prendre.
- [ ] Ajouter validation/limite taille fichier upload.
- [ ] Gestion d'erreur si Blob/Resend/Neon indisponible.

---

## 12. HISTORIQUE DES INTERVENTIONS (chronologie technique connue)

- **v1** : schéma initial documents (migrate) — sans pdf_url_stamped ni submitted_by.
- **v2** : ajout pdf_url_stamped (migrate-v2) — mais le code écrase finalement pdf_url au lieu d'utiliser cette colonne (saveStampedPdfUrl).
- **Ajout auth** : table users, SHA-256, seed-users avec génération mots de passe {Adjectif}{Animal}{NN}!.
- **v3 / submitted_by** : ajout submitted_by_name + submitted_by_email (migrate-v3).
- **2026-07-29** :
  - Guide de formation Word Phase 1 produit (11 sections, tableau accès, placeholders captures).
  - Erreur en prod : `column "submitted_by_name" of relation "documents" does not exist` sur upload → la migration v3 n'avait pas été exécutée sur la bonne branche/DB.
  - Création endpoint /api/migrate-submitted-by (doublon fonctionnel de v3, + index + UPDATE 'Unknown').
  - Erreur 404 (fichier .ts hors dossier route.ts) → corrigé.
  - Push GitHub via PAT réussi (commits 0e11637, fe070db).

---

## 13. PIÈGES CONNUS / LEÇONS APPRISES (à ne pas répéter)

1. **404 sur endpoint** = fichier mal placé. Il FAUT `dossier/route.ts`, jamais `fichier.ts`.
2. **"column does not exist"** = migration pas exécutée sur la DB de production. Toujours vérifier avec /api/check-schema après un push, et APPELER l'endpoint de migration.
3. **SSH indisponible** dans l'environnement Claude → push GitHub uniquement en HTTPS + PAT.
4. **Token Vercel peut être limité** → ne pas compter dessus pour l'API ; déployer via push GitHub.
5. **Endpoints de migration PUBLICS** → danger réel de destruction de DB. Ne jamais laisser un endpoint DROP TABLE accessible publiquement en permanence.
6. **Deux modèles de personnes désynchronisés** (users DB vs personnes mémoire) → source potentielle de bugs de routage.
7. **pdf_url est écrasé** par la version tamponnée après approbation → l'original n'est plus accessible ensuite (la colonne pdf_url_stamped existe mais n'est pas utilisée). À revoir si on veut conserver l'original.
8. **Resend from = onboarding@resend.dev** → les courriels partent d'un domaine test, pas pro.

---

## 14. CHECKLIST DE REPRISE RAPIDE (pour une IA qui reprend le projet)

1. Cloner le repo, lire lib/db.ts, lib/auth.ts, lib/email.ts, lib/pdf-stamp.ts.
2. Appeler /api/check-schema pour connaître l'état réel de la DB.
3. Vérifier les variables d'env dans Vercel Settings.
4. Pour tout changement DB : endpoint migration idempotent (IF NOT EXISTS) → push → appeler l'URL → vérifier.
5. Pour tout changement code : éditer → git push main → attendre redéploiement Vercel.
6. Ne JAMAIS exposer durablement un endpoint destructif public.
7. Respecter la structure App Router : dossier/route.ts.

---

FIN DU DOCUMENT.


# Snap Learn — Chrome Extension for AI-Powered Learning

Snap Learn est une extension Chrome qui permet de capturer une zone d'une page web, d'en extraire le texte grâce à l'OCR, puis de l'analyser à l'aide d'un modèle de langage (LLM) exécuté localement.

L'objectif est de faciliter la compréhension de contenus numériques directement depuis le navigateur, sans avoir à recopier manuellement le texte.

## Sommaire

- [Fonctionnalités](#fonctionnalités)
- [Démonstration du fonctionnement](#démonstration-du-fonctionnement)
- [Architecture du projet](#architecture-du-projet)
- [Technologies utilisées](#technologies-utilisées)
- [Prérequis](#prérequis)
- [Installation et configuration](#installation-et-configuration)
- [Utilisation](#utilisation)
- [API Backend](#api-backend)
- [Structure du projet](#structure-du-projet)
- [Sécurité et confidentialité](#sécurité-et-confidentialité)
- [Limites connues](#limites-connues)
- [Améliorations envisagées](#améliorations-envisagées)
- [Auteur](#auteur)

## Fonctionnalités

### Capture de contenu
- Sélection visuelle d'une zone de l'écran depuis une page web.
- Prévisualisation de la zone sélectionnée avant l'analyse.
- Transmission de l'image au backend local.

### Extraction de texte par OCR
- Utilisation d'EasyOCR pour détecter et extraire le texte présent dans l'image.
- Restitution du texte extrait dans l'interface de l'extension.

### Analyse par intelligence artificielle
Trois modes de traitement sont disponibles :

- **Expliquer :** obtenir une explication claire du contenu sélectionné.
- **Résumer :** synthétiser les informations principales.
- **Répondre :** répondre à une question à partir du texte extrait.

Un contexte complémentaire peut être fourni pour orienter la réponse. Le mode « Répondre » permet de saisir une question spécifique.

### Interface utilisateur
- Interface intégrée au popup Chrome.
- Affichage des résultats de l'OCR et du LLM.
- Possibilité de copier la réponse générée.

## Démonstration du fonctionnement

Le traitement suit le pipeline suivant :

1. L'utilisateur ouvre l'extension Chrome.
2. Il lance la capture et sélectionne une zone de la page.
3. L'image sélectionnée est conservée temporairement.
4. L'utilisateur rouvre le popup et choisit le type d'analyse.
5. Le backend reçoit l'image et extrait le texte avec EasyOCR.
6. Le texte extrait, le contexte éventuel et la consigne sont transmis au LLM.
7. Le modèle génère une réponse affichée dans l'extension.

**Pipeline :**

`Chrome Extension → Capture d'écran → Sélection de zone → FastAPI → EasyOCR → Ollama / Qwen 2.5 3B → Résultat`

L'analyse n'est déclenchée qu'après le clic de l'utilisateur sur le bouton « Analyser la capture ».

## Architecture du projet

Snap Learn repose sur deux composants principaux.

### 1. Extension Chrome

L'extension gère l'interaction avec l'utilisateur, la capture d'écran et l'affichage des résultats.

- **manifest.json :** déclare les permissions, le popup, les icônes et le service worker.
- **background.js :** orchestre la capture d'écran, communique avec le script de contenu et conserve temporairement l'image sélectionnée.
- **content.js :** affiche le sélecteur de zone sur la page et recadre l'image sélectionnée.
- **popup/** : contient l'interface, les styles et la logique du popup.

### 2. Backend Python

Le backend expose une API REST développée avec FastAPI.

- **FastAPI :** expose les endpoints de traitement.
- **EasyOCR :** extrait le texte à partir de l'image reçue.
- **Ollama :** permet d'interagir avec un modèle de langage local.
- **Qwen 2.5 3B :** génère les explications, résumés ou réponses.

## Technologies utilisées

| Technologie | Rôle |
|---|---|
| JavaScript | Logique de l'extension |
| HTML / CSS | Interface utilisateur |
| Chrome Extensions API — Manifest V3 | Intégration dans Chrome |
| Python | Développement du backend |
| FastAPI | API HTTP |
| Uvicorn | Serveur ASGI |
| EasyOCR | Reconnaissance optique de caractères |
| Ollama | Exécution et accès au LLM local |
| Qwen 2.5 3B | Génération de texte |
| Pydantic | Validation des données des requêtes |

## Prérequis

Avant de lancer le projet, installer :

- Python, dans une version compatible avec les dépendances utilisées.
- Google Chrome ou un navigateur Chromium compatible avec les extensions Manifest V3.
- Ollama.
- Le modèle `qwen2.5:3b`.
- Git, pour cloner le dépôt.

## Installation et configuration

### 1. Cloner le dépôt

```bash
git clone https://github.com/JessicaSigne/extension_ocr_llm.git
cd ocr-llm-assistant
```

### 2. Créer un environnement virtuel Python

Sous Windows PowerShell :

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
```

Si l'activation n'est pas autorisée par la politique PowerShell, utiliser un terminal compatible ou suivre la procédure adaptée à son environnement.

### 3. Installer les dépendances

```powershell
python -m pip install --upgrade pip
python -m pip install -r backend/requirements.txt
```

### 4. Installer et préparer Ollama

Installer Ollama depuis son site officiel :

https://ollama.com/

Télécharger le modèle utilisé par le backend :

```bash
ollama pull qwen2.5:3b
```

Vérifier que le modèle est disponible :

```bash
ollama list
```

Le service Ollama doit être démarré pour que le backend puisse générer des réponses. Selon l'installation, il peut démarrer automatiquement ; sinon, lancer le service avec la commande adaptée à l'environnement.

### 5. Démarrer le backend

Depuis la racine du projet, avec l'environnement virtuel activé :

```powershell
python -m uvicorn backend.app.main:app --reload
```

L'API est alors accessible à l'adresse :

http://127.0.0.1:8000

La documentation interactive de l'API est disponible à :

http://127.0.0.1:8000/docs

### 6. Charger l'extension dans Chrome

1. Ouvrir `chrome://extensions`.
2. Activer le **Mode développeur**.
3. Cliquer sur **Charger l'extension non empaquetée**.
4. Sélectionner le dossier `extension/` du projet.
5. Épingler Snap Learn dans la barre d'extensions si nécessaire.

Vérifier que le backend et Ollama sont opérationnels avant d'utiliser les fonctionnalités d'analyse.

## Utilisation

1. Ouvrir une page web compatible.
2. Cliquer sur l'icône Snap Learn.
3. Cliquer sur « Capturer une zone ».
4. Sélectionner la zone contenant le texte à analyser.
5. Rouvrir l'extension.
6. Choisir le mode : expliquer, résumer ou répondre.
7. Ajouter un contexte ou une question si nécessaire.
8. Cliquer sur « Analyser la capture ».
9. Consulter le texte extrait et la réponse générée.
10. Copier la réponse si besoin.

## API Backend

Le backend expose notamment les endpoints suivants :

| Endpoint | Méthode | Fonction |
|---|---|---|
| `/ocr` | POST | Reçoit une image et retourne le texte extrait |
| `/llm` | POST | Reçoit un texte et les paramètres d'analyse, puis retourne la réponse du modèle |

La documentation interactive disponible sur `/docs` permet de consulter les schémas exacts des requêtes et des réponses.

### Paramètres du LLM

Le backend accepte les paramètres suivants pour l'analyse :

- `text` : texte à analyser.
- `task` : type de traitement (`explain`, `summarize` ou `answer`).
- `question` : question facultative, notamment pour le mode réponse.
- `context` : contexte complémentaire facultatif.

Le modèle utilisé est `qwen2.5:3b`, exécuté localement via Ollama.

## Structure du projet

```text
ocr-llm-assistant/
├── backend/
│   ├── app/
│   │   ├── __init__.py
│   │   └── main.py
│   ├── tests/
│   └── requirements.txt
├── extension/
│   ├── manifest.json
│   ├── background.js
│   ├── content.js
│   ├── icons/
│   └── popup/
│       ├── popup.html
│       ├── popup.css
│       └── popup.js
├── .gitignore
└── README.md
```

Les fichiers et dossiers listés correspondent à l'organisation prévue du projet ; les tests, icônes et fichiers supplémentaires doivent être présents dans le dépôt s'ils sont mentionnés comme implémentés.

## Sécurité et confidentialité

- Le backend est configuré pour fonctionner localement sur `127.0.0.1:8000`.
- Les images sélectionnées sont conservées temporairement afin de permettre à l'utilisateur de choisir les paramètres de l'analyse.
- Le modèle de langage est exécuté localement via Ollama.
- Le contenu envoyé au modèle doit être considéré comme une donnée potentiellement sensible.
- Les données ne doivent pas être envoyées à un service distant sans que cela soit explicitement configuré et documenté.

Le fonctionnement local ne garantit pas, à lui seul, la confidentialité de tous les composants : les paramètres d'Ollama, les journaux, les dépendances et la configuration réseau doivent également être pris en compte.

## Limites connues

- La qualité de l'OCR dépend de la résolution, de la lisibilité et de la mise en page du texte.
- Les performances de génération dépendent des ressources disponibles et du modèle utilisé.
- Certaines pages Chrome internes ou protégées ne permettent pas l'injection du sélecteur ou la capture.
- Les résultats du LLM peuvent contenir des erreurs et doivent être vérifiés.
- Le backend doit être démarré pour utiliser les fonctionnalités de traitement.

## Améliorations envisagées

- Ajouter des tests automatisés pour les endpoints et les principales fonctions.
- Améliorer la gestion des erreurs et des temps d'attente.
- Enrichir l'interface utilisateur et ajouter des états de progression plus explicites.
- Ajouter un historique local des analyses, avec contrôle de l'utilisateur.
- Améliorer les performances de l'OCR et de la génération.
- Préparer une procédure de distribution de l'extension.
- Ajouter une documentation technique et des captures d'écran de démonstration.

## Auteur

**Jessica SIGNE**

Projet scolaire (reprit) de mise en pratique en développement d'extensions Chrome, traitement de données, OCR et intégration de modèles de langage locaux.

---

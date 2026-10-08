from fastapi import FastAPI

app = FastAPI(
    title="OCR LLM Assistant",
    description="API pour une application OCR + LLM",
    version="1.0.0"
)


@app.get("/")
def root():
    return {
        "message": "OCR LLM Assistant API",
        "status": "running"
    }


@app.get("/health")
def health():
    return {
        "status": "ok"
    }

# Lancement de l'application avec uvicorn : python -m uvicorn backend.app.main:app --reload

# Cette partie permet de créer le pont d'entrée qui permettra plus tard à notre application de communiquer avec le modèle LLM et l'OCR. Pour l'instant, elle ne fait que renvoyer
# 
# # 1.  L'utilisateur envoie un document
# # 2. Le backend envoie le contenu à l'OCR pour extraire le texte
# # 3. L'OCR répondrait par exemple : "Facture EDF du 12 septembre 2026..."
# # 4. Le backend envoie le texte extrait à LLM pour analyser et générer une réponse
# # 5/ L'API renvoie la réponse du LLM au frontend, qui l'affiche à l'utilisateur.

# Donc FastAPI est l'intermédiaire entre l'interface utilisateur et les services IA.

# Il est important de ne pas relier directement le frontend aux LLM parceque : 

# Le backend permet notamment de :

# protéger les clés API ;
# contrôler les fichiers envoyés ;
# valider les données ;
# gérer les erreurs ;
# orchestrer OCR → LLM ;
# appliquer notre logique métier ;
# centraliser l'accès aux services externes ;
# éventuellement authentifier les utilisateurs ;
# journaliser les requêtes.
# Permettre de changer de modèle LLM ou d'OCR sans impacter le frontend. Le frontend n'a pas besoin de savoir quel LLM se trouve derrière.


# Donc J1 — capture + sélection de zone est maintenant fonctionnel :

# ✅ Extension Chrome Manifest V3
# ✅ Capture de l’écran
# ✅ Affichage de la capture
# ✅ Sélection à la souris
# ✅ Rectangle de sélection correctement positionné
# ✅ Recadrage de la zone sélectionnée
# ✅ Aperçu de l’image recadrée

# | Fichier         | Rôle                             | À retenir                                                              |
# | --------------- | -------------------------------- | ---------------------------------------------------------------------- |
# | `manifest.json` | **Configuration de l'extension** | Il dit à Chrome comment fonctionne l'extension                         |
# | `popup.html`    | **Interface visuelle**           | Il définit ce que l'utilisateur voit quand il clique sur l'extension   |
# | `popup.js`      | **Logique / comportement**       | Il fait réellement fonctionner les boutons, la capture et la sélection |

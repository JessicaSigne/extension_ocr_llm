
from io import BytesIO

import easyocr
import numpy as np
from PIL import Image, UnidentifiedImageError
from fastapi import FastAPI, File, HTTPException, UploadFile

from pydantic import BaseModel
import ollama

app = FastAPI(
    title="OCR LLM Assistant",
    description="API pour extraire du texte depuis une image",
    version="1.0.0",
)

# Initialisation du moteur OCR une seule fois
reader = easyocr.Reader(["fr", "en"], gpu=False)


@app.get("/")
def root():
    return {
        "message": "OCR LLM Assistant API",
        "status": "running",
    }


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/ocr")
def extract_text(file: UploadFile = File(...)):
    # 1. Vérifier le type du fichier
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(
            status_code=400,
            detail="Le fichier envoyé doit être une image.",
        )

    # 2. Lire les octets de l'image
    content = file.file.read()

    if not content:
        raise HTTPException(
            status_code=400,
            detail="L'image envoyée est vide.",
        )

    # 3. Décoder l'image
    try:
        image = Image.open(BytesIO(content)).convert("RGB")
    except (UnidentifiedImageError, OSError):
        raise HTTPException(
            status_code=400,
            detail="Impossible de lire cette image.",
        )

    # 4. Convertir l'image en tableau numérique
    image_array = np.array(image)

    # 5. Extraire le texte avec EasyOCR
    lines = reader.readtext(image_array, detail=0)

    extracted_text = "\n".join(lines)

    # 6. Renvoyer le résultat
    return {
        "filename": file.filename,
        "text": extracted_text,
        "lines": lines,
        "line_count": len(lines),
    }

class LLMRequest(BaseModel):
    text: str
    task: str = "explain"
    question: str | None = None

@app.post("/llm")
def process_text(request: LLMRequest):
    tasks = {
        "explain": "Explique clairement le texte suivant.",
        "summarize": "Résume le texte suivant.",
        "answer": "Réponds à la question à partir du texte fourni.",
    }

    if request.task not in tasks:
        raise HTTPException(
            status_code=400,
            detail="Tâche inconnue. Utilise explain, summarize ou answer.",
        )

    if not request.text.strip():
        raise HTTPException(
            status_code=400,
            detail="Le texte ne doit pas être vide.",
        )

    if request.task == "answer" and not (
        request.question and request.question.strip()
    ):
        raise HTTPException(
            status_code=400,
            detail="Une question est nécessaire pour cette tâche.",
        )

    prompt = f"""
{tasks[request.task]}

Texte :
{request.text}
"""

    if request.task == "answer":
        prompt += f"\nQuestion : {request.question}\n"

    try:
        response = ollama.chat(
            model="qwen2.5:3b",
            messages=[
                {
                    "role": "system",
                    "content": (
                        "Tu es un assistant pédagogique. "
                        "Réponds en français, clairement et précisément."
                    ),
                },
                {"role": "user", "content": prompt},
            ],
        )

        return {
            "task": request.task,
            "response": response.message.content,
        }

    except Exception as exc:
        raise HTTPException(
            status_code=502,
            detail=f"Erreur lors de l'appel au modèle : {exc}",
        )


# UploadFile : Reçoit l'image envoyée au backend.
# BytesIO : Permet de lire les données binaires comme un flux de fichier.
# Image.open() : Décode l'image avec Pillow.
# np.array() : Convertit l'image en tableau numérique exploitable par EasyOCR.
# reader.readtext() : Détecte les zones de texte et reconnaît les caractères.
# "\n".join(lines) : Regroupe les lignes reconnues en un seul texte.



# Lancement de l'application avec uvicorn (lancement Fast API) : python -m uvicorn backend.app.main:app --reload

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


# LLMRequest définit les données que l'API attend.

# task détermine le comportement demandé au modèle.

# prompt rassemble la consigne et le texte à analyser.

# ollama.chat() transmet les messages au modèle.

# response.message.content contient le texte généré.

# HTTPException permet de renvoyer une erreur HTTP explicite.

# Ollama C'est le moteur qui télécharge, exécute et expose le modèle via une API locale.
# Qwen 2.5 en version 3B : c'est un modèle relativement compact . Modèle sélectionné pour sa capacité à comprendre et générer du texte en français, tout en étant plus léger que les modèles plus grands, ce qui le rend plus rapide à exécuter localement.


# POST /ocr : extrait le texte d’une image avec EasyOCR.
# POST /llm : explique, résume ou répond à une question à partir d’un texte avec Qwen 2.5.
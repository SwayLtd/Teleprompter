#!/bin/bash
# Script d'initialisation et de lancement du projet Flask

# 1. Activation de l'environnement virtuel
if [ ! -d "env" ]; then
    echo "Création de l'environnement virtuel Python..."
    python -m venv env
fi
source env/Scripts/activate

# 2. Installation des dépendances
pip install --upgrade pip
pip install -r requirements.txt

# 3. Création du fichier .env si absent
if [ ! -f ".env" ]; then
    echo "DATABASE_URL=sqlite:///teleprompter.db" > .env
    echo "Fichier .env créé."
fi

# 4. Lancement de l'application
python app.py

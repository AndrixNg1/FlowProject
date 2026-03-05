# FlowProject

FlowProject est un logiciel open-source de **planification et gestion de projets** inspiré d'outils comme Microsoft Project, ProjectLibre et GanttProject.

L'objectif du projet est de fournir une plateforme moderne permettant de planifier, organiser et visualiser des projets grâce à des **diagrammes de Gantt**, des **dépendances entre tâches** et un **moteur de planification automatique**.

---

## Fonctionnalités principales

* Gestion des **projets**
* Gestion des **tâches**
* Diagramme de **Gantt interactif**
* Gestion des **dépendances entre tâches**
* Calcul automatique du **planning**
* Détection des **cycles dans les dépendances**
* Architecture **modulaire et extensible**

---

## Architecture du projet

Le projet utilise une architecture **monorepo** avec plusieurs applications et packages.

```
FlowProject
│
├── apps
│   ├── api        # Backend NestJS (API)
│   └── web        # Frontend Vue.js
│
├── packages
│   ├── scheduler  # Moteur de planification des tâches
│   └── shared     # Types et interfaces partagés
│
├── pnpm-workspace.yaml
└── package.json
```

### Backend

* NestJS
* Prisma
* PostgreSQL

### Frontend

* Vue 3
* Vite
* Pinia
* Vue Router

### Core

* TypeScript
* pnpm workspaces

---

## Installation

### 1. Cloner le projet

```
git clone https://github.com/yourusername/FlowProject.git
cd FlowProject
```

### 2. Installer les dépendances

```
pnpm install
```

### 3. Lancer le projet

```
pnpm dev
```

Cela démarre :

* API NestJS : http://localhost:3000
* Application Vue : http://localhost:5173

---

## Structure des packages

### @flow/shared

Contient :

* Types communs
* DTO
* Interfaces partagées

### @flow/scheduler

Contient le moteur de planification :

* recalcul des dates
* gestion des dépendances
* tri topologique
* détection de cycles

---

## Roadmap

* [ ] CRUD projets
* [ ] CRUD tâches
* [ ] Dépendances entre tâches
* [ ] Diagramme de Gantt
* [ ] Drag & Drop sur le Gantt
* [ ] Calcul du chemin critique
* [ ] Export JSON / CSV
* [ ] Gestion des ressources

---

## Contribuer

Les contributions sont les bienvenues.

1. Fork le projet
2. Créer une branche
3. Faire un commit
4. Ouvrir une Pull Request

---

## Licence

MIT License

---

## Auteur

Projet développé par **Andrix Ngoyi**

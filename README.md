# HiveManager - Gestion Systèmes Connectés

Application web moderne pour la gestion de systèmes connectés via MQTT avec HiveMQ Cloud.

## 🚀 Fonctionnalités

### Interface Utilisateur
- **Design moderne et élégant** avec animations fluides
- **Interface responsive** adaptée aux mobiles et desktops
- **Menu hamburger** pour navigation mobile
- **Tableau de bord** avec statistiques en temps réel
- **Gestion des systèmes** avec visualisation d'état

### Terminal MQTT Intégré
- **Terminal interactif** pour tester HiveMQ
- **Commandes disponibles** :
  - `help` - Afficher l'aide
  - `status` - État de la connexion
  - `send <device> <command>` - Envoyer une commande
  - `list` - Lister tous les systèmes
  - `online` - Lister les systèmes en ligne
  - `publish <topic> <message>` - Publier un message
  - `subscribe <topic>` - S'abonner à un topic
  - `clear` - Effacer le terminal

### Gestion MQTT
- **Connexion automatique** à HiveMQ Cloud
- **Gestion de 30 systèmes** connectés
- **Contrôle ON/OFF** individuel ou groupé
- **Monitoring en temps réel** de l'état des systèmes

## 📁 Structure des Fichiers

```
esp32/
├── index.html          # Structure HTML principale
├── styles.css          # Styles CSS avec design responsive
├── script.js           # Logique JavaScript et MQTT
└── README.md           # Documentation
```

## 🛠️ Installation

1. Cloner ou télécharger les fichiers
2. Ouvrir `index.html` dans un navigateur web
3. L'application se connectera automatiquement à HiveMQ Cloud

## 📱 Compatibilité

### Desktop
- Chrome/Chromium (recommandé)
- Firefox
- Safari
- Edge

### Mobile
- Android Chrome
- iOS Safari
- Navigateurs mobiles modernes

## 🔧 Configuration MQTT

Les paramètres de connexion sont configurés dans `script.js` :

```javascript
const BROKER_URL = 'wss://0c55afee7a364e47947154c09e33702c.s1.eu.hivemq.cloud:8884/mqtt';
const USERNAME = 'esp32';
const PASSWORD = 'Esp32_1234';
```

## 🎨 Design Features

### Thème
- **Palette de couleurs moderne** avec bleu principal
- **Animations fluides** et transitions CSS3
- **Effets de survol** interactifs
- **Design épuré** et professionnel

### Responsive Design
- **Mobile-first approach**
- **Menu hamburger** avec overlay
- **Grilles adaptatives** pour les cartes
- **Navigation optimisée** pour tactile

### Composants
- **Cartes de systèmes** avec indicateurs visuels
- **Badges d'état** animés
- **Terminal style** avec couleurs syntaxiques
- **Notifications toast** élégantes

## 📊 Utilisation

### Navigation
1. **Menu latéral** pour accéder aux différentes sections
2. **Barre de recherche** pour filtrer les systèmes
3. **Boutons d'action** pour contrôler les systèmes

### Terminal
1. **Cliquer dans le terminal** pour activer l'input
2. **Taper des commandes** et appuyer sur Entrée
3. **Utiliser les flèches** pour naviguer dans l'historique

### Contrôle des Systèmes
1. **Visualiser l'état** des systèmes en temps réel
2. **Envoyer des commandes** ON/OFF individuellement
3. **Contrôle groupé** des systèmes connectés

## 🔍 Débogage

### Console Navigateur
- Ouvrir les outils de développement (F12)
- Consulter la console pour les messages MQTT
- Vérifier les erreurs de connexion

### Terminal Intégré
- Utiliser la commande `status` pour vérifier la connexion
- Observer les messages en temps réel
- Tester manuellement les commandes MQTT

## 🚀 Améliorations Futures

- [ ] Ajout de graphiques analytiques
- [ ] Exportation des logs
- [ ] Notifications push
- [ ] Thèmes sombres/clair
- [ ] Multi-utilisateurs
- [ ] API REST

## 📝 Notes

- L'application utilise des modules ES6
- Compatible avec les navigateurs modernes
- Connexion sécurisée via WebSocket (WSS)
- Design responsive avec CSS Grid et Flexbox

---

**Développé avec ❤️ pour la gestion efficace des systèmes IoT**

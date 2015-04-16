# AZKAR WebRTC script base 1TO1 version 0.4.0 

-------------------------------------------------

### Todo's

Encours:  STEP 1 >>> livrable base 1to1:
- DO: Hebergement nodejs sur Openshift
- DO: HTML5 & css client
- DO: Implémentation classes javascript communes client/serveur
- DO: Implémentation Tchat websocket indépendant de WebRTC
- DO: Implémentation localStram
- DO: Implémentation Signaling WebSocket 
	- FIX: bug objet SDP
	- FIX: bug objet Candidate
	- DO: gestion déconnexions (apellant/apellé)
- DO: Implémentation RemoteStream
- DO: implémentation RtcDataChannel 
- DO: Websocket - gestion des connectés
	- DO: Liste connectés
	- DO: Historique des connexions
	- DO: Gestion des numéros d'ordre
- DO Routes différenciées (pilote/robot)	
- Encours :  WebRTC - gestion déco/reco (appelant<>appelé)
	- DO: Renégociation RTCDataChannel
	- Encours: renégotiation RemoteStream 
        - FIX: Relancer ouverture caméra sur Appelé (Robot)
        - FIX: Use Chromium + --use-fake-ui sur Appelé (Robot)
        - DO: Test local Crhome/Chrome > R.A.S
        - Encours: Test local Chromium/Chromium > BUGS
            - BUG: Surcharge BP (multiples renégo)
                - TODO: ??? petite temporisation au vidage ???
            - Encours: Signaling HS (reset serveur) 
                - DO: Définir Rôle Robot/Pilote par routing > 
                - TODO: Detect déco serveur coté client
                - TODO: Reinitialiser session websocket coté client
        - DO: Test local Chromium/Chrome > BUGS
            - FIX: renégo RemoteStream (add 2ème caméra, 1 par browser)
            - BUG: Renégo si déco Robot
        - Encours: Tests en ligne > BUGS
            - BUG: buffer signaling onDisconnect...
                - TODO: Vider buffer coté serveur (si déco Robot) ou revenir API WebRTC                
- Encours: 2 remotes Stream (Caméra tête et caméra sol)
    - DO: get devices sur apellé (Robot)
    - Encours: Select Device ID (Robot)
    - TODO: Add capture 2eme Stream Sol > Robot
    - TODO: Add affichage 2ème Stream Sol > Pilote
    - TODO: pré-signaling >> Select Devices Robot coté pilote   
- Encours: main.js différenciés (Pilote/Robot)
- Encours: IHM différenciées (Pilote/Robot)
- TODO: Implémentations outils de test
- TODO: Constraints paramétrables
- TODO: intégration webComponents caméra
- TODO: Interception ICE candidate actif
- TODO: Forcer le choix Host/Stun/Turn

TODO: STEP 2 >>> Livrable base NtoN:
- TODO: Gestion des connectés
	- TODO: transformer les Users en "objet"
	- TODO: Passer liste Users coté client
- TODO: Websocket gestion des rooms
- TODO: Routes différenciées (pilote/robot + clients)
- TODO: IHM différenciées (Pilote/robot + clients)
- TODO: main.js différenciés (Pilote/Robot + clients)	
- TODO: Intégration +Sieurs instances de RTCPeerConnection
- TODO: Intégration full-mesh (bas niveau ou librairie ??)

TODO: STEP 3 >>> Livrable base 1toN
- TODO: Intégration multiStream plan B (Chrome) 
- TODO: Intégration multiStream plan unifié (Mozzila) 

------------------------------------------------------------

Test en ligne du script base 1to1:
http://websocket-azkar.rhcloud.com/

------------------------------------------------------------
AZKAR WebRTC script Base.

Script le plus simple possible et basé sur clients chrome en 1to1 fonctionnant en bas-niveau. Objectif: Base de développement des différents scripts benchmarks du projet AZKAR.

Architectures prévues:
- 1 appli 1to1 pour le scénario transport 
- 1 appli 1toN scénario culture
- 1 appli NtoN scénario culture
- 1 appli 1toN scénario santé
- 1 appli NtoN scénario santé

Versions prévues:
- 1 en Bas niveau
- 1 avec lib haut-niveau (ds un second temps)

fonctionnalités supplémentaires à intégrer:
- 1 tchatt par room avec historique
- Transfert de fichier 
- Partage de fichier ( genre 1 room = 1 dossier ) ou avec dropbox ou googledrive

Moockups pour scénarii de développement:
- Transport: 1 IHM (pilote)
- Culture: 2 IHM (pilote/conferencier + groupe de visiteurs)
- Santé: 3 IHM (aidant + robot/patient + consultant)
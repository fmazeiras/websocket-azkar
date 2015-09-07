// Script inspiré de l'article suivant:
// https://developer.mozilla.org/fr/docs/Web/Guide/API/WebRTC/WebRTC_basics
// Source github : https://github.com/louisstow/WebRTC/blob/master/media.html

// Initialisation des variables, objets et paramètres du script
// NB toutes les variables sont déclarées en global...
function mainSettings() {
    console.log("@mainSettings()");
    
    onMove = false; // Flag > Si un mouvement est en cours
    //lastMoveTimeStamp =  Date.now(); // Variable globale pour la détection du dernier mouvement (homme mort)...
    lastMoveTimeStamp = 0;
    
    // Benchmarks Settings Default
    navCh = 'webSocket';
    lPview = 'show';
    lRview = 'show';
    rPview = 'high';
    rRView = 'show';
    pStoR = 'open';

    // Objet paramètres
    parameters = {
        navCh: navCh,
        lPview: lPview,
        lRview: lRview,
        rPview: rPview,
        rRView: rRView,
        pStoR: pStoR
    };
    

    // pré-signaling -------------------------------------------------

    // sélecteurs de micros et caméras
    local_AudioSelect = document.querySelector('select#local_audioSource');
    local_VideoSelect = document.querySelector('select#local_videoSource');

    // sélecteurs de micros et caméras (robot) affiché coté pilote 
    remote_AudioSelect = document.querySelector('select#remote_audioSource');
    remote_VideoSelect = document.querySelector('select#remote_videoSource');

    // Pour visualiser toutes les cams dispo coté Robot,
    // on laisse par défaut l'affichage des devices.
    local_AudioSelect.disabled = false;
    local_VideoSelect.disabled = false;

    // (pilote-Appelant) > Activation/Désativation préalable 
    // Du formulaire de sélection des devices locaux et de demande de connexion
    if (type == "pilote-appelant") {
        remote_ButtonDevices.disabled = true;
        local_ButtonDevices.disabled = true;
        //remote_AudioSelect.disabled = true; 
        //remote_VideoSelect.disabled = true; 
        local_AudioSelect.disabled = true;
        local_VideoSelect.disabled = true;
    }

    // Liste des sources cam/micro
    listeLocalSources = {};
    listeRemoteSources = {};
    // flag d'origine des listes (local/remote)
    origin = null;

    // webRTC -------------------------------

    // flag de connexion
    isStarted = false;
    // console.log("isStarted = "+ isStarted);

    // shims!
    PeerConnection = window.mozRTCPeerConnection || window.webkitRTCPeerConnection;
    SessionDescription = window.mozRTCSessionDescription || window.RTCSessionDescription;
    IceCandidate = window.mozRTCIceCandidate || window.RTCIceCandidate;
    navigator.getUserMedia = navigator.getUserMedia || navigator.mozGetUserMedia || navigator.webkitGetUserMedia;


    // Eléments videos du document html
    video1 = document.getElementById("video");
    video2 = document.getElementById("otherPeer");


    // RTC DataChannel
    // Zone d'affichage (textarea)
    chatlog = document.getElementById("zone_chat_WebRTC");
    // Zone de saisie (input)
    message = document.getElementById("input_chat_WebRTC");

    // options pour l'objet PeerConnection
    server = {
        'iceServers': [{
            'url': 'stun:23.21.150.121'
        }]
    };
    server.iceServers.push({
        url: 'stun:stun.l.google.com:19302'
    });
    server.iceServers.push({
        url: 'stun:stun.anyfirewall.com:3478'
    });
    server.iceServers.push({
        url: 'stun:turn1.xirsys.com'
    });
    // Ajout de serveurs TURN
    server.iceServers.push({
        url: "turn:turn.bistri.com:80",
        credential: "homeo",
        username: "homeo"
    });
    server.iceServers.push({
        url: 'turn:turn.anyfirewall.com:443?transport=tcp',
        credential: 'webrtc',
        username: 'azkarproject'
    });
    server.iceServers.push({
        url: "turn:numb.viagenie.ca",
        credential: "webrtcdemo",
        username: "temp20fev2015@gmail.com"
    });
    server.iceServers.push({
        url: "turn:turn.anyfirewall.com:443?transport=tcp",
        credential: "webrtc",
        username: "webrtc"
    });
    server.iceServers.push({
        url: "turn:turn1.xirsys.com:443?transport=tcp",
        credential: "b8631283-b642-4bfc-9222-352d79e2d793",
        username: "e0f4e2b6-005f-440b-87e7-76df63421d6f"
    });
    // TODO: Tester les TURNS individuelements pour déterminer celui qui fonctionne le mieux


    // TODO:
    options = {
        optional: [{
                DtlsSrtpKeyAgreement: true
            }, {
                RtpDataChannels: true
            } //required for Firefox
        ]
    }


    // 1toN > Liste de clients de type 'Visiteurs'
    visitorsList = {};

    // 1toN > Tableau des connexions WebRTC
    peerCnxCollection = {};
    peerCnxId = "default"; // Nom par défaut



    // Création de l'objet PeerConnection (CAD la session de connexion WebRTC)
    //pc = new PeerConnection(server, options);
    // peerCnxCollection[peerCnxId] =new PeerConnection(server, options);
    // console.log(peerCnxCollection); 

    localStream = null;
    remoteStream = null;
    // var ws_remoteStream = null; // Stream transmit par websocket...

    // Constraints de l'offre SDP. 
    // TODO: Tester d'autres résolutions pour voir l'impact sur les délais de transmission
    constraints = {
        mandatory: {
            OfferToReceiveAudio: true,
            OfferToReceiveVideo: true
        }
    };

    // définition de la variable channel
    channel = null;
    debugNbConnect = 0;

    // Si une renégociation à déjas eu lieu
    // >> pour éviter de réinitialiser +sieurs fois le même écouteur
    isRenegociate = false;




    // console.log ("!!! pc.iceConnectionState >>>>>> " + pc.iceConnectionState);

}
mainSettings();

//------ Phase 1 Pé-signaling ----------------------------------------------------------

// rejectConnexion', message:message, url:indexUrl);
socket.on('error', errorHandler);
socket.on('rejectConnexion', function(data) {
    alertAndRedirect(data.message, data.url)
})

// Génération des listes de sélection sources (cam/micro) 
// disponibles localement et a distance
function gotSources(sourceInfos) {

    console.log("@gotSources(sourceInfos)");
    //console.log(sourceInfos);

    // Si sources locales (pilote)
    if (origin == "local") {
        listeLocalSources = sourceInfos;

        // Si sources distantes (Robot)
    } else if (origin == "remote") {
        listeRemoteSources = sourceInfos;

    }

    // BUG: Double affichage des options remoteDevices en cas de déco/reco du Robot.
    // FIX ==> On vide la liste du formulaire de ses options.
    // Comment ==> En supprimant tous les enfants du nœud
    if (origin == "remote") {
        // On supprime tous les enfants du noeud précédent...
        while (remote_AudioSelect.firstChild) {
            // La liste n'étant pas une copie, elle sera réindexée à chaque appel
            remote_AudioSelect.removeChild(remote_AudioSelect.firstChild);
        }
        // Idem pour le noeud video
        while (remote_VideoSelect.firstChild) {
            remote_VideoSelect.removeChild(remote_VideoSelect.firstChild);
        }
    }

    for (var i = 0; i !== sourceInfos.length; ++i) {

        var sourceInfo = sourceInfos[i];
        var option = document.createElement('option');
        option.id = sourceInfo.id;
        option.value = sourceInfo.id;

        // Reconstruction de l'objet javascript natif sourceInfo:
        // Quand il est construit sous chromium et transmit par websocket
        // vers Chrome impossible d'accéder à ses attributs une foi transmit... 
        // Ce qui est bizarre, c'est que l'objet natif semble tout à fait normal avant transmission.
        // Par contre, R.A.S quand on le transmet de Chrome à Chrome ou de Chromium à chromium.
        var sourceDevice = new tools.sourceDevice();
        sourceDevice.id = sourceInfo.id;
        sourceDevice.label = sourceInfo.label;
        sourceDevice.kind = sourceInfo.kind;
        sourceDevice.facing = sourceInfo.facing;
        sourceInfos[i] = sourceDevice;

        // Conflit webcam Chromium/Chrome si même device choisi sur le PC local
        // >>> L'ID fournie par L'API MediaStreamTrack.getSources est différente
        // selon le navigateur et ne permet pas de différencier cams et micros correctement
        // TODO: Trouver une solution de contournement pour les tests interNavigateurs sur une même machine

        if (sourceInfo.kind === 'audio') {

            if (origin == "local") {
                option.text = sourceInfo.label || 'localMicro ' + (local_AudioSelect.length + 1) + ' (ID:' + sourceInfo.id + ')';
                local_AudioSelect.appendChild(option);

            } else if (origin == "remote") {
                option.text = sourceInfo.label || 'RemoteMicro ' + (remote_AudioSelect.length + 1) + ' (ID:' + sourceInfo.id + ')';
                remote_AudioSelect.appendChild(option);
            }


        } else if (sourceInfo.kind === 'video') {

            if (origin == "local") {
                option.text = sourceInfo.label || 'localCam ' + (local_VideoSelect.length + 1) + ' (ID:' + sourceInfo.id + ')';
                local_VideoSelect.appendChild(option);

            } else if (origin == "remote") {
                option.text = sourceInfo.label || 'RemoteCam ' + (remote_VideoSelect.length + 1) + ' (ID:' + sourceInfo.id + ')';
                remote_VideoSelect.appendChild(option);
            }

        } else {

            console.log('Some other kind of source: ', sourceInfo);

        }
    }

    // On fait un RAZ du flag d'origine
    origin = null;
}

// Lancement de la récupération des Devices disponibles
if (typeof MediaStreamTrack === 'undefined') {
    alert('This browser does not support MediaStreamTrack.\n\nTry Chrome.');
} else {
    origin = "local"; // On prévient la fonction apellée que la source sera locale
    MediaStreamTrack.getSources(gotSources);
}


// IHM Pilote
// Ouverture du premier des formulaires de selection des devices
// Et par conséquence dévérouillage du lancement de la connexion
function activeManageDevices() {

    // On active les sélecteurs de listes
    remote_ButtonDevices.disabled = false;
    remote_AudioSelect.disabled = false;
    remote_VideoSelect.disabled = false;

    // Une petite animation CSS pour visualiser l'invite de formulaire...
    document.getElementById("robotDevices").className = "insideFlex oneQuarterbox robot shadowGreen devicesInvite";
}


// IHM Pilote:
// Traitement du formulaire de selection des devices du robot
// et ouverture du formulaire de selection des devices du pilote 
// Avec animation CSS d'invite du formulaire
function remoteManageDevices() {

    console.log("@ remoteManageDevices()");
    // Activation
    if (type == "pilote-appelant") {
        local_ButtonDevices.disabled = false;
    }
    local_AudioSelect.disabled = false;
    local_VideoSelect.disabled = false;

    // Invite de formulaire...
    document.getElementById("piloteDevices").className = "insideFlex oneQuarterbox pilote devices shadowGreen devicesInvite";
}

// IHM Pilote:
// Au submit du bouton d'ouverture de connexion -> 
// > Désactivation des formulaires remote et local de selection des devices
// > Animation CSS de désactivation
// > Envoi au robot des settings de benchmarks
// > Envoi au Robot la liste des devices à activer.
function localManageDevices() {

    console.log("@ localManageDevices()");
    if (type == "pilote-appelant") {
        local_ButtonDevices.disabled = true;
    }

    local_AudioSelect.disabled = true;
    local_VideoSelect.disabled = true;

    remote_ButtonDevices.disabled = true;
    remote_AudioSelect.disabled = true;
    remote_VideoSelect.disabled = true;

    // Animation CSS de désactivation du formulaire devices robot...
    document.getElementById("robotDevices").className = "insideFlex oneQuarterbox  robot devices shadowBlack device";

    // On balance au robot les paramètres de benchmarkings 
    // socket.emit('settingBenchmarks', {objUser:localObjUser,listeDevices:selectList}); // Version Objet

    // On balance coté robot les devices sélectionnés...
    // ... Et les Settings de canal/caméra du benchmarking...
    if (type == "pilote-appelant") {
        var selectAudio = remote_AudioSelect.value;
        var selectVideo = remote_VideoSelect.value;
        var selectList = {
            selectAudio, selectVideo
        };
        var appSettings = parameters;
        // socket.emit("selectedRemoteDevices", selectList); Ancienne version
        // Coté serveur >> socket.broadcast.emit('selectedRemoteDevices', {objUser:data.objUser, listeDevices:data.listeDevices});
        socket.emit('selectedRemoteDevices', {
            objUser: localObjUser,
            listeDevices: selectList,
            appSettings: appSettings
        }); // Version Objet

        // Animation CSS de désactivation du formulaire devices pilote...
        document.getElementById("piloteDevices").className = "insideFlex oneQuarterbox pilote devices shadowBlack device";
    }
}

// -- > ecouteurs webSocket de pré-signaling

// Ecouteurs Websockets exclusifs au Pilote (appelant)
if (type == "pilote-appelant") {

    // Reception de la liste des Devices du Robot V2 (version objet)
    // coté serveur >> socket.broadcast.emit('remoteListDevices', {objUser:data.objUser, listeDevices:data.listeDevices});
    socket.on('remoteListDevices', function(data) {
        console.log(">> socket.on('remoteListDevices',...");

        // console.log(data.listeDevices);
        // console.log("--------------------------------------");

        // On renseigne  le flag d'ogigine
        origin = "remote";

        // On alimente les listes de micro/caméra distantes
        gotSources(data.listeDevices);

    })

    // Reception du signal de fin pré-signaling
    socket.on("readyForSignaling", function(data) {
        console.log(">> socket.on('readyForSignaling',...");

        if (data.message == "ready") {
            initLocalMedia(peerCnxId);
        


        }
    })


    // Reception du statut de connexion du robot
    socket.on("robotCnxStatus", function(data) {
        robotCnxStatus = data.message;
        // On vérifie l'état de sa propre connexion et de celle du robot
        if (piloteCnxStatus == 'new' && robotCnxStatus == 'new') {
            activeManageDevices(); // On acive les formulaires permettant de relancer la connexion
        }
    });
}

// Ecouteurs Websockets exclusifs au Robot (appelé)
if (type == "robot-appelé") {

    // Reception cam et micro selectionnés par le pilote (apellant) V2 Objet
    // Coté serveur >> socket.broadcast.emit('selectedRemoteDevices', {objUser:data.objUser, listeDevices:data.listeDevices});
    socket.on('selectedRemoteDevices', function(data) {
        console.log(">> socket.on('selectedRemoteDevices',...");

        // On rebalance au formulaire les caméras/micros choisies par le pilote
        document.getElementById(data.listeDevices.selectAudio).selected = "selected";
        document.getElementById(data.listeDevices.selectVideo).selected = "selected";

        // On affecte les paramètres de settings
        parameters = data.appSettings;
        // alert("Parameters: " +data.appSettings.lRview);

        console.log(data); 
        //var debugg = tools.stringObjectDump(data,"selectedRemoteDevice")
        //console.log(debugg);
        //console.log(data);

        // On lance l'initlocalmedia
        initLocalMedia(peerCnxId);

        // var infoMessage = "<strong> Micro/Camera -- Activés</strong>"
        // document.getElementById("messageDevicesState").innerHTML = infoMessage;

        var infoMicro = "<strong> Micro Activé </strong>"
        var infoCam = "<strong> Caméra Activée </strong>"
        document.getElementById("messageDevicesStateMicro").innerHTML = infoMicro;
        document.getElementById("messageDevicesStateCams").innerHTML = infoCam;

        // On rebalance au pilote-appelant le top-départ pour 
        // qu'il lance un intilocalMedia de son coté....
        // socket.emit("readyForSignaling","ready"); // ancienne version

        // Fix Bug renégociation > On vérifie que c'est une renégo et
        // si c'est le cas, on attend d'avoir l'état du statut webRTC ps iceConnexionXtate à "new"
        // pour lancer le message de fin de pré-signaling . A faire ds l'écouteur idoine...
        socket.emit('readyForSignaling', {
            objUser: localObjUser,
            message: "ready"
        }); // Version objet
    })

    // Reception du statut de connexion du pilote
    socket.on("pilotetCnxStatus", function(data) {
        piloteCnxStatus = data.message;
    });


    // Reception d'une commande pilote
    // On la renvoie au client robot qui exécuté sur la même machine que la Robubox.
    // Il pourra ainsi faire un GET ou un POST de la commande à l'aide d'un proxy et éviter le Cross Origin 
    socket.on("piloteOrder", function(data) {
        //console.log('@onPiloteOrder >> command:' + data.command);
        //if (data.command == "onDrive" && data.command == "onStop") sendCommandDriveInterface(data.command,data.enable, data.aSpeed, data.lSpeed);
        /*
        if (data.command == "onStop") {};
        if (data.command == "onStep") {};
        if (data.command == "onGoto") {};
        if (data.command == "onClicAndGo") {};
        /**/
        sendCommandDriveInterface(data.command,data.enable, data.aSpeed, data.lSpeed);
    });

}

// Quand on reçoit une mise à jour de la liste 
// des connectés de cette session websocket
// C.A.D un nouvel arrivant...
socket.on('updateUsers', function(data) {

    console.log(">> socket.on('updateUsers',...");
    // On met à jour la liste locale des connectés...
    // console.log(data);
    users = data;
    //var debug = tools.stringObjectDump(users,"users");
    //console.log(debug);

    // si on est l'apellé  (Robot)
    // On renvoie à l'autre pair la liste de ses devices
    if (type == "robot-appelé") {
        socket.emit('remoteListDevices', {
            objUser: localObjUser,
            listeDevices: listeLocalSources
        });
        // On lui envoie ensuite son etat de connexion
        // robotCnxStatus = pc.iceConnectionState;
        // robotCnxStatus = peerCnxCollection[peerCnxId].iceConnectionState;
        if ( ! peerCnxCollection["Pilote-to-Robot"] ) robotCnxStatus = 'new'; 
        else robotCnxStatus = peerCnxCollection["Pilote-to-Robot"].iceConnectionState; 
        socket.emit("robotCnxStatus", robotCnxStatus);
    }

    // si on est l'apellant (Pilote)
    // ... En cas de besoin...
    if (type == "pilote-appelant") {
        if ( ! peerCnxCollection["Pilote-to-Robot"] ) piloteCnxStatus = 'new'; 
        else piloteCnxStatus = peerCnxCollection["Pilote-to-Robot"].iceConnectionState; 
    }
})


// ---- Phase 2 Signaling --------------------------------------------------

// initialisation du localStream et appel connexion
function initLocalMedia(peerCnxId) {

    console.log("@ initLocalMedia("+peerCnxId+")");

    // Récupération des caméras et micros selectionnés  
    var audioSource = local_AudioSelect.value;
    var videoSource = local_VideoSelect.value;

    var constraint = {
        audio: {
            optional: [{
                sourceId: audioSource
            }]
        },

        video: {
            optional: [{
                sourceId: videoSource
            }]
        }
    }

    if (type == "robot-appelé" || type == "pilote-appelant") {
         peerCnxId = "Pilote-to-Robot"; // Nom par défaut de la connexion
    }
   

    peerCnxCollection[peerCnxId] =new PeerConnection(server, options);
    console.log("new peerCnxCollection["+peerCnxId+"]"); 
    console.log(peerCnxCollection); 

    // Etat des clients pour le signaling
    piloteCnxStatus = peerCnxCollection[peerCnxId].iceConnectionState; 
    robotCnxStatus = peerCnxCollection[peerCnxId].iceConnectionState;

    // Initialisation du localStream et lancement connexion
    navigator.getUserMedia(constraint, function(stream) {

        //console.log(parameters.lRview);
        localStream = stream;
        var showLocalVideo = true;
        if (type == "pilote-appelant") {
            if (parameters.lPview != 'show') showLocalVideo = false;
        } else if (type == "robot-appelé") {
            // alert("local view: " +parameters.lRview);
            if (parameters.lRview != 'show') showLocalVideo = false;
        }
        if (showLocalVideo == true) video1.src = URL.createObjectURL(localStream);
        //pc.addStream(localStream);
        //connect();
        
        peerCnxCollection[peerCnxId].addStream(localStream);
        connect(peerCnxId);




    }, errorHandler);
};

// initialisation de la connexion
function connect(peerCnxId) {

    //console.log ("@ connect()");
    debugNbConnect += 1;
    console.log("@ connect("+peerCnxId+") > rôle: " + type);
    isStarted = true;

    // Ecouteurs communs apellant/apellé
    // ---------------------------------

    // Ecouteurs de l'API WebRTC -----------------

    // Ecouteur déclenché à la génération d'un candidate 
    peerCnxCollection[peerCnxId].onicecandidate = function(e) {
        //console.log("@ pc.onicecandidate > timestamp:" + Date.now());
        // vérifie que le candidat ne soit pas nul
        if (!e.candidate) {
            // console.log("  > !e.candidate): return ");
            return;
        }
        // Réinitialise l'écouteur "candidate" de la connexion courante
        // pc.onicecandidate = null; // Provoque un BUG sur Openshift ! 
        // >>>>>> Et si on teste sans ???
        // >>>>>> en local > OK, c'est juste plus long... 
        // >>>>>> en ligne > OK en filaire... 
        // conclusion: La réinitialisation n'a d'intéret 
        // que pour réduire les délais de signaling des tests locaux
        // -----------------------------------------
        // Envoi du candidate généré à l'autre pair
        // socket.emit("candidate", e.candidate);
    
        var cible = ""; // TODO: choisir la cible en fonction de l'ID PeerConnexion....
        if (type === "pilote-appelant" ) cible = getClientBy('typeClient','Robot');
        else if ( type === "robot-appelé") cible = getClientBy('typeClient','Pilote');
        console.log ("------------ candidate >>> ----------");
        var data = {from: localObjUser, message: e.candidate, cible: cible, peerCnxId: peerCnxId}
        // console.log (data);
        socket.emit("candidate2", data);
    
    };


    // Ecouteur déclenché a la reception d'un remoteStream
    peerCnxCollection[peerCnxId].onaddstream = function(e) {

        console.log("@ pc.onaddstream > timestamp:" + Date.now());
        remoteStream = e.stream;
        //video2.src = URL.createObjectURL(remoteStream);
        var showRemoteVideo = true;
        if (type == "pilote-appelant") {
            if (parameters.rPview == 'hide') showRemoteVideo = false;
            // showRemoteVideo = false;
        } else if (type == "robot-appelé") {
            if (parameters.rRView == 'hide') showRemoteVideo = false;
        }
        if (showRemoteVideo == true) video2.src = URL.createObjectURL(remoteStream);

    };


    // Ecouteurs de changement de statut de connexion
    // Permet de déterminer si le pair distant s'est déconnecté. (Version 1to1)
    peerCnxCollection[peerCnxId].oniceconnectionstatechange = function(e) {

        //var newDate = tools.dateNowInMs();
        var dateE = tools.dateER('E');
        console.log("@ pc.oniceconnectionstatechange > " + dateE);

        console.log(">>> stateConnection Event > " + peerCnxCollection[peerCnxId].iceConnectionState);
        $(chatlog).prepend(dateE + ' [stateConnection Event] ' + peerCnxCollection[peerCnxId].iceConnectionState + '\n');

        // Si la connexion est neuve, on remet le flag de renégo à sa position par défaut...
        if ( peerCnxCollection[peerCnxId].iceConnectionState == 'new') isRenegociate = false; 

        
        // On informe l'autre pair de son statut de connexion   
        if (type == 'pilote-appelant') {
            piloteCnxStatus = peerCnxCollection[peerCnxId].iceConnectionState;

            socket.emit("piloteCnxStatus", piloteCnxStatus);
            // Si on change de status suite à une déco du robot
            // On redéclenche l'ouverture des formulaires de connexion 
            // a la condition que le robot soit lui aussi prêt a se reconnecter... (new...)
            if (piloteCnxStatus == 'new' && robotCnxStatus == 'new') {
                activeManageDevices(); // On active les formulaires permettant de relancer la connexion
            }

        } else if (type == 'robot-appelé') {
            robotCnxStatus = peerCnxCollection[peerCnxId].iceConnectionState;
            socket.emit("robotCnxStatus", robotCnxStatus);
        }
 
        // si le pair distant est déconnecté, on lance le processus préparatoire a une reconnexion
        if (peerCnxCollection[peerCnxId].iceConnectionState == 'disconnected') {   
            onDisconnect(peerCnxId);
        }

    };

    // Ecouteur ... // OK instancié...
    peerCnxCollection[peerCnxId].onremovestream = function(e) {
        console.log("@ pc.onremovestream(e) > timestamp:" + Date.now());
        console.log(e);
    }

    
    // Si on est l'apellant
    if (type === "pilote-appelant") {
        //console.log("+++++++++ apellant ++++++++++++++ ");

        // l'apellant crée un dataChannel
        channel = peerCnxCollection[peerCnxId].createDataChannel("mychannel", {});
        // et peut maintenant lancer l'écouteur d'évènement sur le datachannel
        bindEvents();

        // création et envoi de l'offre SDP
        var cible = getClientBy('typeClient','Robot');
        peerCnxCollection[peerCnxId].createOffer(function(sdp){
                    peerCnxCollection[peerCnxId].setLocalDescription(sdp);
                    console.log ("------------ offer >>> ----------");
                    var data = {from: localObjUser, message: sdp, cible: cible, peerCnxId: peerCnxId}
                    // console.log (data);
                    socket.emit("offer2", data);
                }
                , errorHandler, 
                constraints
            );

        // Sinon si on est l'apellé (Robot)
    } else if (type === "robot-appelé") {
        
        // l'appelé doit attendre l'ouverture d'un dataChannel pour lancer son écouteur d'èvènement data...
        // Ecouteur d'ouverture d'un data channel
        peerCnxCollection[peerCnxId].ondatachannel = function(e) {
            channel = e.channel;
            console.log("pc.ondatachannel(e)... ");
            bindEvents(); //now bind the events
        };

    }
}


// Ecouteurs Signaling de l'API websocket -----------------


// L'apellé doit attendre de recevoir une offre SDP
// avant de générer une réponse SDP
// ---------------------------------
// Ok au premier passage
// BUG a la renégo > ne déclenches plus le onAddStream... 
// FIX: réinstancier onAddStream après reinstanciation PeerConnection
// BUG a la renégo > Envoie 2 answers...
// Cause: L'écouteur de reception "offer"est instancié 2 fois...
// FIX: ajout d'un flag "isRenegociate = false;" 
socket.on("offer", function(data) {
    console.log ("------------ >>> offer ----------");
    console.log ("isRenegociate:"+isRenegociate);
    if (isRenegociate == false) {            

        //console.log("(apellé)>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>");
        //peerCnxCollection[peerCnxId].setRemoteDescription(new SessionDescription(data.message));
        //peerCnxCollection[peerCnxId].createAnswer(doAnswer, errorHandler, constraints);           

        // ------------- Version 1toN
        var offer = new SessionDescription(data.message);
        
        //console.log("- Offer From: " + data.from.pseudo +"("+data.from.id+")");
        //console.log("- Cible: " + data.cible.pseudo +"("+data.cible.id+")");
        //console.log("- peerconnection: " + data.peerCnxId);
        //console.log (offer);
        peerCnxCollection[data.peerCnxId].setRemoteDescription(offer); 
        
        // Une foi l'offre reçue et celle-ci enregistrée dans un setRemoteDescription,
        // on peu enfin générer une réponse SDP 
        var cible = getClientBy('id', data.from.id);
        var idPeerConnection = data.peerCnxId;

        // création de l'offre SDP
        peerCnxCollection[idPeerConnection].createAnswer(function(sdp){
                peerCnxCollection[idPeerConnection].setLocalDescription(sdp);
                console.log ("------------ Answer >>> ----------");
                var data = {from: localObjUser, message: sdp, cible: cible, peerCnxId: idPeerConnection}
                //console.log (data);
                socket.emit("answer2", data);
            }
            , errorHandler, 
            constraints
        );
    }
});
/**/


// Réception d'une réponse à une offre
socket.on("answer", function(data) {
    console.log ("------------ >>>> Answer ----------");
    //console.log("- Answer From: " + data.from.pseudo +"("+data.from.id+")");
    //console.log("- Cible: " + data.cible.pseudo +"("+data.cible.id+")");
    //console.log("- peerconnection: " + data.peerCnxId);
    //console.log (data.message);
    peerCnxCollection[data.peerCnxId].setRemoteDescription(new SessionDescription(data.message));

});

// Réception d'un ICE Candidate
socket.on("candidate", function(data) {
    console.log ("------------ >>>> Candidate ----------");
    //console.log("- candidate From: " + data.from.pseudo +"("+data.from.id+")");
    //console.log("- Cible: " + data.cible.pseudo +"("+data.cible.id+")");
    //console.log("- peerconnection: " + data.peerCnxId);
    //console.log (data.message);
    // TODO : ici intercepter et filter le candidate
    peerCnxCollection[data.peerCnxId].addIceCandidate(new IceCandidate(data.message)); // OK
});


// ----- Phase 3 Post-Signaling --------------------------------------------

// A la déconnection du pair distant:
function onDisconnect(peerCnxId) {

    console.log("@ onDisconnect()");

    // On vérifie le flag de connexion
    if (isStarted == false) return;

    // on retire le flux remoteStream
    video1.src = "";
    video2.src = "";

    //videoElement.src = null;
    //window.stream.stop();

    // on coupe le RTC Data channel
    if (channel) channel.close();
    channel = null;

    // On vide et on ferme la connexion courante
    // pc.onicecandidate = null;
    //pc.close();
    //pc = null;

    peerCnxCollection[peerCnxId].close();
    peerCnxCollection[peerCnxId] = null;
    stopAndStart(peerCnxId);
}

// Fermeture et relance de la connexion p2p par l'apellé (Robot)
function stopAndStart(peerCnxId) {

    console.log("@stopAndStart()");
    input_chat_WebRTC.disabled = true;
    input_chat_WebRTC.placeholder = "RTCDataChannel close";
    env_msg_WebRTC.disabled = true;

    peerCnxCollection[peerCnxId] = new PeerConnection(server, options);

    // console.log("------pc = new PeerConnection(server, options);-----");

    // On informe la machine à état que c'est une renégociation
    isRenegociate = true;
};

// -------------------- Méthodes RTCDataChannel ----------------------

// bind the channel events
function bindEvents() {

    // écouteur d'ouverture
    channel.onopen = function() {
        //console.log("RTCDataChannel is Open");
        input_chat_WebRTC.focus();
        input_chat_WebRTC.placeholder = "RTCDataChannel is Open !";
        input_chat_WebRTC.disabled = false;
        env_msg_WebRTC.disabled = false;
        //isStarted = true;
        //console.log("isStarted = "+ isStarted);
    };

    // écouteur de reception message
    channel.onmessage = function(e) {
        // add the message to the chat log
        //var dateR = tools.dateER('R');
        var dateR = Date.now();
        //console.log("@ channel.onmessage");
        // si c'est u message string
        if (tools.isJson(e.data) == false) {
            $(chatlog).prepend(dateR + ' ' + e.data + "\n");
        }
        // sinon si c'est un objet Json
        else if (tools.isJson(e.data) == true || type == "robot-appelé"){
            var cmd = e.data;
            cmd = JSON.parse(cmd);
            if (cmd.command) {
                var delta = dateR-cmd.dateE;
                //$(chatlog).prepend(cmd.dateE +' ' +dateR + ' ' + cmd.command + "\n");
                $(chatlog).prepend('[ ' +delta+' ms ] ' + cmd.command + "\n");
                //if (type == "robot-appelé") {
                    if (cmd.command == "onDrive") robubox.sendDrive(cmd.enable, cmd.aSpeed, cmd.lSpeed);
                    else if (cmd.command == "onStop") robubox.sendDrive(cmd.enable, cmd.aSpeed, cmd.lSpeed);
                    // ...
                //}
            }
        }
        /**/
    };
}

// envoi message par WebRTC
function sendMessage() {
    var dateE = tools.dateER('E');
    var msgToSend = dateE + ' [' + localObjUser.typeClient + '] ' + message.value;
    channel.send(msgToSend);
    message.value = "";
    // Affiche le message dans le chatlog websocket
    $(chatlog).prepend(msgToSend + "\n");
}

// envoi commande par WebRTC
function sendCommand(commandToSend) {
    //var dateE = tools.dateER('E');
    var dateE = Date.now()
    commandToSend.dateE = dateE;
    //tools.traceObjectDump(commandToSend,'commandToSend');
     $(chatlog).prepend(dateE + " "+commandToSend.command + "\n");
    commandToSend = JSON.stringify(commandToSend);
    //console.log('toto');
    channel.send(commandToSend);
    
}


// Bouton d'envoi du formulaire de chat WebRTC
$('#formulaire_chat_webRTC').submit(function() {
    var message = $('#send_chat_WebRTC').val() + '\n';
    channel.send(msg);
    message.value = "";
    $('#send_chat_WebRTC').val('').focus(); // Vide la zone de Chat et remet le focus dessus
    return false; // Permet de bloquer l'envoi "classique" du formulaire
});

// --------------------- Gestion des commandes du robot -------------------

// fonction homme mort...
if (type == "robot-appelé") {
    function deathMan(){
        if (onMove == true || lastMoveTimeStamp != 0) {
            var now = Date.now();
            var test = now - lastMoveTimeStamp;
            if (test >= 1000 ) {
               sendCommandDriveInterface('onStop',false,0,0) 
            }
        
        }
        setTimeout(deathMan,1000); /* rappel après 100 millisecondes */
    }
    deathMan();
}


function sendCommandDriveInterface(command,enable,aSpeed,lSpeed) {
        // onMove = false; // Flag > Si un mouvement est en cours
        // lastMoveTimeStamp =  Date.now(); // on met a jour le timestamp du dernier ordre de mouvement...
        if (command == "onDrive") {
            onMove = true;
            lastMoveTimeStamp = Date.now(); // on met a jour le timestamp du dernier ordre de mouvement...
            robubox.sendDrive(enable, aSpeed, lSpeed); // Et on envoie le mouvement
        }
        if (command == "onStop") {
            onMove = false;
            lastMoveTimeStamp = 0;
            robubox.sendDrive(enable, aSpeed, lSpeed); // Et on envoie le mouvement
        };
        /*
        if (command == "onStep") {};
        if (command == "onGoto") {};
        if (command == "onClicAndGo") {};
        /**/
    
  

}




// --------------------- Gestion des messages d'erreur ------------------

function errorHandler(err) {
    console.log("ON-ERROR");
    console.error(err);
}

function alertAndRedirect(message, url) {
    //alert (message);
    window.alert(message)
    window.location.href = url;
}


// ------ fonctions diverses ---------------


function getClientBy(key,value) {
    for (i in users.listUsers) {
        if (users.listUsers[i][key] == value) {
                return users.listUsers[i];
                break;
        }
    }
};
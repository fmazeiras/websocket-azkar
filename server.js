/*
*
* Copyright © CNRS (Laboratoire I3S) / université de Nice
* Contributeurs: Michel Buffa & Thierry Bergeron, 2015-2016
* 
* Ce logiciel est un programme informatique servant à piloter un Robot à distance
* Ce logiciel est régi par la licence CeCILL-C soumise au droit français et
* respectant les principes de diffusion des logiciels libres. Vous pouvez
* utiliser, modifier et/ou redistribuer ce programme sous les conditions
* de la licence CeCILL-C telle que diffusée par le CEA, le CNRS et l'INRIA 
* sur le site "http://www.cecill.info".
*
* En contrepartie de l'accessibilité au code source et des droits de copie,
* de modification et de redistribution accordés par cette licence, il n'est
* offert aux utilisateurs qu'une garantie limitée.  Pour les mêmes raisons,
* seule une responsabilité restreinte pèse sur l'auteur du programme,  le
* titulaire des droits patrimoniaux et les concédants successifs.

* A cet égard  l'attention de l'utilisateur est attirée sur les risques
* associés au chargement,  à l'utilisation,  à la modification et/ou au
* développement et à la reproduction du logiciel par l'utilisateur étant 
* donné sa spécificité de logiciel libre, qui peut le rendre complexe à 
* manipuler et qui le réserve donc à des développeurs et des professionnels
* avertis possédant  des  connaissances  informatiques approfondies.  Les
* utilisateurs sont donc invités à charger  et  tester  l'adéquation  du
* logiciel à leurs besoins dans des conditions permettant d'assurer la
* sécurité de leurs systèmes et ou de leurs données et, plus généralement, 
* à l'utiliser et l'exploiter dans les mêmes conditions de sécurité. 

* Le fait que vous puissiez accéder à cet en-tête signifie que vous avez 
* pris connaissance de la licence CeCILL-C, et que vous en avez accepté les
* termes.
*
*/


// Effacer la console à chaque lancement.
console.reset = function () {
  return process.stdout.write('\033c');
}

console.reset()



// ------------------------ Elements communs client/serveur
var tools = require('./js/common_tools'); // méthodes génériques
var models = require('./js/common_models'); // objets
var appSettings = require('./js/common_app_settings'); // paramètres de configuration de l'application

// Implémentation mongoDB
var MongoClient = require('mongodb').MongoClient;
var assert = require('assert');
var ObjectId = require('mongodb').ObjectID;

// Adds du 25/O9/2016 > Admin > Upload files
var multer  =   require('multer');



// ------ Variables d'environnement & paramètrages serveurs ------------------
// Récupération du Nom de la machine 
var os = require("os");
hostName = os.hostname();
console.log(hostName);

// Configuration de l'Ip et du port de l'application
ipaddress = appSettings.appServerIp();
port = appSettings.appServerPort();

// Adresse de redirection pour les connexions refusées
indexUrl = null;
indexUrl = "https://" + ipaddress + ":" + port; // Par défaut...

pathKey = appSettings.getPathKey();
pathCert = appSettings.getPathCert();

appName = appSettings.appName();
appBranch = appSettings.appBranch();
appVersion = appSettings.appVersion();
appCredit= appSettings.appCredit()
appInstanceTitle = appSettings.appInstanceTitle();

// Si présence d'un fichier de config propre à la branche: Overwriting des settings,
var appBranchSettings;

try {
   appBranchSettings = require('./js/branch_settings/common_app_branch_settings.js'); 
   appBranchSettings.setServers();
   appBranchSettings.setBranch();
   console.log("Configuration Branche")
}
catch (e) {
   console.log("Configuration Standard") 
}



console.log("***********************************");
console.log('');
// console.log('(' + appSettings.appBranch() + ') ' + appSettings.appName() + " V " + appSettings.appVersion());
// console.log(name + ': ' + branch + " (Version " + version+")");
console.log(appName + " V " + appVersion+ "( branche "+ appBranch + ")" );
console.log(appCredit);
console.log("***********************************");
console.log("Serveur sur machine: " + hostName);

// HTTPS ---------------------------

var fs = require('fs');
var express = require('express');
var https = require('https');
var ent = require('ent'); // Permet de bloquer les caractères HTML (sécurité équivalente à htmlentities en PHP)

key = fs.readFileSync(pathKey);
cert = fs.readFileSync(pathCert);


var https_options = {
    key: key,
    cert: cert
};

var PORT = port;
var HOST = ipaddress;
app = express();

server = https.createServer(https_options, app).listen(PORT, HOST);
console.log('HTTPS Server listening on %s:%s', HOST, PORT);

// Pour que nodejs puisse servir correctement 
// les dépendances css du document html
app.use(express.static(__dirname));

// Routing des différentes IHM
app.get('/', function(req, res) {
    res.sendFile(__dirname + '/index.html');
});

// --------------- 1to1

app.get('/robot/', function(req, res) {
    res.sendFile(__dirname + '/robot.html');
});


app.get('/pilote/', function(req, res) {
    res.sendFile(__dirname + '/pilote.html');
});

// Add 16/09/16 - titi
app.get('/i3s/', function(req, res) {
    res.sendFile(__dirname + '/admin.html');
});
// ------------------

// On passe la variable hostName en ajax à l'IHM d'accueil
// puisqu'on ne peux pas passer par websocket...
app.get("/getvar", function(req, res){
    res.json({ hostName: hostName });
});


io = require('socket.io').listen(server); // OK
/**/// Fin test 2 -----------------------------

// ------ Partie Websocket ------------------


// Liste de tous les connectés au serveur
var  serverUsers = {}

// liste des connectés actifs (pilotes et robots)
var users2 = {};
var nbUsers2 = 0;

// Historique des connexions
var histoUsers2 = {};
var placeHisto2 = 0;
histoPosition2 = 0;

// ID websockets 1to1 Pilote et Robot pour les envois non broadcastés
wsIdPilote = '';
wsIdRobot = '';

// Flag session serveur
isServerStarted = false;



// Adds Web Sémantique (13/09/16) // -----------------------
var rdfstore = require('rdfstore');
var retourData = [];
var XMLHttpRequest = require("xmlhttprequest").XMLHttpRequest;
var ontology = ""


// Adds partie Admin >> Flags & variables de configuration -----------
isFakeRobubox = true; // Mode simulateur activé par défaut.
activeMap = 'map_unavailable.jpg'; // Image de la Map par défaut
defaultIpRobot = null; // Ip par defaut de Robubox/Mobiserve
defaultIpFoscam = null; // Ip par defaut de la Foscam
urlsRobot = {} // Liste des différentes IPs Robubox/Mobiserve
urlsFoscam = {} // Liste des différentes Ips Foscam
config = null; // Fichier JSON de configuration (persistence)
isGamepad = false; // Détection gamepad physique activé

io.on('connection', function(socket, pseudo) {

    // Ecouteur de connexion entrante
    onSocketConnected(socket);

    // Quand un User rentre un pseudo 
    // on le stocke en variable de session et on informe les autres Users
    socket.on('nouveau_client2', function(data) {

        // console.log(tools.humanDateER('R') + " @ nouveau_client2 >>>> (???)");
        console.log(tools.humanDateER('R') + " @ nouveau_client >>>> (socket.id: "+socket.id+") - ["+data.typeClient+"]"+data.pseudo+")");

	    // Contrôle d'accès minimal (pour éviter les conflits de rôles et les bugs de signaling...)
        // Cas Pilote >> Si 0 Robot ou 1 Pilote déjà présents: Accès refusé
        // Cas Robot >> Si 1 Robot déjà présent: Accès refusé
        // Cas Visiteur >> Si 0 Robot ou 0 Pilote présents: Accès refusé
        // Comportement attendu du client après un refus d'accès:
        // >>> Redirection vers la page d'accueil de l'application
        // Contrainte: L'URL de la page d'accueil doit être dynamique 
        // donc le serveur websocket doit transmettre cette URL au client
        // pour forcer sa redirection.

        // 2 possibilités:
        // Soit contrôler la connexion en amont par un io.use(function... 
        // et, après traitement, générer une erreur avec un message.
        // Mais dans ce cas de figure, ce serai trop compliqué de transmettre 
        // au client l'url de redirection en plus du message d'erreur.
        // Autre solution, plus simple et plus bourrine:
        // Accepter la connexion, faire le traitement et renvoyer
        // au client un simple message websocket avec en paramètre l'ip de redirection. 
        // A sa réception, le client se redirige vers la nouvelle url, se déconnectant d'office. 
       
        var isAuthorized = true;
        var authMessage;
        var rMsg = "> Connexion Rejetée: ";
        var rReason;
        if (data.typeClient == "Robot") {

            // Teste la présence d'un robot dans la liste des clients connectés
            // Paramètres: (hashTable,attribute,value,typeReturn) typeReturn >> boolean ou count...
            var isOtherBot = tools.searchInObjects(users2, "typeClient", "Robot", "boolean");
            if (isOtherBot == true) {
                isAuthorized = false;
                authMessage = "Client Robot non disponible...\n Veuillez patienter.";
                rReason = " > Because 2 Robots";
            }

        } else if (data.typeClient == "Pilote") {
            var isOneBot = tools.searchInObjects(users2, "typeClient", "Robot", "boolean");
            var isOtherPilot = tools.searchInObjects(users2, "typeClient", "Pilote", "boolean");
            if (isOneBot == false) {
                isAuthorized = false;
                authMessage = "Client Robot non connecté... \n Ressayez plus tard.";
                rReason = " > Because no robot";
            } else if (isOtherPilot == true) {
                // Teste la présence d'un pilote dans la liste des clients connectés
                isAuthorized = false;
                authMessage = "Client Pilote non disponible...\n Veuillez patienter.";
                rReason = " > Because 2 Pilotes";
            }
        } else if (data.typeClient == "Visiteur") {
            var isOnePilot = tools.searchInObjects(users2, "typeClient", "Pilote", "boolean");
            if (isOnePilot == false) {
                isAuthorized = false;
                authMessage = "Client Pilote non connecté... \n Ressayez plus tard.";
                rReason = " > Because no pilote";
            }
        }

        if (isAuthorized == false) {
            console.log(rMsg + "(ID: " + socket.id + ") " + rReason);
            io.to(socket.id).emit('rejectConnexion', {
                message: authMessage,
                url: indexUrl
            });
            return;
        } else {
            // Si tt est ok pour enregistrement ds la liste des connectés,
            // On renseigne la variable d'identité du pilote et du robot
            // pour les transferts de messages non broadcastés.
            if (data.typeClient == "Pilote") wsIdPilote = socket.id;
            if (data.typeClient == "Robot") wsIdRobot = socket.id;
        }



        // On lui attribue un numéro correspondant a sa position d'arrivée dans la session:
        // var placeListe = lastPosition +1; // WTF LastPosition ne s'incrémente pas... 
        // Même en modifiant la portée de la variable (placeliste déclaré sans "var" devant...)
        // var placeListe = nbUsers +1; // Par contre là ca marche ! PKOI ?
        // Il semblerai que seuls les objets soient persistants, pas les valeurs de types primitifs...
        // A creuser + tard (tester si c'est pareil avec un type "string" )....

        // Plan B: On passe par un objet contenant tous les users connectés
        // depuis le début de la session (comme une sorte de log, d'historique..)
        // et on comptera simplement le nombre de propriétés de l'objet.
        histoUsers2[socket.id] = data.pseudo + " timestamp:" + Date.now();
        var userPlacelist = tools.lenghtObject(histoUsers2);
        // On crée un User - Fonction de référence ds la librairie tools:
        // exports.client = function client (id,pseudo,placeliste,typeClient,connectionDate,disConnectionDate){
        var p1 = socket.id;
        var p2 = ent.encode(data.pseudo);
        var p3 = userPlacelist;
        var p4 = data.typeClient;
        var p5 = Date.now();
        //var p6 = null;
        // var objUser = new tools.client(p1, p2, p3, p4, p5, p6);
        //var objUser = new tools.client(p1, p2, p3, p4, p5);
        var objUser = new models.client(p1, p2, p3, p4, p5);

        // On ajoute l'User à la liste des connectés
        users2[socket.id] = objUser;

        // On renvoie l'User crée au nouveau connecté
        // pour l'informer entre autre de son ordre d'arrivée ds la session
        io.to(socket.id).emit('localUser', objUser);
        
        // On lui envoie aussi des infos concerant le serveur (pour débug)
		// io.to(socket.id).emit('infoServer', hostName);
		// NB > Obsolète.. >< Remplacé par une récupération directe 
		// depuis le client IHM en ajax par un $.get( "/getvar", function( data ) ) {}
		
        // On signale à tout le monde l'arrivée de l'User
        socket.broadcast.emit('nouveau_client2', objUser);

        /*// Si c'st un "Visiteur", on informe Pilote (et Robot ??)
        if (objUser.typeClient == "Visiteur") {
            io.to(wsIdPilote).emit('newVisitor', objUser);
            //io.to(wsIdRobot).emit('newVisitor', objUser);
        }
        /**/
        

        // On met a jour la liste des connectés coté client"
        nbUsers2 = tools.lenghtObject(users2);
        io.sockets.emit('updateUsers', {
            listUsers: users2
        });

        console.log("> Il y a " + nbUsers2 + " connectés");

    });

    // Quand un user se déconnecte
    socket.on('disconnect', function() {
        console.log(tools.humanDateER('R') + " @ disconnect >>>> (from "+socket.id+")");
        var dUser = users2[socket.id];

        var message = "> Connexion sortante";

        // On met a jour la liste des connectés
        delete users2[socket.id];

        // On envoie a tous le monde l'info de déconnexion
        socket.broadcast.emit('disconnected', {
            objUser: dUser,
            message: message
        });


        // On actualise le nombre de connectés coté serveur
        nbUsers = tools.lenghtObject(users2)

        // On met a jour la liste des connectés coté client"
        io.sockets.emit('updateUsers', {
            listUsers: users2
        });

        // contrôle liste connectés coté serveur
        console.log("> Il reste " + nbUsers + " utilisateurs sur les pages Robot et Pilote");
        displayUsers();
    });
    

    // Transmission de messages génériques 
    socket.on('message2', function(data) {
        console.log(tools.humanDateER('R') + " @ message2 >>>> (from "+data.objUser.typeClient+" id:"+data.objUser.peerID+")");
        if (data.message) {
            message = ent.encode(data.message); // On vire les caractères html...
            socket.broadcast.emit('message2', {
                objUser: data.objUser,
                message: message
            });
        }
        console.log("------------------");
        console.log(message);
        console.log("------------------");
    });


    // ---------------------------------------------------------------------------------
    // Echanges clients Robot/Pilote

    // A la réception d'un ordre de commande en provenance du pilote
    // On le renvoie au client robot qui exécuté sur la même machine que la Robubox.
    // Il pourra ainsi faire un GET ou un POST de la commande à l'aide d'un proxy et éviter le Cross Origin 
    socket.on('piloteOrder', function(data) {
        //console.log(tools.humanDateER('R') + " @ piloteOrder >>>> " + data.command + " (from "+data.objUser.pseudo+" id:"+data.objUser.id+")");
        // var consoleTxt = tools.humanDateER('R') + " @ piloteOrder >>>> " + data.command;
        // consoleTxt += " (from "+data.objUser.pseudo+" id:"+data.objUser.id+")";
        // console.log(consoleTxt);
        io.to(wsIdRobot).emit('piloteOrder', data);
    });

    
    // A la reception du niveau de la batterie
    socket.on('battery_level', function(data) {
       // console.log("@ battery_level >>>> " + data.percentage);
       io.to(wsIdPilote).emit('battery_level', data);
    });


   // Selection du système embarqué (Robubox ou KomNAV)
   // pour l'exécution des commandes reçues en WebRTC et webSocket
   socket.on('changeNavSystem', function(data) {
        io.to(wsIdRobot).emit('changeNavSystem', data);
    });
    

    // Demande d'infos navigation au robot
    socket.on('pilotGetNav', function(data) {
       io.to(wsIdRobot).emit('pilotGetNav', data);
    });



    // Envoi infos navigation au pilote.
    socket.on('navigation', function(data) {
       //console.log("@ navigation >>>> ");
       io.to(wsIdPilote).emit('navigation', data);
    });
    

    // Navigation: envoi d'une commande Goto au robot
    socket.on('gotoPOI', function(data) {
    	console.log(">>>>>>GOTOPOI")
        io.to(wsIdRobot).emit('gotoPOI', data);
    });

    // Navigation: transmission au pilote 
    // du Statut (et trajectoire) d'une commande Goto 
    socket.on('gotoStateReturn', function(data) {
        io.to(wsIdPilote).emit('gotoStateReturn', data);
    });


    // Navigation: transmission au pilote 
    // de la trajectoire calculée d'une commande Goto 
    socket.on('gotoTrajectory', function(data) {
        io.to(wsIdPilote).emit('gotoTrajectory', data);
    });
    

    // ----------------------------------------------------------------------------------
    // Partie 'signaling'. Ces messages transitent par websocket 
    // mais n'ont pas vocation à s'afficher dans le tchat client...
    // Ces messages sont relayés à tous les autres connectés (sauf à celui qui l'a envoyé)


    socket.on('offer2', function(data) {
        var consoleTxt = tools.humanDateER('R') + " @ offer >>>> (SDP from "+ data.from.pseudo +"("+data.from.id+")"
        consoleTxt += " to " + data.cible.pseudo +"("+data.cible.id+") / peerConnectionID: "+ data.peerCnxId;
        console.log(consoleTxt);
        socket.broadcast.emit('offer', data);

    });

    socket.on('answer2', function(data) {
        var consoleTxt = tools.humanDateER('R') + " @ answer >>>> (SDP from "+ data.from.pseudo +"("+data.from.id+")"
        consoleTxt += " to " + data.cible.pseudo +"("+data.cible.id+") / peerConnectionID: "+ data.peerCnxId;
        console.log(consoleTxt);
        socket.broadcast.emit('answer',data);
    });

    socket.on('candidate2', function(data) {
       var consoleTxt = tools.humanDateER('R') + " @ candidate >>>> (from "+data.from.pseudo + " ("+data.from.id+")" ;
        consoleTxt += "to "+data.cible.pseudo +" ("+data.cible.id+") / peerConnectionID: "+ data.peerCnxId;
        socket.broadcast.emit('candidate', data);
    });

    /*
    socket.on('offer_VtoR', function(data) {

        var consoleTxt = tools.humanDateER('R') + " @ offer_VtoR >>>> (SDP from "+ data.from.pseudo +"("+data.from.id+")"
        consoleTxt += " to " + data.cible.pseudo +"("+data.cible.id+") / peerConnectionID: "+ data.peerCnxId;
        console.log(consoleTxt);

        socket.broadcast.emit('offer_VtoR', data);
    });
    /**/
 

    // ----------------------------------------------------------------------------------
    // Phase pré-signaling ( selections caméras et micros du robot par l'IHM pilote 
    // et statut de la connexion WebRTC de chaque client)

    // Retransmission du statut de connexion WebRTC du pilote
    socket.on('piloteCnxStatus', function(message) {
        console.log(tools.humanDateER('R') + " @ piloteCnxStatus >>>> "+message);
        socket.broadcast.emit('piloteCnxStatus', {
            message: message
        });
    });

    // Retransmission du statut de connexion WebRTC du robot
    socket.on('robotCnxStatus', function(message) {
       console.log(tools.humanDateER('R') + " @ robotCnxStatus >>>> "+message);
        socket.broadcast.emit('robotCnxStatus', {
            message: message
        });
    });



    // Robot >> Pilote: Offre des cams/micros disponibles coté robot
    socket.on('remoteListDevices', function(data) {
        socket.broadcast.emit('remoteListDevices', data);
    });

    // Pilote >> Robot: cams/micros sélectionnés par le Pilote
    socket.on('selectedRemoteDevices', function(data) {
        console.log(tools.humanDateER('R') + " @ selectedRemoteDevices >>>> (from "+data.objUser.pseudo+" id:"+data.objUser.id+")");
        socket.broadcast.emit('selectedRemoteDevices', {
            objUser: data.objUser,
            listeDevices: data.listeDevices,
            appSettings: data.appSettings
        });
    });

    // Robot >> Pilote: Signal de fin pré-signaling...
    socket.on('readyForSignaling', function(data) {
        console.log(tools.humanDateER('R') + " @ readyForSignaling >>>> (from "+data.objUser.pseudo+" id:"+data.objUser.id+")");
        socket.broadcast.emit('readyForSignaling', {
            objUser: data.objUser,
            message: data.message
        });
    });


    // ----------------------------------------------------------------------------------
    // Elements pré-Signaling adaptée au 1toN & NtoN
    // A la différence du 1to1 de base, ces messages ne sont pas broadcastés à tous les connectés
    // mais sont relayés à une cible spécifique 'io.to(destinataire.id)...' 


    // Pilote > Visiteur >> initialisation d'une connexion WebRTC
    // Pour mémo >> socket.emit('requestConnect', { objUser: localObjUser, cible: "pilote" }); 
    socket.on('requestConnect', function(data) { 
        var consoleTxt = tools.humanDateER('R') + " @ requestConnect >>>> from "+data.from.pseudo+" ("+data.from.id+") ";
        consoleTxt += "to: "+data.cible.pseudo+"("+data.cible.id+")"; 
        console.log(consoleTxt); 
        io.to(data.cible.id).emit('requestConnect', data);
    }); 

    // Visiteur > pilote >> acceptation de la connexion WebRTC
    /*// Pour mémo >> socket.emit('requestConnect', { objUser: localObjUser, cible: "pilote" }); 
    socket.on('readyForSignaling_1toN_VtoP', function(data) { 
        var consoleTxt = tools.humanDateER('R') + " @ readyForSignaling_1toN_VtoP >>>> from "+data.from.pseudo+" ("+data.from.id+") ";
        consoleTxt += "to: "+data.cible.pseudo+"("+data.cible.id+")"; 
        console.log(consoleTxt); 
        io.to(data.cible.id).emit('readyForSignaling_1toN_VtoP', data);
    }); 

    //  Visiteur > pilote >> statut de connexion WebRTC du visiteur ( p2p pilote/visiteur)
    socket.on('visitorCnxPiloteStatus', function(data) {
       console.log(tools.humanDateER('R') + " @ visitorCnxPiloteStatus >>>> "+data.iceState);
       socket.broadcast.emit('visitorCnxPiloteStatus', data);
    });
    /**/


   // Elements de post-signaling----------------------------------------------------------------------------------

    socket.on('closeConnectionOrder', function(data) { 
        var consoleTxt = tools.humanDateER('R') + " @ closeConnectionOrder >>>> from "+data.from.pseudo+" ("+data.from.id+") ";
        consoleTxt += "to: "+data.cible.pseudo+"("+data.cible.id+")"; 
        console.log(consoleTxt); 
        io.to(data.cible.id).emit('closeConnectionOrder', data);
    }); 



    /*// Pilote/Robot >>> Visiteurs > Signal de perte de la connexion WebRTC principale (Pilote <> Robot)
    socket.on('closeMasterConnection', function(data) { 
        var consoleTxt = tools.humanDateER('R') + " @ closeMasterConnection >>>> to ALL Clients"; 
        console.log(consoleTxt); 
        socket.broadcast.emit('closeMasterConnection', data);
    });
    /**/ 


    socket.on('infoToPilote', function(data) {
        var consoleTxt = tools.humanDateER('R') + " @ infoToPilote >>>>"; 
        console.log(consoleTxt); 
       io.to(wsIdPilote).emit('infoToPilote', data);
    });


    socket.on('mongoDB', function(data) {
        var consoleTxt = tools.humanDateER('R') + " @ mongoDB >>>>"+data.command; 
        console.log(consoleTxt); 
        console.log(data);
            
        // handlers['getListCollections'](callback, text);
        handlers[data.command](function (result){
                data.result = result;
                io.to(wsIdPilote).emit('mongoDB', data);
        },data.parameters);

    });


    // Ajouts Web Sémantique (13/09/16) // -----------------------    
    // Author: Hatim Aouzal
    // réception d'une messagre Websocket (Demande de ressources sur une scene)
    socket.on('getSceneRessources', function(data) {
        
        console.log("socket On >>> getSceneRessources")
        // console.log(data);
        
        // Récupération distante du dataset de l'ontologie 
        //getFileFromServer("http://localhost:80/sparql/dataset.ttl", function(text) {
        getFileFromServer("http://mainline.i3s.unice.fr/azkar/ontology/v3/dataset.ttl", function(text) {


            if (text === null) {
                console.log('An error occurred');
            } else {
                
                ontology = text.toString();
                //console.log(ontology)
            
                rdfstore.create(function(err, store) {    
                    if (err) console.log("There was an error creating the store", err);                    
                    else  {
                  
                        var syncPath = __dirname + "/files/dataset.ttl";      //local but not enough 
                        var re = new RegExp('/', 'g');
                        syncPath = syncPath.replace(re, '\\'); //update path        
                        //LOCAL
                        store.load("text/turtle" , ontology, function(err, results) {           
                            //var query = 'SELECT * WHERE { ?s ?p ?o } LIMIT 1'
                            //var query = 'SELECT * WHERE { <http://azkar.musee_Ontology.fr/schema#Marne14> ?p ?o } LIMIT 10'
                            var query = 'SELECT * WHERE { <http://azkar.musee_Ontology.fr/schema#'+data.scene+'> ?p ?o }'
                            store.execute(query, function(err, results){
                                //console.log(JSON.stringify(results));
                                var dataArray = results;
                                    for (data in dataArray) {
                                       
                                        var u = dataArray[data].p.value;
                                        if(u.substring(0,11) == "http://purl"){
                                            var n = u.substr(u.lastIndexOf('/') + 1)
                                        } else {
                                            var n = u.substr(u.lastIndexOf('#') + 1)
                                        }
                                        var q = dataArray[data].o.value;
                                        retourData.push({propriete:n,valeur:q});
                                    }
                                    //console.log(JSON.stringify(retourData));
                                    
                                    // Envoi au demandeur
                                    // socket.emit('onSceneRessources', {sentData: retourData});
                                    
                                    // Envoi a un connecté seulement (identifié par son socket ID, ici le demandeur...)
                                    io.to(socket.id).emit('onSceneRessources', {sentData: retourData}); 
                                    
                                    // Envoi a tout le mode (sauf au demandeur...)
                                    // socket.broadcast.emit('onSceneRessources', data); 
                                   
                                }); 
                            retourData = [];                     
                        }); //END LOCAL

                        store.close(); 
                    } // End if (err) else {
                }); // End rdfstore.create(function(err, store) { 
            } // End if result
        }); // End getFileFromServer(...
    }); // End socket.on('getSceneRessources'..


    // ------Fonctions pour la partie Web Sémntique ------------------  

    // Author: Hatim Aouzal - add le (13/09/16) 
    // Récupération distante d'un fichier (ici un dataset .ttl)
    function getFileFromServer(url, doneCallback) {
        
        console.log("@ getFileFromServer")

        var xhr;

        xhr = new XMLHttpRequest();
        xhr.onreadystatechange = handleStateChange;
        xhr.open("GET", url, true);
        xhr.send();

        function handleStateChange() {
            if (xhr.readyState === 4) {
                doneCallback(xhr.status == 200 ? xhr.responseText : null);
            }
        }
    }


    // ----------------------- // Fin Ajouts Web Sémantique 


    // ---- Page d'aministration ---------------------------------

    // Adds du 26/09/2016 >> Persistence de la configuration
    try {
       config = require('./config.json');
        console.log("require('./config.json') OK !");
        //console.log(config);
    } catch (e) {
       console.log("require('./config.json') FAILED !");
       config = {
            isGamepad: false,
            isFakeRobubox: true,
            activeMap: 'map_unavailable.jpg',
            urlsRobot: urlsRobot, // Liste des urls disponibles pour le robot
            urlsFoscam: urlsFoscam, // Liste des urls disponibles pour la Foscam
            defaultIpRobot: defaultIpRobot,
            defaultIpFoscam: defaultIpFoscam
        };
        //console.log(config);
        persistConfig(config);
    }
    


    // Ads le 17/09/2016 > Cartographie - Liste des maps disponibles
    function getFiles (dir, files_){
        files_ = files_ || [];
        var files = fs.readdirSync(dir);
        for (var i in files){
            var name = dir + '/' + files[i];
            if (fs.statSync(name).isDirectory()){
                getFiles(name, files_);
            } else {
                files_.push(name);
            }
        }
        return files_;
    }

   
    // Adds du 25/O9/2016 > Admin > Upload file (map)
    var storage =   multer.diskStorage({
      destination: function (req, file, callback) {
        callback(null, './maps');
      },
      filename: function (req, file, callback) {
        console.log("file Object:");
        console.log(file);
        callback(null, file.originalname);
      }
    });
    
    var upload = multer({ storage : storage}).single('userPhoto');

    //app.post('/api/photo',function(req,res){
    app.post('/i3s/',function(req,res){
        upload(req,res,function(err) {
            if(err) {
                console.log("EEEEEEEEEEEERRRRRRRRROOOOOOOORRRRRRRRRRRR")
            }
            res.sendFile(__dirname + '/admin.html');
            console.log("SSSSSSSUUUUCCCCEESSSSSSSSSSSSS")
        });
    });

    
    function sendAdminMessage (type, title, msg) {
        console.log('sendAdminMessage()');
        var typeMessage = type;
        var titleMessage = title;
        var message = msg;
        var data = {typeMessage: typeMessage, titleMessage: titleMessage, message: message}
        //socket.broadcast.emit('messageToAdmin', data);
        socket.emit('messageToAdmin', data);

    }


    // Adds du 25/O9/2016 > Admin > delete file (map)
    socket.on("deleteMap", function(data) { 
        
        var deleteMap = data.deleteMap; 
        console.log ("DELETE MAP: "+deleteMap);
        var maps = getFiles('./maps'); 
        var testMap = './maps/'+deleteMap;
        var isInFolder = false;
        for (m in maps) {
            if(maps[m] == testMap ) {
                isInFolder = true;
            }
        }
        console.log("@ deleteMap checkFolder >>> "+ isInFolder)
        if (isInFolder == true ) {
            var filePath = "./maps/"+deleteMap ; 
            fs.unlinkSync(filePath);
            sendAdminMessage ('success', 'Delete Map', deleteMap)
        }
    });


    // Adds du 16/09/2016 > Ejection forcée de tous les clients robot/Pilote
    socket.on('ejectClients', function(data) {
        
        var data = { url: indexUrl};  
        console.log ("> socket.broadcast.emit('razConnexions',"+data.url+")");
        socket.broadcast.emit('razConnexion',data); 
        
       // On réinitialise la liste des clients connectés aux IHM Pilote et Robot
       // Pour éviter q'un client fantôme ne perturbe les contrôles d'accès
       users2 = {};
	   nbUsers2 = 0;

       // On actualise le nombre de connectés coté serveur
       nbUsers = tools.lenghtObject(users2)

       // Au cas ou, on met à jour la liste des connectés coté client"
       io.sockets.emit('updateUsers', {
           listUsers: users2
       });

       // contrôle liste des connectés coté serveur
       console.log("> Il reste " + nbUsers + " utilisateurs sur les pages Robot et Pilote");
       displayUsers();
       /**/



     });
    /**/
    
    // Adds du 16/09/2016 > Reload de tous les clients robot/Pilote et visiteurs
    socket.on('reloadAllClients', function(data) {
        var data = { url: indexUrl};  
        socket.broadcast.emit('reloadAllClients',data); 
        console.log ("> socket.broadcast.emit('reloadAllClients',"+data.url+")");
     });
    /**/

    // Adds du 16/09/2016 > Ejection du robot
    socket.on('ejectRobot', function(data) {
        var data = { url: indexUrl};  
        io.to(wsIdRobot).emit('razConnexion', data);
        console.log ("> io.to(Robot).emit('razConnexions',"+data.url+")");
     });
    /**/

    // Adds du 16/09/2016 > Ejection du pilote
    socket.on('ejectPilot', function(data) {
        var data = { url: indexUrl};  
        io.to(wsIdPilote).emit('razConnexion', data); 
        console.log ("> io.to(Pilote).emit('razConnexion',"+data.url+")");
     });
    /**/
   
    
    // Adds du 16/09/2016 > Reload du robot
    socket.on('reloadRobot', function(data) {
        var data = { url: indexUrl};  
        io.to(wsIdRobot).emit('reloadAllClients',data); 
        console.log ("> io.to(Robot).emit('reloadAllClients',"+data.url+")");
     });
    /**/

    // Adds du 16/09/2016 > Reload du pilote
    socket.on('reloadPilot', function(data) {
        var data = { url: indexUrl};  
        io.to(wsIdPilote).emit('reloadAllClients',data); 
        console.log ("> io.to(Pilote).emit('reloadAllClients',"+data.url+")");
     });
    /**/


    // Adds du 17/09/2016 > Liste des conectés en page d'admin...
    socket.on('onConnectionUser', function(data) { 
        var pseudo = "???"
        if (data.pseudo) pseudo = data.pseudo;
        console.log("socket On >>> onConnectionUser: "+data.pseudo+" -:- "+socket.id) 
        displayUsers();
    }); 

    // Adds du 18/O9/2016 > Demande des cartes dispos
    socket.on("getMaps", function(data) { 
        console.log("> socket.on(getMaps)")
        var maps = getFiles('./maps');   
        // io.to(socket.id).emit('getMaps', {maps: maps});
        // Envoi de la réponse au demandeur
        socket.emit('getMaps', {maps: maps});
        console.log ("> socket.emit('getMaps',{maps: maps}");
    });

    // Adds du 20/O9/2016 >  Demande de l'état du mode de simulation:
    socket.on("getFakeRobubox", function(data) { 
        console.log("> socket.on(getFakeRobubox)")
        var data = { isFakeRobubox: config.isFakeRobubox};  
        // Envoi de la réponse au demandeur
        socket.emit('getFakeRobubox', data);
        console.log ("> socket.emit('getFakeRobubox',{ isFakeRobubox: "+isFakeRobubox+"})");
    });

    
    // Adds du 20/O9/2016 >  Modification de l'état du mode de simulation:
    socket.on("setFakeRobubox", function(data) { 
        console.log("> socket.on(setFakeRobubox)")
        isFakeRobubox = data.isFakeRobubox;
        config.isFakeRobubox = isFakeRobubox;
        persistConfig(config);  
        var data = { isFakeRobubox: isFakeRobubox};                        
        // Envoi à tout le mode (sauf à l'émeteur...)
        socket.broadcast.emit('setFakeRobubox', data); 
        console.log ("> socket.broadcast.emit('setFakeRobubox',{ isFakeRobubox: "+isFakeRobubox+"})");
    });


    // Adds du 20/O9/2016 > Demande de la carte active:
    socket.on("getActiveMap", function(data) { 
        console.log("> socket.on(getActiveMap)")
        // 1: On vérifie que la carte existe dans le repertoire des maps.
        // Si oui, on répond normalement
        // Si non: on envoie l'image par défaut >> 'map_unavailable.jpg';
        
        var maps = getFiles('./maps'); 
        //var testMap = './maps/'+activeMap;
        var testMap = './maps/'+config.activeMap;
        var isInFolder = false;
        for (m in maps) {
            if(maps[m] == testMap ) {
                isInFolder = true;
            }
        }
        /**/
        //console.log("@ getActiveMap checkFolder >>> "+ testMap)
        console.log("@@@@ getActiveMap checkFolder >>> "+ isInFolder)

        //var isInFolder = checkFolder('./maps/',activeMap)
        if (isInFolder == false) {
            activeMap = 'map_unavailable.jpg';
            config.activeMap = activeMap;
            persistConfig(config);
        }    
        //var data = { activeMap: activeMap}; 
        var data = { activeMap: config.activeMap};  
        io.to(socket.id).emit('getActiveMap', data);
        console.log ("> io.to("+socket.id+").emit('getActiveMap',{ activeMap: "+config.activeMap+"})");
    });

	// Adds du 23/O9/2016 > Modification de la carte active:
    socket.on("setActiveMap", function(data) { 
    	console.log("> socket.on(setActiveMap)")
        activeMap = data.activeMap; 
        config.activeMap = activeMap;
        persistConfig(config);
        socket.broadcast.emit('getActiveMap', data); 
        console.log ("> socket.broadcast.emit('getActiveMap',{ activeMap: "+activeMap+"})");
    });
	
	// Adds du 23/O9/2016 > Demande la liste des connectés aux IHM Pilot et Robot:
    socket.on("getUsers", function(data) {
        console.log("> socket.on(getUsers)") 
        var data =  {listUsers: users2};
        socket.emit('updateUsers', data );
        console.log ("> socket.emit('getUsers',{ updateUsers: users2 })");
    });


    // Adds du 26/09/2016 > renvoie les IP caméra et robot
    socket.on("getIpRessources", function(data) { 
        var debug = "";
        if (data.from) debug = " from "+data.from;
        console.log("> socket.on( getIpRessources"+debug+" )") 
        // console.log(config)
        var data =  {
                listUrlsRobot: config.urlsRobot,
                listUrlsFoscam: config.urlsFoscam,
                ipRobot: config.defaultIpRobot ,
                ipFoscam: config.defaultIpFoscam

            };
        socket.emit('getIpRessources', data );
        // socket.broadcast.emit('getIpRessources', data);
        console.log ("> socket.emit('getIpRessources',data)");
    });

    // Adds du 26/09/2016 > Met à jour les IP camera et robot
    socket.on("updateIpRessources", function(data) { 
               
        // console.log ("> socket.on(setIpRessources, data)");
		console.log ("> socket.on(updateIpRessources, "+data.cible+")");
        
        if (data.cible == "Robot") config.defaultIpRobot = data.newData;
        if (data.cible == "Camera") config.defaultIpFoscam = data.newData;

        if (data.cible == "listUrlsRobot") config.urlsRobot = data.newData;
        if (data.cible == "listUrlsFoscam") config.urlsFoscam = data.newData;
        
        
        persistConfig(config);

        var data =  {
                from: "@ updateIpRessources",
                listUrlsRobot: config.urlsRobot,
                listUrlsFoscam: config.urlsFoscam,
                ipRobot: config.defaultIpRobot ,
                ipFoscam: config.defaultIpFoscam

            };
        
        socket.emit('setIpRessources', data );
        //socket.broadcast.emit('getIpRessources', data);
        console.log ("> socket.emit('setIpRessources',data)");
        /**/
    


    });


    // Adds du 10/10/2016 >  Demande le paramètre de détection du gamepad:
    socket.on("getIsGamepad", function(data) { 
        console.log("> socket.on(getIsGamepad)")
        var data = { isGamepad: config.isGamepad}; 
        socket.emit('getIsGamepad', data);
        console.log ("> socket.emit('getIsGamepad',{ isGamepad: "+isGamepad+"})");
    });

    
    // Adds du 10/10/2016 >  Modification le paramètre de détection du gamepad:
    socket.on("setGamepad", function(data) { 
        console.log("> socket.on(setGamepad)")
        isGamepad = data.isGamepad;
        config.isGamepad = isGamepad;
        persistConfig(config);  
        var data = { isGamepad: isGamepad};  
        socket.broadcast.emit('setGamepad', data); 
        console.log ("> socket.broadcast.emit('setGamepad',{ setGamepad: "+isGamepad+"})");
    });






    // ----------------------- // Fin Ajouts pages d'amnisitration


});


// ------------ fonctions Diverses ------------

// Pour Contrôle des connectés coté serveur
// Ecouteur de connexion entrante
function onSocketConnected(socket) {
    console.log("\n -------------------------------------------------");
    console.log("> Connexion entrante: (ID: " + socket.id + ")");
    //displayUsers();
}


// ------Fonctions pour la page d'administration ------------------  

// Adds du 26/09/16 >> Ip Mobiserv & Foscam par défaut

var urlRobotI3S = new models.ressourceUrl("127.0.0.1:7007", "IP Mobiserv I3S", "");
urlsRobot[urlRobotI3S.Label] = urlRobotI3S;

var urlRobotCSI = new models.ressourceUrl("10.0.15.74:7007", "IP Mobiserv CSI","");
urlsRobot[urlRobotCSI.Label] = urlRobotCSI;

var urlFoscamI3S = new models.ressourceUrl("192.168.1.50:88", "IP Foscam I3S", "");
urlsFoscam[urlFoscamI3S.Label] = urlFoscamI3S;

var urlFoscamCSI = new models.ressourceUrl("10.0.15.50:88", "IP Foscam CSI", "");
urlsFoscam[urlFoscamCSI.Label] = urlFoscamCSI;

defaultIpRobot = urlRobotI3S;
defaultIpFoscam = urlFoscamI3S;


function persistConfig(config) {
    console.log("@@@@ persistConfig(config)")
    // console.log(config);
    newConfig = JSON.stringify(config);
    fs.writeFile('config.json', newConfig, "utf8", function (err) {
        if (err) return console.log(err);
        console.log('fs.writeFile > config.json');
    });

}

// Ads le 17/09/2016 > 
// Gestion des connectés - Fonction de test & débuggage
function displayUsers() {


/*
    console.log("////////////////////////////////////////////////////////////////////");
    // This will return the array of SockeId of all the connected clients
    var allConnectedClients = Object.keys(io.sockets.connected);
    console.log("allConnectedClients");
    console.log(allConnectedClients);
    console.log("-------------------------------------");
    
    var allConnectedClients2 = io.sockets.connected;
    for (v in allConnectedClients2) {
        console.log("&&&&&&&&&&&&&&&&&-");
        console.log(allConnectedClients2[v].id)
    }
    

    console.log("-------------------------------------");
    console.log("HistoUsers");
    console.log("-------------------------------------");
    console.log(histoUsers2);
    console.log("-------------------------------------");
    console.log("ActiveUsers:");
    console.log("-------------------------------------");
    console.log(users2);
    console.log("////////////////////////////////////////////////////////////////////");

*/


}










// --------------------- Fonctions de Persistance - Passerelles MongoDB

var handlers = {
    getCountDatabases: getCountDatabases,
    getListDatabases: getListDatabases,
    getListCollections: getListCollections,
    getCollectionDocs: getCollectionDocs,
    findOneDoc: findOneDoc,
    findManyDocs: findManyDocs,
    createCollection:createCollection,
    dropCollection:dropCollection,
    renameCollection:renameCollection,
    removeAllDocs:removeAllDocs,
    insertOnedDoc:insertOnedDoc,
    insertManyDocs:insertManyDocs,
    deleteOnedDoc:deleteOnedDoc,
    deleteManyDocs:deleteManyDocs,
    updateOneDoc:updateOneDoc,
    replaceOneDoc:replaceOneDoc,
}



// Récupération du compteur de bases dans une promize
function getCountDatabases (callback, parameters) {
    persistance.getCountDatabases(function(result) {
        callback(result);
    }, function(error) {
            if (error == null) error = "erreur getCountDatabases()";
            console.log(error)
    });
}



// La liste des databases du serveur mongoDb
function getListDatabases (callback, parameters) {
    persistance.getListDatabases(function(result) {
        callback(result);
    }, function(error) {
        if (error == null) error = "erreur getListDatabases()";
        console.log(error)
    });
}


// Toutes les collections de la base de donnée courante
function getListCollections(callback, parameters) {
    persistance.getListCollections(function(result) {
        callback(result)
    }, function(error) {
        if (error == null) error = "erreur getListCollections()";
        console.log(error)
    });
}


// Remonter tous les documents d'une collection
// function getCollectionDocs(collection, callback) {
function getCollectionDocs(callback,parameters) {    
    //console.log( "> Test getCollectionDocs("+collection+")");
    var collection = parameters.collection;
    persistance.getCollectionDocs(collection,function(result) {
        callback(result);
    }, function(error) {
        if (error == null) error = "erreur getCollectionDocs("+collection+")";
        console.log(error)
    });
}

// Remonter tous les documents d'une collection
// function findOneDoc(collection, query, callback) {
function findOneDoc(callback, parameters) {
    var collection = parameters.collection;
    var query = parameters.query;
    //console.log( "> Test getOneDoc("+collection+")");
    persistance.findOneDoc(collection, query, function(result) {
        callback(result);
    }, function(error) {
        if (error == null) error = "erreur findOneDoc("+collection+")";
        console.log(error)
    });
}

// function findManyDocs(collection, query, callback) {
function findManyDocs(callback, parameters) {
    var collection = parameters.collection;
    var query = parameters.query;
    persistance.findManyDocs(collection, query, function(result) {
        callback(result);
    }, function(error) {
        if (error == null) error = "erreur findManyDocs("+collection+")";
        console.log(error)
    });
}


// Créer une collection
//function createCollection(collection, callback) {
function createCollection(callback, parameters) {
    var collection = parameters.collection;
    persistance.createCollection(collection,function(result) {
        callback (result)       
    }, function(error) {
        if (error == null) error = "erreur createCollection("+collection+")";
        console.log(error)
    });
}


// Supprimer une collection (et tout son contenu)
// function dropCollection(collection,callback) {
function dropCollection(callback, parameters) {
    var collection = parameters.collection;
    persistance.dropCollection(collection,function(result) {
        callback (result)
    }, function(error) {
        if (error == null) error = "erreur dropCollection("+collection+")";
        console.log(error)
    });
}


// Renommer une collection (sans toucher a son contenu)
// function renameCollection(oldNameCollection,newNameCollection,callback) {
function renameCollection(callback, parameters) {  
    var oldNameCollection = parameters.oldNameCollection;
    var newNameCollection = parameters.newNameCollection;
    persistance.renameCollection(oldNameCollection,newNameCollection,function(result) {
        callback (result)
    }, function(error) {
        if (error == null) error = "erreur renameCollection("+collection+")";
        console.log(error)
    });
}

// Vide tous les documents d'une collection sans la supprimer elle-même
//function removeAllDocs(collection, callback) {
function removeAllDocs(callback, parameters) {
    var collection = parameters.collection;
    persistance.removeAllDocs(collection,function(result) {
        // var removeResult = result;
        callback (result);
        //logTestValues ("Result of removeAllDocs("+collection+")");
    }, function(error) {
        if (error == null) error = "erreur removeAllDocs("+collection+")";
        console.log(error)
    });
}

// OK
// function insertOnedDoc(collection,doc,callback) {
function insertOnedDoc(callback, parameters) {
    var collection = parameters.collection;
    var doc = parameters.doc;
    persistance.insertOneDoc(collection,doc,function(result) {
        callback (result)
    }, function(error) {
        if (error == null) error = "erreur insertOnedDoc("+collection+")";
        console.log(error)
    });
}



// OK
//function insertManyDocs(collection,arrayDocs,callback) {
function insertManyDocs(callback, parameters) {
    var collection = parameters.collection;
    var arrayDocs = parameters.arrayDocs;
    persistance.insertManyDocs(collection,arrayDocs,function(result) {
        callback (result)
    }, function(error) {
        if (error == null) error = "erreur insertManyDocs("+collection+")";
        console.log(error)
    });
}


//function deleteOnedDoc(collection,doc,callback) {
function deleteOnedDoc(callback, parameters) {
    var collection = parameters.collection;
    var doc = parameters.doc;
    persistance.deleteOnedDoc(collection,doc,function(result) {
        //console.log("XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX")
        //console.log(result)
        callback (result)
    }, function(error) {
        if (error == null) error = "erreur insertOnedDoc("+collection+")";
        console.log(error)
    });
}


// function deleteManyDocs(collection, query, callback) {
function deleteManyDocs(callback, parameters) {
    var collection = parameters.collection;
    var query = parameters.query;
    persistance.deleteManyDocs(collection, query, function(result) {
        callback(result);
    }, function(error) {
        if (error == null) error = "erreur deleteManyDocs("+collection+")";
        console.log(error)
    });
}


//function updateOneDoc(collection, query1, query2, callback) {
function updateOneDoc(callback, parameters) {
    var collection = parameters.collection;
    var query1 = parameters.query1;
    var query2 = parameters.query2;
    persistance.updateOneDoc(collection, query1, query2, function(result) {
        //console.log("OK !!! ------------------------------")
        //console.log(result)
        callback(result);
    }, function(error) {
        if (error == null) error = "erreur updateOneDoc("+collection+")";
        console.log(error)
    });
}


//function replaceOneDoc(collection,docID,newDoc, callback) {
function replaceOneDoc(callback, parameters) {
    var collection = parameters.collection;
    var docID = parameters.docID;
    var newDoc = parameters.newDoc;
    persistance.replaceOneDoc(collection, docID, newDoc, function(result) {
        //console.log("OK !!! ------------------------------")
        //console.log(result)
        callback(result);
    }, function(error) {
        if (error == null) error = "erreur updateOneDoc("+collection+")";
        console.log(error)
    });
}


// Fonctions diverses ----------------------

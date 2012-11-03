// ----------------------------------------- //
// Inclusion des bibliothèques necessaires   //
// ----------------------------------------- //
var os        = require('os');
var dns       = require('dns');
var http      = require('http');
var fs        = require('fs');

var express   = require('express');
var io        = require('socket.io');
var _         = require('underscore');
var Mustache  = require('mustache');

// ----------------------------------------- //
// Configuration de l'application            //
// ----------------------------------------- //

var conf = {
    baseDir   : "./data",
    localhost : os.hostname(),
    wifi      : "WifiHETIC",
    port      : 8888,
    viewDelay : 40000 // 40s
}

dns.lookup(os.hostname(), function (err, add, fam) {
  conf.ip = add;
})

// ----------------------------------------- //
// Parametrage du jeu                        //
// ----------------------------------------- //
var gameState = 0;
var game = [
    { 
        title   : "Indiana Jones\n et les aventuriers de l'arche perdue",
        filename: "1",
        answer  : /^(Indiana\s+Jones(\s*:?|\s+et)\s+)?Les\s+aventuriers\s+de\s+l'arche\s+perdue$/ig 
    },
    {
        title   : "Piranhas 3D",
        filename: "2",
        answer  : /^Piranhas?\s+3D$/ig
    },
    {
        title   : "Monstres et compagnie",
        filename: "3",
        answer  : /^Monstres\s+et\s+c(ompagn)?ie\.?$/ig
    },
    {
        title   : "Psychose",
        filename: "4",
        answer  : /^Psychose$/ig
    },
    {
        title   : "La grande vadrouille",
        filename: "5",
        answer  : /^La\s+grande\s+vadrouille$/ig
    },
    {
        title   : "Le tombeau des lucioles",
        filename: "6",
        answer  : /^Le\s+tombeau\s+des\s+lucioles$/ig
    },
    {
        title   : "Le bon, la brute et le truand",
        filename: "7",
        answer  : /^Le\s+bon,?\s+la\s+brute\s+et\s+le\s+truand$/ig
    },
    {
        title   : "Ben-Hur",
        filename: "8",
        answer  : /^Ben(-|\s+)Hur$/ig
    },
    {
        title   : "Demolition Man",
        filename: "9",
        answer  : /^Demolition\s+Man$/ig
    },
    {
        title   : "Le seigneur des anneaux\n Le retour du Roi",
        filename: "10",
        answer  : /^(Le\s+seigneur\s+des\s+anneaux\s*:?\s+)?Le retour du Roi$/ig
    }
]

// ----------------------------------------- //
// Objet de stockage des données des joueurs //
// ----------------------------------------- //
// C'est un stockage en mémoire, si          //
// l'application est arrétée, les données    //
// sont perdus                               //
// ----------------------------------------- //
var users = {}

// ----------------------------------------- //
// Configuration du serveur HTTP             //
// ----------------------------------------- //
var router = express();
var server = http.createServer(router).listen(conf.port);

// --------------------------------------------- //
// Definition des dossiers de contenu statiques. //
// --------------------------------------------- //
['css', 'js', 'img', 'video', 'font', 'theme'].forEach(function(dir) {
    router.use('/' + dir, express.static(conf.baseDir + '/' + dir));
});

// --------------------------- //
// Gestion des URL specifiques //
// --------------------------- //
// Root URL /                  //
// --------------------------- //
router.get("/", function(req, res) {
    fs.readFile(conf.baseDir + '/index.html', function(err, data) {
        if(data && data.toString) {
            res.send(Mustache.to_html(data.toString(), {
                localhost : conf.ip,
                port      : conf.port,
                wifi      : conf.wifi,
                game      : game
            }));
        } else {
            res.statusCode = 500;
            res.send('Oups! Something wrong happened, please, try again.')
        }
    });
});
// --------------------------- //
// Admin URL /control.html     //
// --------------------------- //
router.get("/control.html", function(req, res) {
    fs.createReadStream(conf.baseDir + '/control.html').pipe(res);
});

// ------------------------------------ //
// Configuration du serveur WebSocket   //
// ------------------------------------ //
io = io.listen(server);

// ------------------------------------ //
// Initialisation du serveru            //
// ------------------------------------ //
io.sockets.on('connection', function(socket) {

    // ---------------------------------- //
    // Enregistrement des utilisateurs    //
    // ---------------------------------- //
    socket.on('login', function(user) {
        if (socket.username) {
            socket.emit('error',"Vous ne pouvez pas changer de nom de joueur.");
        
        } else if (user.data == "" || users[user.data]) {
            socket.emit('error', "Ce nom de joueur est déjà utilisé.");
        
        } else {
            users[user.data] = {
                score    : 0,
                game     : []
            }

            socket.username = user.data;

            socket.emit('registerUser', socket.username);

            io.sockets.emit('updateUsers', users);
        }
    });

    // ---------------------------------- //
    // Enregistrement des propositions    //
    // ---------------------------------- //
    socket.on('guessTitle', function(guess) {
        if (!socket.username || !guess.user || socket.username !== guess.user) {
            socket.emit('error',"Vous n'êtes pas un joueur connu.");

        } else if (!users[socket.username].game[gameState - 1] ||
                   !users[socket.username].game[gameState - 1].success) {
            var film = game[gameState - 1].answer;
            var user = users[socket.username];

            if (film.test(guess.data)) {
                user.game[gameState - 1] = {
                    time: +new Date,
                    success: true
                };

                user.score++;
                
                socket.emit('success', true);
                socket.emit('status',  user);

            } else {
                user.game[gameState - 1] = {
                    time: +new Date,
                    success: false
                };

                socket.emit('success', false);
            }
        }
    });

    // ---------------------------------- //
    // Demarrage du jeu                   //
    // ---------------------------------- //
    socket.on('start', function() {
        io.sockets.emit('start');
        
        _.each(users, function (element, index, list) {
            users[index].score = 0;
            users[index].game  = [];
        });

        gameState = 0;

        updateView();
    });

    // ---------------------------------- //
    // Enchainement des écrans du jeu     //
    // ---------------------------------- //
    // L'application envoie l'évènement   //
    // updateView toute les viewDelay     //
    // millisecondes jusqu'a ce que tous  //
    // Les écran aient été passés en      //
    // revue.                             //
    // ---------------------------------- //
    function updateView(){
        var data = {
            view: gameState,
            film: game[gameState]
        }

        _.each(users, function (element, index, list) {
            users[index].game[gameState]  = {
                time: +new Date,
                success: false
            };
        });

        io.sockets.emit('updateView', data);
        gameState++;

        if(gameState < game.length) {
            _.delay(updateView, conf.viewDelay);
            
        } else {
            _.delay(function () {
                io.sockets.emit('stop', users);
            }, conf.viewDelay);
        }
    }
});
var restify         = require('restify');
var builder         = require('botbuilder');
var CONTENT         = require('./content.json');
var MONGOCLIENT     = require('mongodb').MongoClient;
var HTTP            = require('request');
var htmlToText      = require('html-to-text');

//=========================================================
// Bot Setup
//=========================================================

// Setup Restify Server
var server = restify.createServer();
server.listen(process.env.port || process.env.PORT || 3978, function () {
    console.log('%s listening to %s', server.name, server.url); 
});
  
// Create chat bot
var connector = new builder.ChatConnector({
    appId: '',
    appPassword: ''
});
var bot = new builder.UniversalBot(connector);
server.post('/api/messages', connector.listen());

//=========================================================
// Bots Middleware
//=========================================================

// Anytime the major version is incremented any existing conversations will be restarted.
bot.use(builder.Middleware.dialogVersion({ version: 1.0, resetCommand: /^reset/i }));

//=========================================================
// Bots Global Actions
//=========================================================

bot.endConversationAction('goodbye', 'Goodbye :)', { matches: /^goodbye/i });
bot.beginDialogAction('help', '/help', { matches: /^help/i });

//=========================================================
// Bots Dialogs
//=========================================================

bot.dialog('/', [
    function (session) {
        console.log("here");
        // Send a greeting and show help.
        var card = new builder.HeroCard(session)
            .title(CONTENT.welcome_content.card_title)
            .text(CONTENT.welcome_content.card_subtitle)
            .images([
                 builder.CardImage.create(session, "http://factordaily.com/wp-content/uploads/2016/09/FactorDailyLogo-03.png")
            ]);
        var msg = new builder.Message(session).attachments([card]);
        session.send(msg);
        session.send(CONTENT.welcome_content.welcome_message);
        session.beginDialog('/menu');
    },
    function (session, results) {
        // Always say goodbye
        session.send("Ok... See you later!");
    }
]);

bot.dialog('/menu', [
    function (session) {
        builder.Prompts.choice(session, CONTENT.menu.ask_user_options, CONTENT.menu.options);
    },
    function (session, results) {
        if (results.response && results.response.entity != '(quit)') {
            // Launch demo dialog
            session.beginDialog('/' + results.response.entity);
        } else {
            // Exit the menu
            session.endDialog();
        }
    },
    function (session, results) {
        // The menu runs a loop until the user chooses to (quit).
        session.replaceDialog('/menu');
    }
]).reloadAction('reloadMenu', null, { matches: /^menu|show menu/i });


bot.dialog('/News', [
    function (session) {
        var array = [];
        MONGOCLIENT.connect(CONTENT.mongodbUrl, function(err, db) {
            var collection = db.collection('contents');
            collection.find().limit(10).toArray(function(err, docs) {
                for (var i = 0; i < docs.length; i++){
                    singleStory =  new builder.HeroCard(session)
                        .title(docs[i].title)
                        .subtitle(docs[i].description)
                        .images([
                            builder.CardImage.create(session, "http://factordaily.com/wp-content/uploads/2016/09/FactorDailyLogo-03.png")
                                .tap(builder.CardAction.showImage(session, "http://factordaily.com/wp-content/uploads/2016/09/FactorDailyLogo-03.png")),
                        ])
                        .buttons([
                            builder.CardAction.openUrl(session, "https://en.wikipedia.org/wiki/Space_Needle", "link")
                        ]) 
                    array.push(singleStory);
                }
                var msg = new builder.Message(session)
                    .attachmentLayout(builder.AttachmentLayout.carousel)
                    .attachments(array);
                builder.Prompts.choice(session, msg, "select:100|select:101|select:102");   
            })
        });
    },
    function (session, results) {
        var action, item;
        var kvPair = results.response.entity.split(':');
        switch (kvPair[0]) {
            case 'select':
                action = 'selected';
                break;
        }
                session.privateConversationData.choice = kvPair[1];
                session.beginDialog('/chosenSituation');
               
       //session.endDialog();
    }    
]);

bot.dialog('/Videos', [
    function (session) {
        HTTP({
            headers: CONTENT.headers,
            url: 'https://public-api.wordpress.com/rest/v1.1/sites/factordaily.com/posts/?http_envelope=1&category=video,audio-video&number=10',
            method: 'GET',
            json: true
        },function(error, response, body) {
            var array = [];
            var posts = body.body.posts; 
            for (var i = 0; i < posts.length; i++){
                    var title = htmlToText.fromString(posts[i].title, {     // removes html tags and convert it to text but didn't able to remove all the tags
                        wordwrap: 130
                    });
                    var text = htmlToText.fromString(posts[i].excerpt, {     // removes html tags and convert it to text but didn't able to remove all the tags
                        wordwrap: 130
                    }); 
                    singleStory =  new builder.HeroCard(session)
                        .title(title)
                        .subtitle(text)
                        .images([
                            builder.CardImage.create(session, posts[i].featured_image)
                                .tap(builder.CardAction.showImage(session, posts[i].featured_image)),
                        ])
                        .buttons([
                            builder.CardAction.openUrl(session, posts[i].URL, "link")
                        ]) 
                    array.push(singleStory);
                }
                var msg = new builder.Message(session)
                    .attachmentLayout(builder.AttachmentLayout.carousel)
                    .attachments(array);
                session.send(msg);
                session.beginDialog('/menu');   
        });
    },
    function (session, results) {
        var action, item;
        var kvPair = results.response.entity.split(':');
        switch (kvPair[0]) {
            case 'select':
                action = 'selected';
                break;
        }
                session.privateConversationData.choice = kvPair[1];
                session.beginDialog('/chosenSituation');
               
       //session.endDialog();
    }    
]);


bot.dialog('/Stories', [
    function (session) {
        HTTP({
            headers: CONTENT.headers,
            url: 'https://public-api.wordpress.com/rest/v1.1/sites/factordaily.com/posts/?http_envelope=1&number=10',
            method: 'GET',
            json: true
        },function(error, response, body) {
            var array = [];
            var posts = body.body.posts; 
            for (var i = 0; i < posts.length; i++){
                    var title = htmlToText.fromString(posts[i].title, {     // removes html tags and convert it to text but didn't able to remove all the tags
                        wordwrap: 130
                    });
                    var text = htmlToText.fromString(posts[i].excerpt, {     // removes html tags and convert it to text but didn't able to remove all the tags
                        wordwrap: 130
                    }); 
                    singleStory =  new builder.HeroCard(session)
                        .title(title)
                        .subtitle(text)
                        .images([
                            builder.CardImage.create(session, posts[i].featured_image)
                                .tap(builder.CardAction.showImage(session, posts[i].featured_image)),
                        ])
                        .buttons([
                            builder.CardAction.openUrl(session, posts[i].URL, "link")
                        ]) 
                    array.push(singleStory);
                }
                var msg = new builder.Message(session)
                    .attachmentLayout(builder.AttachmentLayout.carousel)
                    .attachments(array);
                session.send(msg);
                session.beginDialog('/menu'); 
        });
    },
    function (session, results) {
        var action, item;
        var kvPair = results.response.entity.split(':');
        switch (kvPair[0]) {
            case 'select':
                action = 'selected';
                break;
        }
                session.privateConversationData.choice = kvPair[1];
                session.beginDialog('/chosenSituation');
               
       //session.endDialog();
    }    
]);
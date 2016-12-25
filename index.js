const Steam = require('steam'),
      dota2 = require('dota2'),
      APIDota2 = require('dota2api'),
      SteamID = require('steamid'),
      util = require('util'),
      chalk = require('chalk'),
      fs = require('fs'),
      Long = require('long');

global.config = require('./config');

const steamClient = new Steam.SteamClient(),
      dota2Client = new dota2.Dota2Client(steamClient, true)
      steamUser = new Steam.SteamUser(steamClient);

const onSteamLogOn = (logonResponse) => {
  if(logonResponse.eresult == Steam.EResult.OK){
    dota2Client.launch();

    dota2Client.on("ready", () => {
      requestPlayerMatchHistory();
    });
  }
}



const onSteamError = (error) => {
  util.log(error);
};

var logOnDetails = {
    "account_name": global.config.steam_user,
    "password": global.config.steam_pass,
};

steamClient.connect();

steamClient.on('connected', () => {
    steamUser.logOn(logOnDetails);
});

steamClient.on('logOnResponse', onSteamLogOn);
steamClient.on('error', onSteamError);

function requestPlayerMatchHistory(){

  dota2Client.requestPlayerMatchHistory(121292501, {}, (result, response) => {
    const match_id_int = response.matches[0].match_id;
    const match_long = new Long(match_id_int.low, match_id_int.high);

    const match_id = parseInt(match_long.toString());

    requestMatchDetails(match_id);
  })
}


function requestMatchDetails(match_id) {
  const cache = JSON.parse(fs.readFileSync('./match_details.json', 'utf8'));
  const cache_match_id = new Long(cache.match_id.low, cache.match_id.high);

  if(cache_match_id == match_id){
    printPlayers(cache.players);
  }
  else{
    dota2Client.requestMatchDetails(match_id, (result, response) => {
      const players = response.match.players;
      fs.writeFile('match_details.json', JSON.stringify(response.match));

      printPlayers(players);
    })
  }
}

function printPlayers(players){
  const heroes = JSON.parse(fs.readFileSync('./heroes.json', 'utf8')).heroes;

  players.forEach((player, index) => {
    const sid = SteamID.fromIndividualAccountID(player.account_id).getSteamID64();
    const playing = isProfilePlaying(sid);

    if(index == 0){
      console.log('\nRadiant');
    }
    else if(index == 5) {
      console.log('\nDire')
    }

    const hero_name = heroes.filter((hero) => {
      return hero.id == player.hero_id;
    })[0];

    if(playing){
      console.log(chalk.green('Está jogando - %s [%s]'), player.player_name, hero_name.localized_name);
    }
    else{
      console.log(chalk.red('Não está jogando - %s [%s]'), player.player_name, hero_name.localized_name);
    }
  })
}

function isProfilePlaying(sid) {
  var isPlaying = false;

  dota2Client.spectateFriendGame(sid, function(result, response) {
    if(response != null) {
      isPlaying = true;
    }
  });

  return isPlaying;
}

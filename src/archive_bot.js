// require modules
const Twit = require('twit');
const config = require('./config');
const screen_name = require('./screen_name');
const fs = require('fs');

// instantiate Twit
const bot = new Twit(config);

// create variable stores 
let statuses_count = 0;
const now = Date.now();
const seven_days = 608400000;
let to_archive = 0;

// helper functions
function olderThanSevenDays(check_date) {
    return check_date < now - seven_days
};

function promiseCountStatuses() {
    return new Promise(function(resolve, reject) {
        bot.get('users/lookup', {
            screen_name: screen_name
        }, function(e, d, r) {
            if (e) console.log(e);
            resolve(d[0].statuses_count);
            reject(e);
        })
    }
)}

function getUserHistory(user, done) {
  let data = [];
  search();

  function search(lastId) {
    let args = {
      screen_name: user,
      count: 200,
      include_rts: 1
    };
    if(lastId) args.max_id = lastId;

    bot.get('statuses/user_timeline', args, onTimeline);

    function onTimeline(err, chunk) {
      if (err) {
        console.log('Twitter search failed!');
        return done(err);
      }

    //   if (!chunk.length) {
    //     console.log('User has not tweeted yet');
    //     return done(err);
    //   }

      //Get rid of the first element of each iteration (not the first time)
      if (data.length) {
        var popped = chunk.shift();
      }

      data = data.concat(popped, chunk);
    //   var thisId = parseInt(data[data.length - 1].id_str);

      if (chunk.length) {
        var thisId = parseInt(data[data.length - 1].id);
        return search(thisId);
      }
      console.log(data.length + ' tweets imported');
      return done(undefined, data);
    }
  }
}

promiseCountStatuses()
    .then((statusCount) => {
        console.log('Total number of tweets:', statusCount);
    })
    .catch((reject) => { console.log(reject) });

getUserHistory(screen_name, (undefined, data) => {
    data.shift();
    data.pop();
    console.log('data length after shift and pop',data.length)
    for (var i = data.length - 1; i > -1; i--) {
         if (olderThanSevenDays(Date.parse(data[i].created_at)) && !data[i].favorited || 
             olderThanSevenDays(Date.parse(data[i].created_at)) && data[i].favorited && data[i].retweeted) {
             to_archive++;
             var jsondata = JSON.stringify(data[i], null , 4);
             fs.writeFile('data/'+ data[i].id_str.toString() + '.json', jsondata, (err) => {
                if (err) {
                    throw err;
                }
                console.log("JSON data is saved.");
            });

             console.log(jsondata);
          } 
        }
    console.log(to_archive, 'tweets archived!');
});


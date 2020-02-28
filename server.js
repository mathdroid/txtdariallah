/* Setting things up. */
var path = require("path"),
  express = require("express"),
  app = express(),
  Twit = require("twit"),
  config = {
    /* Be sure to update the .env file with your API keys. See how to get them: https://botwiki.org/tutorials/how-to-create-a-twitter-app */

    twitter: {
      consumer_key: process.env.CONSUMER_KEY,
      consumer_secret: process.env.CONSUMER_SECRET,
      access_token: process.env.ACCESS_TOKEN,
      access_token_secret: process.env.ACCESS_TOKEN_SECRET
    }
  },
  T = new Twit(config.twitter);

const passport = require("passport");
const Strategy = require("passport-twitter").Strategy;

const { getRandomAyatFairly } = require("./quran.js");
const getScreenshot = require("./screenshot");

const surahs = [...Array(114)].map((_, i) => i + 1);

passport.use(
  new Strategy(
    {
      consumerKey: process.env["CONSUMER_KEY"],
      consumerSecret: process.env["CONSUMER_SECRET"],
      callbackURL: process.env.BOT_CALLBACK
    },
    function(token, tokenSecret, profile, cb) {
      console.log({ token, tokenSecret });
      // In this example, the user's Twitter profile is supplied as the user
      // record.  In a production-quality application, the Twitter profile should
      // be associated with a user record in the application's database, which
      // allows for account linking and authentication with other identity
      // providers.
      return cb(null, profile);
    }
  )
);

passport.serializeUser(function(user, cb) {
  cb(null, user);
});

passport.deserializeUser(function(obj, cb) {
  cb(null, obj);
});

app.use(require("morgan")("combined"));
app.use(require("cookie-parser")());
app.use(require("body-parser").urlencoded({ extended: true }));
app.use(
  require("express-session")({
    secret: "keyboard cat",
    resave: true,
    saveUninitialized: true
  })
);
app.use(express.static("public"));

// Initialize Passport and restore authentication state, if any, from the
// session.
app.use(passport.initialize());
app.use(passport.session());

// app.get("/login", passport.authenticate("twitter"));

// app.get(
//   process.env.BOT_CALLBACK_SLUG,
//   passport.authenticate("twitter", { failureRedirect: "/login" }),
//   function(req, res) {
//     res.redirect("/");
//   }
// );

/* You can use cron-job.org, uptimerobot.com, or a similar site to hit your /BOT_ENDPOINT to wake up your app and make your Twitter bot tweet. */

app.all(`/${process.env.BOT_ENDPOINT}`, async function(req, res) {
  try {
    const { surah, ayat, translation } = getRandomAyatFairly();

    console.log({ surah, ayat, translation });

    const result = await getScreenshot(
      `https://quran.com/${surah}/${ayat}?translations=20`
    );
    
    const postfix = `
- QS${surah}:${ayat}`
    
    const maxTextLength = 280 - postfix.length
    
    const text = translation.length > maxTextLength ? `${translation.slice(0,maxTextLength - 3)}...` : translation
    
    const status = `${text}${postfix}`

    T.post("media/upload", { media_data: result.toString('base64') }, function(
      err,
      data,
      response
    ) {
      
      console.log({err, data, response})
      // now we can assign alt text to the media, for use by screen readers and
      // other text-based presentations and interpreters
      var mediaIdStr = data.media_id_string;
      var altText =
        `QS ${surah}:${ayat}`;
      var meta_params = { media_id: mediaIdStr, alt_text: { text: altText } };

      T.post("media/metadata/create", meta_params, function(
        err,
        data,
        response
      ) {
        if (!err) {
          // now we can reference the media and post a tweet (media will attach to the tweet)
          console.log(data);
          var params = {
            status,
            media_ids: [mediaIdStr]
          };

          T.post("statuses/update", params, function(err, data, response) {
            console.log(data);
          });
        } else {
          console.error(err);
        }
      });
    });
    res.send(200)
  } catch (error) {
    console.error(error);
    res.sendStatus(500);
  }
});

var listener = app.listen(process.env.PORT, function() {
  console.log("Your bot is running on port " + listener.address().port);
});

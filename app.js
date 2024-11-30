const { Client, auth } = require("twitter-api-sdk");
const express = require("express");
const axios = require("axios");
const cors = require("cors");
const app = express();
app.use(cors());


const TWITTER_CALLBACK_URL = "http://localhost:3000/callback";

const twitterAuthClient = new auth.OAuth2User({
  client_id: "eEZ5R09lbWxiMExuRE8yeTZaUlk6MTpjaQ",
  client_secret: "oRvdps4VYVBgIHoBRpS9Hnhlpe620KgiPbeasLM79o6hKM9-lk",
  callback: TWITTER_CALLBACK_URL,
  scopes: ["tweet.read", "users.read"],
});

let twitterAccessToken = "";


const REDDIT_CLIENT_ID = "OYAGfqEwogQjJ6Fvn9nY7g";
const REDDIT_CLIENT_SECRET = "_XsyyFrzKMsbyZevlSuuIAIAimwFHw";
const REDDIT_REDIRECT_URI = "http://localhost:3000/reddit/callback";

let redditAccessToken = "";


app.get("/login", (req, res) => {
  const authUrl = twitterAuthClient.generateAuthURL({
    state: "twitterstate",
    code_challenge_method: "s256",
  });
  res.redirect(authUrl);
});

app.get("/callback", async (req, res) => {
  const { code, state } = req.query;
  if (state !== "twitterstate") return res.status(500).send("State isn't matching");

  try {
    const tokenResponse = await twitterAuthClient.requestAccessToken(code);
    twitterAccessToken = tokenResponse.token.access_token;
    res.send(`
      <html>
        <body>
          <script>
            window.opener.postMessage({ token: '${twitterAccessToken}', status: 'Twitter Login successful' }, "http://localhost:3000");
            window.close();
          </script>
        </body>
      </html>
    `);
  } catch (error) {
    console.error("Twitter Callback Error:", error.message);
    res.status(500).send("Authentication failed.");
  }
});

app.post("/followers", async (req, res) => {
  try {
    const userResponse = await axios.get("https://api.twitter.com/2/users/me", {
      headers: {
        Authorization: `Bearer ${twitterAccessToken}`,
      },
    });
    const userId = userResponse.data.data.id;

    const timelineResponse = await new Client(twitterAuthClient).tweets.usersIdTimeline(userId, {
      max_results: 10,
      expansions: "author_id",
      "tweet.fields": "created_at",
      "user.fields": "name",
    });

    const tweets = timelineResponse.data || [];
    const users = timelineResponse.includes?.users || [];
    const userMap = users.reduce((map, user) => {
      map[user.id] = user.name;
      return map;
    }, {});

    const formattedTweets = tweets.map((tweet) => ({
      tweet: tweet.text,
      author: userMap[tweet.author_id] || "Unknown Author",
      tweetedAt: new Date(tweet.created_at).toLocaleString(),
    }));

    res.json(formattedTweets);
  } catch (error) {
    console.error("Error fetching Twitter followers:", error.message);
    res.status(500).send("Failed to fetch Twitter followers.");
  }
});


app.get("/reddit/login", (req, res) => {
  const redditAuthUrl = `https://www.reddit.com/api/v1/authorize?client_id=${REDDIT_CLIENT_ID}&response_type=code&state=redditstate&redirect_uri=${encodeURIComponent(REDDIT_REDIRECT_URI)}&duration=temporary&scope=read`;
  res.redirect(redditAuthUrl);
});

app.get("/reddit/callback", async (req, res) => {
  const { code, state } = req.query;
  if (state !== "redditstate") return res.status(500).send("State isn't matching");

  try {
    const tokenResponse = await axios.post(
      "https://www.reddit.com/api/v1/access_token",
      new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: REDDIT_REDIRECT_URI,
      }),
      {
        auth: {
          username: REDDIT_CLIENT_ID,
          password: REDDIT_CLIENT_SECRET,
        },
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      }
    );

    redditAccessToken = tokenResponse.data.access_token;
    res.send(`
      <html>
        <body>
          <script>
            window.opener.postMessage({ token: '${redditAccessToken}', status: 'Reddit Login successful' }, "http://localhost:3000");
            window.close();
          </script>
        </body>
      </html>
    `);
  } catch (error) {
    console.error("Reddit Callback Error:", error.message);
    res.status(500).send("Authentication failed.");
  }
});

app.get("/reddit/feed", async (req, res) => {
  try {
    const response = await axios.get("https://oauth.reddit.com/best", {
      headers: {
        Authorization: `Bearer ${redditAccessToken}`,
      },
    });
    const posts = response.data.data.children.map((post) => ({
      title: post.data.title,
      subreddit: post.data.subreddit,
      url: post.data.url,
      createdUtc: post.data.created_utc,
      thumbnail: post.data.thumbnail !== "self" && post.data.thumbnail !== "default" ? post.data.thumbnail : null,
    }));

    res.json(posts);
  } catch (error) {
    console.error("Error fetching Reddit feed:", error.message);
    res.status(500).send("Failed to fetch Reddit feed.");
  }
});


// Start Server
app.listen(3000, () => {
  console.log("Server running at http://localhost:3000");
});

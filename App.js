import axios from "axios";
import { useEffect, useState } from "react";
import "./App.css";

export default function Page() {
    const [redditFeed, setRedditFeed] = useState([]);
    const [twitterFeed, setTwitterFeed] = useState([]);
    const [combinedFeed, setCombinedFeed] = useState([]);
    const [accessToken, setAccessToken] = useState(null);

    useEffect(() => {
        const handleMessage = (event) => {
            if (event.origin !== "http://localhost:3000") return;

            const { token } = event.data;

            if (token) {
                setAccessToken(token);
            }
        };

        window.addEventListener("message", handleMessage);

        return () => {
            window.removeEventListener("message", handleMessage);
        };
    }, []);



    const handleLogin = () => {
        window.open("http://localhost:3000/login", "_blank", "width=600,height=700");
    };

    const handleRedditLogin = () => {
        window.open("http://localhost:3000/reddit/login", "_blank", "width=600,height=700");
    };

    const fetchTwitterFeed = async () => {
        try {
            const response = await axios.post("http://localhost:3000/followers");
            const twitterData = response.data.map((tweet) => ({
                author: tweet.author,
                content: tweet.tweet,
                date: new Date(tweet.tweetedAt).toISOString(),

            }));
            setTwitterFeed(twitterData);
        } catch (error) {
            console.error("Error fetching Twitter feed:", error.message);
        }
    };


    const fetchRedditFeed = async () => {
        try {
            const response = await axios.get("http://localhost:3000/reddit/feed");
            const redditData = await Promise.all(
                response.data.map(async (post) => {
                    return {
                        author: post.subreddit,
                        content: post.title,
                        date: new Date(post.createdUtc * 1000).toISOString(),
                        thumbnail: post.thumbnail !== "self" && post.thumbnail !== "default" ? post.thumbnail : null,
                    };
                })
            );
            setRedditFeed(redditData);
        } catch (error) {
            console.error("Error fetching Reddit feed:", error.message);
        }
    };

    useEffect(() => {
        const combined = [...twitterFeed, ...redditFeed];
        combined.sort((a, b) => new Date(b.date) - new Date(a.date));
        setCombinedFeed(combined);
    }, [twitterFeed, redditFeed]);

    return (
        <div className="app">

            <header className="app-header">
                <h1>X Tweets and Reddit Feed Viewer</h1>

                <div className="button-section">
                    <div className="button-container">
                        <button className="action-btn" onClick={handleLogin}>
                            Login to Twitter
                        </button>
                        <button className="action-btn" onClick={handleRedditLogin}>
                            Login to Reddit
                        </button>
                    </div>
                    <div className="button-container">
                        <button className="action-btn fetch-btn" onClick={fetchTwitterFeed}>
                            Tweets
                        </button>
                        <button className="action-btn fetch-btn" onClick={fetchRedditFeed}>
                            Reddit Posts
                        </button>
                    </div>
                </div>
            </header>




            <div className="feeds-container">
                {combinedFeed.map((item, index) => (
                    <div className="feed-card" key={index}>
                        <h3 className="feed-author">{item.author}</h3>
                        <p className="feed-content">{item.content}</p>
                        <span className="feed-date">
                            {new Date(item.date).toLocaleString()}
                        </span>
                        {item.thumbnail && (
                            <img
                                src={item.thumbnail}
                                alt="Post thumbnail"
                                className="feed-thumbnail"
                            />
                        )}
                    </div>
                ))}
            </div>
        </div>
    );



}

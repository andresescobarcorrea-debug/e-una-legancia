const axios = require('axios');
const API_KEY = 'f57bed9c6f5e4bccb57c76dd5ffb9daf';

async function test() {
    try {
        const res = await axios.get(`https://api.rawg.io/api/characters?key=${API_KEY}`);
        console.log("Characters:", res.data.results.slice(0, 2).map(c => c.name));
    } catch(e) {
        console.log("Error characters:", e.response ? e.response.status : e.message);
    }
}
test();

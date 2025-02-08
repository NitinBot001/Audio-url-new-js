const express = require('express');
const { chromium, installDeps } = require('playwright');
const axios = require('axios');
const { execSync } = require('child_process');

const app = express();
const PORT = process.env.PORT || 3000;

// Function to check and install Playwright browsers
async function ensureBrowserInstalled() {
    try {
        // Try launching the browser to check if it's installed
        const browser = await chromium.launch();
        await browser.close();
        console.log("Playwright browser is available.");
    } catch (error) {
        console.log("Playwright browser not found. Installing...");
        try {
            // Install necessary dependencies
            execSync('npx playwright install --with-deps chromium', { stdio: 'inherit' });
            console.log("Playwright browser installed successfully.");
        } catch (installError) {
            console.error("Failed to install Playwright browser:", installError);
        }
    }
}

// Ensure browser is installed before starting the server
ensureBrowserInstalled().then(() => {
    app.get('/audio-url', async (req, res) => {
        const videoId = req.query.v;

        if (!videoId) {
            return res.status(400).send('Missing videoId parameter');
        }

        const urul = `https://youtube-mp3-download1.p.rapidapi.com/dl?id=${videoId}`;
        const options = {
            method: 'GET',
            headers: {
                'x-rapidapi-key': 'cd0ce75f2dmsh28573eb27ac05d2p1bbac9jsn4e2bfe8b3bdb',
                'x-rapidapi-host': 'youtube-mp3-download1.p.rapidapi.com'
            }
        };

        let browser;
        try {
            // Fetch the download link using native fetch
            const response = await fetch(urul, options);
            const result = await response.json();

            if (!result.link) {
                throw new Error('No download link found');
            }

            // Launch Playwright browser
            browser = await chromium.launch();
            const context = await browser.newContext();
            const page = await context.newPage();

            // Open the download link
            await page.goto(result.link, { waitUntil: 'domcontentloaded' });

            // Wait for content to fully load (adjust time if necessary)
            await page.waitForTimeout(3000); // 3 seconds delay

            // Extract tH and tS values
            const { tH, tS } = await page.evaluate(() => {
                return {
                    tH: window.tH || null,
                    tS: window.tS || null
                };
            });

            console.log(`tS: ${tS}, tH: ${tH}`);

            if (!tH || !tS) {
                throw new Error('Could not retrieve tH/tS values');
            }

            // Construct the final download URL
            const dlUrl = `https://mp3api-d.ytjar.info/dl?id=${videoId}&s=${tS}&h=${tH}`;
            const finalResponse = await axios.get(dlUrl, {
                headers: {
                    'authority': 'mp3api-d.ytjar.info',
                    'accept': '*/*',
                    'accept-language': 'en-US,en;q=0.9',
                    'origin': 'https://mp3api.ytjar.info',
                    'referer': 'https://mp3api.ytjar.info/',
                    'sec-ch-ua': '"Not A(Brand";v="8", "Chromium";v="132"',
                    'sec-ch-ua-mobile': '?0',
                    'sec-ch-ua-platform': '"Linux"',
                    'sec-fetch-dest': 'empty',
                    'sec-fetch-mode': 'cors',
                    'sec-fetch-site': 'same-site',
                    'user-agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Safari/537.36',
                    'x-cftoken': 'FMP3DL'
                }
            });

            res.send(finalResponse.data);

        } catch (error) {
            console.error('Error:', error.message);
            res.status(500).send({ error: error.message });
        } finally {
            if (browser) await browser.close();
        }
    });

    app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
    });
});

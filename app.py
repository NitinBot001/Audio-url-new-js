from flask import Flask, request, jsonify
from playwright.sync_api import sync_playwright
import requests
import subprocess
import sys
import os

app = Flask(__name__)
PORT = int(os.environ.get('PORT', 3000))

def ensure_browser_installed():
    """Check and install Playwright browser if needed."""
    try:
        # Try launching the browser to check if it's installed
        with sync_playwright() as p:
            browser = p.chromium.launch()
            browser.close()
            print("Playwright browser is available.")
    except Exception:
        print("Playwright browser not found. Installing...")
        try:
            # Install necessary dependencies
            subprocess.run([sys.executable, '-m', 'playwright', 'install', '--with-deps', 'chromium'], 
                         check=True, capture_output=True)
            print("Playwright browser installed successfully.")
        except subprocess.CalledProcessError as e:
            print("Failed to install Playwright browser:", e)
            raise

@app.route('/audio-url')
def get_audio_url():
    video_id = request.args.get('v')
    
    if not video_id:
        return jsonify({'error': 'Missing videoId parameter'}), 400
    
    url = f"https://youtube-mp3-download1.p.rapidapi.com/dl?id={video_id}"
    headers = {
        'x-rapidapi-key': 'cd0ce75f2dmsh28573eb27ac05d2p1bbac9jsn4e2bfe8b3bdb',
        'x-rapidapi-host': 'youtube-mp3-download1.p.rapidapi.com'
    }
    
    try:
        # Fetch the download link
        response = requests.get(url, headers=headers)
        result = response.json()
        
        if 'link' not in result:
            raise Exception('No download link found')
        
        # Launch Playwright browser
        with sync_playwright() as p:
            browser = p.chromium.launch()
            context = browser.new_context()
            page = context.new_page()
            
            # Open the download link
            page.goto(result['link'], wait_until='domcontentloaded')
            
            # Wait for content to fully load
            page.wait_for_timeout(3000)  # 3 seconds delay
            
            # Extract tH and tS values
            values = page.evaluate("""() => {
                return {
                    'tH': window.tH || null,
                    'tS': window.tS || null
                }
            }""")
            
            t_h = values.get('tH')
            t_s = values.get('tS')
            
            print(f"tS: {t_s}, tH: {t_h}")
            
            if not t_h or not t_s:
                raise Exception('Could not retrieve tH/tS values')
            
            # Construct the final download URL
            dl_url = f"https://mp3api-d.ytjar.info/dl?id={video_id}&s={t_s}&h={t_h}"
            final_headers = {
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
            
            final_response = requests.get(dl_url, headers=final_headers)
            return final_response.json()
            
    except Exception as e:
        print('Error:', str(e))
        return jsonify({'error': str(e)}), 500

def main():
    ensure_browser_installed()
    app.run(port=PORT)

if __name__ == '__main__':
    main()

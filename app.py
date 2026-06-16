import os
import re
import urllib.request
import xml.etree.ElementTree as ET
from flask import Flask, render_template, jsonify, request

app = Flask(__name__)

# Memory cache for release notes
_cache = {
    "data": None,
    "last_fetched": None
}

FEED_URL = "https://docs.cloud.google.com/feeds/bigquery-release-notes.xml"

def clean_html_for_text(html_content):
    """Converts HTML to clean plain text suitable for a tweet."""
    # Remove HTML tags
    text = re.sub('<[^<]+?>', '', html_content)
    # Decode some basic entities
    text = text.replace('&nbsp;', ' ').replace('&amp;', '&').replace('&lt;', '<').replace('&gt;', '>')
    # Normalize spacing
    text = re.sub(r'\n+', ' ', text)
    text = re.sub(r'\s+', ' ', text)
    return text.strip()

def fetch_and_parse_releases():
    """Fetches the Google Cloud BigQuery Release Notes feed and parses it into structured data."""
    try:
        # Fetching Atom feed
        req = urllib.request.Request(
            FEED_URL, 
            headers={'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'}
        )
        with urllib.request.urlopen(req, timeout=10) as response:
            xml_data = response.read()
        
        root = ET.fromstring(xml_data)
        ns = {'atom': 'http://www.w3.org/2005/Atom'}
        entries = root.findall('atom:entry', ns)
        
        parsed_entries = []
        
        for idx, entry in enumerate(entries):
            # Parse basics
            date_title = entry.find('atom:title', ns).text
            id_elem = entry.find('atom:id', ns)
            id_text = id_elem.text if id_elem is not None else f"release-{idx}"
            
            # Extract anchor link if available
            link_elem = entry.find('atom:link', ns)
            link_href = link_elem.attrib.get('href') if link_elem is not None else "https://cloud.google.com/bigquery/docs/release-notes"
            
            content_elem = entry.find('atom:content', ns)
            if content_elem is None or not content_elem.text:
                continue
                
            content_html = content_elem.text
            
            # Parse individual updates by splitting on <h3> elements
            headers = re.findall(r'<h3>(.*?)</h3>', content_html)
            parts = re.split(r'<h3>.*?</h3>', content_html)
            
            updates = []
            if headers:
                for u_idx, header in enumerate(headers):
                    body = parts[u_idx + 1] if u_idx + 1 < len(parts) else ""
                    body = body.strip()
                    
                    plain_text = clean_html_for_text(body)
                    
                    # Generate a clean anchor link specific to this section if possible
                    safe_header_anchor = header.lower().replace(' ', '_')
                    update_link = f"{link_href}#{safe_header_anchor}"
                    
                    updates.append({
                        "id": f"{id_text.split('#')[-1] if '#' in id_text else id_text}_{u_idx}",
                        "type": header,
                        "html": body,
                        "text": plain_text,
                        "link": link_href
                    })
            else:
                # Fallback if there are no <h3> tags
                plain_text = clean_html_for_text(content_html)
                updates.append({
                    "id": f"{id_text.split('#')[-1] if '#' in id_text else id_text}_0",
                    "type": "General",
                    "html": content_html,
                    "text": plain_text,
                    "link": link_href
                })
                
            parsed_entries.append({
                "date": date_title,
                "id": id_text.split('#')[-1] if '#' in id_text else id_text,
                "link": link_href,
                "updates": updates
            })
            
        return {
            "success": True,
            "releases": parsed_entries,
            "source": "live"
        }
    except Exception as e:
        return {
            "success": False,
            "error": str(e)
        }

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/releases')
def get_releases():
    force_refresh = request.args.get('refresh', 'false').lower() == 'true'
    
    if force_refresh or _cache["data"] is None:
        result = fetch_and_parse_releases()
        if result["success"]:
            _cache["data"] = result["releases"]
            return jsonify(result)
        else:
            # If live fetch fails, return cached if available
            if _cache["data"] is not None:
                return jsonify({
                    "success": True,
                    "releases": _cache["data"],
                    "source": "cache_fallback",
                    "error": result["error"]
                })
            return jsonify(result), 500
            
    return jsonify({
        "success": True,
        "releases": _cache["data"],
        "source": "cache"
    })

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5001)

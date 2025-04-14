import re

def format_ai_response(response_text):
    """Simple test for link handling."""
    # First, extract and preserve links
    links = []
    
    def extract_links(match):
        link_text = match.group(1)
        link_url = match.group(2)
        links.append((link_text, link_url))
        return f"[LINK:{len(links)-1}]"
    
    # Process and replace links with placeholders
    link_pattern = r'\[([^\]]+)\]\(([^)]+)\)'
    processed_text = re.sub(link_pattern, extract_links, response_text)
    
    print("After extraction:", processed_text)
    print("Links found:", links)
    
    # Restore all links with their original markdown format
    for i, (link_text, link_url) in enumerate(links):
        processed_text = processed_text.replace(f"[LINK:{i}]", f"[{link_text}]({link_url})")
    
    print("After restoration:", processed_text)
    return processed_text

# Test with a simple example
test_text = """
Here is a [LeetCode problem](https://leetcode.com/problems/two-sum/) and 
another [GitHub repo](https://github.com/example/repo).
"""

print("Original text:", test_text)
result = format_ai_response(test_text)
print("Final result:", result) 
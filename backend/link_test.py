import re

def format_ai_response(response_text):
    """
    Format the AI response by removing markdown symbols and making the text 
    more reader-friendly while preserving structure, adding appropriate spacing,
    and maintaining hyperlinks.
    """
    # First, extract and preserve links
    links = []
    
    def extract_links(match):
        link_text = match.group(1)
        link_url = match.group(2)
        links.append((link_text, link_url))
        return f"LINK_PLACEHOLDER_{len(links)-1}"
    
    # Process and replace links with unique placeholders
    link_pattern = r'\[([^\]]+)\]\(([^)]+)\)'
    processed_text = re.sub(link_pattern, extract_links, response_text)
    
    print("After extraction:", processed_text)
    print("Links found:", links)
    
    # Restore all links with their original markdown format
    for i, (link_text, link_url) in enumerate(links):
        processed_text = processed_text.replace(f"LINK_PLACEHOLDER_{i}", f"[{link_text}]({link_url})")
    
    print("After restoration:", processed_text)
    return processed_text

# Test with a sample response
test_text = """
## Skill Development

Based on your GitHub profile, I recommend focusing on:

1. **Advanced Python** - Your repositories show you're comfortable with Python, but you could benefit from learning more about asyncio and design patterns.

2. **Database Optimization** - [SQL Performance Guide](https://use-the-index-luke.com/) would be a great resource.

## Practice Problems

Here are some LeetCode problems that match your level:

- [Two Sum](https://leetcode.com/problems/two-sum/) - Easy but fundamental
- [LRU Cache](https://leetcode.com/problems/lru-cache/) - Medium, great for interviews
"""

print("Original text:", test_text)
result = format_ai_response(test_text)
print("\nFinal result:", result) 
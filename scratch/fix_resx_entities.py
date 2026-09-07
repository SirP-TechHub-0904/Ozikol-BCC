import os
import re
import xml.etree.ElementTree as ET

resources_dir = r"c:\Users\JURAY\source\Ozikol-BCC\src\Ozikol.Central\Resources"

# Regex to match any ampersand that is NOT part of a valid XML entity
# e.g., not &amp;, &lt;, &gt;, &quot;, &apos;, or &#123;, &#x12a;
amp_regex = re.compile(r'&(?!(amp|lt|gt|quot|apos|#\d+|#x[0-9a-fA-F]+);)')

for filename in os.listdir(resources_dir):
    if filename.endswith(".resx"):
        filepath = os.path.join(resources_dir, filename)
        with open(filepath, "r", encoding="utf-8") as f:
            content = f.read()

        fixed_content = amp_regex.sub('&amp;', content)
        
        # Verify it parses cleanly with ElementTree
        try:
            ET.fromstring(fixed_content)
            with open(filepath, "w", encoding="utf-8") as f:
                f.write(fixed_content)
            print(f"Successfully validated and updated {filename}")
        except Exception as e:
            print(f"Error parsing {filename}: {e}")

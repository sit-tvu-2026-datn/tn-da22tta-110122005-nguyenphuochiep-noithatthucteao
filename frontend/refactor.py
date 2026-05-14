import os
import re

def process_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    if 'fetch(' not in content and 'fetch (' not in content:
        return False

    print(f"Processing {filepath}")
    
    # We will do simple string replacements for the most common patterns
    # or just show the user so they can do it manually, but we can try to do simple ones.
    
    # Since regex parsing for JS fetch is complex (nested blocks, etc), 
    # I'll just print out the lines with fetch so I know exactly where to look.
    return True

if __name__ == "__main__":
    src_dir = r"c:\Users\GIGABYTE\Desktop\cn-da22tta-NguyenPhuocHiep-InteriorShop\frontend\src"
    
    for root, dirs, files in os.walk(src_dir):
        for file in files:
            if file.endswith('.jsx') or file.endswith('.js'):
                process_file(os.path.join(root, file))

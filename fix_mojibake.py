def fix_mojibake(filepath):
    with open(filepath, 'rb') as f:
        content_bytes = f.read()

    # Determine if it has BOM
    has_bom = content_bytes.startswith(b'\xef\xbb\xbf')
    if has_bom:
        content_bytes = content_bytes[3:]

    # Since the file was saved as UTF-8 but contains cp1252 bytes interpreted as characters,
    # what we actually have is: the original bytes were decoded as cp1252, then saved as UTF-8.
    # To reverse this:
    # 1. Read as UTF-8 string
    content_str = content_bytes.decode('utf-8', errors='ignore')

    # 2. Encode to cp1252 bytes to get back the original bytes that form the UTF-8 UTF-8 multibyte sequences
    try:
        fixed_bytes = content_str.encode('cp1252')
        # 3. Decode those bytes as utf-8
        final_str = fixed_bytes.decode('utf-8')
        
        # Save back to file
        with open(filepath, 'wb') as f:
            if has_bom:
                f.write(b'\xef\xbb\xbf')
            f.write(final_str.encode('utf-8'))
        print(f"Successfully fixed mojibake for {filepath}")
    except Exception as e:
        print(f"Failed {filepath}: {e}")
        # fallback manual replace for characters that might fail the encode
        pass

fix_mojibake('logic.js')
fix_mojibake('app.html')

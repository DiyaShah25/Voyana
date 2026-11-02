import os
import zipfile

def make_zip():
    base_dir = r"D:\DAU Sem-3\wsoa\Voyana\docs\testing"
    dest_zip = r"D:\DAU Sem-3\wsoa\Voyana\docs\testing\submission\evidence.zip"
    
    dirs_to_zip = ["evidence", "postman"]
    
    with zipfile.ZipFile(dest_zip, 'w', zipfile.ZIP_DEFLATED) as zf:
        for folder in dirs_to_zip:
            folder_path = os.path.join(base_dir, folder)
            for root, dirs, files in os.walk(folder_path):
                # Avoid node_modules if any
                if "node_modules" in root:
                    continue
                for file in files:
                    file_path = os.path.join(root, file)
                    arcname = os.path.relpath(file_path, base_dir)
                    zf.write(file_path, arcname)
                    print(f"Added {arcname}")

    print("Created evidence.zip successfully, size:", os.path.getsize(dest_zip))

if __name__ == "__main__":
    make_zip()

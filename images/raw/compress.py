import os
from PIL import Image

def compress_images(input_folder, output_folder, max_size=1024):
    # Ensure output folder exists
    os.makedirs(output_folder, exist_ok=True)
    
    # Iterate over all files in the input folder
    for filename in os.listdir(input_folder):
        input_path = os.path.join(input_folder, filename)
        
        # Check if the file is an image
        if filename.lower().endswith(('.png', '.jpg', '.jpeg', '.gif', '.bmp', '.tiff')):
            with Image.open(input_path) as img:
                # Calculate new size while maintaining aspect ratio
                img.thumbnail((max_size, max_size), Image.LANCZOS)
                
                # Save the compressed image to the output folder with the same filename
                output_path = os.path.join(output_folder, filename)
                img.save(output_path)
                print(f"Compressed and saved {filename} to {output_folder}")

# Define input and output folder paths
input_folder = "./"   # Replace with the path to your input folder
output_folder = "../" # Replace with the path to your output folder

# Run the function
compress_images(input_folder, output_folder)

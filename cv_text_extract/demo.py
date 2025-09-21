import cv2
from pyzbar import pyzbar

def detect_barcodes(image_path):
    """
    Detects the presence of barcodes in an image file.

    Args:
        image_path (str): The path to the image file.
    """
    try:
        # Read the image from the specified path
        image = cv2.imread(image_path)
        
        if image is None:
            print(f"Error: Could not read the image from {image_path}")
            return
            
        # Convert the image to grayscale for better detection
        gray_image = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        
        # Find all barcodes in the image. This returns a list of detected objects.
        barcodes = pyzbar.decode(gray_image)
        
        # Check if any barcodes were found
        if not barcodes:
            print("No barcodes detected in the image.")
            
        # Loop through all detected barcodes to process them
        for barcode in barcodes:
            # Extract the location of the barcode. We don't need the data for this task.
            (x, y, w, h) = barcode.rect
            
            # Print a message to the console for each barcode detected
            print("Barcode detected!")
            height_const = 500
            width_const = 100
            # Draw a green rectangle around the barcode on the original image
            cv2.rectangle(image, (x-width_const, y-height_const), (x + w + width_const, y + h + height_const), (0, 255, 0), 2)
            
            # Add text to the image to indicate a barcode was found
            text = "Barcode Found"
            cv2.putText(image, text, (x-width_const, y - height_const - 10), cv2.FONT_HERSHEY_SIMPLEX, 2.0, (0, 255, 0), 3, cv2.LINE_AA)
            
        # Display the image with the detected barcodes
        cv2.imshow("Barcode Detection", image)
        cv2.waitKey(0) # Wait for a key press to close the window
        cv2.destroyAllWindows()
        
    except Exception as e:
        print(f"An error occurred: {e}")

if __name__ == "__main__":
    # Specify the path to your image file with a barcode.
    # Make sure this image is in the same directory as the script.
    image_file = "/Users/burakayyorgun/Documents/gitclones/PennApps2025/imgs/example_img5.jpeg"
    
    # Call the function to detect barcodes in the image
    detect_barcodes(image_file)
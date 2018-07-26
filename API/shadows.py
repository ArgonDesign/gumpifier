"""Gaussian blur on a cropped part of the image. The blur decreases the lower down you go
Cleaned up copy of AddingShadows/GaussianCropGradientBlur.py
"""
# region imports
from PIL import Image, ImageFilter
import numpy as np
import math
# endregion

# region utility functions
def find_coeffs(pa, pb):
    """Finds the coefficients of the perspective transformation

    Args:
        pa (1x4 int matrix): Contains the four vertices in the resulting plane
        pb (1x4 int matrix): Contains the four vertices in the original plane
    
    Returns:
        image matrix: the skewed image matrix

    Source: http://xenia.media.mit.edu/~cwren/interpolator/ 
    (https://stackoverflow.com/questions/14177744/how-does-perspective-transformation-work-in-pil)
    """

    matrix = []
    for p1, p2 in zip(pa, pb):
        matrix.append([p1[0], p1[1], 1, 0, 0, 0, -p2[0]*p1[0], -p2[0]*p1[1]])
        matrix.append([0, 0, 0, p1[0], p1[1], 1, -p2[1]*p1[0], -p2[1]*p1[1]])

    A = np.matrix(matrix, dtype=np.float)
    B = np.array(pb).reshape(8)

    res = np.dot(np.linalg.inv(A.T * A) * A.T, B)
    return np.array(res).reshape(8)

def rotate_point(theta, x, y):
    ct = math.cos(theta)
    st = math.sin(theta)
    rotation_matrix = np.array([[ct, -st], [st, ct]])
    xy = np.array([x, y])
    x, y = np.matmul(rotation_matrix, xy)
    return x, y

def diagonal_stretch(magnitude, x, y):
    """Stretches the coordinates in both axes 
    Args:
        magnitude (float): The magnitude of the amount to scale by
        x (int): The x coordinate
        y (int): The y coordinate
    
    Returns:
        tuple: The new x, y pair
    """

    return int(x * magnitude), int(y * magnitude)

def tuple_map(f, a, b):
    """Zip + Map for tuples
    
    Args:
        f (function): The function to apply
        a (tuple): The first tuple
        b (tuple): The second tuple
    
    Returns:
        [type]: [description]
    """

    return tuple([f(x) for x in zip(a, b)])
# endregion

def add_shadows(foreground_array, background_array, mask, box):
    foreground_image = Image.fromarray(foreground_array)

    # * Replace person with a black fill
    shadow = foreground_array.copy()
    print(shadow.shape, mask.shape)
    shadow[mask, :3] = [0, 0, 0]

    # * Apply transparency gradient
    height = box[2] - box[0]
    width = box[3] - box[1]
    half_mark = height * 0.75
    step = 255 / half_mark
    indices = min(np.where(mask)[1])

    alpha_layer = np.fromfunction(lambda i, j: step * (i - indices), mask.shape[:2], dtype=int)
    alpha_layer = np.minimum(alpha_layer, np.full(alpha_layer.shape, 255))
    shadow[mask, 3] = alpha_layer[mask]

    # * Generate the 4 coordinates for each plane to determine the perspective coefficients
    # 4 points in original plane
    top_left_y, top_left_x, bottom_right_y, bottom_right_x = box
    pb = [(top_left_x, top_left_y), (bottom_right_x, top_left_y), (bottom_right_x, bottom_right_y), (top_left_x, bottom_right_y)]

    # 4 points in new plane 
    # ! The shifts, stretches and angles are all hyper-parameters, fiddle with as necessary
    shifted_tl = tuple_map(sum, diagonal_stretch(1.2, *rotate_point(math.pi/6, top_left_x, top_left_y)), (-100, -50))
    shifted_tr = tuple_map(sum, diagonal_stretch(1.2, *rotate_point(math.pi/8, bottom_right_x, top_left_y)), (-100, -50))
    pa = [shifted_tl, shifted_tr,  (bottom_right_x, bottom_right_y), (top_left_x, bottom_right_y)]

    coeffs = find_coeffs(pa, pb)

    shadow_image = Image.fromarray(shadow)
    shadow_image = shadow_image.transform(shadow.shape[:2][::-1], Image.PERSPECTIVE, coeffs, Image.BICUBIC)

    # * Extract the areas under where the shadow would be
    # ! For now, resize the background image to be the same size as the foreground


    shadow_mask = np.array(shadow_image)[:, :, 3]
    indices = shadow_mask == 255
    masked_bg_array = np.zeros(foreground_array.shape)
    masked_bg_array[indices] = background_array[indices]
    masked_bg_image = Image.fromarray(masked_bg_array.astype("uint8"))

    preblur_composite = Image.alpha_composite(masked_bg_image, shadow_image)
    preblur_composite_array = np.array(preblur_composite)

    # * Calculate the upper and lower boundaries of the mask
    rows, cols = np.where(shadow_mask)
    lower_y = min(rows) # ! Lower y is actually the top of the image, but y-indexing increases as you progress downwards
    upper_y = max(rows)  

    # * Split into 10(?) sections
    step = (upper_y - lower_y) // 10
    for i in range(10):
        base_index = int(lower_y + step * (i - 0.5)) if i > 0 else lower_y
        follow_index = int(base_index + step * 1.5) if i > 0 else int(base_index + step)
        print(base_index, follow_index)
        section = preblur_composite_array[base_index : follow_index]
        section_image = Image.fromarray(section)
        section_image = section_image.filter(ImageFilter.GaussianBlur(max(10 - i, 0)))
        preblur_composite_array[base_index : follow_index] = np.array(section_image)

    postblur_composite = Image.fromarray(preblur_composite_array)

    # * Putting it all together
    final_image = Image.alpha_composite(Image.alpha_composite(Image.fromarray(background_array), postblur_composite), foreground_image)
    return np.array(final_image)
"""The API for the Gumpifier project
"""
from MaskRCNN import MaskRCNN
from PIL import Image
import numpy as np
import json
import hashlib
import time, random, os
# TODO: Do some clever processing to see what images are actually in front and which are behind?
class API:
    def __init__(self):
        self.nn = MaskRCNN()
        self.objects_to_be_behind = [] # [2, 3, 4, 9, 11, 15, 16, 17, 18, 19, 20, 23, 57, 58, 59, 60, 61, 64]  # ! This is a personal choice and needs to be reconsidered in more depth

    def load_foreground(self, foreground):
        """Loads and segments the foreground
        
        Args:
            foreground (image_url -> str): A url to the foreground image
        """

        self.foreground = foreground
        self.foreground_prediction = self.nn.predict_from_file(foreground)

    def load_background(self, background):
        """Loads and segments the background
        
        Args:
            background (image_url -> str): A url to the background image
        """

        self.background = background
        self.background_prediction = self.nn.predict_from_file(background)

    def create_image(self, cutout, foreground, background, position, scale):
        """Creates and returns a complete image from the data provided by the frontend UI
        
        Args:
            cutout (image_url -> str): A url to the cutout of the person
            foreground (list of image_urls -> str list): A list of the things that have been placed in the foreground
            background (List of image_urls -> str list): A list of the things that have been placed in the background
            position (tuple of floats): A tuple of floats containing the position of the person relative to the background image
            scale (tuple of floats): A tuple of floats containing the x y stretch of the person relative to the dimensions of the background image
        
        Returns:
            (image_url -> str): A url to the final image
        """

        cutout_img = self.nn.load_image(cutout)
        foreground_imgs = map(self.nn.load_image, foreground)
        background_imgs = map(self.nn.load_image, background)
        

    def build_response(self):
        """Creates and returns a json string containing the parameters required for the front end UI
        
        Returns:
            json str: A json string containing the parameters
        """

        response = {}
        response["cutout"] = self.get_cutout()
        response["foreground"], response["background"] = self.get_segments()
        response["position"], response["scale"] = self.get_optimal_position()
        # response["scale"] = self.get_optimal_scale()

        return json.dumps(response)

    def get_cutout(self):
        img = self.foreground_prediction.get_primary_human_image()
        return self.save_img_get_url(img)

    def get_segments(self):
        image, masks, classes = self.background_prediction.get_all_data()[:3]
        image = self.background_prediction.make_image_transparent(image)
        image[:, :, 3] = 255
        foreground = []
        background = [self.save_img_get_url(image)]
        for n in range(masks.shape[2]):
            mask = masks[:, :, n]
            img = self.background_prediction._apply_mask(image, mask)
            if classes[n] in self.objects_to_be_behind:
                foreground.append(self.save_img_get_url(img))
            else:
                background.append(self.save_img_get_url(img))
        return foreground, background

    def save_img_get_url(self, img):
        filepath = "test_url"
        os.makedirs(filepath, exist_ok=True)
        fname = os.path.join(filepath, hashlib.md5(str(time.time() + random.random()).encode("utf8")).hexdigest() + ".png")
        Image.fromarray(img.astype("uint8")).save(fname)
        return fname

    def get_optimal_position(self):
        # ! This is a big one 
        # ! We will eventually need a GAN to determine if this is a realistic looking image
        # * Return as a tuple of fpns between 0 and 1
        
        # TODO: Choosing a random object
        # TODO: See where you should put it

        # * Choosing a random object
        random_object = self.get_random_object()

        # * See where to put it
        bb = self.background_prediction.boxes[random_object]
        top_left_y, top_left_x, bottom_right_y, bottom_right_x = bb
        
        # ** Find out where to put the base of the image and then calculate where the top corner goes
        c_x, c_y = (top_left_x + bottom_right_x) // 2, bottom_right_y
        
        # *** rescale the image internally 
        scale_compared_object = self.get_optimal_scale(self.background_prediction.class_ids[random_object])
        if self.background_prediction.class_ids[random_object] in self.objects_to_be_behind:
            scale_compared_object *= 0.9


        object_height = bottom_right_y - top_left_y
        new_person_height = object_height * scale_compared_object


        mask, person_bb = self.foreground_prediction.get_primary_human()
        person_width = person_bb[3] - person_bb[1]
        person_height = person_bb[2] - person_bb[0] 
        person_scale = new_person_height / person_height

        new_person_width = person_width * person_scale

        left_x = c_x - new_person_width // 2
        upper_y = c_y - new_person_height

        image_height, image_width = self.background_prediction.get_all_data()[0].shape[:2]
        
        scale = (new_person_width / image_width, new_person_height / image_height)

        return (left_x / image_width, upper_y / image_height), scale

    def get_optimal_scale(self, object_id):
        # ! This is a big one
        # * Return as a multiple of the background image size

        # TODO: Find the average size of a bunch of objects
        # ! This assumes average height people
        # TODO: Compare the values and return some metric

        # TODO: add a scaling factor if they're behind an object
        # * Mapping multipliers to coco class names
        print(object_id)
        # height_multiplier = [0] * 81
        height_multiplier = [
            0.0, 1.0, 1.5, 1.4, 
            1.5, 0.2, 0.6, 0.9, 
            0.6, 0.5, 0.6, 3.0, 
            0.6, 1.8, 1.7, 0.0, 
            0.0, 0.0, 1.4, 2.0, 
            1.5, 0.7, 1.8, 1.4,
            0.2, 5.0, 0.0, 6.0,
            0.0, 3.0, 0.0, 0.0,
            0.8, 0.0, 0.0, 0.0,
            0.0, 10., 0.8, 0.0,
            0.0, 0.0, 0.0, 0.0,
            0.0, 0.0, 0.0, 0.0, 
            0.0, 0.0, 0.0, 0.0,
            0.0, 0.0, 0.0, 0.0,
            0.0, 2.0, 3.0, 0.0, 
            3.0, 1.6, 2.0, 1.0, 
            0.0, 0.0, 0.0, 0.0,
            0.0, 0.0, 0.0, 0.0,
            0.0, 1.0, 0.0, 0.0,
            0.0, 0.0, 0.0, 0.0, 0.0
        ]
        return height_multiplier[object_id]

    def get_random_object(self):
        # ! Return the required bb, mask and stuff 
        # ! This is so you can limit which objects to actually use
        random_object = np.random.choice(len(self.background_prediction.class_ids))
        while self.get_optimal_scale(self.background_prediction.class_ids[random_object]) == 0:
            random_object = np.random.choice(len(self.background_prediction.class_ids))
        return random_object
"""The API for the Gumpifier project
"""
from MaskRCNN import MaskRCNN
from PIL import Image, ImageFilter
import numpy as np
import json
import hashlib
import time, random, os, shadows
from scipy.spatial import ConvexHull

# TODO: Do some clever processing to see what images are actually in front and which are behind?
class API:
    def __init__(self):
        self.nn = MaskRCNN()
        self.foreground_map = {}
        self.background_map = {}
        self.objects_to_be_behind = [] # [2, 3, 4, 9, 11, 15, 16, 17, 18, 19, 20, 23, 57, 58, 59, 60, 61, 64]  # ! This is a personal choice and needs to be reconsidered in more depth

    def load_foreground(self, foreground, fn=lambda: None):
        """Loads and segments the foreground
        
        Args:
            foreground (image_url -> str): A url to the foreground image
        """
        self.foreground_map[foreground] = self.nn.predict_from_file(foreground)
        fn()

    def load_background(self, background, fn=lambda: None):
        """Loads and segments the background
        
        Args:
            background (image_url -> str): A url to the background image
        """

        self.background_map[background] = self.nn.predict_from_file(background)
        print(self.background_map[background].get_all_data()[2])
        fn()


    def create_image(self, cutout, foreground, background, position, scale, bg_image):
        """Creates and returns a complete image from the data provided by the frontend UI
        
        Args:
            cutout (image_url -> str): A url to the cutout of the person
            foreground (list of image_urls -> str list): A list of the things that have been placed in the foreground
            background (List of image_urls -> str list): A list of the things that have been placed in the background
            position (tuple of floats): A tuple of floats containing the position of the person relative to the background image
            scale (tuple of floats): A tuple of floats containing the x y stretch of the person relative to the dimensions of the background image
            bg_image (image_url -> str): A url to the background - used as a key
        Returns:
            (image_url -> str): A url to the final image
        """
        print(cutout, foreground, background, position, scale)
        cutout_array = self.nn.load_image(cutout)
        foreground_array = list(map(self.nn.load_image, foreground))
        if foreground_array: # Only print if foreground_array has elements!
            print("fg shape:", foreground_array[0].shape)
        background_array = map(self.nn.load_image, background)
        bg_image_array = self.background_map[bg_image].get_all_data()[0]
        bg_image_array = self.background_map[bg_image].make_image_transparent(bg_image_array)
        bg_image_array[:, :, 3] = 255
        # ! Goal: Create a new image from the parameters
        # TODO: Resize the image
        # TODO: Position and place the person
        # TODO: Add shadows
        # TODO: Place foreground

        # * Resize the image
        cutout_img = Image.fromarray(cutout_array)
        bg_image_size = bg_image_array.shape[:2][::-1]
        new_dims = int(bg_image_size[0] * scale[0]), int(bg_image_size[1] * scale[1])
        cutout_img = cutout_img.resize(new_dims)
        cutout_array = np.array(cutout_img)

        # # * Position and place the person
        top_left_x, top_left_y = int(bg_image_size[0] * position[0]), int(bg_image_size[1] * position[1])
        bottom_right_x, bottom_right_y = int(top_left_x + new_dims[0]), int(top_left_y + new_dims[1])
        # bg_image[top_left_y:bottom_right_y+1, top_left_x:bottom_right_x+1] = cutout_array

        # * Add shadows
        bg_image_person_img = np.zeros(bg_image_array.shape)

        # ! Only add the part of the image that's visible
        print(bg_image_size)
        print(top_left_y, top_left_x, bottom_right_y, bottom_right_x)
        indices = [0, cutout_array.shape[0], 0, cutout_array.shape[1]]
        if top_left_y < 0:
            indices[0] = abs(top_left_y)
            top_left_y = 0
            print("Too high")
        if bottom_right_y > bg_image_size[1]:
            indices[1] = bg_image_size[1] - bottom_right_y
            bottom_right_y = bg_image_size[1]
            print("too low")
        if top_left_x < 0:
            indices[2] = abs(top_left_x)
            top_left_x = 0
            print("Too left")
        if bottom_right_x > bg_image_size[0]:
            indices[3] = bg_image_size[0] - bottom_right_x
            bottom_right_x = bg_image_size[0]
            print("Too right")
        print(indices, cutout_array.shape, (top_left_y, top_left_x, bottom_right_y, bottom_right_x), bg_image_person_img[top_left_y:bottom_right_y, top_left_x:bottom_right_x].shape, cutout_array[indices[0]:indices[1], indices[2]:indices[3]].shape)
        bg_image_person_img[top_left_y:bottom_right_y, top_left_x:bottom_right_x] = cutout_array[indices[0]:indices[1], indices[2]:indices[3]]

        bg_image_person_mask = np.zeros(bg_image_array.shape[:2], dtype=np.bool)
        bg_image_person_mask[np.any(bg_image_person_img[:, :, :3], axis=2)] = True
        print(np.where(bg_image_person_img != 0))
        # return_image = shadows.add_shadows(bg_image_person_img.astype("uint8"), bg_image_array, bg_image_person_mask, (top_left_y, top_left_x, bottom_right_y, bottom_right_x))

        paste_img = Image.fromarray(bg_image_person_img.astype("uint8"))
        for im in foreground_array:
            print("count", np.count_nonzero(im[:, :, 3]), im.shape, im.dtype)
            im = Image.fromarray(im)
            im.save("test.png")
            paste_img.paste(im, mask=im)
        t = np.array(paste_img)
        print("count:", np.count_nonzero(t), t.dtype)
        paste_img.save("webApp/storage/test.png")
        return self.save_img_get_url(t)
        # Test
        return self.save_img_get_url(return_image)  # ! It kinda works? A little bit weird....


    def build_response(self, foreground, background):
        """Creates and returns a json string containing the parameters required for the front end UI
        
        Args:
            foreground (image_url -> str): A url to the cutout of the person - using it as a key
            background (image_url -> str): A url to the cutout of the person - using it as a key

        Returns:
            dict: a dict representing the json values
            (NOT: json str: A json string containing the parameters)
        """
        
        response = {}
        fg_pred = self.foreground_map[foreground]
        bg_pred = self.background_map[background]
        
        start_time = time.time()
        print("start")
        response["cutout"] = self.get_cutout(fg_pred)
        print("cutout done", time.time() - start_time)
        response["foreground"], response["background"] = self.get_segments(bg_pred)
        print("foreground done", time.time() - start_time)
        response["position"], response["scale"] = self.get_optimal_position(fg_pred, bg_pred)
        print("position and scale done", time.time() - start_time)
        response["background_masks"] = self.get_mask_fill(bg_pred)
        print("done", time.time() - start_time)
        # response["scale"] = self.get_optimal_scale()

        return response

    def get_cutout(self, fg_pred):
        img = fg_pred.get_primary_human_image()
        return self.save_img_get_url(img)

    def get_segments(self, bg_pred):
        start_time = time.time()
        image, masks, classes = bg_pred.get_all_data()[:3]
        image = bg_pred.make_image_transparent(image)
        print("bg made transparent", time.time() - start_time)
        image[:, :, 3] = 255
        foreground = []
        background = [self.save_img_get_url(image)]
        print("bg saved", time.time() - start_time)
        for n in range(masks.shape[2]):
            mask = masks[:, :, n]
            img = bg_pred._apply_mask(image, mask)
            if classes[n] in self.objects_to_be_behind:
                foreground.append(self.save_img_get_url(img))
            else:
                background.append(self.save_img_get_url(img))
            print(n, time.time() - start_time)
        return foreground, background

    def save_img_get_url(self, img):
        filepath = "webApp/storage/"
        os.makedirs(filepath, exist_ok=True)
        fname = os.path.join(filepath, hashlib.md5(str(time.time() + random.random()).encode("utf8")).hexdigest() + ".png")
        Image.fromarray(img.astype("uint8")).save(fname)
        return fname

    def get_optimal_position(self, fg_pred, bg_pred):
        # ! This is a big one 
        # ! We will eventually need a GAN to determine if this is a realistic looking image
        # * Return as a tuple of fpns between 0 and 1
        
        # TODO: Choosing a random object
        # TODO: See where you should put it

        # * Choosing a random object
        random_object = self.get_random_object(bg_pred)

        # * See where to put it
        bb = bg_pred.boxes[random_object]
        top_left_y, top_left_x, bottom_right_y, bottom_right_x = bb
        
        # ** Find out where to put the base of the image and then calculate where the top corner goes
        c_x, c_y = (top_left_x + bottom_right_x) // 2, bottom_right_y
        
        # *** rescale the image internally 
        scale_compared_object = self.get_optimal_scale(bg_pred.class_ids[random_object])
        if bg_pred.class_ids[random_object] in self.objects_to_be_behind:
            scale_compared_object *= 0.9


        object_height = bottom_right_y - top_left_y
        new_person_height = object_height * scale_compared_object

        mask, person_bb = fg_pred.get_primary_human()
        person_width = person_bb[3] - person_bb[1]
        person_height = person_bb[2] - person_bb[0] 
        person_scale = new_person_height / person_height

        new_person_width = person_width * person_scale

        left_x = c_x - new_person_width // 2
        upper_y = c_y - new_person_height

        image_height, image_width = bg_pred.get_all_data()[0].shape[:2]
        
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
            0.6, 0.5, 0.6, 1.5, 
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

    def get_random_object(self, bg_pred):
        # ! Return the required bb, mask and stuff 
        # ! This is so you can limit which objects to actually use

        # ! Check whether this will actually terminate, and generate probabilities!
        softmax = []
        im_h = bg_pred.image.shape[0]
        for ind, x in enumerate(bg_pred.class_ids):
            scale = self.get_optimal_scale(x)
            bb = bg_pred.boxes[ind]
            top_left_y, top_left_x, bottom_right_y, bottom_right_x = bb
            object_height = bottom_right_y - top_left_y
            new_person_height = object_height * scale
            softmax.append(new_person_height / (im_h * 0.1))
        
        if all(x < 1 for x in softmax):
            raise ValueError()

        softmax = np.array(softmax)
        probs = np.exp(softmax) / np.sum(np.exp(softmax), axis=0)

        random_object = np.random.choice(len(bg_pred.class_ids), p=probs)

        while self.get_optimal_scale(bg_pred.class_ids[random_object]) == 0:
            random_object = np.random.choice(len(bg_pred.class_ids), p=probs)
        return random_object

    def get_mask_fill(self, bg_pred): 
        image, masks, classes = bg_pred.get_all_data()[:3]
        image = bg_pred.make_image_transparent(image)
        image[:, :, 3] = 255
        mask_fill = []
        for n in range(masks.shape[2]):
            mask = masks[:, :, n]
            img = bg_pred._apply_mask(image, mask)
            indices = (mask==1)
            img[indices] = 255
            mask_fill.append(self.save_img_get_url(img))
        return mask_fill

    def get_mask_outline(self, bg_pred):
        image, masks, classes = bg_pred.get_all_data()[:3]
        image = bg_pred.make_image_transparent(image)
        image[:, :, 3] = 255
        mask_outline = []
        for n in range(masks.shape[2]):
            mask = masks[:, :, n]
            img = bg_pred._apply_mask(image, mask)
            img = Image.fromarray(img.astype("uint8")).filter(ImageFilter.FIND_EDGES)
            img = np.array(img)
            img[img[:, :, 3]==255, :] = 255

            # ! border expansion
            img_2 = img.copy()
            for y in range(img.shape[0]):
                for x in range(img.shape[1]):
                    if img[y, x, 3] == 255:
                        img_2[y-5:y+5, x-5:x+5, :] = 255
            img = img_2
            # ii = np.argwhere(mask==1)[:, ::-1]
            # hull = ConvexHull(ii)
            # print(hull.simplices.shape)
            # for simplex in hull.simplices:
            #     #print("Simplex", simplex, ii[simplex], ii.shape, hull.simplices.shape)
            #     img[ii[simplex, 1], ii[simplex, 0], :] = 255
            # # print(np.where(img==255))
            mask_outline.append(self.save_img_get_url(img))
        return mask_outline

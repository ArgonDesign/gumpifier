#!/usr/bin/env python
# -*- coding: utf-8 -*-
# ******************************************************************************
# Argon Design Ltd. Project P8010 Spock
# (c) Copyright 2018 Argon Design Ltd. All rights reserved.
#
# Module : Gumpifier
# Author : Argon Design
# Desc: The API for segmenting the images and retrieving the segmentation data
# ******************************************************************************
from MaskRCNN import MaskRCNN
from PIL import Image, ImageFilter
import numpy as np
import json
import hashlib
import time, random, os, shadows
from scipy.spatial import ConvexHull
from scipy.ndimage.morphology import binary_erosion
import colour
from collections import OrderedDict
from operator import itemgetter
from io import BytesIO
import base64
# TODO: Do some clever processing to see what images are actually in front and which are behind?
class API:
    def __init__(self):
        self.nn = MaskRCNN()
        self.foreground_map = {}
        self.background_map = {}
        self.objects_to_be_behind = [] # [2, 3, 4, 9, 11, 15, 16, 17, 18, 19, 20, 23, 57, 58, 59, 60, 61, 64]  # ! This is a personal choice and needs to be reconsidered in more depth

    def clear_dict(self):
        print(os.getcwd())
        files_remaining = set(os.path.join("webApp/storage/", x) for x in os.listdir("webApp/storage"))
        new_keys_fg = set(self.foreground_map.keys()) & files_remaining
        new_keys_bg = set(self.background_map.keys()) & files_remaining
        self.foreground_map = {x : self.foreground_map[x] for x in new_keys_fg}
        self.background_map = {x : self.background_map[x] for x in new_keys_bg}
        print(self.foreground_map, self.background_map)

    def load_foreground(self, foreground, fn=lambda: None):
        """Loads and segments the foreground. Currently resizes the image if it's above a threshold
        # ! Keep the old image too.
        
        Args:
            foreground (image_url -> str): A url to the foreground image
        """

        img = Image.fromarray(self.nn.load_image(foreground))
        if img.width > 1920:
            s = img.size
            ratio = 1920/s[0]
            img = img.resize((int(s[0]*ratio), int(s[1]*ratio)))
            print("Resized to: ", s[0]*ratio, s[1]*ratio)

        self.foreground_map[foreground] = self.nn.predict_from_array(np.array(img))
        fn()

    def load_background(self, background, fn=lambda: None):
        """Loads and segments the background. Currently resizes the image if it's above a threshold
        # ! Keep the old image too.
        
        Args:
            background (image_url -> str): A url to the background image
        """
        img = Image.fromarray(self.nn.load_image(background))
        if img.width > 1920:
            s = img.size
            ratio = 1920/s[0]
            img = img.resize((int(s[0]*ratio), int(s[1]*ratio)))
            print("Resized to: ", s[0]*ratio, s[1]*ratio)

        self.background_map[background] = self.nn.predict_from_array(np.array(img))
        print(self.background_map[background].get_all_data()[2])
        fn()

    def create_image(self, cutout, foreground, background, position, scale, colour_correction, bg_image):
        """Creates and returns a complete image from the data provided by the frontend UI
        
        Args:
            # //cutout (image_url -> str): A url to the cutout of the person
            cutout (base64 encoded image): The modified canvas image
            foreground (list of image_urls -> str list): A list of the things that have been placed in the foreground
            background (List of image_urls -> str list): A list of the things that have been placed in the background
            position (tuple of floats): A tuple of floats containing the position of the person relative to the background image
            scale (tuple of floats): A tuple of floats containing the x y stretch of the person relative to the dimensions of the background image
            colour_correction (dictionary of floats): A dictionary containing the corrected brightness and temperature
            bg_image (image_url -> str): A url to the background - used as a key
        Returns:
            (image_url -> str): A url to the final image
        """
        print(cutout, foreground, background, position, scale)
        modified_cutout_str = cutout.replace('data:image/png;base64,', '').replace(" ", "+")

        cutout_array = np.array(Image.open(BytesIO(base64.b64decode(modified_cutout_str))))
        print("cutout_shape:", cutout_array.shape)
        foreground_array = list(map(self.nn.load_image, foreground))
        if foreground_array: # Only print if foreground_array has elements!
            print("fg shape:", foreground_array[0].shape)
        background_array = map(self.nn.load_image, background)
        bg_image_array = self.background_map[bg_image].get_all_data()[0]
        bg_image_array = self.background_map[bg_image].make_image_transparent(bg_image_array)
        bg_image_array[:, :, 3] = 255
        # ! Goal: Create a new image from the parameters
        # TODO: Resize the image
        # TODO: Colour correction
        # TODO: Position and place the person
        # TODO: Add shadows
        # TODO: Place foreground

        # * Resize the image
        cutout_img = Image.fromarray(cutout_array)
        bg_image_size = bg_image_array.shape[:2][::-1]
        new_dims = int(bg_image_size[0] * scale[0]), int(bg_image_size[1] * scale[1])
        print("New size:", new_dims)
        cutout_img = cutout_img.resize(new_dims, Image.ANTIALIAS)
        cutout_array = np.array(cutout_img)

        # # * Colour correct the person - based on the JS code

        # # ** white balance adjustment
        # r_adjust = int(255 / colour_correction["white_balance"]["r"])
        # g_adjust = int(255 / colour_correction["white_balance"]["g"])
        # b_adjust = int(255 / colour_correction["white_balance"]["b"])
        # cutout_array[:, :, :3] *= np.array([r_adjust, g_adjust, b_adjust], dtype="uint8")


        # # ** Brightness adjustment
        # adjust = int(255 * (colour_correction["brightness"] / 100));
        # cutout_array[:, :, :3] += np.uint8(adjust)

        # print("--------------", "\r\n", cutout_array, "--------------", "\r\n")
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

        paste_img = Image.fromarray(bg_image_array.astype("uint8"))
        im = Image.fromarray(bg_image_person_img.astype("uint8"))
        paste_img.paste(im, mask=im)
        for im in foreground_array:
            im = Image.fromarray(im)
            paste_img.paste(im, mask=im)
        return self.save_img_get_url(np.array(paste_img))
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
        response["foreground"], response["background"], response["labels"] = self.get_segments_and_labels(bg_pred)
        print("foreground done", time.time() - start_time)
        response["position"], response["scale"] = self.get_optimal_position(fg_pred, bg_pred)
        print("position and scale done", time.time() - start_time)
        response["background_masks"] = self.get_mask_fill(bg_pred)
        print("masking done", time.time() - start_time)
        response["colour_correction"] = self.get_colour_correction(bg_pred, response["cutout"], response["position"], response["scale"])
        print("colour correction done", time.time() - start_time)
        response["quotation"] = self.get_random_forrest_gump_quotation()
        print("done", time.time() - start_time)

        return response

    def get_cutout(self, fg_pred):
        img = fg_pred.get_primary_human_image()
        return self.save_img_get_url(img)

    def get_segments_and_labels(self, bg_pred):
        start_time = time.time()
        image, masks, classes, _, scores = bg_pred.get_all_data()
        image = bg_pred.make_image_transparent(image)
        print("bg made transparent", time.time() - start_time)
        image[:, :, 3] = 255
        foreground = []
        print("bg made un-transparent", time.time() - start_time)
        background = [self.save_img_get_url(image)]
        labels = {}
        print("bg saved", time.time() - start_time)
        for n in range(masks.shape[2]):
            mask = masks[:, :, n]
            img = bg_pred._apply_mask(image, mask)
            url = self.save_img_get_url(img)
            if classes[n] in self.objects_to_be_behind:
                foreground.append(url)
            else:
                background.append(url)
            labels[url] = {"name": bg_pred.coco_class_names[classes[n]], "confidence": str(scores[n])}
        labels = OrderedDict(
            sorted(
                sorted(labels.items(), key = lambda x: x[1]["name"]),
                key = lambda x: round(float(x[1]["confidence"]) * 100), reverse=True)
            )
        print (labels)
        return foreground, background, labels

    def save_img_get_url(self, img):
        start_time = time.time()
        filepath = "webApp/storage/"
        os.makedirs(filepath, exist_ok=True)
        print("makedirs", time.time() - start_time)
        fname = os.path.join(filepath, hashlib.md5(str(time.time() + random.random()).encode("utf8")).hexdigest() + ".png")
        print("hash", time.time() - start_time)
        Image.fromarray(img.astype("uint8")).save(fname, quality=95)
        print("saved", time.time() - start_time)
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
            raise ValueError("Everything is too small!")

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
        fill_color = (194, 145, 229, 255)
        for n in range(masks.shape[2]):
            mask = masks[:, :, n]
            img = bg_pred._apply_mask(image, mask)
            indices = (mask==1)
            img[indices] = fill_color
            mask_fill.append(self.save_img_get_url(img))
        return mask_fill

    def get_mask_outline_from_fill(self, bg_pred):
        """
        This function starts off by recomputing the values from get_mask_fill to form a mask.
        An erode is then performed, before the two are subtracted, forming an outline.
        """
        image, masks, classes = bg_pred.get_all_data()[:3]
        image = bg_pred.make_image_transparent(image)
        image[:, :, 3] = 255
        mask_outline = []
        for n in range(masks.shape[2]):
            # Generate original filled mask
            mask = masks[:, :, n]
            img = bg_pred._apply_mask(image, mask)
            indices = (mask==1)
            img[indices] = 255
            # Generate an eroded version of the mask
            iterations = max(1, int(mask.shape[1] * 0.005)) # Base the thickness of the line on the image width
            eroded_mask = binary_erosion(mask, iterations=iterations)
            eroded_img = bg_pred._apply_mask(image, eroded_mask)
            eroded_indices = (eroded_mask==1)
            img[eroded_indices] = 255
            # Subtract the eroded image from the original image
            return_img = img - eroded_img
            # Continue as before
            mask_outline.append(self.save_img_get_url(return_img))
        return mask_outline

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

    def get_colour_correction(self, bg_pred, fg_img, position, scale):
        fg_img = self.nn.load_image(fg_img)
        bg_img = bg_pred.get_all_data()[0]
        mask = np.full(fg_img.shape[:2], 255)

        response = {}

        if fg_img.shape[2] == 4:
            mask = fg_img[:, :, 3]
            fg_img = fg_img[:, :, :3]
        
        # ! Get the new brightness value
        lum_vec = np.array([0.299, 0.587, 0.114])
        lum_bg_img = np.dot(bg_img, lum_vec)
        lum_fg_img = np.dot(fg_img, lum_vec)

        bg_image_size = bg_img.shape[:2][::-1]
        new_dims = int(bg_image_size[0] * scale[0]), int(bg_image_size[1] * scale[1])
        top_left_x, top_left_y = int(bg_image_size[0] * position[0]), int(bg_image_size[1] * position[1])
        bottom_right_x, bottom_right_y = int(top_left_x + new_dims[0]), int(top_left_y + new_dims[1])

        sampled_area_brightness = lum_bg_img[top_left_y:bottom_right_y, top_left_x:bottom_right_x]

        print(sampled_area_brightness.shape, mask.shape, bg_img.shape, fg_img.shape)
        sampled_area_b_mean = np.mean(sampled_area_brightness)
        fg_img_b_mean = np.mean(lum_fg_img[mask==255])

        avg_b = (sampled_area_b_mean + fg_img_b_mean) / 2
        print(avg_b, sampled_area_b_mean, fg_img_b_mean)
        response["brightness"] = (avg_b - fg_img_b_mean) / 2.55

        # ! There's a possibility for this value to be NaN - I can't seem to reproduce it in the time available so I've switched to a standard brightness value
        if np.any(np.isnan(response["brightness"])):  # ! This may not even be correct - see above note
            response["brightness"] = 7 # arbitrary

        # ! Get the new temperature
        sampled_area_temp = bg_img # [top_left_y:bottom_right_y, top_left_x:bottom_right_x, :3]
        def wb(channel, perc = 0.05):
            mi, ma = (np.percentile(channel, perc), np.percentile(channel,100.0-perc))
            channel = np.uint8(np.clip((channel-mi)*255.0/(ma-mi), 0, 255))
            return channel

        channel_red = np.mean(wb(sampled_area_temp[:, :, 0]))
        channel_green = np.mean(wb(sampled_area_temp[:, :, 1]))
        channel_blue = np.mean(wb(sampled_area_temp[:, :, 2]))

        # Assuming sRGB encoded colour values.
        RGB = np.array([channel_red, channel_green, channel_blue])

        # Conversion to tristimulus values.
        XYZ = colour.sRGB_to_XYZ(RGB / 255)

        # Conversion to chromaticity coordinates.
        xy = colour.XYZ_to_xy(XYZ)

        # Conversion to correlated colour temperature in K.
        CCT = colour.xy_to_CCT_Hernandez1999(xy)
        response["white_balance"] = CCT

        if np.any(np.isnan(response["white_balance"])):  # ! This may not even be correct - see above note
            response["white_balance"] = 2856  # arbitrary
        
        return response
        
    def get_random_forrest_gump_quotation(self):
        quotes = [
            "Life is like a box of chocolates, you never know what you're going to get.",
            "My mama says that stupid is as stupid does.",
            "My mama always said, \"dyin' was a part of life\". I sure wish it wasn't.",
            "My mama says they were magic shoes. They could take me anywhere.",
            "Run! Forrest! Run!",
            "I may not be a smart man, but I know what love is.",
            "I'm pretty tired... I think I'll go home now.",
            "Hello. My name's Forrest, Forrest Gump. You want a chocolate?",
            "That's all I have to say about that.",
            "Get down! Shut up!",
            "Some people don't think miracles happen, well, they do.",
            "From that day on, if I was going somewhere, I was running!",
            "I'm sorry I ruined your New Year's Eve party, Lieutenant Dan.",
            "Hey! Don't call him stupid! You shut up! Don't you ever call him stupid!",
            "Anyway, like I was sayin', shrimp is the fruit of the sea.",
            "Momma always had a way of explaining things so I could understand them.",
            "Momma always said you can tell a lot about a person by their shoes, where they're going, where they've been.",
            "What’s normal anyways?",
            "The best thing about visiting the President is the food! ",
            "Sometimes, I guess there just aren’t enough rocks.",
            "I didn’t know I was supposed to be looking for him, sir. ",
            "Gump, what’s your sole purpose in this Army? To do whatever you tell me to do, sir!",
            "We was always taking long walks, and we was always looking for a guy named \"Charlie\"."
        ]
        return np.random.choice(quotes, 1)[0]
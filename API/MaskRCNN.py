# region imports
import os
import sys
import time
import numpy as np
import imgaug  # https://github.com/aleju/imgaug (pip3 install imgaug)
# Note: Edit PythonAPI/Makefile and replace "python" with "python3".
from pycocotools.coco import COCO
from pycocotools.cocoeval import COCOeval
from pycocotools import mask as maskUtils
import tensorflow as tf
import zipfile
import urllib.request
import shutil
import skimage.io
import matplotlib
import matplotlib.pyplot as plt
# Root directory of the project
ROOT_DIR = os.path.join(os.path.abspath(os.path.dirname(__file__)), "Mask_RCNN")
sys.path.append(ROOT_DIR)  # To find local version of the library
# Import Mask RCNN
from mrcnn import visualize
from mrcnn.config import Config
from mrcnn import model as modellib, utils
from keras import backend as K
from skimage.measure import find_contours

import matplotlib.pyplot as plt
from matplotlib import patches,  lines
from matplotlib.patches import Polygon

from pycocotools.coco import COCO
from pycocotools.cocoeval import COCOeval
from pycocotools import mask as maskUtils

from PIL import Image
import cv2

import warnings
warnings.filterwarnings("ignore", category=UserWarning)
#endregion

# Import COCO config
COCO_MODEL_PATH = os.path.join(ROOT_DIR, "mask_rcnn_coco.h5")

class CocoConfig(Config):
    """Configuration for training on MS COCO.
    Derives from the base Config class and overrides values specific
    to the COCO dataset.
    """
    # Give the configuration a recognizable name
    NAME = "coco"

    # We use a GPU with 12GB memory, which can fit two images.
    # Adjust down if you use a smaller GPU.
    IMAGES_PER_GPU = 1

    # Uncomment to train on 8 GPUs (default is 1)
    # GPU_COUNT = 8

    # Number of classes (including background)
    NUM_CLASSES = 1 + 80  # COCO has 80 classes


class Prediction():
    """ Provides an interface to extract and operate on the masks given by a classifier
    """
    def __init__(self, image, masks, class_ids, boxes):
        self.image = image
        self.masks = masks
        self.class_ids = class_ids
        self.boxes = boxes
        self.coco_class_names = [
            'BG', 'person', 'bicycle', 'car', 
            'motorcycle', 'airplane', 'bus', 'train', 
            'truck', 'boat', 'traffic light', 'fire hydrant', 
            'stop sign', 'parking meter', 'bench', 'bird',
            'cat', 'dog', 'horse', 'sheep', 
            'cow', 'elephant', 'bear', 'zebra', 
            'giraffe', 'backpack', 'umbrella', 'handbag', 
            'tie', 'suitcase', 'frisbee', 'skis', 
            'snowboard', 'sports ball', 'kite', 'baseball bat', 
            'baseball glove', 'skateboard', 'surfboard', 'tennis racket', 
            'bottle', 'wine glass', 'cup', 'fork', 
            'knife', 'spoon', 'bowl', 'banana', 
            'apple', 'sandwich', 'orange', 'broccoli', 
            'carrot', 'hot dog', 'pizza', 'donut', 
            'cake', 'chair', 'couch', 'potted plant',
            'bed', 'dining table', 'toilet', 'tv', 
            'laptop', 'mouse', 'remote', 'keyboard', 
            'cell phone', 'microwave', 'oven', 'toaster',
            'sink', 'refrigerator', 'book', 'clock', 
            'vase', 'scissors', 'teddy bear', 'hair drier', 'toothbrush']

    def _apply_mask(self, image, mask):
        new_im = np.full(image.shape, 0)
        idx = (mask==1)
        new_im[idx] = image[idx]
        return new_im

    def get_human_masks(self):
        human_ids = (self.class_ids==1)
        return self.masks[:, :, human_ids]

    def get_human_boxes(self):
        human_ids = (self.class_ids==1)
        return self.boxes[human_ids]

    def get_size_comparable_masks(self):
        """ Figure out how you're going to get this working
            Are you going to compare the avg human height to the average object height
            And then scale?
        """
        objects = [1, 2, 3, 4, 5, 6, 7, 8, 9, 12]
        pass  
        
    def get_all_humans_image(self):
        human_masks = self.get_human_masks()
        return self.get_image_from_mask(human_masks)

    def get_all_data(self):
        return self.image, self.masks, self.class_ids, self.boxes

    def get_primary_human(self):
        masks = self.get_human_masks()
        boxes = self.get_human_boxes()
        counts = np.count_nonzero(masks, (0, 1))
        argmax = np.argmax(counts)
        return masks[:, :, [argmax]], boxes[argmax]

    def get_image_from_mask(self, masks):
        merged_indices = np.any(masks, axis=2)
        return self._apply_mask(self.image, merged_indices).astype('uint8')

    def get_primary_human_image(self):
        mask, (top_left_y, top_left_x, bottom_right_y, bottom_right_x) = self.get_primary_human()
        full_img = self.get_image_from_mask(mask)
        cut_down_img = full_img[top_left_y:bottom_right_y + 1, top_left_x:bottom_right_x + 1, :]
        with_alpha = self.make_image_transparent(cut_down_img)
        merged_indices = np.any(mask, axis=2)[top_left_y:bottom_right_y + 1, top_left_x:bottom_right_x + 1]
        with_alpha[merged_indices, 3] = 255
        return with_alpha

    def make_image_transparent(self, img):
        return np.concatenate((img, np.full((img.shape[0], img.shape[1], 1), 0)), axis=2).astype('uint8')


    def place_behind_random_object(self, person):
        person_image_shape = person.shape
        self_image_shape = self.image.shape
        object_to_be_behind = [2, 3, 4, 9, 11, 14, 15, 16, 17, 18, 19, 20, 23, 57, 58, 59, 60, 61, 64]

        random_object = np.random.choice(len(self.class_ids))
        bb = self.boxes[random_object]
        mask = self.masks[random_object]
        top_left_y, top_left_x, bottom_right_y, bottom_right_x = bb
        c_x, c_y = (top_left_x + bottom_right_x) // 2, bottom_right_y

        new_person_height = int(min(c_y - 0.25 * c_y, person_image_shape[0]))
        new_person_width = int(person_image_shape[1] * new_person_height / person_image_shape[0])
        resized_person = cv2.resize(person, dsize = (new_person_width, new_person_height))

        mid_person = new_person_width // 2
        person_box_x = c_x - mid_person

        with_alpha = self.make_image_transparent(self.image)
        with_alpha[:, :, 3] = 255
        
        person_layer = np.full(with_alpha.shape, 0)

        person_layer[c_y-new_person_height:c_y, person_box_x:person_box_x+new_person_width] = resized_person

        transparent_mask = self.make_image_transparent(self.get_image_from_mask(self.masks))

        indices = np.any(transparent_mask, axis=2)
        transparent_mask[indices, 3] = 255
        
        
        new_img = Image.fromarray(with_alpha)
        person_layer_image = Image.fromarray(person_layer.astype('uint8'))
        transparent_mask_layer = Image.fromarray(transparent_mask.astype('uint8'))
        new_img.paste(person_layer_image, mask=person_layer_image)
        if random_object in object_to_be_behind:
            new_img.paste(transparent_mask_layer, mask=transparent_mask_layer)
        new_img.save("Result.png")
        # TODO: Add the old image on top of the new one!
        # TODO: Use min of width as well, or make sure to choose an object that's more central
# Class masks?  

class MaskRCNN():
    def __init__(self):
        config = CocoConfig()
        K.clear_session()
        self.model = modellib.MaskRCNN(mode="inference", model_dir="Logs", config=config)
        self.model.load_weights(COCO_MODEL_PATH, by_name=True)
        
    def load_image(self, filename):
        return skimage.io.imread(filename)

    def predict_from_file(self, filename):
        image = self.load_image(filename)
        return self.predict_from_array(image)

    def predict_from_array(self, image):
        image = image[:, :, :3]
        results = self.model.detect([image])
        r = results[0]
        boxes = r['rois']
        masks = r['masks']
        class_ids = r['class_ids']

        N = boxes.shape[0]
        if N == 0:
            raise ValueError("Nothing to detect")

        return Prediction(image, masks, class_ids, boxes)       

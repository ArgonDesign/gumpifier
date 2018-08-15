# CGI

## Files and directory listing 

We describe the files in roughly the order they are called in the running of the webapp.

* `exampleImage.py` - called when the user chooses an example image.  Copies the image from repo/SharedResources/ExampleImages to repo/webApp/storage and gives it a unique name.  This is important because there is an Observer patter in TF_server.py indexed by file name - we do not want to use the original file in case concurrent requests to segment it cause a collision.  Otherwise, this proceeds as `imageUpload.py`.
* `imageUpload.py` - called when the user uploads a custom image.  Saves the image with a unique name into repo/webApp/storage and instructs TF_server.py to start segmenting it.  Returns immediately this instruction has been issued (i.e. does not wait for segmentation to finish) with the url of the uploaded image so the front end can display it.
* `segCheck.py` - called when `imageUpload.py` has returned with the url.  This registers a callback in `TF_server.py` which returns when the requested image has finished segmenting.
* `getScreen2Data.py` - called with the user presses the 'Gumpify' button.  Asks the TF server to construct the information to display screen 2 (e.g. position and scale of foreground image; urls to the background segments, background segment masks and foreground; quotation text, colour correction information; labels and confidences).  Returns this data to the front end.
* `getFinalImage.py` - called when the user presses the 'Download' button.  Asks `TF_server.py` to composite the image with the data returned from `getScreen2Data.py` as adjusted by the user.  Returns the URL of this image for the frontend to layer on the meme text and give to the user as a download.



* `TF_interface.py` - the interface between these CGI scripts and `TF_server.py`.
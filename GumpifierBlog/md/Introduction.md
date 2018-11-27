# So, What's Going On Here?

Over the summer of 2018 three interns working for a collaboration between two Cambridge companies, Argon Design and Dovetailed, produced a fun and interactive tool they called the Gumpifier.

The Gumpifier is effectively an automatic Photoshop, a green screen without the green screen: given a photo of a person, and a photo of some background scene, it will automatically cut out the photo of the person, analyse the background picture, and attempt to place the person into it.  The name 'Gumpifier' is, of course, inspired by the impressive visual effects in the film Forrest Gump, in which the eponymous hero was layered into historical footage.

In the Gumpifier, this is primarily done using artificial intelligence techniques.  A 'convolutional neual network' performs the cutting out and colour correction algorithms are run to match the brightness and temperature to the background before the final image is composited.

In the following three sections of this blog post, each of the interns describes some of their work.

Hai-Dao, from Dovetailed, worked on designing the user interface with the target of providing both usability and transparency for the end user in light of the heavy, and potentially opaque, use of artificial intelligence.

Patrick, from Argon Design, worked on automatic colour correction of the picture of the person to make it match the background image.

Mohammed, also from Argon Design, worked on segmentation techniques for identifying and cutting out objects in photos.
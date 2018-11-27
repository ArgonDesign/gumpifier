# ReadMe

## Workflow for Modification

The source files are stored in `md/` folder.  if you would like to make any changes to the content of the blog post, it is these that should be changed.  This allows authoring to be separated from formatting; it means that content only has to be changed in one place and it reduces the necessity to work on html directly.  Mostly the md files are just that, although I have made one or two modifications, described below under 'Files and Folders' -> ''./md/'' -> '*.md'.

To compile the source content into an html file, run `python3 generate.py`, which will produce a file `output/blogPost.html`.  This file depends on:

* `output/blogPost.css`
* `output/images/` folder

## Files and Folders

### ./md/

* `config.json`.  There are two things which can be changed here.
  * Modify the first array named 'order_of_posts' to adjust the ordering of our respective parts and the table of contents.  The display name in the table of contents can also be set here.  The boolean value dictates whether the entry appears in the table of contents.
  * Change the 'urlPrefix' to adjust the html references to images.  Currently images are copied from their location in `md/` to the same location within `output/images/`.  'urlPrefix' is curently set as 'images', referring to the `output/images/` folder.  I suspect this may well need to be changed to something involving a either 'www.gumpifier.com' or a relative path specifying where the blog post data is stored on the server.
* `template.html`.  A stub piece of html containing links to Google Fonts used, MathJax for some basic TeX rendering, and the divs which contain the blog post once `generate.py` is run.
* `*.md`.  The source files for the blog posts.  These should be broadly editable as per normal, although I have taken a couple of liberties:
  * There is the occasional occurrence of HTML.  Notably in ordered and unordered lists and tables.
  * Above certain images there is a slightly cryptic line which starts with 'DIRECTIVES'.  The remaining content on these lines specifies how the images should be displayed.

* Folders contain images related to the project.

### ./output/

The content of this folder is what should be uploaded to the Gumpifier server - it is the material necessary for the blog post.


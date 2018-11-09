import json
import re
from shutil import copyfile
import os

def convertAsterisk(text):
	"""
	- Double asterisk: bold
	- Single asterisk: italic
	"""
	state = ["NONE", "ESC", "SINGLE", "POSTSINGLE", "DOUBLE"]
	transitions = {	"NONE":			{"*": "SINGLE", "\\": "ESC", "default": "NONE"}, # From NONE state
					"ESC":			{"*:": "NONE", "\\": "NONE", "default": "NONE"}, # From ESC state
					"SINGLE":		{"*": "DOUBLE", "\\": "POSTSINGLE", "default": "POSTSINGLE"}, # From SINGLE state
					"POSTSINGLE":	{"*": "SINGLE", "\\": "NONE", "default": "NONE"}, # From POSTSINGLE state
					"DOUBLE":		{"default": "NONE"} # From DOUBLE state
				}
	
	outputText = []
	state = "NONE"
	boldFlag = False
	italicFlag = False
	for c in text:
		# Transition to new state
		if c in transitions[state]:
			state = transitions[state][c]
		else:
			state = transitions[state]["default"]

		# Perorm action based on state
		if state == "NONE":
			outputText.append(c)
		if state == "ESC":
			outputText.append(c)
		if state == "POSTSINGLE":
			if not italicFlag: outputText.append("<em>")
			else: outputText.append("</em>")
			outputText.append(c)
			italicFlag = not italicFlag
		if state == "DOUBLE":
			if not boldFlag: outputText.append("<b>")
			else: outputText.append("</b>")
			boldFlag = not boldFlag

	if state == "SINGLE": outputText.append("</em>")

	return "".join(outputText)

def convertHash(text):
	headingLevel = 0
	lastCharHash = False
	for c in text:
		if c == '#' and headingLevel == 0 and not lastCharHash:
			headingLevel = 1
			lastCharHash = True
		elif c == '#' and lastCharHash:
			headingLevel += 1
		elif c == ' ' and lastCharHash:
			lastCharHash = False
		elif c != '#' and c != ' ' and lastCharHash:
			return text

	if headingLevel > 0:
		return "<h{}>{}</h{}>".format(str(headingLevel), text[headingLevel:], str(headingLevel))
	else:
		return text


def convertImg(post, urlPrefix):
	def mdImgToHtml(text):
		originalURL = text.split("(")[-1][:-1][2:]
		copyfile(os.path.join("./md", originalURL), os.path.join("./output/images", originalURL))
		return "<img src={}>".format(os.path.join(urlPrefix, originalURL))

	# Do a first pass looking for explicit directives
	newPost = []
	i = 0
	while i < len(post):
		para = post[i]
		toInc = 1

		if para.startswith("DIRECTIVES"):
			flags = para[12:].split(" ")
			print(flags)
			toAdd = []
			toInc = 0
			if "pictureGrid" in flags:
				toAdd.append("<div class=pictureGrid>")
				toAdd.append(mdImgToHtml(post[i+1]))
				toInc += 2
			elif "fullWidth" in flags:
				toAdd.append("<div class=fullWidth>")
				toAdd.append(mdImgToHtml(post[i+1]))
				toInc += 2
			if "caption" in flags:
				toAdd.append(post[i+2])
				toInc += 2

			toAdd.append("</div>")

			if "clear" in flags:
				toAdd.append("<div class=floatClear></div>")

			newPost.append("".join(toAdd))
		else:
			newPost.append(para)

		i += toInc

	post = newPost

	# Do a second pass looking for any remaining inline images
	mdImage = re.compile(r"""
		!		# Match an exclmation mark
		\[		# Match an open square bracket
		.*?		# Match any character 0 or more times non-greedily
		\]		# Match a closing square bracket
		\(		# Match an opening bracket
		.*?		# Match any character 0 or more times non-greedily
		\)		# Match a closing bracket
		""", re.VERBOSE)

	for i in range(len(post)):
		para = post[i]
		post[i] = re.sub(mdImage, lambda match: mdImgToHtml(match.group(0)), para)

	# Finally, return
	return post

def convertURL(text):
	mdURL = re.compile(r"""
		\[		# Match an open square bracket
		.*? 	# Match any character 0 or more times non-greedily
		\]		# Match a closing sqaure bracekt
		\(		# Match and opening bracket
		.*?		# Match any character 0 or more times non-greedily
		\)		# Match a closing bracket
		""", re.VERBOSE)

	def subFn(match):
		matchedText = match.group(0)
		displayText = matchedText.split("]")[0][1:]
		url = matchedText.split("(")[-1][:-1]

		return "<a href={}>{}</a>".format(url, displayText)

	text = re.sub(mdURL, subFn, text)

	return text


def formatPost(post, urlPrefix):
	# Split the post on new line markers
	post = post.split("\n")
	
	# Deal with asterisk characters
	post = [convertAsterisk(p) for p in post]

	# Deal with hash characters
	post = [convertHash(p) for p in post]

	# Add paragraph markers at breakpoints]
	post = ["<p>" + para + "</p>\n\n" if not para.startswith("![") and not para.startswith("DIRECTIVES") else para for para in post]
	post[0] = post[0]

	# Convert md images to html images
	post = convertImg(post, urlPrefix)

	# Convert md urls to html urls
	post = [convertURL(para) for para in post]

	return "".join(post)

def generateTOC(order):
	toReturn = ["<p><h1>Contents</h1></p>\n"]

	for postInfo in order:
		postPath = postInfo[0]
		postTitle = postInfo[1]
		if postPath == "TOC":
			continue
		else:
			with open(postPath, "r") as post:
				# postTitle = post.readline()[2:]
				toReturn.append("<p><h3><a href=#{}>{}</a></h3><p>\n".format(postTitle, postTitle))

	return "".join(toReturn)


def generateBlogPost(config):
	toReturn = []
	order = config["order_of_posts"]

	for postInfo in order:
		postPath = postInfo[0]
		postTitle = postInfo[1]
		if postPath == "TOC":
			toReturn.append(generateTOC(order))
		else:
			with open(postPath, "r", encoding="utf-8") as post:
				toReturn.append("<a name={}></a>".format(postTitle))
				toReturn.append(formatPost(post.read(), config["urlPrefix"]))

	return "".join(toReturn)

if __name__ == "__main__":
	with open("./md/template.html", "r") as f, open("./output/blogPost.html", "w", encoding="utf-8") as output_html, open("./md/config.json") as config:
		# Open the template file and split at the appropriate point
		template_html = f.read().split("<!-- GENERATE -->")
		# Load the order of the blog posts
		config = json.loads(config.read())
		# Generate the final blog post
		generated_html = template_html[0] + generateBlogPost(config) + template_html[1]
		# Write out the blog post to file
		output_html.write(generated_html)

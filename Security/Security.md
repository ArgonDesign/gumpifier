# Security

There are two main security risks:

1. Denial of service.  For example, by exploiting internal memory leaks, filling up the storage/ folder.  These have low probability and low risk... unless the Gumpifier becomes an internet sensation.
2. Arbitrary code execution on an Argon Design machine.  This is more worrying as it could disrupt company business or result in the release of classified documents.  If the site is hosted on a third party remove server, this risk is mitigated.  If the site is hosted at Argon, we should take more care.

The sections below represent possible attack vectors and testing we have undertaken to assess their viability.  The list is by no means comprehensive, and the testing is probably cursory.

## Escape from served directory

**Attempt 1 - Failed**

It seems that the server is sensible and does not serve files outside its root.  For instance, a request to `10.10.10.90:8002/storage/../../portConfig.txt` returns 404 Not Found.  Indeed, it redirects to `10.10.10.90:800s/portConfig.txt`.

**Attempt 2 - Succeeded; now mitigated**

The CGI script `exampleImage.py` at one point performs `copyfile(url, dest)`.  'url' is an arbitrary string provided from an AJAX call and 'dest 'is returned to the user.  Thus, a user could execute the following in their JS console:

```javascript
$.ajax({
    type: "POST",
    url: "/cgi-bin/exampleImage.py",
    data: {fg_url: "/path/to.file"},
    success: function(data) {console.log(data);},
});
```

This allows them to gain access to any file the CGI script has permission to copy.

This threat was mitigated by hardcoding into `exampleImage.py` arrays containing the URLS of images used as examples and passing an integer to index into them.  This restricts the arguments to `copyfile(...)` to server side generated values.

## Arbitrary Code Execution

These are the steps we attempted to get the server to execute arbitrary code:

* The user is able to upload an html file with embedded Javascript.  The server will willingly return this file to the user and their browser will interpret it as HTML/JS if they type in the URL.  (It will not be interpreted if the user doesn't explicitly request the file - the preview image just shows an error).
* We can use this Javascript to make an AJAX call to the server.  The server will, due to a config setting, skip .py files and effectively pass them to the CGI plugin.  All other files it will simply serve back to the user.
* Thus, if we want to be able to execute arbitrary code on the server, we would like to go via the CGI plugin.  There seem to be two options: 1) Upload a script to storage/ and trick the CGI plugin into executing it; 2) trick the server into uploading a script to cgi-bin/.

**Option 1 - upload a script to storage/ and trick the CGI plugin into executing it**

Created file `Security/option1.py`, ensuring Unix line endings and ran `chmod 755`.  Uploaded this using the custom image upload button and noted down the result URL at which it is stored.

Create file `Security/option1.html`.  Filled in the noted down filename for the malicious Python script and uploaded to the server.  Noted down its URL and requested from server.

Results:

- The first AJAX call to a legitimate function ran successfully.  The second AJAX call to the malicious script failed with 404.  I thought this meant that, although we prefixed the URL with '/cgi-bin/', control was not passed to the CGI plugin and the server simply tried to server the Python file but failed because of the exclusion of .py extension.  However, the extension is not .py, so some other failure must have occurred.
- Running `ls -l` on the server show that that no one has execute permissions on the malicious uploaded script, which is encouraging.

**Option 2 - Trick the server into uploading an executable script to cgi-bin/**

This is the code on the server which handles image uploading:

```python
extension = os.path.basename(fileitem.filename).split('.')[-1]

if extension.lower() not in ['bmp', 'gif', 'ico', 'jpg', 'jpeg', 'png', 'svg', 'tif', 'tiff', 'webp']:
		extension = ""
        
hashName = hashlib.md5(str(time.time()).encode("utf8") + str(random.random()).encode("utf8")).hexdigest() + "." + extension

savedPath = os.path.join("storage", hashName)

open(savedPath, 'wb').write(fileitem.file.read())
```

This produces names such as: d9f90b000f2c5fa5d9d0ef401ef1dbe8.png

Originally we thought we might be able to trick the server into saving into cgi-bin/ by crafting a malicious extension.  For example, if the extension comprised:

* 33 backspace characters (using `chr(8)` or similar in Python) to remove the leading hash and '.',
* Followed by '../cgi-bin/bad.py.png' to break out of the storage/ folder and into the cgi-bin/ folder.

This, of course, failed.  The Python script considers the extension as '.png' and simply removes the malicious content.  If we didn't have the tailing '.png' the server would just produce "*hash*." as a name.

Perhaps there is scope to pass malicious unicode characters which Python doesn't interpret as a dot but which do allow us to escape the storage folder, although this wasn't pursued.
// Code from https://computer.howstuffworks.com/cgi3.htm
// Use 'python3 -m http.server --cgi [port]' from 'webapp/' to enable cgi scripts.  Bottom of here: https://docs.python.org/3/library/http.server.html
// Then navigate to 10.10.10.90:port/cgi-bin/test.cgi.  stdout of the script will be sent to the client.

#include <stdio.h>

int main() {
	printf("Content type: text/html\n\n");
	printf("<html>\n");
	printf("<body>\n");
	printf("<h1>Hello world</h1>\n");
	printf("</body>\n");
	printf("</html>\n");
	return 0;
}
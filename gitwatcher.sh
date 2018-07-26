while true; do
	git fetch -v --dry-run 2>&1 | grep -q "up to date" && (clear; tput setaf 2; echo "GIT not updated") || (tput setaf 1; echo "GIT UPDATED")
	sleep 60
done

while true; do
	git fetch -v --dry-run 2>&1 | grep -q "up to date" && (clear; tput setaf 2; echo "GIT not updated"; sleep 60) || (clear; tput setaf 1; echo "GIT UPDATED"; echo -e "\a"; sleep 1)
done

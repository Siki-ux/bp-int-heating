run: tsc
	node index.js ./output/output.txt 22 20 800 5 2880
tsc:
	npx tsc
install:
	sudo apt update
	sudo apt-get install nodejs
	sudo apt install npm 
	npm install typescript --save-dev
tests: tsc
	node index.js ./output/output00.txt 22 20 800 5 2880
	node index.js ./output/output01.txt 21 19 500 3 2880
	node index.js ./output/output02.txt 22 20 0 5 2880
	node index.js ./output/output03.txt 19 20 800 5 2880
	node index.js ./output/output04.txt 22 22 800 5 1
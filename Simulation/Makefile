TARGET=23
START=20
RANGE=800
COEFICIENT=5
MINUTES=2880
SINC=3

run: tsc
	node index.js ./output/output.txt $(TARGET) $(START) $(RANGE) $(COEFICIENT) $(MINUTES) $(SINMOVE) $(SINC)
tsc:
	npx tsc
install:
	sudo apt update
	sudo apt-get install nodejs
	sudo apt install npm 
	npm install typescript --save-dev
	npm install --save-dev @types/node
tests: tsc
	node index.js ./output/output00.txt 22 20 800 5 2880 3
	node index.js ./output/output01.txt 21 19 500 3 2880 3
	node index.js ./output/output02.txt 22 20 0 5 2880 3
	node index.js ./output/output03.txt 19 20 800 5 2880 3
	node index.js ./output/output04.txt 22 22 800 5 1 3